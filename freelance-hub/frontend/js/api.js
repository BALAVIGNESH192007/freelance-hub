import Store from './store.js';

const API_BASE = '/api';

async function request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    
    // Setup Headers
    options.headers = options.headers || {};
    
    if (Store.token) {
        options.headers['Authorization'] = `Bearer ${Store.token}`;
    }
    
    // Automatically set Content-Type if body is JSON (and not FormData)
    if (options.body && !(options.body instanceof FormData)) {
        options.headers['Content-Type'] = 'application/json';
        if (typeof options.body === 'object') {
            options.body = JSON.stringify(options.body);
        }
    }
    
    try {
        const response = await fetch(url, options);
        
        // Handle unauthorized token expiration
        if (response.status === 401) {
            Store.logoutUser();
            window.location.hash = '#login';
            return { ok: false, error: 'Session expired. Please log in again.' };
        }
        
        // Parse JSON content if present
        let data = null;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = await response.text();
        }
        
        if (!response.ok) {
            return {
                ok: false,
                status: response.status,
                error: (data && data.message) ? data.message : 'An error occurred'
            };
        }
        
        return { ok: true, status: response.status, data };
        
    } catch (err) {
        console.error('API Request Error:', err);
        return { ok: false, error: 'Network connection failed' };
    }
}

const Api = {
    async get(endpoint) {
        return request(endpoint, { method: 'GET' });
    },
    async post(endpoint, body) {
        return request(endpoint, { method: 'POST', body });
    },
    async put(endpoint, body) {
        return request(endpoint, { method: 'PUT', body });
    },
    async delete(endpoint) {
        return request(endpoint, { method: 'DELETE' });
    }
};

export default Api;
export { API_BASE };
