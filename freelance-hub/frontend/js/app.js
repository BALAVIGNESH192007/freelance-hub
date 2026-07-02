import Store from './store.js';
import { registerRoute, navigate } from './router.js';

// Import Views
import { renderLanding } from './pages/landing.js';
import { renderLogin, renderRegister, renderForgot, renderReset } from './pages/auth.js';
import { renderDashboard } from './pages/dashboards.js';
import { renderProjects } from './pages/projects.js';
import { renderFreelancers } from './pages/projects.js'; // Exported in same module for simplicity
import { renderProfile } from './pages/profiles.js';
import { renderPayments } from './pages/payments.js';
import { renderChat } from './pages/chat.js';

// Configure Router Table
registerRoute('home', { render: renderLanding, auth: false });
registerRoute('login', { render: renderLogin, auth: false });
registerRoute('register', { render: renderRegister, auth: false });
registerRoute('forgot-password', { render: renderForgot, auth: false });
registerRoute('reset-password', { render: renderReset, auth: false });

registerRoute('dashboard', { render: renderDashboard, auth: true });
registerRoute('projects', { render: renderProjects, auth: false }); // Public search
registerRoute('freelancers', { render: renderFreelancers, auth: false }); // Public search

registerRoute('profile', { render: renderProfile, auth: true });
registerRoute('payments', { render: renderPayments, auth: true });
registerRoute('chat', { render: renderChat, auth: true });

// Listeners
window.addEventListener('hashchange', navigate);

window.addEventListener('DOMContentLoaded', () => {
    // Apply theme
    Store.initTheme();
    
    // Fire routing
    navigate();
});
