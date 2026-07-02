import Store from './store.js';

// Route configurations
// Format: hash: { render: function, auth: boolean, roles: Array (optional) }
const routes = {};

// Register a route
export function registerRoute(hash, config) {
    routes[hash] = config;
}

// Global UI toast manager
export function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconClass = 'fa-info-circle';
    if (type === 'success') iconClass = 'fa-check-circle';
    if (type === 'danger') iconClass = 'fa-exclamation-circle';
    if (type === 'warning') iconClass = 'fa-exclamation-triangle';
    
    toast.innerHTML = `
        <i class="fas ${iconClass}"></i>
        <div>${message}</div>
    `;
    
    container.appendChild(toast);
    
    // Animate out and remove
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s forwards';
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, 4000);
}

// Parse current hash and query parameters
// Example: #projects?id=5&category=dev -> { path: 'projects', params: { id: '5', category: 'dev' } }
function parseRoute() {
    const hash = window.location.hash || '#home';
    const cleanHash = hash.replace(/^#/, '');
    
    const parts = cleanHash.split('?');
    const path = parts[0] || 'home';
    const queryString = parts[1] || '';
    
    const params = {};
    if (queryString) {
        queryString.split('&').forEach(pair => {
            const [key, val] = pair.split('=');
            params[decodeURIComponent(key)] = decodeURIComponent(val || '');
        });
    }
    
    return { path, params };
}

// Main router tick
export async function navigate() {
    const { path, params } = parseRoute();
    const viewport = document.getElementById('app-viewport');
    
    if (!viewport) return;
    
    // Find matching configuration
    const route = routes[path];
    
    if (!route) {
        viewport.innerHTML = `
            <div class="page-fade-in" style="text-align: center; padding: 100px 0;">
                <h1 style="font-size: 80px; color: var(--text-muted);"><i class="fas fa-search"></i> 404</h1>
                <p style="margin: 20px 0; color: var(--text-secondary);">The page you are looking for does not exist.</p>
                <a href="#home" class="btn btn-primary">Go Home</a>
            </div>
        `;
        return;
    }
    
    // Guard: Authentication required
    if (route.auth && !Store.isAuthenticated()) {
        showToast('Please log in to view this page.', 'warning');
        window.location.hash = '#login';
        return;
    }
    
    // Guard: Role authorization check
    if (route.roles && Store.isAuthenticated()) {
        const userRole = Store.getUserRole();
        if (!route.roles.includes(userRole)) {
            showToast('Access restricted to authorized roles only.', 'danger');
            window.location.hash = '#dashboard';
            return;
        }
    }
    
    // Set loading indicator
    viewport.innerHTML = `
        <div class="loading-spinner-container">
            <div class="spinner"></div>
        </div>
    `;
    
    try {
        // Render headers and sidebars
        updateNavigationShells(path);
        
        // Execute render page
        await route.render(viewport, params);
        
    } catch (error) {
        console.error(`Router navigation error for path '${path}':`, error);
        viewport.innerHTML = `
            <div class="page-fade-in" style="text-align: center; padding: 100px 0;">
                <h2 style="color: var(--danger-color);"><i class="fas fa-exclamation-circle"></i> View Render Failed</h2>
                <p style="color: var(--text-secondary); margin-top: 10px;">${error.message || 'An unexpected client error occurred.'}</p>
                <button onclick="window.location.reload()" class="btn btn-secondary" style="margin-top: 20px;">Retry Load</button>
            </div>
        `;
    }
}

// Side navigation and topbar display logic
function updateNavigationShells(activePath) {
    const navbar = document.getElementById('app-navbar');
    const sidebar = document.getElementById('app-sidebar');
    
    if (!navbar || !sidebar) return;
    
    // Redraw Navbar
    renderNavbar(navbar, activePath);
    
    // Redraw Sidebar if user is logged in
    if (Store.isAuthenticated()) {
        sidebar.classList.remove('hidden');
        renderSidebar(sidebar, activePath);
    } else {
        sidebar.classList.add('hidden');
        sidebar.innerHTML = '';
    }
}

function renderNavbar(navEl, activePath) {
    const authLinks = Store.isAuthenticated()
        ? `
            <a href="#dashboard" class="nav-link ${activePath === 'dashboard' ? 'active' : ''}">Dashboard</a>
            <a href="#projects" class="nav-link ${activePath === 'projects' ? 'active' : ''}">Find Projects</a>
            <a href="#freelancers" class="nav-link ${activePath === 'freelancers' ? 'active' : ''}">Find Talent</a>
            <div class="nav-user-badge">
                <a href="#profile" class="nav-profile-btn">
                    <i class="fas fa-user-circle"></i>
                    <span>${Store.user.full_name.split(' ')[0]}</span>
                    <span class="badge badge-info" style="font-size: 8px; padding: 2px 6px; margin-left: 4px;">
                        ${Store.user.role.toUpperCase()}
                    </span>
                </a>
                <button id="nav-logout-btn" class="nav-icon-btn" title="Log Out"><i class="fas fa-sign-out-alt"></i></button>
            </div>
        `
        : `
            <a href="#projects" class="nav-link ${activePath === 'projects' ? 'active' : ''}">Browse Projects</a>
            <a href="#freelancers" class="nav-link ${activePath === 'freelancers' ? 'active' : ''}">Browse Talent</a>
            <a href="#login" class="btn btn-secondary btn-sm">Log In</a>
            <a href="#register" class="btn btn-primary btn-sm">Register</a>
        `;
        
    const themeIcon = Store.theme === 'dark' ? 'fa-sun' : 'fa-moon';
    
    navEl.innerHTML = `
        <div class="nav-brand">
            <a href="#home" class="brand-logo">
                <i class="fas fa-rocket text-primary" style="margin-right: 8px;"></i>
                <span>Freelance<span class="text-primary font-weight-bold">Hub</span></span>
            </a>
        </div>
        <div class="nav-links">
            ${authLinks}
            <button id="theme-toggle-btn" class="nav-icon-btn" title="Toggle Theme"><i class="fas ${themeIcon}"></i></button>
        </div>
    `;
    
    // Bind buttons
    const logoutBtn = document.getElementById('nav-logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            Store.logoutUser();
            showToast('You have been logged out successfully.', 'info');
            window.location.hash = '#home';
        });
    }
    
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            Store.toggleTheme();
            const icon = themeBtn.querySelector('i');
            if (Store.theme === 'dark') {
                icon.className = 'fas fa-sun';
            } else {
                icon.className = 'fas fa-moon';
            }
        });
    }
}

function renderSidebar(sidebarEl, activePath) {
    const role = Store.getUserRole();
    
    let menuItems = '';
    
    if (role === 'admin') {
        menuItems = `
            <a href="#dashboard" class="sidebar-item ${activePath === 'dashboard' ? 'active' : ''}"><i class="fas fa-chart-pie"></i> Admin Hub</a>
            <a href="#projects" class="sidebar-item ${activePath === 'projects' ? 'active' : ''}"><i class="fas fa-briefcase"></i> View Projects</a>
            <a href="#freelancers" class="sidebar-item ${activePath === 'freelancers' ? 'active' : ''}"><i class="fas fa-users"></i> Freelancer List</a>
            <a href="#payments" class="sidebar-item ${activePath === 'payments' ? 'active' : ''}"><i class="fas fa-receipt"></i> Transaction Audit</a>
            <a href="#chat" class="sidebar-item ${activePath === 'chat' ? 'active' : ''}"><i class="fas fa-comments"></i> Admin Support</a>
        `;
    } else if (role === 'client') {
        menuItems = `
            <a href="#dashboard" class="sidebar-item ${activePath === 'dashboard' ? 'active' : ''}"><i class="fas fa-th-large"></i> Client Dashboard</a>
            <a href="#projects" class="sidebar-item ${activePath === 'projects' ? 'active' : ''}"><i class="fas fa-folder-open"></i> Posted Projects</a>
            <a href="#freelancers" class="sidebar-item ${activePath === 'freelancers' ? 'active' : ''}"><i class="fas fa-user-tie"></i> Find Freelancers</a>
            <a href="#payments" class="sidebar-item ${activePath === 'payments' ? 'active' : ''}"><i class="fas fa-credit-card"></i> Invoices & Payments</a>
            <a href="#chat" class="sidebar-item ${activePath === 'chat' ? 'active' : ''}"><i class="fas fa-comment-dots"></i> Discussions</a>
        `;
    } else { // Freelancer
        menuItems = `
            <a href="#dashboard" class="sidebar-item ${activePath === 'dashboard' ? 'active' : ''}"><i class="fas fa-laptop-code"></i> Talent Dashboard</a>
            <a href="#projects" class="sidebar-item ${activePath === 'projects' ? 'active' : ''}"><i class="fas fa-search-dollar"></i> Search Projects</a>
            <a href="#payments" class="sidebar-item ${activePath === 'payments' ? 'active' : ''}"><i class="fas fa-wallet"></i> Earnings & Invoices</a>
            <a href="#chat" class="sidebar-item ${activePath === 'chat' ? 'active' : ''}"><i class="fas fa-paper-plane"></i> Active Chats</a>
        `;
    }
    
    sidebarEl.innerHTML = `
        <div class="sidebar-section">
            <span class="sidebar-header">Navigation</span>
            ${menuItems}
        </div>
        <div class="sidebar-section" style="margin-top: auto;">
            <span class="sidebar-header">Account</span>
            <a href="#profile" class="sidebar-item ${activePath === 'profile' ? 'active' : ''}"><i class="fas fa-user-cog"></i> Profile Settings</a>
        </div>
    `;
}
