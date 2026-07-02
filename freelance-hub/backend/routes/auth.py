import os
import uuid
import datetime
from flask import Blueprint, request, jsonify, g
from werkzeug.utils import secure_filename
from ..database import query_db, insert_db, modify_db
from ..utils import hash_password, verify_password, generate_token, require_token
from ..config import Config

auth_bp = Blueprint('auth', __name__)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in Config.ALLOWED_EXTENSIONS

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    email = data.get('email', '').strip()
    password = data.get('password', '')
    role = data.get('role', '').strip()
    full_name = data.get('full_name', '').strip()
    
    if not email or not password or not role or not full_name:
        return jsonify({'message': 'All fields are required'}), 400
        
    if role not in ['freelancer', 'client', 'admin']:
        return jsonify({'message': 'Invalid role specified'}), 400
        
    # Check if user already exists
    existing = query_db("SELECT id FROM users WHERE email = ?", (email,), one=True)
    if existing:
        return jsonify({'message': 'Email already registered'}), 400
        
    hashed = hash_password(password)
    
    try:
        user_id = insert_db(
            "INSERT INTO users (email, password_hash, role, full_name) VALUES (?, ?, ?, ?)",
            (email, hashed, role, full_name)
        )
        
        # Create corresponding empty profile
        insert_db("INSERT INTO profiles (user_id) VALUES (?)", (user_id,))
        
        return jsonify({
            'message': 'Registration successful',
            'user': {
                'id': user_id,
                'email': email,
                'role': role,
                'full_name': full_name
            }
        }), 201
    except Exception as e:
        return jsonify({'message': f'Error registering user: {str(e)}'}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email', '').strip()
    password = data.get('password', '')
    
    if not email or not password:
        return jsonify({'message': 'Email and password are required'}), 400
        
    user = query_db("SELECT * FROM users WHERE email = ?", (email,), one=True)
    if not user or not verify_password(password, user['password_hash']):
        return jsonify({'message': 'Invalid email or password'}), 401
        
    token = generate_token(user['id'], user['email'], user['role'])
    
    # Get profile info if exists
    profile = query_db("SELECT * FROM profiles WHERE user_id = ?", (user['id'],), one=True)
    
    return jsonify({
        'message': 'Login successful',
        'token': token,
        'user': {
            'id': user['id'],
            'email': user['email'],
            'role': user['role'],
            'full_name': user['full_name'],
            'profile': profile
        }
    }), 200

@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json() or {}
    email = data.get('email', '').strip()
    
    if not email:
        return jsonify({'message': 'Email is required'}), 400
        
    user = query_db("SELECT id FROM users WHERE email = ?", (email,), one=True)
    if not user:
        # Avoid user enumeration by returning 200 anyway
        return jsonify({'message': 'If the email exists, a reset link has been logged'}), 200
        
    reset_token = str(uuid.uuid4())
    expiry = (datetime.datetime.utcnow() + datetime.timedelta(hours=1)).isoformat()
    
    modify_db(
        "UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?",
        (reset_token, expiry, user['id'])
    )
    
    # In a real app we'd email this. Here we log it to console / system logs.
    print(f"PASSWORD RESET REQUEST: User {email} can reset password with token: {reset_token}")
    
    return jsonify({
        'message': 'If the email exists, a reset link has been logged',
        'debug_token': reset_token  # Expose token for local developer convenience
    }), 200

@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json() or {}
    reset_token = data.get('token', '').strip()
    new_password = data.get('password', '')
    
    if not reset_token or not new_password:
        return jsonify({'message': 'Token and new password are required'}), 400
        
    user = query_db("SELECT id, reset_token_expiry FROM users WHERE reset_token = ?", (reset_token,), one=True)
    if not user:
        return jsonify({'message': 'Invalid token'}), 400
        
    # Check expiry
    expiry_str = user['reset_token_expiry']
    expiry = datetime.datetime.fromisoformat(expiry_str)
    if datetime.datetime.utcnow() > expiry:
        return jsonify({'message': 'Token has expired'}), 400
        
    hashed = hash_password(new_password)
    modify_db(
        "UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?",
        (hashed, user['id'])
    )
    
    return jsonify({'message': 'Password has been reset successfully'}), 200

@auth_bp.route('/profile', methods=['GET'])
@require_token
def get_profile():
    user = query_db("SELECT id, email, role, full_name, created_at FROM users WHERE id = ?", (g.user_id,), one=True)
    profile = query_db("SELECT * FROM profiles WHERE user_id = ?", (g.user_id,), one=True)
    
    # Calculate account balance/earnings summary
    balance = 0.0
    transactions = query_db("SELECT SUM(amount) as bal FROM transactions WHERE user_id = ? AND status = 'Completed'", (g.user_id,), one=True)
    if transactions and transactions['bal'] is not None:
        balance = transactions['bal']
        
    return jsonify({
        'user': user,
        'profile': profile,
        'balance': balance
    }), 200

@auth_bp.route('/profile', methods=['PUT'])
@require_token
def update_profile():
    data = request.get_json() or {}
    
    title = data.get('title', '').strip()
    bio = data.get('bio', '').strip()
    skills = data.get('skills', '').strip()
    experience = data.get('experience', '').strip()
    portfolio = data.get('portfolio', '').strip()
    company_name = data.get('company_name', '').strip()
    company_bio = data.get('company_bio', '').strip()
    company_website = data.get('company_website', '').strip()
    
    # If the user changed their full name
    full_name = data.get('full_name', '').strip()
    if full_name:
        modify_db("UPDATE users SET full_name = ? WHERE id = ?", (full_name, g.user_id))
        
    modify_db(
        """UPDATE profiles SET 
            title = ?, bio = ?, skills = ?, experience = ?, portfolio = ?, 
            company_name = ?, company_bio = ?, company_website = ? 
           WHERE user_id = ?""",
        (title, bio, skills, experience, portfolio, company_name, company_bio, company_website, g.user_id)
    )
    
    updated_profile = query_db("SELECT * FROM profiles WHERE user_id = ?", (g.user_id,), one=True)
    
    return jsonify({
        'message': 'Profile updated successfully',
        'profile': updated_profile
    }), 200

@auth_bp.route('/profile/resume', methods=['POST'])
@require_token
def upload_resume():
    if 'resume' not in request.files:
        return jsonify({'message': 'No file part'}), 400
        
    file = request.files['resume']
    if file.filename == '':
        return jsonify({'message': 'No selected file'}), 400
        
    if file and allowed_file(file.filename):
        # Ensure upload folder exists
        os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)
        
        orig_ext = file.filename.rsplit('.', 1)[1].lower()
        new_filename = secure_filename(f"resume_{g.user_id}_{uuid.uuid4().hex[:8]}.{orig_ext}")
        file_path = os.path.join(Config.UPLOAD_FOLDER, new_filename)
        file.save(file_path)
        
        # Update db
        modify_db("UPDATE profiles SET resume_filename = ? WHERE user_id = ?", (new_filename, g.user_id))
        
        return jsonify({
            'message': 'Resume uploaded successfully',
            'filename': new_filename
        }), 200
        
    return jsonify({'message': 'File type not allowed'}), 400
