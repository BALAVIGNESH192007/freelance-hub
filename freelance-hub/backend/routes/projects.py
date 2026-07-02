from flask import Blueprint, request, jsonify, g
from ..database import query_db, insert_db, modify_db
from ..utils import require_token, require_role

projects_bp = Blueprint('projects', __name__)

@projects_bp.route('', methods=['GET'])
def list_projects():
    # Public route to search & filter projects
    search = request.args.get('search', '').strip()
    category = request.args.get('category', '').strip()
    skills = request.args.get('skills', '').strip()
    min_budget = request.args.get('min_budget', '').strip()
    max_budget = request.args.get('max_budget', '').strip()
    status = request.args.get('status', 'Open').strip() # Default to search open projects
    
    query = """
        SELECT p.*, u.full_name as client_name, pr.company_name 
        FROM projects p
        JOIN users u ON p.client_id = u.id
        LEFT JOIN profiles pr ON u.id = pr.user_id
        WHERE 1=1
    """
    params = []
    
    if status and status != 'All':
        query += " AND p.status = ?"
        params.append(status)
        
    if search:
        query += " AND (p.title LIKE ? OR p.description LIKE ?)"
        params.append(f"%{search}%")
        params.append(f"%{search}%")
        
    if category:
        query += " AND p.category = ?"
        params.append(category)
        
    if min_budget:
        try:
            query += " AND p.budget >= ?"
            params.append(float(min_budget))
        except ValueError:
            pass
            
    if max_budget:
        try:
            query += " AND p.budget <= ?"
            params.append(float(max_budget))
        except ValueError:
            pass
            
    results = query_db(query, params)
    
    # Filter by skills in Python to handle tags matching
    if skills:
        filtered = []
        search_skills = [s.strip().lower() for s in skills.split(',') if s.strip()]
        for p in results:
            # Query the freelancer's required skills from description, or project tags (we match text)
            # In our schema we can check if description or title matches skills, 
            # or check freelancer profile matching skills (if filtering freelancers).
            # If search is for projects, we see if any search_skills are in the project description/title.
            desc_lower = p['description'].lower() + " " + p['title'].lower()
            if any(skill in desc_lower for skill in search_skills):
                filtered.append(p)
        results = filtered
        
    return jsonify(results), 200

@projects_bp.route('/freelancers', methods=['GET'])
def list_freelancers():
    # Public route to search freelancers
    skills = request.args.get('skills', '').strip()
    search = request.args.get('search', '').strip() # Name or title
    
    query = """
        SELECT u.id, u.full_name, u.email, p.title, p.bio, p.skills, p.experience, p.rating, p.rating_count
        FROM users u
        JOIN profiles p ON u.id = p.user_id
        WHERE u.role = 'freelancer'
    """
    params = []
    
    if search:
        query += " AND (u.full_name LIKE ? OR p.title LIKE ? OR p.bio LIKE ?)"
        params.append(f"%{search}%")
        params.append(f"%{search}%")
        params.append(f"%{search}%")
        
    results = query_db(query, params)
    
    if skills:
        filtered = []
        search_skills = [s.strip().lower() for s in skills.split(',') if s.strip()]
        for r in results:
            user_skills = [s.strip().lower() for s in (r['skills'] or '').split(',') if s.strip()]
            if any(skill in user_skills for skill in search_skills):
                filtered.append(r)
        results = filtered
        
    return jsonify(results), 200

@projects_bp.route('', methods=['POST'])
@require_role('client')
def create_project():
    data = request.get_json() or {}
    title = data.get('title', '').strip()
    description = data.get('description', '').strip()
    category = data.get('category', '').strip()
    budget = data.get('budget')
    deadline = data.get('deadline', '').strip()
    
    if not title or not description or not category or budget is None or not deadline:
        return jsonify({'message': 'All project fields are required'}), 400
        
    try:
        budget_val = float(budget)
        if budget_val <= 0:
            return jsonify({'message': 'Budget must be positive'}), 400
    except ValueError:
        return jsonify({'message': 'Invalid budget format'}), 400
        
    project_id = insert_db(
        "INSERT INTO projects (client_id, title, description, category, budget, deadline) VALUES (?, ?, ?, ?, ?, ?)",
        (g.user_id, title, description, category, budget_val, deadline)
    )
    
    # Notify admin of new project (simulate)
    admin_users = query_db("SELECT id FROM users WHERE role = 'admin'")
    for admin in admin_users:
        insert_db(
            "INSERT INTO notifications (user_id, type, message) VALUES (?, 'project', ?)",
            (admin['id'], f"New project '{title}' posted by client {g.user_email}")
        )
        
    return jsonify({
        'message': 'Project posted successfully',
        'project_id': project_id
    }), 201

@projects_bp.route('/<int:project_id>', methods=['GET'])
def get_project(project_id):
    project = query_db(
        """SELECT p.*, u.full_name as client_name, u.email as client_email, pr.company_name, pr.company_bio
           FROM projects p 
           JOIN users u ON p.client_id = u.id 
           LEFT JOIN profiles pr ON u.id = pr.user_id
           WHERE p.id = ?""",
        (project_id,), one=True
    )
    if not project:
        return jsonify({'message': 'Project not found'}), 404
        
    # Get active contract details if any
    contract = query_db(
        """SELECT c.id, c.status, c.freelancer_id, u.full_name as freelancer_name, c.paid_amount 
           FROM contracts c
           JOIN users u ON c.freelancer_id = u.id
           WHERE c.project_id = ?""", (project_id,), one=True
    )
    
    return jsonify({
        'project': project,
        'contract': contract
    }), 200

@projects_bp.route('/<int:project_id>', methods=['PUT'])
@require_role('client')
def update_project(project_id):
    project = query_db("SELECT * FROM projects WHERE id = ?", (project_id,), one=True)
    if not project:
        return jsonify({'message': 'Project not found'}), 404
        
    if project['client_id'] != g.user_id and g.user_role != 'admin':
        return jsonify({'message': 'Unauthorized edit request'}), 403
        
    data = request.get_json() or {}
    title = data.get('title', project['title']).strip()
    description = data.get('description', project['description']).strip()
    category = data.get('category', project['category']).strip()
    budget = data.get('budget', project['budget'])
    deadline = data.get('deadline', project['deadline']).strip()
    status = data.get('status', project['status']).strip()
    
    try:
        budget_val = float(budget)
    except ValueError:
        return jsonify({'message': 'Invalid budget format'}), 400
        
    modify_db(
        """UPDATE projects 
           SET title = ?, description = ?, category = ?, budget = ?, deadline = ?, status = ? 
           WHERE id = ?""",
        (title, description, category, budget_val, deadline, status, project_id)
    )
    
    return jsonify({'message': 'Project updated successfully'}), 200

@projects_bp.route('/<int:project_id>', methods=['DELETE'])
@require_role('client')
def delete_project(project_id):
    project = query_db("SELECT * FROM projects WHERE id = ?", (project_id,), one=True)
    if not project:
        return jsonify({'message': 'Project not found'}), 404
        
    if project['client_id'] != g.user_id and g.user_role != 'admin':
        return jsonify({'message': 'Unauthorized delete request'}), 403
        
    modify_db("DELETE FROM projects WHERE id = ?", (project_id,))
    return jsonify({'message': 'Project deleted successfully'}), 200

@projects_bp.route('/<int:project_id>/apply', methods=['POST'])
@require_role('freelancer')
def apply_to_project(project_id):
    project = query_db("SELECT * FROM projects WHERE id = ?", (project_id,), one=True)
    if not project:
        return jsonify({'message': 'Project not found'}), 404
        
    if project['status'] != 'Open':
        return jsonify({'message': 'Project is no longer accepting applications'}), 400
        
    # Check if already applied
    existing = query_db(
        "SELECT id FROM applications WHERE project_id = ? AND freelancer_id = ?",
        (project_id, g.user_id), one=True
    )
    if existing:
        return jsonify({'message': 'You have already applied to this project'}), 400
        
    data = request.get_json() or {}
    bid_amount = data.get('bid_amount')
    cover_letter = data.get('cover_letter', '').strip()
    
    if bid_amount is None or not cover_letter:
        return jsonify({'message': 'Bid amount and cover letter are required'}), 400
        
    try:
        bid_val = float(bid_amount)
    except ValueError:
        return jsonify({'message': 'Invalid bid amount format'}), 400
        
    application_id = insert_db(
        "INSERT INTO applications (project_id, freelancer_id, bid_amount, cover_letter) VALUES (?, ?, ?, ?)",
        (project_id, g.user_id, bid_val, cover_letter)
    )
    
    # Notify client
    insert_db(
        "INSERT INTO notifications (user_id, type, message) VALUES (?, 'project', ?)",
        (project['client_id'], f"New application received for '{project['title']}' from freelancer {g.user_email}")
    )
    
    return jsonify({
        'message': 'Application submitted successfully',
        'application_id': application_id
    }), 201

@projects_bp.route('/<int:project_id>/applications', methods=['GET'])
@require_token
def get_project_applications(project_id):
    project = query_db("SELECT * FROM projects WHERE id = ?", (project_id,), one=True)
    if not project:
        return jsonify({'message': 'Project not found'}), 404
        
    # Allow client owner or admin or the freelancer who applied
    if g.user_role == 'freelancer':
        apps = query_db(
            """SELECT a.*, u.full_name as freelancer_name, pr.title as freelancer_title, pr.rating 
               FROM applications a
               JOIN users u ON a.freelancer_id = u.id
               LEFT JOIN profiles pr ON u.id = pr.user_id
               WHERE a.project_id = ? AND a.freelancer_id = ?""",
            (project_id, g.user_id)
        )
    elif project['client_id'] == g.user_id or g.user_role == 'admin':
        apps = query_db(
            """SELECT a.*, u.full_name as freelancer_name, u.email as freelancer_email, pr.title as freelancer_title, pr.rating, pr.skills, pr.resume_filename
               FROM applications a
               JOIN users u ON a.freelancer_id = u.id
               LEFT JOIN profiles pr ON u.id = pr.user_id
               WHERE a.project_id = ?""",
            (project_id,)
        )
    else:
        return jsonify({'message': 'Unauthorized access'}), 403
        
    return jsonify(apps), 200

@projects_bp.route('/<int:project_id>/hire', methods=['POST'])
@require_role('client')
def hire_freelancer(project_id):
    project = query_db("SELECT * FROM projects WHERE id = ?", (project_id,), one=True)
    if not project:
        return jsonify({'message': 'Project not found'}), 404
        
    if project['client_id'] != g.user_id:
        return jsonify({'message': 'Unauthorized request'}), 403
        
    if project['status'] != 'Open':
        return jsonify({'message': 'Project status must be Open to hire'}), 400
        
    data = request.get_json() or {}
    freelancer_id = data.get('freelancer_id')
    
    if not freelancer_id:
        return jsonify({'message': 'Freelancer ID is required'}), 400
        
    # Check application
    app = query_db(
        "SELECT * FROM applications WHERE project_id = ? AND freelancer_id = ? AND status = 'Pending'",
        (project_id, freelancer_id), one=True
    )
    if not app:
        return jsonify({'message': 'Pending application not found for this freelancer'}), 404
        
    # Hire freelancer:
    # 1. Update application status
    modify_db(
        "UPDATE applications SET status = 'Hired' WHERE id = ?", (app['id'],)
    )
    # 2. Reject other applications
    modify_db(
        "UPDATE applications SET status = 'Rejected' WHERE project_id = ? AND id != ?",
        (project_id, app['id'])
    )
    # 3. Update project status to In Progress
    modify_db(
        "UPDATE projects SET status = 'In Progress' WHERE id = ?", (project_id,)
    )
    # 4. Create contract
    contract_id = insert_db(
        "INSERT INTO contracts (project_id, freelancer_id, client_id, budget) VALUES (?, ?, ?, ?)",
        (project_id, freelancer_id, g.user_id, app['bid_amount'])
    )
    # 5. Create invoice (Pending payment by client)
    insert_db(
        "INSERT INTO invoices (contract_id, amount, description) VALUES (?, ?, ?)",
        (contract_id, app['bid_amount'], f"Invoice for hiring escrow payment - Project: '{project['title']}'")
    )
    
    # 6. Notify freelancer
    insert_db(
        "INSERT INTO notifications (user_id, type, message) VALUES (?, 'project', ?)",
        (freelancer_id, f"Congratulations! You have been hired for '{project['title']}'. An invoice has been generated for client payment.")
    )
    
    return jsonify({
        'message': 'Freelancer hired successfully. Escrow invoice generated.',
        'contract_id': contract_id
    }), 200

@projects_bp.route('/<int:project_id>/submit-work', methods=['POST'])
@require_role('freelancer')
def submit_work(project_id):
    contract = query_db(
        "SELECT * FROM contracts WHERE project_id = ? AND freelancer_id = ? AND status = 'Active'",
        (project_id, g.user_id), one=True
    )
    if not contract:
        return jsonify({'message': 'Active contract not found for this project'}), 404
        
    data = request.get_json() or {}
    submission_notes = data.get('submission_notes', '').strip()
    
    if not submission_notes:
        return jsonify({'message': 'Submission details are required'}), 400
        
    # Notify client of submission
    insert_db(
        "INSERT INTO notifications (user_id, type, message) VALUES (?, 'project', ?)",
        (contract['client_id'], f"Freelancer submitted work for project. Review notes: {submission_notes[:100]}...")
    )
    
    # In messages table, we can append a custom system-like message
    insert_db(
        "INSERT INTO messages (sender_id, receiver_id, project_id, message_text) VALUES (?, ?, ?, ?)",
        (g.user_id, contract['client_id'], project_id, f"[SYSTEM: Work Submission] Notes: {submission_notes}")
    )
    
    return jsonify({'message': 'Work submitted successfully. Client has been notified.'}), 200

@projects_bp.route('/<int:project_id>/complete', methods=['POST'])
@require_role('client')
def complete_project(project_id):
    project = query_db("SELECT * FROM projects WHERE id = ?", (project_id,), one=True)
    if not project:
        return jsonify({'message': 'Project not found'}), 404
        
    if project['client_id'] != g.user_id:
        return jsonify({'message': 'Unauthorized request'}), 403
        
    contract = query_db(
        "SELECT * FROM contracts WHERE project_id = ? AND status = 'Active'",
        (project_id,), one=True
    )
    if not contract:
        return jsonify({'message': 'Active contract not found'}), 404
        
    # Check if invoices are fully paid (client must pay the invoice before project completion)
    invoice = query_db(
        "SELECT * FROM invoices WHERE contract_id = ? AND status = 'Pending'",
        (contract['id'],), one=True
    )
    if invoice:
        return jsonify({'message': 'You must pay the pending contract invoices before completing this project.'}), 400
        
    # Complete contract & project
    import datetime
    now_str = datetime.datetime.utcnow().isoformat()
    
    modify_db(
        "UPDATE contracts SET status = 'Completed', completed_at = ? WHERE id = ?",
        (now_str, contract['id'])
    )
    modify_db(
        "UPDATE projects SET status = 'Completed', completed_at = ? WHERE id = ?",
        (now_str, project_id)
    )
    
    # Transfer escrow payment to freelancer balance
    # Freelancer earnings: credit transaction
    insert_db(
        "INSERT INTO transactions (user_id, amount, type, description) VALUES (?, ?, 'earning', ?)",
        (contract['freelancer_id'], contract['budget'], f"Earnings payout for completed project: '{project['title']}'")
    )
    
    # Notify freelancer
    insert_db(
        "INSERT INTO notifications (user_id, type, message) VALUES (?, 'payment', ?)",
        (contract['freelancer_id'], f"Project '{project['title']}' completed! Budget of ${contract['budget']:.2f} has been added to your balance.")
    )
    
    return jsonify({'message': 'Project marked as completed. Funds released to freelancer.'}), 200
