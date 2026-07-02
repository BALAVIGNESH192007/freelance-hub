// Application Global State Store

const Store = {
    // Current User Session
    user: JSON.parse(localStorage.getItem('fh_user')) || null,
    token: localStorage.getItem('fh_token') || null,
    
    // UI Theme Preferences
    theme: localStorage.getItem('fh_theme') || 'dark',

    // Global listeners array for state changes (simplistic pub-sub)
    listeners: [],

    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    },

    notify() {
        this.listeners.forEach(l => l(this));
    },

    // Session Management
    loginUser(user, token) {
        this.user = user;
        this.token = token;
        localStorage.setItem('fh_user', JSON.stringify(user));
        localStorage.setItem('fh_token', token);
        this.notify();
    },

    logoutUser() {
        this.user = null;
        this.token = null;
        localStorage.removeItem('fh_user');
        localStorage.removeItem('fh_token');
        this.notify();
    },

    updateUserProfile(profile) {
        if (this.user) {
            this.user.profile = profile;
            localStorage.setItem('fh_user', JSON.stringify(this.user));
            this.notify();
        }
    },

    // Theme Management
    setTheme(themeName) {
        this.theme = themeName;
        localStorage.setItem('fh_theme', themeName);
        document.documentElement.setAttribute('data-theme', themeName);
        this.notify();
    },

    toggleTheme() {
        const nextTheme = this.theme === 'dark' ? 'light' : 'dark';
        this.setTheme(nextTheme);
    },

    initTheme() {
        document.documentElement.setAttribute('data-theme', this.theme);
    },

    // Check permissions
    isAuthenticated() {
        return this.user !== null && this.token !== null;
    },

    getUserRole() {
        return this.user ? this.user.role : null;
    }
};

export default Store;
