import datetime
from flask import Blueprint, request, jsonify, g
from ..database import query_db, insert_db, modify_db
from ..utils import require_token, require_role

payments_bp = Blueprint('payments', __name__)

@payments_bp.route('/invoices', methods=['GET'])
@require_token
def list_invoices():
    # Admin views all invoices
    if g.user_role == 'admin':
        invoices = query_db(
            """SELECT i.*, c.project_id, p.title as project_title, c.client_id, u_c.full_name as client_name, 
                      c.freelancer_id, u_f.full_name as freelancer_name
               FROM invoices i
               JOIN contracts c ON i.contract_id = c.id
               JOIN projects p ON c.project_id = p.id
               JOIN users u_c ON c.client_id = u_c.id
               JOIN users u_f ON c.freelancer_id = u_f.id
               ORDER BY i.created_at DESC"""
        )
    # Client views invoices they owe
    elif g.user_role == 'client':
        invoices = query_db(
            """SELECT i.*, c.project_id, p.title as project_title, c.freelancer_id, u_f.full_name as freelancer_name
               FROM invoices i
               JOIN contracts c ON i.contract_id = c.id
               JOIN projects p ON c.project_id = p.id
               JOIN users u_f ON c.freelancer_id = u_f.id
               WHERE c.client_id = ?
               ORDER BY i.created_at DESC""",
            (g.user_id,)
        )
    # Freelancer views invoices associated with their contracts
    else:
        invoices = query_db(
            """SELECT i.*, c.project_id, p.title as project_title, c.client_id, u_c.full_name as client_name
               FROM invoices i
               JOIN contracts c ON i.contract_id = c.id
               JOIN projects p ON c.project_id = p.id
               JOIN users u_c ON c.client_id = u_c.id
               WHERE c.freelancer_id = ?
               ORDER BY i.created_at DESC""",
            (g.user_id,)
        )
        
    return jsonify(invoices), 200

@payments_bp.route('/invoices/<int:invoice_id>/pay', methods=['POST'])
@require_role('client')
def pay_invoice(invoice_id):
    invoice = query_db(
        """SELECT i.*, c.client_id, c.budget, c.id as contract_id, p.title as project_title, c.freelancer_id
           FROM invoices i
           JOIN contracts c ON i.contract_id = c.id
           JOIN projects p ON c.project_id = p.id
           WHERE i.id = ?""",
        (invoice_id,), one=True
    )
    if not invoice:
        return jsonify({'message': 'Invoice not found'}), 404
        
    if invoice['client_id'] != g.user_id:
        return jsonify({'message': 'Unauthorized payment attempt'}), 403
        
    if invoice['status'] == 'Paid':
        return jsonify({'message': 'Invoice is already paid'}), 400
        
    # Process payment:
    # 1. Update invoice status
    now_str = datetime.datetime.utcnow().isoformat()
    modify_db(
        "UPDATE invoices SET status = 'Paid', paid_at = ? WHERE id = ?",
        (now_str, invoice_id)
    )
    # 2. Update contract paid amount
    modify_db(
        "UPDATE contracts SET paid_amount = paid_amount + ? WHERE id = ?",
        (invoice['amount'], invoice['contract_id'])
    )
    
    # 3. Log transactions:
    # We record a client "deposit" to simulate client funding their account, 
    # and a "payment" to represent payment into contract escrow.
    insert_db(
        "INSERT INTO transactions (user_id, amount, type, description) VALUES (?, ?, 'deposit', ?)",
        (g.user_id, invoice['amount'], f"Simulated bank deposit for project funding")
    )
    insert_db(
        "INSERT INTO transactions (user_id, amount, type, description) VALUES (?, ?, 'payment', ?)",
        (g.user_id, -invoice['amount'], f"Escrow payment for project: '{invoice['project_title']}'")
    )
    
    # 4. Notify freelancer
    insert_db(
        "INSERT INTO notifications (user_id, type, message) VALUES (?, 'payment', ?)",
        (invoice['freelancer_id'], f"Client paid invoice of ${invoice['amount']:.2f} for project '{invoice['project_title']}'. Funds are held in escrow until completion.")
    )
    
    return jsonify({'message': 'Invoice paid successfully. Escrow updated.'}), 200

@payments_bp.route('/transactions', methods=['GET'])
@require_token
def list_transactions():
    if g.user_role == 'admin':
        txs = query_db(
            """SELECT t.*, u.full_name, u.email, u.role
               FROM transactions t
               JOIN users u ON t.user_id = u.id
               ORDER BY t.created_at DESC"""
        )
    else:
        txs = query_db(
            "SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC",
            (g.user_id,)
        )
    return jsonify(txs), 200

@payments_bp.route('/deposit', methods=['POST'])
@require_token
def deposit_funds():
    # Simulates depositing money to dashboard wallet (useful for freelancers/clients)
    data = request.get_json() or {}
    amount = data.get('amount')
    
    if amount is None:
        return jsonify({'message': 'Amount is required'}), 400
        
    try:
        val = float(amount)
        if val <= 0:
            return jsonify({'message': 'Amount must be greater than zero'}), 400
    except ValueError:
        return jsonify({'message': 'Invalid amount format'}), 400
        
    tx_id = insert_db(
        "INSERT INTO transactions (user_id, amount, type, description) VALUES (?, ?, 'deposit', ?)",
        (g.user_id, val, "Simulated wallet deposit")
    )
    
    return jsonify({
        'message': 'Simulated deposit successful',
        'transaction_id': tx_id
    }), 200

@payments_bp.route('/withdraw', methods=['POST'])
@require_role('freelancer')
def withdraw_funds():
    # Simulates withdrawing money from freelancing wallet balance
    data = request.get_json() or {}
    amount = data.get('amount')
    
    if amount is None:
        return jsonify({'message': 'Amount is required'}), 400
        
    try:
        val = float(amount)
        if val <= 0:
            return jsonify({'message': 'Amount must be greater than zero'}), 400
    except ValueError:
        return jsonify({'message': 'Invalid amount format'}), 400
        
    # Check current balance
    balance = 0.0
    bal_row = query_db(
        "SELECT SUM(amount) as bal FROM transactions WHERE user_id = ? AND status = 'Completed'",
        (g.user_id,), one=True
    )
    if bal_row and bal_row['bal'] is not None:
        balance = bal_row['bal']
        
    if val > balance:
        return jsonify({'message': 'Insufficient funds for withdrawal'}), 400
        
    tx_id = insert_db(
        "INSERT INTO transactions (user_id, amount, type, status, description) VALUES (?, ?, 'withdrawal', 'Pending', ?)",
        (g.user_id, -val, "Simulated bank withdrawal request")
    )
    
    # Notify admin
    admins = query_db("SELECT id FROM users WHERE role = 'admin'")
    for admin in admins:
        insert_db(
            "INSERT INTO notifications (user_id, type, message) VALUES (?, 'payment', ?)",
            (admin['id'], f"Withdrawal request of ${val:.2f} submitted by freelancer {g.user_email}")
        )
        
    return jsonify({
        'message': 'Withdrawal request submitted for approval',
        'transaction_id': tx_id
    }), 200

@payments_bp.route('/withdrawals/<int:tx_id>/approve', methods=['POST'])
@require_role('admin')
def approve_withdrawal(tx_id):
    tx = query_db("SELECT * FROM transactions WHERE id = ? AND type = 'withdrawal'", (tx_id,), one=True)
    if not tx:
        return jsonify({'message': 'Withdrawal transaction not found'}), 404
        
    if tx['status'] == 'Completed':
        return jsonify({'message': 'Withdrawal is already approved'}), 400
        
    modify_db(
        "UPDATE transactions SET status = 'Completed' WHERE id = ?", (tx_id,)
    )
    
    # Notify freelancer
    insert_db(
        "INSERT INTO notifications (user_id, type, message) VALUES (?, 'payment', ?)",
        (tx['user_id'], f"Your withdrawal request of ${abs(tx['amount']):.2f} has been approved and processed.")
    )
    
    return jsonify({'message': 'Withdrawal request approved successfully'}), 200
