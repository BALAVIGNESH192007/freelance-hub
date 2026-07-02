from flask import Blueprint, request, jsonify, g
from ..database import query_db, insert_db, modify_db
from ..utils import require_token

reviews_bp = Blueprint('reviews', __name__)

@reviews_bp.route('', methods=['POST'])
@require_token
def submit_review():
    data = request.get_json() or {}
    project_id = data.get('project_id')
    reviewee_id = data.get('reviewee_id')
    rating = data.get('rating')
    review_text = data.get('review_text', '').strip()
    
    if not project_id or not reviewee_id or rating is None:
        return jsonify({'message': 'Project ID, Reviewee ID, and Rating are required'}), 400
        
    try:
        rating_val = int(rating)
        if rating_val < 1 or rating_val > 5:
            return jsonify({'message': 'Rating must be an integer between 1 and 5'}), 400
    except ValueError:
        return jsonify({'message': 'Invalid rating format'}), 400
        
    # Check if project exists and user is part of it
    project = query_db("SELECT * FROM projects WHERE id = ?", (project_id,), one=True)
    if not project:
        return jsonify({'message': 'Project not found'}), 404
        
    contract = query_db(
        "SELECT * FROM contracts WHERE project_id = ? AND status IN ('Completed', 'Active')",
        (project_id,), one=True
    )
    if not contract:
        return jsonify({'message': 'No active or completed contract found for this project'}), 400
        
    # Determine roles and permissions
    if g.user_role == 'client':
        if contract['client_id'] != g.user_id or contract['freelancer_id'] != reviewee_id:
            return jsonify({'message': 'You can only review the hired freelancer for your project'}), 403
        reviewer_role = 'client'
    elif g.user_role == 'freelancer':
        if contract['freelancer_id'] != g.user_id or contract['client_id'] != reviewee_id:
            return jsonify({'message': 'You can only review the client of your contract'}), 403
        reviewer_role = 'freelancer'
    else:
        return jsonify({'message': 'Admins cannot submit reviews'}), 403
        
    # Check if review already exists
    existing = query_db(
        "SELECT id FROM reviews WHERE project_id = ? AND reviewer_id = ? AND reviewee_id = ?",
        (project_id, g.user_id, reviewee_id), one=True
    )
    if existing:
        return jsonify({'message': 'You have already reviewed this user for this project'}), 400
        
    # Insert review
    review_id = insert_db(
        """INSERT INTO reviews (project_id, reviewer_id, reviewee_id, rating, review_text, reviewer_role)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (project_id, g.user_id, reviewee_id, rating_val, review_text, reviewer_role)
    )
    
    # Recalculate rating & rating_count for reviewee profile
    all_reviews = query_db("SELECT rating FROM reviews WHERE reviewee_id = ?", (reviewee_id,))
    rating_count = len(all_reviews)
    avg_rating = sum(r['rating'] for r in all_reviews) / rating_count if rating_count > 0 else 0.0
    
    modify_db(
        "UPDATE profiles SET rating = ?, rating_count = ? WHERE user_id = ?",
        (avg_rating, rating_count, reviewee_id)
    )
    
    # Notify reviewee
    insert_db(
        "INSERT INTO notifications (user_id, type, message) VALUES (?, 'info', ?)",
        (reviewee_id, f"You received a new {rating_val}-star review from your contract partner.")
    )
    
    return jsonify({
        'message': 'Review submitted successfully',
        'review_id': review_id,
        'average_rating': avg_rating
    }), 201

@reviews_bp.route('/<int:user_id>', methods=['GET'])
def get_user_reviews(user_id):
    # Fetch reviews for a specific user
    reviews = query_db(
        """SELECT r.*, u.full_name as reviewer_name, p.title as project_title
           FROM reviews r
           JOIN users u ON r.reviewer_id = u.id
           JOIN projects p ON r.project_id = p.id
           WHERE r.reviewee_id = ?
           ORDER BY r.created_at DESC""",
        (user_id,)
    )
    return jsonify(reviews), 200
