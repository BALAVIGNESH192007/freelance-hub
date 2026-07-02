from flask import Blueprint, jsonify, g
from ..database import query_db
from ..utils import require_token, require_role

reports_bp = Blueprint('reports', __name__)

@reports_bp.route('/admin', methods=['GET'])
@require_role('admin')
def get_admin_reports():
    # Counts
    user_counts = query_db("SELECT role, COUNT(*) as count FROM users GROUP BY role")
    project_counts = query_db("SELECT status, COUNT(*) as count FROM projects GROUP BY status")
    total_projects = query_db("SELECT COUNT(*) as count FROM projects", one=True)
    
    counts = {
        'admin': 0,
        'freelancer': 0,
        'client': 0,
        'open_projects': 0,
        'active_projects': 0,
        'completed_projects': 0,
        'total_projects': total_projects['count'] if total_projects else 0
    }
    
    for row in user_counts:
        counts[row['role']] = row['count']
        
    for row in project_counts:
        if row['status'] == 'Open':
            counts['open_projects'] = row['count']
        elif row['status'] == 'In Progress':
            counts['active_projects'] = row['count']
        elif row['status'] == 'Completed':
            counts['completed_projects'] = row['count']
            
    # Financial metrics
    escrow = query_db(
        "SELECT SUM(budget - paid_amount) as escrow_bal FROM contracts WHERE status = 'Active'",
        one=True
    )
    total_payments = query_db(
        "SELECT SUM(amount) as paid FROM transactions WHERE type = 'payment'",
        one=True
    )
    total_earnings = query_db(
        "SELECT SUM(amount) as earned FROM transactions WHERE type = 'earning'",
        one=True
    )
    total_withdrawals = query_db(
        "SELECT SUM(amount) as withdrawn FROM transactions WHERE type = 'withdrawal' AND status = 'Completed'",
        one=True
    )
    
    # Calculate revenue (e.g. 5% service fee simulation on projects, or we can just mock revenue numbers)
    # Let's say our platform takes a 5% cut or we compute transaction volumes
    volume = abs(total_payments['paid']) if total_payments and total_payments['paid'] else 0.0
    platform_revenue = volume * 0.05
    
    financials = {
        'escrow_balance': escrow['escrow_bal'] if escrow and escrow['escrow_bal'] is not None else 0.0,
        'total_transaction_volume': volume,
        'estimated_platform_revenue': platform_revenue,
        'total_withdrawn': abs(total_withdrawals['withdrawn']) if total_withdrawals and total_withdrawals['withdrawn'] is not None else 0.0
    }
    
    # User growth statistics (by month)
    # Simple SQLite date parsing to count user signups
    user_growth = query_db(
        """SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as signups 
           FROM users 
           GROUP BY month 
           ORDER BY month ASC 
           LIMIT 12"""
    )
    
    # Project trends (by month)
    project_trends = query_db(
        """SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as postings
           FROM projects
           GROUP BY month
           ORDER BY month ASC
           LIMIT 12"""
    )
    
    return jsonify({
        'counts': counts,
        'financials': financials,
        'user_growth': user_growth,
        'project_trends': project_trends
    }), 200

@reports_bp.route('/freelancer', methods=['GET'])
@require_role('freelancer')
def get_freelancer_reports():
    # Ongoing, Applied, Completed counts
    applied = query_db(
        "SELECT COUNT(*) as count FROM applications WHERE freelancer_id = ?",
        (g.user_id,), one=True
    )
    ongoing = query_db(
        "SELECT COUNT(*) as count FROM contracts WHERE freelancer_id = ? AND status = 'Active'",
        (g.user_id,), one=True
    )
    completed = query_db(
        "SELECT COUNT(*) as count FROM contracts WHERE freelancer_id = ? AND status = 'Completed'",
        (g.user_id,), one=True
    )
    
    # Earnings history
    earnings = query_db(
        "SELECT SUM(amount) as earned FROM transactions WHERE user_id = ? AND type = 'earning'",
        (g.user_id,), one=True
    )
    withdrawn = query_db(
        "SELECT SUM(amount) as withdrawn FROM transactions WHERE user_id = ? AND type = 'withdrawal'",
        (g.user_id,), one=True
    )
    
    # Monthly earnings breakdown
    earnings_breakdown = query_db(
        """SELECT strftime('%Y-%m', created_at) as month, SUM(amount) as amount
           FROM transactions
           WHERE user_id = ? AND type = 'earning'
           GROUP BY month
           ORDER BY month ASC""",
        (g.user_id,)
    )
    
    return jsonify({
        'applied_count': applied['count'] if applied else 0,
        'ongoing_count': ongoing['count'] if ongoing else 0,
        'completed_count': completed['count'] if completed else 0,
        'total_earnings': earnings['earned'] if earnings and earnings['earned'] is not None else 0.0,
        'total_withdrawn': abs(withdrawn['withdrawn']) if withdrawn and withdrawn['withdrawn'] is not None else 0.0,
        'earnings_history': earnings_breakdown
    }), 200

@reports_bp.route('/client', methods=['GET'])
@require_role('client')
def get_client_reports():
    posted = query_db(
        "SELECT COUNT(*) as count FROM projects WHERE client_id = ?",
        (g.user_id,), one=True
    )
    active_contracts = query_db(
        "SELECT COUNT(*) as count FROM contracts WHERE client_id = ? AND status = 'Active'",
        (g.user_id,), one=True
    )
    hired = query_db(
        "SELECT COUNT(DISTINCT freelancer_id) as count FROM contracts WHERE client_id = ?",
        (g.user_id,), one=True
    )
    
    # Financial metrics
    spent = query_db(
        "SELECT SUM(amount) as total FROM transactions WHERE user_id = ? AND type = 'payment'",
        (g.user_id,), one=True
    )
    
    # Monthly spending breakdown
    spending_breakdown = query_db(
        """SELECT strftime('%Y-%m', created_at) as month, ABS(SUM(amount)) as amount
           FROM transactions
           WHERE user_id = ? AND type = 'payment'
           GROUP BY month
           ORDER BY month ASC""",
        (g.user_id,)
    )
    
    return jsonify({
        'posted_count': posted['count'] if posted else 0,
        'active_contracts_count': active_contracts['count'] if active_contracts else 0,
        'hired_freelancers_count': hired['count'] if hired else 0,
        'total_spent': abs(spent['total']) if spent and spent['total'] is not None else 0.0,
        'spending_history': spending_breakdown
    }), 200
