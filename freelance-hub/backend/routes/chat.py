import os
import uuid
from flask import Blueprint, request, jsonify, g
from werkzeug.utils import secure_filename
from ..database import query_db, insert_db, modify_db
from ..utils import require_token
from ..config import Config

chat_bp = Blueprint('chat', __name__)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in Config.ALLOWED_EXTENSIONS

@chat_bp.route('/messages', methods=['GET'])
@require_token
def get_messages():
    # Fetch messages between two users (receiver_id is passed as query param)
    # Optional project_id context
    receiver_id = request.args.get('receiver_id')
    project_id = request.args.get('project_id')
    
    if not receiver_id:
        return jsonify({'message': 'receiver_id is required'}), 400
        
    query = """
        SELECT m.*, u_s.full_name as sender_name, u_r.full_name as receiver_name
        FROM messages m
        JOIN users u_s ON m.sender_id = u_s.id
        JOIN users u_r ON m.receiver_id = u_r.id
        WHERE ((m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?))
    """
    params = [g.user_id, receiver_id, receiver_id, g.user_id]
    
    if project_id:
        query += " AND m.project_id = ?"
        params.append(project_id)
        
    query += " ORDER BY m.created_at ASC"
    
    messages = query_db(query, params)
    return jsonify(messages), 200

@chat_bp.route('/messages', methods=['POST'])
@require_token
def send_message():
    receiver_id = request.form.get('receiver_id')
    project_id = request.form.get('project_id')
    message_text = request.form.get('message_text', '').strip()
    
    if not receiver_id:
        return jsonify({'message': 'receiver_id is required'}), 400
        
    # Check if there is a file attachment
    file_name = None
    file_url = None
    
    if 'file' in request.files:
        file = request.files['file']
        if file and file.filename != '':
            if allowed_file(file.filename):
                os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)
                orig_ext = file.filename.rsplit('.', 1)[1].lower()
                new_filename = secure_filename(f"chat_{g.user_id}_{uuid.uuid4().hex[:8]}.{orig_ext}")
                file_path = os.path.join(Config.UPLOAD_FOLDER, new_filename)
                file.save(file_path)
                
                file_name = file.filename
                # URL path that will be served statically
                file_url = f"/uploads/{new_filename}"
            else:
                return jsonify({'message': 'File extension not allowed'}), 400
                
    if not message_text and not file_url:
        return jsonify({'message': 'Cannot send empty message'}), 400
        
    # Optional project id parameter parsing
    proj_val = int(project_id) if project_id else None
    
    msg_id = insert_db(
        "INSERT INTO messages (sender_id, receiver_id, project_id, message_text, file_name, file_url) VALUES (?, ?, ?, ?, ?, ?)",
        (g.user_id, receiver_id, proj_val, message_text, file_name, file_url)
    )
    
    # Generate notification for receiver
    insert_db(
        "INSERT INTO notifications (user_id, type, message) VALUES (?, 'chat', ?)",
        (receiver_id, f"New message from {g.user_email}")
    )
    
    # Return created message
    new_msg = query_db(
        """SELECT m.*, u.full_name as sender_name 
           FROM messages m 
           JOIN users u ON m.sender_id = u.id 
           WHERE m.id = ?""",
        (msg_id,), one=True
    )
    
    return jsonify(new_msg), 201

@chat_bp.route('/notifications', methods=['GET'])
@require_token
def get_notifications():
    notifications = query_db(
        "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
        (g.user_id,)
    )
    return jsonify(notifications), 200

@chat_bp.route('/notifications/read', methods=['POST'])
@require_token
def mark_notifications_read():
    modify_db(
        "UPDATE notifications SET is_read = 1 WHERE user_id = ?",
        (g.user_id,)
    )
    return jsonify({'message': 'Notifications marked as read'}), 200

@chat_bp.route('/active-chats', methods=['GET'])
@require_token
def get_active_chats():
    # Return a list of users current user has messaged or has a contract with
    # 1. Users from contracts (client + freelancer pairs)
    if g.user_role == 'client':
        partners = query_db(
            """SELECT DISTINCT u.id, u.full_name, u.email, u.role, p.title as profile_title
               FROM contracts c
               JOIN users u ON c.freelancer_id = u.id
               LEFT JOIN profiles p ON u.id = p.user_id
               WHERE c.client_id = ?""",
            (g.user_id,)
        )
    elif g.user_role == 'freelancer':
        partners = query_db(
            """SELECT DISTINCT u.id, u.full_name, u.email, u.role, p.company_name as profile_title
               FROM contracts c
               JOIN users u ON c.client_id = u.id
               LEFT JOIN profiles p ON u.id = p.user_id
               WHERE c.freelancer_id = ?""",
            (g.user_id,)
        )
    else: # Admins can chat with anyone
        partners = query_db(
            "SELECT id, full_name, email, role FROM users WHERE id != ? LIMIT 20",
            (g.user_id,)
        )
        
    # 2. Add users who we have messages with, even if no contract yet (e.g. negotiation)
    msg_users = query_db(
        """SELECT DISTINCT u.id, u.full_name, u.email, u.role, p.title, p.company_name
           FROM messages m
           JOIN users u ON (m.sender_id = u.id OR m.receiver_id = u.id)
           LEFT JOIN profiles p ON u.id = p.user_id
           WHERE (m.sender_id = ? OR m.receiver_id = ?) AND u.id != ?""",
        (g.user_id, g.user_id, g.user_id)
    )
    
    # Merge lists uniquely
    seen = set()
    merged = []
    for p in partners + msg_users:
        if p['id'] not in seen:
            seen.add(p['id'])
            # Clean up display titles
            display_title = p.get('profile_title') or p.get('company_name') or p.get('title') or p['role'].capitalize()
            merged.append({
                'id': p['id'],
                'full_name': p['full_name'],
                'email': p['email'],
                'role': p['role'],
                'display_title': display_title
            })
            
    return jsonify(merged), 200
