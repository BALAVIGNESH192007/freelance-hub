// Authentication Views Module (Login, Register, Forgot Password, Reset Password)
import Api from '../api.js';
import Store from '../store.js';
import { showToast } from '../router.js';

export function renderLogin(container) {
    container.innerHTML = `
        <div class="auth-page page-fade-in" style="display: flex; justify-content: center; align-items: center; padding: 40px 0;">
            <div class="card" style="width: 100%; max-width: 420px; box-shadow: var(--shadow);">
                <div style="text-align: center; margin-bottom: 30px;">
                    <i class="fas fa-rocket text-primary" style="font-size: 40px; margin-bottom: 12px;"></i>
                    <h2>Welcome Back</h2>
                    <p style="color: var(--text-secondary); font-size: 14px; margin-top: 6px;">Sign in to your Freelance Hub account</p>
                </div>
                
                <form id="login-form">
                    <div class="form-group">
                        <label class="form-label" for="login-email">Email Address</label>
                        <input type="email" id="login-email" class="form-input" placeholder="name@company.com" required>
                    </div>
                    
                    <div class="form-group">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <label class="form-label" for="login-password" style="margin-bottom: 0;">Password</label>
                            <a href="#forgot-password" style="font-size: 12px;">Forgot password?</a>
                        </div>
                        <input type="password" id="login-password" class="form-input" placeholder="••••••••" required>
                    </div>
                    
                    <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 10px;">Sign In</button>
                </form>
                
                <div style="text-align: center; margin-top: 24px; font-size: 14px; border-top: 1px solid var(--border-color); padding-top: 20px;">
                    <span style="color: var(--text-secondary);">Don't have an account?</span>
                    <a href="#register" style="font-weight: 500; margin-left: 4px;">Create one</a>
                </div>
            </div>
        </div>
    `;

    const form = document.getElementById('login-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Authenticating...';
        
        const res = await Api.post('/auth/login', { email, password });
        
        if (res.ok) {
            Store.loginUser(res.data.user, res.data.token);
            showToast(`Welcome back, ${res.data.user.full_name}!`, 'success');
            window.location.hash = '#dashboard';
        } else {
            showToast(res.error, 'danger');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign In';
        }
    });
}

export function renderRegister(container, params) {
    const defaultRole = (params && params.role === 'client') ? 'client' : 'freelancer';
    
    container.innerHTML = `
        <div class="auth-page page-fade-in" style="display: flex; justify-content: center; align-items: center; padding: 40px 0;">
            <div class="card" style="width: 100%; max-width: 460px; box-shadow: var(--shadow);">
                <div style="text-align: center; margin-bottom: 30px;">
                    <i class="fas fa-user-plus text-primary" style="font-size: 40px; margin-bottom: 12px;"></i>
                    <h2>Create Account</h2>
                    <p style="color: var(--text-secondary); font-size: 14px; margin-top: 6px;">Join the premium workspace network</p>
                </div>
                
                <form id="register-form">
                    <div class="form-group">
                        <label class="form-label" for="reg-name">Full Name</label>
                        <input type="text" id="reg-name" class="form-input" placeholder="John Doe" required>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label" for="reg-email">Email Address</label>
                        <input type="email" id="reg-email" class="form-input" placeholder="john@example.com" required>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label" for="reg-role">I want to...</label>
                        <select id="reg-role" class="form-select" required>
                            <option value="freelancer" ${defaultRole === 'freelancer' ? 'selected' : ''}>Work as a Freelancer</option>
                            <option value="client" ${defaultRole === 'client' ? 'selected' : ''}>Hire Freelancers (Client)</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label" for="reg-password">Password</label>
                        <input type="password" id="reg-password" class="form-input" placeholder="Minimum 6 characters" minlength="6" required>
                    </div>
                    
                    <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 10px;">Get Started</button>
                </form>
                
                <div style="text-align: center; margin-top: 24px; font-size: 14px; border-top: 1px solid var(--border-color); padding-top: 20px;">
                    <span style="color: var(--text-secondary);">Already registered?</span>
                    <a href="#login" style="font-weight: 500; margin-left: 4px;">Sign in instead</a>
                </div>
            </div>
        </div>
    `;

    const form = document.getElementById('register-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const full_name = document.getElementById('reg-name').value;
        const email = document.getElementById('reg-email').value;
        const role = document.getElementById('reg-role').value;
        const password = document.getElementById('reg-password').value;
        
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Creating Account...';
        
        const res = await Api.post('/auth/register', { full_name, email, role, password });
        
        if (res.ok) {
            showToast('Registration successful! Please log in.', 'success');
            window.location.hash = '#login';
        } else {
            showToast(res.error, 'danger');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Get Started';
        }
    });
}

export function renderForgot(container) {
    container.innerHTML = `
        <div class="auth-page page-fade-in" style="display: flex; justify-content: center; align-items: center; padding: 40px 0;">
            <div class="card" style="width: 100%; max-width: 420px; box-shadow: var(--shadow);">
                <div style="text-align: center; margin-bottom: 30px;">
                    <i class="fas fa-key text-primary" style="font-size: 40px; margin-bottom: 12px;"></i>
                    <h2>Forgot Password</h2>
                    <p style="color: var(--text-secondary); font-size: 14px; margin-top: 6px;">Enter your email to locate password reset token</p>
                </div>
                
                <form id="forgot-form">
                    <div class="form-group">
                        <label class="form-label" for="forgot-email">Email Address</label>
                        <input type="email" id="forgot-email" class="form-input" placeholder="name@company.com" required>
                    </div>
                    
                    <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 10px;">Find Reset Token</button>
                </form>
                
                <!-- Debug panel to show reset link during offline/local testing -->
                <div id="debug-reset-container" style="display: none; margin-top: 24px; padding: 16px; background-color: rgba(245, 158, 11, 0.1); border: 1px dashed var(--warning-color); border-radius: var(--radius-md);">
                    <h4 style="color: var(--warning-color); font-size: 13px; margin-bottom: 6px;"><i class="fas fa-info-circle"></i> Local Dev Simulator Link:</h4>
                    <p style="font-size: 12px; margin-bottom: 10px; color: var(--text-secondary);">Since no mail server is connected, copy this link to simulate password reset:</p>
                    <a id="debug-reset-link" href="#" style="font-size: 12px; font-weight: 600; word-break: break-all;"></a>
                </div>
                
                <div style="text-align: center; margin-top: 24px; font-size: 14px; border-top: 1px solid var(--border-color); padding-top: 20px;">
                    <a href="#login"><i class="fas fa-arrow-left"></i> Back to login</a>
                </div>
            </div>
        </div>
    `;

    const form = document.getElementById('forgot-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('forgot-email').value;
        
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        
        const res = await Api.post('/auth/forgot-password', { email });
        
        if (res.ok) {
            showToast('Token logged. Check below for dev simulator link.', 'success');
            submitBtn.textContent = 'Token Generated';
            
            if (res.data.debug_token) {
                const debugContainer = document.getElementById('debug-reset-container');
                const debugLink = document.getElementById('debug-reset-link');
                const resetUrl = `#reset-password?token=${res.data.debug_token}`;
                
                debugLink.href = resetUrl;
                debugLink.textContent = window.location.origin + window.location.pathname + resetUrl;
                debugContainer.style.display = 'block';
            }
        } else {
            showToast(res.error, 'danger');
            submitBtn.disabled = false;
        }
    });
}

export function renderReset(container, params) {
    const token = params ? params.token : '';
    
    if (!token) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 0;">
                <h2 class="text-danger"><i class="fas fa-exclamation-triangle"></i> Missing Token</h2>
                <p style="margin: 14px 0; color: var(--text-secondary);">Cannot load reset password view without a validation token.</p>
                <a href="#login" class="btn btn-secondary">Go to Login</a>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="auth-page page-fade-in" style="display: flex; justify-content: center; align-items: center; padding: 40px 0;">
            <div class="card" style="width: 100%; max-width: 420px; box-shadow: var(--shadow);">
                <div style="text-align: center; margin-bottom: 30px;">
                    <i class="fas fa-shield-alt text-primary" style="font-size: 40px; margin-bottom: 12px;"></i>
                    <h2>Reset Password</h2>
                    <p style="color: var(--text-secondary); font-size: 14px; margin-top: 6px;">Set a new secure password</p>
                </div>
                
                <form id="reset-form">
                    <div class="form-group">
                        <label class="form-label" for="reset-pass">New Password</label>
                        <input type="password" id="reset-pass" class="form-input" placeholder="Minimum 6 characters" minlength="6" required>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label" for="reset-confirm">Confirm Password</label>
                        <input type="password" id="reset-confirm" class="form-input" placeholder="Confirm new password" minlength="6" required>
                    </div>
                    
                    <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 10px;">Update Password</button>
                </form>
            </div>
        </div>
    `;

    const form = document.getElementById('reset-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const password = document.getElementById('reset-pass').value;
        const confirm = document.getElementById('reset-confirm').value;
        
        if (password !== confirm) {
            showToast('Passwords do not match!', 'warning');
            return;
        }
        
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Resetting...';
        
        const res = await Api.post('/auth/reset-password', { token, password });
        
        if (res.ok) {
            showToast('Password reset successfully. Please log in.', 'success');
            window.location.hash = '#login';
        } else {
            showToast(res.error, 'danger');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Update Password';
        }
    });
}
