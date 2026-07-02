// User Profiles Editing & Display Module
import Api from '../api.js';
import Store from '../store.js';
import { showToast } from '../router.js';

export async function renderProfile(container) {
    const res = await Api.get('/profile');
    if (!res.ok) {
        container.innerHTML = `<div style="text-align:center; padding:50px;"><p class="text-danger">${res.error}</p></div>`;
        return;
    }

    const { user, profile, balance } = res.data;
    const role = user.role;
    
    // Header banner layout
    const initials = user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    
    container.innerHTML = `
        <div class="profile-page page-fade-in" style="max-width: 800px; margin: 0 auto;">
            <div class="card" style="margin-bottom: 30px; position: relative; overflow: hidden; padding: 40px 30px;">
                <div style="position: absolute; top: 0; left: 0; width: 100%; height: 8px; background: var(--primary-color);"></div>
                
                <div style="display: flex; gap: 24px; align-items: center; flex-wrap: wrap;">
                    <div style="width: 72px; height: 72px; border-radius: var(--radius-full); background: var(--primary-color); color: #fff; font-size: 24px; font-weight: 700; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(var(--primary-rgb), 0.3);">
                        ${initials}
                    </div>
                    <div>
                        <h2 style="font-size: 24px; font-weight: 700;">${user.full_name}</h2>
                        <p style="color: var(--text-secondary); font-size: 14px;"><i class="far fa-envelope"></i> ${user.email}</p>
                        <span class="badge badge-info" style="margin-top: 8px;">Role: ${role.toUpperCase()}</span>
                    </div>
                </div>
            </div>

            <!-- Profile Settings Form -->
            <div class="card">
                <h3 style="margin-bottom: 24px; border-bottom: 1px solid var(--border-color); padding-bottom: 12px;"><i class="fas fa-user-cog text-primary"></i> Edit Profile Details</h3>
                
                <form id="profile-edit-form">
                    <div class="form-group">
                        <label class="form-label" for="prof-name">Full Name</label>
                        <input type="text" id="prof-name" class="form-input" value="${user.full_name}" required>
                    </div>

                    ${role === 'freelancer' ? `
                        <!-- Freelancer Fields -->
                        <div class="form-group">
                            <label class="form-label" for="prof-title">Headline / Job Title</label>
                            <input type="text" id="prof-title" class="form-input" placeholder="e.g. Senior Full-Stack Python Engineer" value="${profile.title || ''}">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label" for="prof-skills">Skills (comma separated tags)</label>
                            <input type="text" id="prof-skills" class="form-input" placeholder="e.g. python, flask, react, css, postgres" value="${profile.skills || ''}">
                        </div>

                        <div class="form-group">
                            <label class="form-label" for="prof-experience">Experience Summary</label>
                            <textarea id="prof-experience" class="form-textarea" placeholder="Describe your corporate/freelance employment history, years of experience..." rows="3">${profile.experience || ''}</textarea>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label" for="prof-bio">Short Professional Bio</label>
                            <textarea id="prof-bio" class="form-textarea" placeholder="Tell clients about yourself, your working principles, and what sets you apart..." rows="4">${profile.bio || ''}</textarea>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label" for="prof-portfolio">Portfolio Links / Projects (Plain Text or URLs)</label>
                            <textarea id="prof-portfolio" class="form-textarea" placeholder="Provide URLs or summaries of completed works..." rows="3">${profile.portfolio || ''}</textarea>
                        </div>
                    ` : ''}

                    ${role === 'client' ? `
                        <!-- Client Fields -->
                        <div class="form-group">
                            <label class="form-label" for="prof-company">Company Name</label>
                            <input type="text" id="prof-company" class="form-input" placeholder="e.g. Acme Tech Solutions" value="${profile.company_name || ''}">
                        </div>

                        <div class="form-group">
                            <label class="form-label" for="prof-website">Company Website URL</label>
                            <input type="url" id="prof-website" class="form-input" placeholder="https://company.com" value="${profile.company_website || ''}">
                        </div>

                        <div class="form-group">
                            <label class="form-label" for="prof-company-bio">Company Overview / Bio</label>
                            <textarea id="prof-company-bio" class="form-textarea" placeholder="Tell freelancers about your company, projects, and mission..." rows="4">${profile.company_bio || ''}</textarea>
                        </div>
                    ` : ''}
                    
                    <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 10px;">Save Profile Changes</button>
                </form>
            </div>
            
            ${role === 'freelancer' ? `
                <!-- Resume File Upload Card -->
                <div class="card" style="margin-top: 30px;">
                    <h3 style="margin-bottom: 16px;"><i class="fas fa-file-pdf text-danger"></i> Upload Professional Resume</h3>
                    <p style="font-size: 13.5px; color: var(--text-secondary); margin-bottom: 20px;">
                        Upload your PDF or Word resume so client recruiters can view it when inspecting your project proposals.
                    </p>
                    
                    <form id="resume-upload-form" style="display: flex; flex-direction: column; gap: 16px;">
                        <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
                            <input type="file" id="resume-file-input" style="display: none;" accept=".pdf,.doc,.docx" required>
                            <button type="button" id="resume-trigger-btn" class="btn btn-secondary"><i class="fas fa-cloud-upload-alt"></i> Select Document</button>
                            <span id="selected-file-name" style="font-size: 13px; color: var(--text-muted);">No file selected</span>
                            <button type="submit" class="btn btn-primary btn-sm" style="margin-left: auto;">Upload File</button>
                        </div>
                        
                        <div id="active-resume-status" style="font-size: 13px; color: var(--text-secondary); padding-top: 10px; border-top: 1px solid var(--border-color);">
                            ${profile.resume_filename 
                                ? `Active CV: <a href="/uploads/${profile.resume_filename}" target="_blank" style="font-weight:600;"><i class="fas fa-file-alt"></i> View ${profile.resume_filename}</a>`
                                : '<span style="font-style: italic;">No active resume uploaded.</span>'
                            }
                        </div>
                    </form>
                </div>
            ` : ''}
        </div>
    `;

    // Bind profile updates form
    const form = document.getElementById('profile-edit-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const full_name = document.getElementById('prof-name').value;
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Saving...';
        
        let payload = { full_name };
        
        if (role === 'freelancer') {
            payload.title = document.getElementById('prof-title').value;
            payload.skills = document.getElementById('prof-skills').value;
            payload.experience = document.getElementById('prof-experience').value;
            payload.bio = document.getElementById('prof-bio').value;
            payload.portfolio = document.getElementById('prof-portfolio').value;
        } else if (role === 'client') {
            payload.company_name = document.getElementById('prof-company').value;
            payload.company_website = document.getElementById('prof-website').value;
            payload.company_bio = document.getElementById('prof-company-bio').value;
        }
        
        const updateRes = await Api.put('/auth/profile', payload);
        if (updateRes.ok) {
            showToast('Profile updated successfully!', 'success');
            // Cache updated profile in store
            Store.updateUserProfile(updateRes.data.profile);
            await renderProfile(container);
        } else {
            showToast(updateRes.error, 'danger');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Profile Changes';
        }
    });

    // Bind resume upload if freelancer
    if (role === 'freelancer') {
        const fileInput = document.getElementById('resume-file-input');
        const triggerBtn = document.getElementById('resume-trigger-btn');
        const label = document.getElementById('selected-file-name');
        const uploadForm = document.getElementById('resume-upload-form');
        
        triggerBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', () => {
            const file = fileInput.files[0];
            label.textContent = file ? file.name : 'No file selected';
        });
        
        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const file = fileInput.files[0];
            if (!file) return;
            
            const submitBtn = uploadForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Uploading...';
            
            const formData = new FormData();
            formData.append('resume', file);
            
            // Post via Api.post handles setting headers correctly
            const res = await Api.post('/auth/profile/resume', formData);
            if (res.ok) {
                showToast('Resume file uploaded successfully!', 'success');
                await renderProfile(container);
            } else {
                showToast(res.error, 'danger');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Upload File';
            }
        });
    }
}
