// Projects & Freelancers Browser Views Module
import Api from '../api.js';
import Store from '../store.js';
import { showToast } from '../router.js';
import { formatNumber, formatDate } from '../utils.js';

// -------------------------------------------------------------
// PROJECT BROWSER & LISTINGS
// -------------------------------------------------------------
export async function renderProjects(container, params) {
    const projectId = params ? params.id : null;

    if (projectId) {
        await renderProjectDetails(container, projectId);
    } else {
        await renderProjectBrowser(container, params);
    }
}

async function renderProjectBrowser(container, params) {
    const defaultSearch = params ? (params.search || '') : '';

    container.innerHTML = `
        <div class="projects-browser page-fade-in">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <div>
                    <h2>Explore Open Projects</h2>
                    <p style="color: var(--text-secondary); font-size: 14px;">Find remote contracts matching your skillset</p>
                </div>
                ${Store.getUserRole() === 'client' ? '<a href="#dashboard" class="btn btn-primary"><i class="fas fa-plus"></i> Post project</a>' : ''}
            </div>

            <!-- Search & Filters Container -->
            <div class="card" style="margin-bottom: 30px;">
                <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 16px; align-items: flex-end;">
                    <div class="form-group" style="margin-bottom: 0;">
                        <label class="form-label" for="search-input">Search Title or Keyword</label>
                        <div style="position: relative;">
                            <input type="text" id="search-input" class="form-input" style="padding-left: 36px;" placeholder="e.g. website, logo, copywriting..." value="${defaultSearch}">
                            <i class="fas fa-search" style="position: absolute; left: 14px; top: 15px; color: var(--text-muted);"></i>
                        </div>
                    </div>
                    
                    <div class="form-group" style="margin-bottom: 0;">
                        <label class="form-label" for="filter-category">Category</label>
                        <select id="filter-category" class="form-select">
                            <option value="">All Categories</option>
                            <option value="Web Development">Web Development</option>
                            <option value="Mobile Apps">Mobile Apps</option>
                            <option value="UI/UX Design">UI/UX Design</option>
                            <option value="Content Writing">Content Writing</option>
                            <option value="Digital Marketing">Digital Marketing</option>
                        </select>
                    </div>

                    <div class="form-group" style="margin-bottom: 0;">
                        <label class="form-label" for="filter-min-budget">Min Budget ($)</label>
                        <input type="number" id="filter-min-budget" class="form-input" placeholder="e.g. 100">
                    </div>

                    <div class="form-group" style="margin-bottom: 0;">
                        <button id="apply-filters-btn" class="btn btn-primary" style="width: 100%;"><i class="fas fa-filter"></i> Apply Filters</button>
                    </div>
                </div>
            </div>

            <!-- Project Results List -->
            <div id="project-results-list" style="display: flex; flex-direction: column; gap: 20px;">
                <div class="loading-spinner-container"><div class="spinner"></div></div>
            </div>
        </div>
    `;

    const applyFiltersBtn = document.getElementById('apply-filters-btn');
    const searchInput = document.getElementById('search-input');
    const categorySelect = document.getElementById('filter-category');
    const minBudgetInput = document.getElementById('filter-min-budget');

    const loadFilteredProjects = async() => {
        const queryList = [];
        if (searchInput.value.trim()) queryList.push(`search=${encodeURIComponent(searchInput.value.trim())}`);
        if (categorySelect.value) queryList.push(`category=${encodeURIComponent(categorySelect.value)}`);
        if (minBudgetInput.value.trim()) queryList.push(`min_budget=${minBudgetInput.value.trim()}`);

        // Only load open listings by default
        queryList.push('status=Open');

        const queryString = queryList.length > 0 ? `?${queryList.join('&')}` : '';

        const listDiv = document.getElementById('project-results-list');
        listDiv.innerHTML = '<div class="loading-spinner-container"><div class="spinner"></div></div>';

        const res = await Api.get(`/projects${queryString}`);
        if (res.ok) {
            renderProjectsList(listDiv, res.data);
        } else {
            listDiv.innerHTML = `<p class="text-danger">Error fetching projects: ${res.error}</p>`;
        }
    };

    applyFiltersBtn.addEventListener('click', loadFilteredProjects);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') loadFilteredProjects();
    });

    // Execute first search
    await loadFilteredProjects();
}

function renderProjectsList(container, projects) {
    if (projects.length === 0) {
        container.innerHTML = `
            <div class="card" style="text-align: center; padding: 60px 0; color: var(--text-muted);">
                <i class="fas fa-folder-open" style="font-size: 48px; margin-bottom: 16px; opacity: 0.3;"></i>
                <h3>No Open Projects Found</h3>
                <p style="margin-top: 8px;">Try broadening your keywords or resetting filters.</p>
            </div>
        `;
        return;
    }

    let html = '';
    projects.forEach(p => {
        html += `
            <div class="card card-interactive project-item" onclick="window.location.hash='#projects?id=${p.id}'">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                    <div>
                        <span class="badge badge-info" style="margin-bottom: 8px;">${p.category}</span>
                        <h3>${p.title}</h3>
                    </div>
                    <div style="text-align: right;">
                        <span style="font-size: 20px; font-weight: 700; color: var(--primary-color); font-family: var(--font-title);">$${formatNumber(p.budget)}</span>
                        <p style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Fixed Price</p>
                    </div>
                </div>
                
                <p style="color: var(--text-secondary); font-size: 14px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 20px; line-height: 1.6;">
                    ${p.description}
                </p>
                
                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 16px; font-size: 12px; color: var(--text-muted);">
                    <div>
                        <i class="fas fa-building" style="margin-right: 6px;"></i>
                        <strong>${p.company_name || p.client_name}</strong>
                    </div>
                    <div>
                        <i class="far fa-clock" style="margin-right: 6px;"></i>
                        <span>Deadline: ${formatDate(p.deadline)}</span>
                    </div>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

// -------------------------------------------------------------
// PROJECT DETAILS & OPERATIONS
// -------------------------------------------------------------
async function renderProjectDetails(container, id) {
    const res = await Api.get(`/projects/${id}`);
    if (!res.ok) {
        container.innerHTML = `<div style="text-align:center; padding:50px;"><p class="text-danger">${res.error}</p></div>`;
        return;
    }

    const { project, contract } = res.data;

    // Status Badge Render Helper
    let statusHTML = `<span class="badge">${project.status}</span>`;
    if (project.status === 'Open') statusHTML = `<span class="badge badge-info"><i class="fas fa-door-open"></i> Accepting Bids</span>`;
    if (project.status === 'In Progress') statusHTML = `<span class="badge badge-warning"><i class="fas fa-spinner fa-spin"></i> Active Work</span>`;
    if (project.status === 'Completed') statusHTML = `<span class="badge badge-success"><i class="fas fa-award"></i> Completed</span>`;

    container.innerHTML = `
        <div class="project-details page-fade-in" style="max-width: 1000px; margin: 0 auto;">
            <!-- Header section -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; border-bottom: 1px solid var(--border-color); padding-bottom: 24px;">
                <div>
                    <a href="#projects" style="font-size: 13px; font-weight: 500; display: inline-flex; align-items: center; gap: 6px; margin-bottom: 12px;">
                        <i class="fas fa-arrow-left"></i> Back to Project Browser
                    </a>
                    <h1 style="font-size: 32px; margin-bottom: 8px;">${project.title}</h1>
                    <div style="display: flex; gap: 12px; align-items: center;">
                        <span class="badge" style="background-color: var(--hover-color); color: var(--text-color);">${project.category}</span>
                        ${statusHTML}
                    </div>
                </div>
                    <div style="text-align: right;">
                        <span style="font-size: 28px; font-weight: 800; color: var(--primary-color); font-family: var(--font-title);">$${formatNumber(project.budget)}</span>
                        <p style="font-size: 12px; color: var(--text-muted);">Client Project Budget</p>
                    </div>
            </div>

            <!-- Content Grid layout -->
            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 30px;">
                <div>
                    <!-- Project Scope -->
                    <div class="card" style="margin-bottom: 30px; line-height: 1.7;">
                        <h3 style="margin-bottom: 16px;">Project Scope & Specifications</h3>
                        <div style="white-space: pre-wrap; font-size: 15px; color: var(--text-secondary);">${project.description}</div>
                    </div>

                    <!-- Dynamic Action Panel based on User Role & Status -->
                    <div id="project-action-panel">
                        <div class="loading-spinner-container"><div class="spinner"></div></div>
                    </div>
                </div>

                <!-- Client Side Card -->
                <div>
                    <div class="card" style="margin-bottom: 30px;">
                        <h4 style="margin-bottom: 12px; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; color: var(--text-muted);">Posted By Client</h4>
                        <h3>${project.company_name || project.client_name}</h3>
                        ${project.company_bio ? `<p style="font-size: 13px; color: var(--text-secondary); margin-top: 8px;">${project.company_bio}</p>` : ''}
                        
                        <div style="margin-top: 16px; border-top: 1px solid var(--border-color); padding-top: 16px; display: flex; flex-direction: column; gap: 10px; font-size: 13px; color: var(--text-secondary);">
                            <div><i class="far fa-calendar-alt" style="margin-right: 8px;"></i> Listed on: ${formatDate(project.created_at)}</div>
                            <div><i class="far fa-calendar-check" style="margin-right: 8px;"></i> Deadline: ${formatDate(project.deadline)}</div>
                        </div>

                        ${Store.isAuthenticated() && project.client_id !== Store.user.id ? `
                            <a href="#chat?receiver_id=${project.client_id}&project_id=${project.id}" class="btn btn-secondary" style="width:100%; margin-top:20px;">
                                <i class="fas fa-comments"></i> Chat with Client
                            </a>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;

    await loadProjectActionPanel(project, contract);
}

async function loadProjectActionPanel(project, contract) {
    const panel = document.getElementById('project-action-panel');
    const isOwner = Store.isAuthenticated() && project.client_id === Store.user.id;
    const isFreelancer = Store.isAuthenticated() && Store.getUserRole() === 'freelancer';
    
    // CASE 1: Open project, user is Freelancer (Can bid)
    if (project.status === 'Open' && isFreelancer) {
        // Check if already applied
        const appRes = await Api.get(`/projects/${project.id}/applications`);
        const myApp = appRes.ok ? appRes.data[0] : null; // returns matching freelancer app in route
        
        if (myApp) {
            panel.innerHTML = `
                <div class="card" style="border-left: 4px solid var(--primary-color);">
                    <h3 style="color: var(--primary-color); margin-bottom: 8px;"><i class="fas fa-check-circle"></i> Application Submitted</h3>
                    <p style="font-size: 14px; color: var(--text-secondary); margin-bottom: 12px;">You bids $${myApp.bid_amount.toFixed(2)} on this project.</p>
                    <div style="font-size: 13px; font-style: italic; background-color: var(--hover-color); padding: 12px; border-radius: var(--radius-md); color: var(--text-secondary);">
                        <strong>Your Cover Letter:</strong><br>${myApp.cover_letter}
                    </div>
                </div>
            `;
        } else {
            panel.innerHTML = `
                <div class="card">
                    <h3 style="margin-bottom: 16px;"><i class="fas fa-paper-plane text-primary"></i> Submit Project Proposal</h3>
                    <form id="submit-bid-form">
                        <div class="form-group">
                            <label class="form-label" for="bid-amount">Your Bid Amount ($)</label>
                            <input type="number" id="bid-amount" class="form-input" placeholder="e.g. 450" min="5" max="100000" value="${project.budget}" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="bid-cover">Cover Letter & Proposal details</label>
                            <textarea id="bid-cover" class="form-textarea" placeholder="Introduce yourself, explain your relevant experience, and detail how you will tackle this project..." required></textarea>
                        </div>
                        <button type="submit" class="btn btn-primary" style="width: 100%;">Submit Proposal Bid</button>
                    </form>
                </div>
            `;
            
            const form = document.getElementById('submit-bid-form');
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const bid_amount = document.getElementById('bid-amount').value;
                const cover_letter = document.getElementById('bid-cover').value;
                
                const submitBtn = form.querySelector('button[type="submit"]');
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Submitting...';
                
                const applyRes = await Api.post(`/projects/${project.id}/apply`, { bid_amount, cover_letter });
                if (applyRes.ok) {
                    showToast('Proposal bid submitted successfully!', 'success');
                    await renderProjectDetails(document.getElementById('app-viewport'), project.id);
                } else {
                    showToast(applyRes.error, 'danger');
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Submit Proposal Bid';
                }
            });
        }
    }
    // CASE 2: Open project, user is Owner client (View bids to Hire)
    else if (project.status === 'Open' && isOwner) {
        panel.innerHTML = `
            <div class="card">
                <h3 style="margin-bottom: 16px;"><i class="fas fa-clipboard-list text-primary"></i> Received Proposals</h3>
                <div id="project-proposals-list">
                    <div class="loading-spinner-container"><div class="spinner"></div></div>
                </div>
            </div>
        `;
        
        await loadProjectProposals(project.id);
    }
    // CASE 3: Active In Progress contract, client and freelancer roles
    else if (project.status === 'In Progress' && contract) {
        const isHiredFreelancer = isFreelancer && contract.freelancer_id === Store.user.id;
        
        if (isOwner) {
            panel.innerHTML = `
                <div class="card" style="border-left: 4px solid var(--warning-color);">
                    <h3 style="margin-bottom: 12px;"><i class="fas fa-spinner fa-spin text-warning"></i> Contract In Progress</h3>
                    <p style="font-size: 14px; color: var(--text-secondary); margin-bottom: 20px;">
                        Hired Freelancer: <strong>${contract.freelancer_name}</strong> for <strong>$${contract.budget.toFixed(2)}</strong>.
                    </p>
                    <div style="border-top: 1px solid var(--border-color); padding-top: 16px; display: flex; gap: 12px;">
                        <button id="complete-project-btn" class="btn btn-success"><i class="fas fa-check-double"></i> Complete & Release Escrow</button>
                        <a href="#chat?receiver_id=${contract.freelancer_id}&project_id=${project.id}" class="btn btn-secondary"><i class="fas fa-comments"></i> Chat Workspace</a>
                    </div>
                </div>
            `;
            
            document.getElementById('complete-project-btn').addEventListener('click', async () => {
                const completeRes = await Api.post(`/projects/${project.id}/complete`, {});
                if (completeRes.ok) {
                    showToast('Project completed! Funds released to freelancer.', 'success');
                    await renderProjectDetails(document.getElementById('app-viewport'), project.id);
                } else {
                    showToast(completeRes.error, 'danger');
                }
            });
        } else if (isHiredFreelancer) {
            panel.innerHTML = `
                <div class="card" style="border-left: 4px solid var(--warning-color);">
                    <h3 style="margin-bottom: 12px;"><i class="fas fa-laptop-code text-warning"></i> You are Hired!</h3>
                    <p style="font-size: 14px; color: var(--text-secondary); margin-bottom: 20px;">
                        Contract value: <strong>$${contract.budget.toFixed(2)}</strong> (escrow funds guaranteed by client payment).
                    </p>
                    
                    <form id="submit-work-form" style="border-top: 1px solid var(--border-color); padding-top: 20px;">
                        <h4 style="margin-bottom: 10px;">Submit Completed Work</h4>
                        <div class="form-group">
                            <textarea id="work-notes" class="form-textarea" placeholder="Provide delivery details (e.g. GitHub repos, design drive folders, zip references)..." required></textarea>
                        </div>
                        <button type="submit" class="btn btn-success"><i class="fas fa-cloud-upload-alt"></i> Deliver Project Work</button>
                    </form>
                </div>
            `;
            
            const workForm = document.getElementById('submit-work-form');
            workForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const notes = document.getElementById('work-notes').value;
                const submitBtn = workForm.querySelector('button[type="submit"]');
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Submitting...';
                
                const workRes = await Api.post(`/projects/${project.id}/submit-work`, { submission_notes: notes });
                if (workRes.ok) {
                    showToast('Project work delivered! Client has been notified.', 'success');
                    workForm.reset();
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Deliver Project Work';
                } else {
                    showToast(workRes.error, 'danger');
                    submitBtn.disabled = false;
                }
            });
        } else {
            panel.innerHTML = `
                <div class="card" style="text-align: center; color: var(--text-muted); padding: 30px 0;">
                    <i class="fas fa-lock" style="font-size: 32px; margin-bottom: 8px; opacity: 0.4;"></i>
                    <p>This project is currently In Progress with a hired freelancer.</p>
                </div>
            `;
        }
    }
    // CASE 4: Completed
    else if (project.status === 'Completed') {
        panel.innerHTML = `
            <div class="card" style="border-left: 4px solid var(--success-color);">
                <h3 style="color: var(--success-color); margin-bottom: 8px;"><i class="fas fa-award"></i> Project Completed</h3>
                <p style="font-size: 14px; color: var(--text-secondary); margin-bottom: 16px;">This project contract is finished and closed.</p>
                
                <!-- Feedback module link -->
                <div id="reviews-container">
                    <button id="add-review-btn" class="btn btn-primary btn-sm"><i class="fas fa-star"></i> Submit Review & Feedback</button>
                </div>
            </div>
        `;
        
        // Simple mock review injection
        const reviewBtn = document.getElementById('add-review-btn');
        if (reviewBtn) {
            reviewBtn.addEventListener('click', () => {
                // Determine target user
                const isClientReviewer = Store.getUserRole() === 'client';
                const partnerId = isClientReviewer ? contract.freelancer_id : project.client_id;
                
                // Prompt feedback inputs in a simple modal mock
                injectReviewModal(project.id, partnerId);
            });
        }
    } else {
        panel.innerHTML = `
            <div class="card" style="text-align: center; padding: 24px 0; color: var(--text-muted);">
                <i class="fas fa-lock" style="font-size: 24px; margin-bottom: 6px;"></i>
                <p>Register or log in to interact with this project details.</p>
            </div>
        `;
    }
}

async function loadProjectProposals(projectId) {
    const listDiv = document.getElementById('project-proposals-list');
    const res = await Api.get(`/projects/${projectId}/applications`);
    
    if (!res.ok) {
        listDiv.innerHTML = `<p class="text-danger">${res.error}</p>`;
        return;
    }
    
    const proposals = res.data;
    if (proposals.length === 0) {
        listDiv.innerHTML = `
            <p style="color: var(--text-muted); text-align: center; padding: 24px 0;">No freelancer proposals received for this listing yet.</p>
        `;
        return;
    }
    
    let html = '';
    proposals.forEach(p => {
        const stars = '★'.repeat(Math.round(p.rating)) + '☆'.repeat(5 - Math.round(p.rating));
        
        html += `
            <div class="proposal-card" style="border-bottom: 1px solid var(--border-color); padding: 20px 0; display: flex; flex-direction: column; gap: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <strong style="font-size: 16px;">${p.freelancer_name}</strong>
                        <span style="font-size: 12px; color: var(--warning-color); margin-left: 10px;">${stars} (${p.rating_count || 0})</span>
                        <p style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">Headline: ${p.freelancer_title || 'Professional Freelancer'}</p>
                    </div>
                    <div style="text-align: right;">
                        <span style="font-size: 18px; font-weight: 700; color: var(--success-color); font-family: var(--font-title);">$${p.bid_amount.toFixed(2)}</span>
                        <p style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Bid Price</p>
                    </div>
                </div>
                
                <p style="font-size: 13.5px; color: var(--text-secondary); line-height: 1.5; background-color: var(--hover-color); padding: 12px; border-radius: var(--radius-md);">
                    ${p.cover_letter}
                </p>
                
                <div style="display: flex; gap: 10px; align-items: center; justify-content: flex-end; margin-top: 8px;">
                    ${p.resume_filename ? `<a href="/uploads/${p.resume_filename}" target="_blank" class="btn btn-secondary btn-sm"><i class="fas fa-file-pdf"></i> Read Resume</a>` : ''}
                    <button class="btn btn-primary btn-sm hire-proposal-btn" data-freelancer="${p.freelancer_id}">Approve & Hire</button>
                </div>
            </div>
        `;
    });
    
    listDiv.innerHTML = html;
    
    // Bind Hire approvals
    listDiv.querySelectorAll('.hire-proposal-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const fId = btn.getAttribute('data-freelancer');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Processing...';
            
            const hireRes = await Api.post(`/projects/${projectId}/hire`, { freelancer_id: fId });
            if (hireRes.ok) {
                showToast('Freelancer hired! Escrow invoice generated.', 'success');
                window.location.hash = '#dashboard';
            } else {
                showToast(hireRes.error, 'danger');
                btn.disabled = false;
                btn.textContent = 'Approve & Hire';
            }
        });
    });
}

function injectReviewModal(projectId, revieweeId) {
    const oldModal = document.getElementById('review-prompt-modal');
    if (oldModal) oldModal.remove();
    
    const modalHtml = `
        <div id="review-prompt-modal" class="modal active">
            <div class="modal-content" style="max-width: 440px;">
                <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                <h3 style="margin-bottom: 16px;"><i class="fas fa-star text-warning"></i> Leave a Review</h3>
                <form id="review-submit-form">
                    <div class="form-group">
                        <label class="form-label" for="feedback-rating">Rating (1 to 5 Stars)</label>
                        <select id="feedback-rating" class="form-select" required>
                            <option value="5">5 Stars (Excellent)</option>
                            <option value="4">4 Stars (Good)</option>
                            <option value="3">3 Stars (Average)</option>
                            <option value="2">2 Stars (Poor)</option>
                            <option value="1">1 Star (Terrible)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="feedback-text">Feedback Comments</label>
                        <textarea id="feedback-text" class="form-textarea" placeholder="Detail your experience collaborating with this user..." required></textarea>
                    </div>
                    <button type="submit" class="btn btn-primary" style="width: 100%;">Submit Feedback</button>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    const form = document.getElementById('review-submit-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const rating = document.getElementById('feedback-rating').value;
        const review_text = document.getElementById('feedback-text').value;
        
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        
        const revRes = await Api.post('/reviews', { project_id: projectId, reviewee_id: revieweeId, rating, review_text });
        if (revRes.ok) {
            showToast('Review submitted successfully!', 'success');
            document.getElementById('review-prompt-modal').remove();
        } else {
            showToast(revRes.error, 'danger');
            submitBtn.disabled = false;
        }
    });
}

// -------------------------------------------------------------
// FREELANCER TALENT SEARCH LISTING
// -------------------------------------------------------------
export async function renderFreelancers(container, params) {
    container.innerHTML = `
        <div class="talent-browser page-fade-in">
            <div style="margin-bottom: 24px;">
                <h2>Browse Global Freelance Talent</h2>
                <p style="color: var(--text-secondary); font-size: 14px;">Connect with verified specialists in development, design, and marketing</p>
            </div>

            <!-- Search inputs card -->
            <div class="card" style="margin-bottom: 30px;">
                <div style="display: grid; grid-template-columns: 2fr 2fr 1fr; gap: 16px; align-items: flex-end;">
                    <div class="form-group" style="margin-bottom: 0;">
                        <label class="form-label" for="talent-search-input">Search Name or Headline</label>
                        <div style="position: relative;">
                            <input type="text" id="talent-search-input" class="form-input" style="padding-left: 36px;" placeholder="e.g. Alice Smith, Senior Engineer...">
                            <i class="fas fa-search" style="position: absolute; left: 14px; top: 15px; color: var(--text-muted);"></i>
                        </div>
                    </div>
                    
                    <div class="form-group" style="margin-bottom: 0;">
                        <label class="form-label" for="talent-skills-input">Skills Filters (comma separated)</label>
                        <input type="text" id="talent-skills-input" class="form-input" placeholder="e.g. python, react, logo">
                    </div>
                    
                    <div class="form-group" style="margin-bottom: 0;">
                        <button id="find-talent-btn" class="btn btn-primary" style="width: 100%;"><i class="fas fa-search"></i> Find Talent</button>
                    </div>
                </div>
            </div>

            <!-- Talent Output grid -->
            <div id="talent-results-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px;">
                <div class="loading-spinner-container"><div class="spinner"></div></div>
            </div>
        </div>
    `;

    const findBtn = document.getElementById('find-talent-btn');
    const searchInp = document.getElementById('talent-search-input');
    const skillsInp = document.getElementById('talent-skills-input');
    const gridDiv = document.getElementById('talent-results-grid');

    const loadTalent = async () => {
        const queryList = [];
        if (searchInp.value.trim()) queryList.push(`search=${encodeURIComponent(searchInp.value.trim())}`);
        if (skillsInp.value.trim()) queryList.push(`skills=${encodeURIComponent(skillsInp.value.trim())}`);
        
        const queryString = queryList.length > 0 ? `?${queryList.join('&')}` : '';
        gridDiv.innerHTML = '<div class="loading-spinner-container"><div class="spinner"></div></div>';
        
        const res = await Api.get(`/projects/freelancers${queryString}`);
        if (res.ok) {
            renderTalentGrid(gridDiv, res.data);
        } else {
            gridDiv.innerHTML = `<p class="text-danger">Error fetching talent: ${res.error}</p>`;
        }
    };

    findBtn.addEventListener('click', loadTalent);
    searchInp.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') loadTalent();
    });
    skillsInp.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') loadTalent();
    });

    await loadTalent();
}

function renderTalentGrid(container, freelancers) {
    if (freelancers.length === 0) {
        container.innerHTML = `
            <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 60px 0; color: var(--text-muted);">
                <i class="fas fa-users-slash" style="font-size: 48px; margin-bottom: 16px; opacity: 0.3;"></i>
                <h3>No Matching Freelancers</h3>
                <p style="margin-top: 8px;">Try modifying search keywords or clearing skills filters.</p>
            </div>
        `;
        return;
    }

    let html = '';
    freelancers.forEach(f => {
        const stars = '★'.repeat(Math.round(f.rating)) + '☆'.repeat(5 - Math.round(f.rating));
        const skillsHTML = (f.skills || '').split(',').filter(s => s.trim()).map(s => `
            <span class="badge" style="background-color: var(--hover-color); color: var(--text-secondary); margin-bottom: 4px; font-size: 10px;">${s.trim()}</span>
        `).join(' ');
        
        // Initials avatar
        const initials = f.full_name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

        html += `
            <div class="card card-interactive talent-card" style="display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                    <div style="display: flex; gap: 16px; align-items: center; margin-bottom: 16px;">
                        <div class="avatar" style="width: 50px; height: 50px; border-radius: var(--radius-full); background: var(--primary-color); color: #fff; font-size: 18px; font-weight: 700; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(var(--primary-rgb), 0.2);">
                            ${initials}
                        </div>
                        <div>
                            <h3 style="font-size: 18px; line-height: 1.2;">${f.full_name}</h3>
                            <div style="color: var(--warning-color); font-size: 12px; margin-top: 2px;">
                                ${stars} <span style="color: var(--text-muted);">(${f.rating_count || 0})</span>
                            </div>
                        </div>
                    </div>
                    
                    <h4 style="font-size: 13.5px; font-weight: 600; color: var(--primary-color); margin-bottom: 8px;">${f.title || 'Professional Freelancer'}</h4>
                    <p style="font-size: 13px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 16px; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
                        ${f.bio || 'No bio details supplied yet.'}
                    </p>
                </div>
                
                <div>
                    <div style="border-top: 1px solid var(--border-color); padding: 12px 0 16px 0; min-height: 50px;">
                        ${skillsHTML || '<span style="color: var(--text-muted); font-size: 11px;">No skills tags listed</span>'}
                    </div>
                    
                    <div style="display: flex; gap: 10px; width: 100%;">
                        <a href="#chat?receiver_id=${f.id}" class="btn btn-primary btn-sm" style="flex: 1;"><i class="fas fa-paper-plane"></i> Contact Talent</a>
                    </div>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}