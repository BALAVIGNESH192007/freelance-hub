// Dashboards View Module (Admin, Client, Freelancer dashboards)
import Api from '../api.js';
import Store from '../store.js';
import { showToast } from '../router.js';
import { renderLineChart, renderBarChart } from '../components/charts.js';
import { formatNumber, formatDate } from '../utils.js';

export async function renderDashboard(container) {
    const role = Store.getUserRole();

    // Core Layout Wrapper
    container.innerHTML = `
        <div class="dashboard-wrapper page-fade-in">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
                <div>
                    <h1 style="font-size: 28px;">Hello, ${Store.user.full_name}</h1>
                    <p style="color: var(--text-secondary); font-size: 14px;">Welcome back to your Freelance Hub ${role} dashboard.</p>
                </div>
                <div id="dashboard-actions"></div>
            </div>
            
            <div id="dashboard-content">
                <div class="loading-spinner-container"><div class="spinner"></div></div>
            </div>
        </div>
    `;

    const contentDiv = document.getElementById('dashboard-content');
    const actionsDiv = document.getElementById('dashboard-actions');

    if (role === 'admin') {
        await loadAdminDashboard(contentDiv, actionsDiv);
    } else if (role === 'client') {
        await loadClientDashboard(contentDiv, actionsDiv);
    } else {
        await loadFreelancerDashboard(contentDiv, actionsDiv);
    }
}

// -------------------------------------------------------------
// ADMIN DASHBOARD
// -------------------------------------------------------------
async function loadAdminDashboard(contentEl, actionsEl) {
    const res = await Api.get('/reports/admin');
    if (!res.ok) {
        contentEl.innerHTML = `<p class="text-danger">${res.error}</p>`;
        return;
    }

    const { counts, financials, user_growth, project_trends } = res.data;

    // Admin header actions
    actionsEl.innerHTML = `
        <a href="#projects" class="btn btn-secondary"><i class="fas fa-search"></i> Inspect Projects</a>
    `;

    // Render HTML structure
    contentEl.innerHTML = `
        <!-- Metrics Stats -->
        <div class="stats-grid">
            <div class="card card-stat">
                <div class="stat-lbl">Freelancers</div>
                <div class="stat-val">${counts.freelancer}</div>
                <div class="stat-icon"><i class="fas fa-users-cog"></i></div>
            </div>
            <div class="card card-stat">
                <div class="stat-lbl">Clients</div>
                <div class="stat-val">${counts.client}</div>
                <div class="stat-icon"><i class="fas fa-building"></i></div>
            </div>
            <div class="card card-stat stat-success">
                <div class="stat-lbl">Transaction Volume</div>
                <div class="stat-val">$${formatNumber(financials.total_transaction_volume, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                <div class="stat-icon"><i class="fas fa-exchange-alt"></i></div>
            </div>
            <div class="card card-stat stat-accent">
                <div class="stat-lbl">Platform Revenue (5%)</div>
                <div class="stat-val">$${formatNumber(financials.estimated_platform_revenue, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                <div class="stat-icon"><i class="fas fa-piggy-bank"></i></div>
            </div>
        </div>

        <div class="stats-grid">
            <div class="card card-stat stat-warning">
                <div class="stat-lbl">Active Projects</div>
                <div class="stat-val">${counts.active_projects}</div>
                <div class="stat-icon"><i class="fas fa-briefcase"></i></div>
            </div>
            <div class="card card-stat">
                <div class="stat-lbl">Open Projects</div>
                <div class="stat-val">${counts.open_projects}</div>
                <div class="stat-icon"><i class="fas fa-door-open"></i></div>
            </div>
            <div class="card card-stat">
                <div class="stat-lbl">Completed Projects</div>
                <div class="stat-val">${counts.completed_projects}</div>
                <div class="stat-icon"><i class="fas fa-check-double"></i></div>
            </div>
            <div class="card card-stat stat-danger">
                <div class="stat-lbl">Funds in Escrow</div>
                <div class="stat-val">$${formatNumber(financials.escrow_balance, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                <div class="stat-icon"><i class="fas fa-vault"></i></div>
            </div>
        </div>

        <!-- Analytical Charts Row -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(450px, 1fr)); gap: 30px; margin-bottom: 40px;">
            <div class="card">
                <h3>User Growth Trend</h3>
                <p style="color: var(--text-muted); font-size: 12px; margin-bottom: 10px;">Monthly registrations (12-month log)</p>
                <div id="user-growth-chart-container" class="chart-container"></div>
            </div>
            <div class="card">
                <h3>Project Posting Trend</h3>
                <p style="color: var(--text-muted); font-size: 12px; margin-bottom: 10px;">New job listings (12-month log)</p>
                <div id="project-trend-chart-container" class="chart-container"></div>
            </div>
        </div>

        <!-- Admin Tasks: Withdrawal Approvals -->
        <div class="card">
            <h3 style="margin-bottom: 16px;"><i class="fas fa-hand-holding-usd text-warning"></i> Pending Withdrawal Requests</h3>
            <div id="withdrawals-list-container">
                <div class="loading-spinner-container"><div class="spinner"></div></div>
            </div>
        </div>
    `;

    // Render Charts asynchronously after layout mounting
    setTimeout(() => {
        renderLineChart(document.getElementById('user-growth-chart-container'), user_growth, 'month', 'signups', '');
        renderBarChart(document.getElementById('project-trend-chart-container'), project_trends, 'month', 'postings', '');
    }, 100);

    // Load and render pending withdrawals list
    await loadPendingWithdrawals();
}

async function loadPendingWithdrawals() {
    const listContainer = document.getElementById('withdrawals-list-container');
    const res = await Api.get('/payments/transactions');
    if (!res.ok) {
        listContainer.innerHTML = `<p class="text-danger">Failed to fetch transactions: ${res.error}</p>`;
        return;
    }

    const pending = res.data.filter(t => t.type === 'withdrawal' && t.status === 'Pending');
    if (pending.length === 0) {
        listContainer.innerHTML = `
            <div style="text-align: center; padding: 30px; color: var(--text-muted); font-size: 14px;">
                <i class="fas fa-check-circle text-success" style="font-size: 24px; margin-bottom: 8px;"></i>
                <p>All withdrawal requests have been processed.</p>
            </div>
        `;
        return;
    }

    let html = `
        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 14px;">
            <thead>
                <tr style="border-bottom: 1px solid var(--border-color); color: var(--text-secondary);">
                    <th style="padding: 12px;">Date</th>
                    <th style="padding: 12px;">Freelancer</th>
                    <th style="padding: 12px;">Amount</th>
                    <th style="padding: 12px;">Description</th>
                    <th style="padding: 12px; text-align: right;">Action</th>
                </tr>
            </thead>
            <tbody>
    `;

    pending.forEach(tx => {
        const date = formatDate(tx.created_at);
        html += `
            <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="padding: 12px;">${date}</td>
                <td style="padding: 12px;">
                    <strong>${tx.full_name}</strong><br>
                    <span style="font-size: 11px; color: var(--text-muted);">${tx.email}</span>
                </td>
                <td style="padding: 12px; font-weight: 600; color: var(--danger-color);">$${Math.abs(tx.amount).toFixed(2)}</td>
                <td style="padding: 12px; color: var(--text-secondary);">${tx.description}</td>
                <td style="padding: 12px; text-align: right;">
                    <button class="btn btn-primary btn-sm approve-withdraw-btn" data-id="${tx.id}">Approve Payout</button>
                </td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    listContainer.innerHTML = html;

    // Bind Approve buttons
    listContainer.querySelectorAll('.approve-withdraw-btn').forEach(btn => {
        btn.addEventListener('click', async() => {
            const txId = btn.getAttribute('data-id');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Processing...';

            const approveRes = await Api.post(`/payments/withdrawals/${txId}/approve`, {});
            if (approveRes.ok) {
                showToast('Withdrawal approved and funds released!', 'success');
                await loadPendingWithdrawals();
                // Reload dashboard numbers
                renderDashboard(document.getElementById('app-viewport'));
            } else {
                showToast(approveRes.error, 'danger');
                btn.disabled = false;
                btn.textContent = 'Approve Payout';
            }
        });
    });
}

// -------------------------------------------------------------
// CLIENT DASHBOARD
// -------------------------------------------------------------
async function loadClientDashboard(contentEl, actionsEl) {
    const res = await Api.get('/reports/client');
    const profileRes = await Api.get('/profile');
    if (!res.ok || !profileRes.ok) {
        contentEl.innerHTML = `<p class="text-danger">${res.error || profileRes.error}</p>`;
        return;
    }

    const { posted_count, active_contracts_count, hired_freelancers_count, total_spent, spending_history } = res.data;

    // Header actions
    actionsEl.innerHTML = `
        <button id="post-job-btn" class="btn btn-primary"><i class="fas fa-plus"></i> Post a Project</button>
    `;

    contentEl.innerHTML = `
        <!-- Metrics Stats -->
        <div class="stats-grid">
            <div class="card card-stat stat-accent">
                <div class="stat-lbl">Active Contracts</div>
                <div class="stat-val">${active_contracts_count}</div>
                <div class="stat-icon"><i class="fas fa-file-signature"></i></div>
            </div>
            <div class="card card-stat">
                <div class="stat-lbl">Total Job Postings</div>
                <div class="stat-val">${posted_count}</div>
                <div class="stat-icon"><i class="fas fa-bullhorn"></i></div>
            </div>
            <div class="card card-stat">
                <div class="stat-lbl">Freelancers Hired</div>
                <div class="stat-val">${hired_freelancers_count}</div>
                <div class="stat-icon"><i class="fas fa-handshake"></i></div>
            </div>
            <div class="card card-stat stat-success">
                <div class="stat-lbl">Total Spending</div>
                <div class="stat-val">$${formatNumber(total_spent, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                <div class="stat-icon"><i class="fas fa-file-invoice-dollar"></i></div>
            </div>
        </div>

        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 30px; margin-bottom: 40px;">
            <!-- Hired Jobs list -->
            <div class="card">
                <h3 style="margin-bottom: 16px;"><i class="fas fa-briefcase text-primary"></i> Active Project Agreements</h3>
                <div id="active-agreements-container">
                    <div class="loading-spinner-container"><div class="spinner"></div></div>
                </div>
            </div>
            
            <!-- Spending History Chart -->
            <div class="card">
                <h3>Spending History</h3>
                <p style="color: var(--text-muted); font-size: 11px; margin-bottom: 10px;">Monthly expense chart</p>
                <div id="spending-chart-container" class="chart-container" style="height: 200px;"></div>
            </div>
        </div>

        <!-- Post Job Modal -->
        <div id="post-job-modal" class="modal">
            <div class="modal-content">
                <button class="modal-close" id="close-post-modal-btn">&times;</button>
                <h2 style="margin-bottom: 20px;"><i class="fas fa-clipboard-list text-primary"></i> Post New Project</h2>
                <form id="post-project-form">
                    <div class="form-group">
                        <label class="form-label" for="proj-title">Project Title</label>
                        <input type="text" id="proj-title" class="form-input" placeholder="e.g. Design a Landing Page for SaaS" required>
                    </div>
                    
                    <div class="form-group" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                        <div>
                            <label class="form-label" for="proj-category">Category</label>
                            <select id="proj-category" class="form-select" required>
                                <option value="Web Development">Web Development</option>
                                <option value="Mobile Apps">Mobile Apps</option>
                                <option value="UI/UX Design">UI/UX Design</option>
                                <option value="Content Writing">Content Writing</option>
                                <option value="Digital Marketing">Digital Marketing</option>
                            </select>
                        </div>
                        <div>
                            <label class="form-label" for="proj-budget">Budget ($)</label>
                            <input type="number" id="proj-budget" class="form-input" placeholder="e.g. 500" min="5" required>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label" for="proj-deadline">Project Deadline</label>
                        <input type="date" id="proj-deadline" class="form-input" required>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label" for="proj-desc">Project Description</label>
                        <textarea id="proj-desc" class="form-textarea" placeholder="Detail the scope of work, key milestones, and required skills tags..." required></textarea>
                    </div>
                    
                    <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 10px;">Post Listing</button>
                </form>
            </div>
        </div>
    `;

    // Render chart
    setTimeout(() => {
        renderBarChart(document.getElementById('spending-chart-container'), spending_history, 'month', 'amount', '$');
    }, 100);

    // Bind modal actions
    const modal = document.getElementById('post-job-modal');
    const openBtn = document.getElementById('post-job-btn');
    const closeBtn = document.getElementById('close-post-modal-btn');
    const form = document.getElementById('post-project-form');

    openBtn.addEventListener('click', () => modal.classList.add('active'));
    closeBtn.addEventListener('click', () => modal.classList.remove('active'));

    // Set default deadline date (1 week from today)
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    document.getElementById('proj-deadline').value = nextWeek.toISOString().split('T')[0];

    form.addEventListener('submit', async(e) => {
        e.preventDefault();

        const title = document.getElementById('proj-title').value;
        const category = document.getElementById('proj-category').value;
        const budget = document.getElementById('proj-budget').value;
        const deadline = document.getElementById('proj-deadline').value;
        const description = document.getElementById('proj-desc').value;

        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Posting...';

        const postRes = await Api.post('/projects', { title, category, budget, deadline, description });

        if (postRes.ok) {
            showToast('Project listing posted successfully!', 'success');
            modal.classList.remove('active');
            form.reset();
            // Reload page
            await renderDashboard(document.getElementById('app-viewport'));
        } else {
            showToast(postRes.error, 'danger');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Post Listing';
        }
    });

    await loadClientAgreements();
}

async function loadClientAgreements() {
    const container = document.getElementById('active-agreements-container');
    // Fetch projects list (where client is owner)
    // For simplicity, fetch projects filtering by Client's own projects
    const res = await Api.get('/projects?status=All');
    if (!res.ok) {
        container.innerHTML = `<p class="text-danger">Failed to fetch agreements: ${res.error}</p>`;
        return;
    }

    const myProjects = res.data.filter(p => p.client_id === Store.user.id);
    if (myProjects.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-muted); font-size: 14px;">
                <i class="fas fa-briefcase" style="font-size: 32px; margin-bottom: 12px; opacity: 0.5;"></i>
                <p>No active project contracts posted yet.</p>
            </div>
        `;
        return;
    }

    let html = `
        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 14px;">
            <thead>
                <tr style="border-bottom: 1px solid var(--border-color); color: var(--text-secondary);">
                    <th style="padding: 12px;">Project</th>
                    <th style="padding: 12px;">Budget</th>
                    <th style="padding: 12px;">Status</th>
                    <th style="padding: 12px; text-align: right;">Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    myProjects.forEach(proj => {
        let statusBadge = `<span class="badge">${proj.status}</span>`;
        if (proj.status === 'Open') statusBadge = `<span class="badge badge-info">Open</span>`;
        if (proj.status === 'In Progress') statusBadge = `<span class="badge badge-warning">Active</span>`;
        if (proj.status === 'Completed') statusBadge = `<span class="badge badge-success">Completed</span>`;

        html += `
            <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="padding: 12px;">
                    <a href="#projects?id=${proj.id}" style="font-weight: 600; display: block;">${proj.title}</a>
                    <span style="font-size: 11px; color: var(--text-muted);">Deadline: ${formatDate(proj.deadline)}</span>
                </td>
                <td style="padding: 12px; font-weight: 500;">$${proj.budget.toFixed(2)}</td>
                <td style="padding: 12px;">${statusBadge}</td>
                <td style="padding: 12px; text-align: right; display: flex; gap: 8px; justify-content: flex-end;">
                    <a href="#projects?id=${proj.id}" class="btn btn-secondary btn-sm" title="View details"><i class="fas fa-search"></i> Details</a>
                </td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
}

// -------------------------------------------------------------
// FREELANCER DASHBOARD
// -------------------------------------------------------------
async function loadFreelancerDashboard(contentEl, actionsEl) {
    const res = await Api.get('/reports/freelancer');
    const profileRes = await Api.get('/profile');
    if (!res.ok || !profileRes.ok) {
        contentEl.innerHTML = `<p class="text-danger">${res.error || profileRes.error}</p>`;
        return;
    }

    const { applied_count, ongoing_count, completed_count, total_earnings, total_withdrawn, earnings_history } = res.data;
    const balance = profileRes.data.balance;

    // Header actions
    actionsEl.innerHTML = `
        <a href="#projects" class="btn btn-primary"><i class="fas fa-search-dollar"></i> Search Job Postings</a>
    `;

    contentEl.innerHTML = `
        <!-- Metrics Stats -->
        <div class="stats-grid">
            <div class="card card-stat stat-accent">
                <div class="stat-lbl">Active Contracts</div>
                <div class="stat-val">${ongoing_count}</div>
                <div class="stat-icon"><i class="fas fa-laptop-code"></i></div>
            </div>
            <div class="card card-stat">
                <div class="stat-lbl">Bids Submitted</div>
                <div class="stat-val">${applied_count}</div>
                <div class="stat-icon"><i class="fas fa-paper-plane"></i></div>
            </div>
            <div class="card card-stat">
                <div class="stat-lbl">Completed Projects</div>
                <div class="stat-val">${completed_count}</div>
                <div class="stat-icon"><i class="fas fa-award"></i></div>
            </div>
            <div class="card card-stat stat-success">
                <div class="stat-lbl">Total Revenue</div>
                <div class="stat-val">$${formatNumber(total_earnings, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                <div class="stat-icon"><i class="fas fa-wallet"></i></div>
            </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 40px;">
            <!-- Wallet Card with withdrawal simulator -->
            <div class="card" style="border-left: 4px solid var(--success-color);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                    <div>
                        <span class="stat-lbl">Available Wallet Balance</span>
                        <h2 style="font-size: 38px; color: var(--success-color); font-family: var(--font-title); margin-top: 4px;">
                            $${formatNumber(balance, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </h2>
                    </div>
                    <i class="fas fa-university text-success" style="font-size: 32px; opacity: 0.2;"></i>
                </div>
                
                <h4 style="margin-bottom: 12px; font-size: 14px;">Simulate Payout Transfer</h4>
                <form id="withdraw-form" style="display: flex; gap: 12px;">
                    <div style="position: relative; flex: 1;">
                        <span style="position: absolute; left: 12px; top: 10px; color: var(--text-muted);">$</span>
                        <input type="number" id="withdraw-amount" class="form-input" style="padding-left: 24px; padding-top: 8px; padding-bottom: 8px;" placeholder="Amount" min="5" max="${balance}" step="any" required>
                    </div>
                    <button type="submit" class="btn btn-success" style="padding: 8px 16px;">Withdraw</button>
                </form>
            </div>
            
            <!-- Earnings History Chart -->
            <div class="card">
                <h3>Earnings Trend</h3>
                <p style="color: var(--text-muted); font-size: 11px; margin-bottom: 10px;">Monthly wallet deposit credits</p>
                <div id="earnings-chart-container" class="chart-container" style="height: 200px;"></div>
            </div>
        </div>

        <!-- Hired Agreements list -->
        <div class="card">
            <h3 style="margin-bottom: 16px;"><i class="fas fa-file-contract text-primary"></i> Hired Projects & Contracts</h3>
            <div id="freelancer-agreements-container">
                <div class="loading-spinner-container"><div class="spinner"></div></div>
            </div>
        </div>
    `;

    // Render chart
    setTimeout(() => {
        renderLineChart(document.getElementById('earnings-chart-container'), earnings_history, 'month', 'amount', '$');
    }, 100);

    // Bind withdrawal form
    const withdrawForm = document.getElementById('withdraw-form');
    withdrawForm.addEventListener('submit', async(e) => {
        e.preventDefault();

        const amount = document.getElementById('withdraw-amount').value;
        const submitBtn = withdrawForm.querySelector('button[type="submit"]');

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i>';

        const withdrawRes = await Api.post('/payments/withdraw', { amount });

        if (withdrawRes.ok) {
            showToast('Simulated withdrawal submitted for Admin approval!', 'success');
            withdrawForm.reset();
            // Reload page to reflect updated numbers
            await renderDashboard(document.getElementById('app-viewport'));
        } else {
            showToast(withdrawRes.error, 'danger');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Withdraw';
        }
    });

    await loadFreelancerAgreements();
}

async function loadFreelancerAgreements() {
    const container = document.getElementById('freelancer-agreements-container');
    const res = await Api.get('/projects?status=All');
    if (!res.ok) {
        container.innerHTML = `<p class="text-danger">Failed to fetch agreements: ${res.error}</p>`;
        return;
    }

    // In projects endpoint, we get project contracts. To find freelancer contracts, 
    // we can request details, or fetch them manually. Let's see: we can filter projects by 
    // applications that have status 'Hired' or contracts that match.
    // Fetching the user's invoices/contracts is also easy. Let's query contracts by project list 
    // or look at active invoices. Let's query list of project contracts.
    // Since projects endpoint returns client projects, let's fetch projects, and for each project, we check applications.
    // However, since we have the projects list, we can run a loop, or fetch public projects where status is NOT Open, 
    // and verify if freelancer is associated.
    // Let's call invoice listing to find projects freelancer is hired for.
    // An invoice GET request lists freelancer's invoices, which contains `project_title`, `contract_id`, `amount`, and `status`.
    // That gives us exactly what projects they are hired for!
    const invoiceRes = await Api.get('/payments/invoices');
    if (!invoiceRes.ok) {
        container.innerHTML = `<p class="text-danger">Failed to fetch agreements: ${invoiceRes.error}</p>`;
        return;
    }

    // De-duplicate contracts from invoices list
    const contractsMap = {};
    invoiceRes.data.forEach(inv => {
        contractsMap[inv.contract_id] = {
            id: inv.contract_id,
            project_id: inv.project_id,
            title: inv.project_title,
            client_name: inv.client_name,
            budget: inv.amount,
            status: inv.status === 'Paid' ? 'In Progress' : 'Awaiting Payment'
        };
    });

    const contractsList = Object.values(contractsMap);
    if (contractsList.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-muted); font-size: 14px;">
                <i class="fas fa-file-signature" style="font-size: 32px; margin-bottom: 12px; opacity: 0.5;"></i>
                <p>You have not been hired for any project contracts yet.</p>
            </div>
        `;
        return;
    }

    let html = `
        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 14px;">
            <thead>
                <tr style="border-bottom: 1px solid var(--border-color); color: var(--text-secondary);">
                    <th style="padding: 12px;">Project</th>
                    <th style="padding: 12px;">Client</th>
                    <th style="padding: 12px;">Contract Value</th>
                    <th style="padding: 12px;">Contract Status</th>
                    <th style="padding: 12px; text-align: right;">Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    contractsList.forEach(c => {
        let statusBadge = `<span class="badge">${c.status}</span>`;
        if (c.status === 'In Progress') statusBadge = `<span class="badge badge-warning">Active Work</span>`;
        if (c.status === 'Awaiting Payment') statusBadge = `<span class="badge">Escrow Pending</span>`;

        html += `
            <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="padding: 12px;">
                    <a href="#projects?id=${c.project_id}" style="font-weight: 600; display: block;">${c.title}</a>
                </td>
                <td style="padding: 12px;">${c.client_name}</td>
                <td style="padding: 12px; font-weight: 500;">$${c.budget.toFixed(2)}</td>
                <td style="padding: 12px;">${statusBadge}</td>
                <td style="padding: 12px; text-align: right; display: flex; gap: 8px; justify-content: flex-end;">
                    <a href="#projects?id=${c.project_id}" class="btn btn-secondary btn-sm"><i class="fas fa-search"></i> Details</a>
                </td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
}