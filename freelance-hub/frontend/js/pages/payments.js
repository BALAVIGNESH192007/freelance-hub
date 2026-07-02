// Payments & Financials View Module
import Api from '../api.js';
import Store from '../store.js';
import { showToast } from '../router.js';
import { formatNumber, formatDate } from '../utils.js';

export async function renderPayments(container) {
    const role = Store.getUserRole();
    const profileRes = await Api.get('/profile');
    if (!profileRes.ok) {
        container.innerHTML = `<p class="text-danger">${profileRes.error}</p>`;
        return;
    }

    const balance = profileRes.data.balance;

    container.innerHTML = `
        <div class="payments-page page-fade-in" style="max-width: 1000px; margin: 0 auto;">
            <div style="margin-bottom: 30px;">
                <h2>Financial Ledger</h2>
                <p style="color: var(--text-secondary); font-size: 14px;">Audit transaction logs, invoice processing status, and wallet holdings</p>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 30px; margin-bottom: 40px; align-items: start;">
                <!-- Wallet holdings details -->
                <div>
                    <div class="card" style="border-left: 4px solid var(--primary-color);">
                        <span class="stat-lbl">Wallet Holdings</span>
                        <h2 style="font-size: 36px; margin: 8px 0; color: var(--primary-color); font-family: var(--font-title); font-weight: 700;">
                            $${formatNumber(balance, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </h2>
                        
                        ${role === 'client' ? `
                            <form id="wallet-deposit-form" style="border-top: 1px solid var(--border-color); padding-top: 20px; margin-top: 20px;">
                                <h4 style="margin-bottom: 12px; font-size: 13.5px;"><i class="fas fa-plus-circle text-primary"></i> Simulated Deposit</h4>
                                <div class="form-group">
                                    <input type="number" id="deposit-amount" class="form-input" placeholder="Amount ($)" min="10" required>
                                </div>
                                <button type="submit" class="btn btn-primary btn-sm" style="width: 100%;">Fund Account</button>
                            </form>
                        ` : ''}

                        ${role === 'freelancer' ? `
                            <div style="border-top: 1px solid var(--border-color); padding-top: 20px; margin-top: 20px;">
                                <h4 style="margin-bottom: 12px; font-size: 13.5px;"><i class="fas fa-university text-success"></i> Withdraw Earnings</h4>
                                <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 12px;">Funds are wired directly to your linked bank account after admin confirmation.</p>
                                <a href="#dashboard" class="btn btn-success btn-sm" style="display: block; text-align: center;">Submit Withdrawal Request</a>
                            </div>
                        ` : ''}
                    </div>
                </div>

                <!-- Active Invoices Section -->
                <div>
                    <div class="card">
                        <h3 style="margin-bottom: 20px;"><i class="fas fa-file-invoice-dollar text-primary"></i> Invoices</h3>
                        <div id="invoices-list-container">
                            <div class="loading-spinner-container"><div class="spinner"></div></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Full Transaction Logs Ledger -->
            <div class="card">
                <h3 style="margin-bottom: 20px;"><i class="fas fa-history text-primary"></i> Full Transaction Ledger</h3>
                <div id="transactions-list-container">
                    <div class="loading-spinner-container"><div class="spinner"></div></div>
                </div>
            </div>
        </div>
    `;

    // Bind deposit form if Client
    if (role === 'client') {
        const depositForm = document.getElementById('wallet-deposit-form');
        depositForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const amount = document.getElementById('deposit-amount').value;
            const submitBtn = depositForm.querySelector('button[type="submit"]');
            
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i>';
            
            const depRes = await Api.post('/payments/deposit', { amount });
            if (depRes.ok) {
                showToast('Simulated deposit successful!', 'success');
                depositForm.reset();
                await renderPayments(container);
            } else {
                showToast(depRes.error, 'danger');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Fund Account';
            }
        });
    }

    await loadInvoices();
    await loadTransactions();
}

async function loadInvoices() {
    const container = document.getElementById('invoices-list-container');
    const res = await Api.get('/payments/invoices');
    if (!res.ok) {
        container.innerHTML = `<p class="text-danger">${res.error}</p>`;
        return;
    }

    const invoices = res.data;
    if (invoices.length === 0) {
        container.innerHTML = `
            <p style="color: var(--text-muted); font-size: 13.5px; text-align: center; padding: 20px 0;">No active invoice records logs found.</p>
        `;
        return;
    }

    let html = `
        <div style="display: flex; flex-direction: column; gap: 16px;">
    `;

    invoices.forEach(inv => {
        const date = formatDate(inv.created_at);
        const isClient = Store.getUserRole() === 'client';
        const isPending = inv.status === 'Pending';
        
        let statusBadge = `<span class="badge badge-success">Paid</span>`;
        if (isPending) statusBadge = `<span class="badge badge-warning">Pending Payment</span>`;
        
        let payActionHTML = '';
        if (isPending && isClient) {
            payActionHTML = `
                <button class="btn btn-primary btn-sm pay-invoice-btn" data-id="${inv.id}" style="margin-top: 10px;">
                    <i class="fas fa-wallet"></i> Pay Escrow Invoice
                </button>
            `;
        }

        html += `
            <div style="border: 1px solid var(--border-color); padding: 16px; border-radius: var(--radius-md); background-color: var(--surface-color);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                    <div>
                        <strong style="font-size: 14.5px;">${inv.project_title}</strong>
                        <p style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Invoice #${inv.id} • Posted on ${date}</p>
                    </div>
                    <span style="font-size: 18px; font-weight: 700; color: var(--text-color); font-family: var(--font-title);">$${inv.amount.toFixed(2)}</span>
                </div>
                
                <p style="font-size: 13px; color: var(--text-secondary); line-height: 1.4;">${inv.description}</p>
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px; border-top: 1px dashed var(--border-color); padding-top: 10px; font-size: 12px;">
                    <div>
                        ${isClient 
                            ? `Contract with: <strong>${inv.freelancer_name}</strong>`
                            : `Client name: <strong>${inv.client_name}</strong>`
                        }
                    </div>
                    ${statusBadge}
                </div>
                ${payActionHTML}
            </div>
        `;
    });

    html += `</div>`;
    container.innerHTML = html;

    // Bind pay invoice buttons
    container.querySelectorAll('.pay-invoice-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const invId = btn.getAttribute('data-id');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Processing Payment...';
            
            const payRes = await Api.post(`/payments/invoices/${invId}/pay`, {});
            if (payRes.ok) {
                showToast('Escrow invoice paid! Funds stored in system holdings.', 'success');
                // Reload dashboard state
                renderPayments(document.getElementById('app-viewport'));
            } else {
                showToast(payRes.error, 'danger');
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-wallet"></i> Pay Escrow Invoice';
            }
        });
    });
}

async function loadTransactions() {
    const container = document.getElementById('transactions-list-container');
    const res = await Api.get('/payments/transactions');
    if (!res.ok) {
        container.innerHTML = `<p class="text-danger">${res.error}</p>`;
        return;
    }

    const txs = res.data;
    if (txs.length === 0) {
        container.innerHTML = `
            <p style="color: var(--text-muted); font-size: 13.5px; text-align: center; padding: 30px 0;">No financial ledger transactions recorded.</p>
        `;
        return;
    }

    let html = `
        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 14px;">
            <thead>
                <tr style="border-bottom: 1px solid var(--border-color); color: var(--text-secondary);">
                    <th style="padding: 12px;">Date</th>
                    ${Store.getUserRole() === 'admin' ? '<th style="padding: 12px;">User</th>' : ''}
                    <th style="padding: 12px;">Type</th>
                    <th style="padding: 12px;">Amount</th>
                    <th style="padding: 12px;">Description</th>
                    <th style="padding: 12px;">Status</th>
                </tr>
            </thead>
            <tbody>
    `;

    txs.forEach(t => {
        const date = formatDate(t.created_at);
        const amtVal = Number(t.amount);
        const isPositive = amtVal > 0;
        
        let amtColor = isPositive ? 'var(--success-color)' : 'var(--danger-color)';
        let typeBadge = `<span class="badge">${t.type}</span>`;
        if (t.type === 'deposit') typeBadge = `<span class="badge badge-success">deposit</span>`;
        if (t.type === 'earning') typeBadge = `<span class="badge badge-info">earning</span>`;
        if (t.type === 'withdrawal') typeBadge = `<span class="badge badge-danger">withdrawal</span>`;
        if (t.type === 'payment') typeBadge = `<span class="badge badge-warning">payment</span>`;

        let statusText = `<span style="color:var(--success-color); font-weight:600;"><i class="fas fa-check-circle"></i> Success</span>`;
        if (t.status === 'Pending') {
            statusText = `<span style="color:var(--warning-color); font-weight:600;"><i class="fas fa-clock"></i> Pending</span>`;
        } else if (t.status === 'Failed') {
            statusText = `<span style="color:var(--danger-color); font-weight:600;"><i class="fas fa-times-circle"></i> Failed</span>`;
        }

        html += `
            <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="padding: 12px;">${date}</td>
                ${Store.getUserRole() === 'admin' ? `
                    <td style="padding: 12px;">
                        <strong>${t.full_name}</strong><br>
                        <span style="font-size: 11px; color: var(--text-muted);">${t.role.toUpperCase()} • ${t.email}</span>
                    </td>
                ` : ''}
                <td style="padding: 12px;">${typeBadge}</td>
                <td style="padding: 12px; font-weight: 700; color: ${amtColor}; font-family: var(--font-title);">
                    ${isPositive ? '+' : ''}$${amtVal.toFixed(2)}
                </td>
                <td style="padding: 12px; color: var(--text-secondary);">${t.description}</td>
                <td style="padding: 12px;">${statusText}</td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
}