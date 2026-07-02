// Landing Page View Module

export function renderLanding(container) {
    container.innerHTML = `
        <div class="landing-page page-fade-in">
            <!-- Hero Section -->
            <section class="hero-section">
                <div class="hero-content">
                    <span class="hero-badge"><i class="fas fa-sparkles text-primary"></i> The Future of Remote Work is Here</span>
                    <h1 class="hero-title">Connecting Elite <span class="text-primary">Talent</span> with Global <span class="text-primary">Opportunities</span></h1>
                    <p class="hero-subtitle">Freelance Hub is the premium, secure workspace for independent professionals and ambitious businesses to collaborate, communicate, and grow together.</p>
                    
                    <div class="hero-ctas">
                        <a href="#register?role=client" class="btn btn-primary btn-lg">Hire Elite Talent</a>
                        <a href="#register?role=freelancer" class="btn btn-secondary btn-lg">Find Freelance Work</a>
                    </div>
                    
                    <div class="hero-search-bar">
                        <div class="search-input-group">
                            <i class="fas fa-search search-icon"></i>
                            <input type="text" id="landing-search-input" placeholder="Search for jobs (e.g., Python Developer, Graphic Designer)...">
                            <button id="landing-search-btn" class="btn btn-primary">Search</button>
                        </div>
                    </div>
                </div>
                
                <!-- Floating Glassmorphic Visuals Showcase -->
                <div class="hero-visual">
                    <div class="glass-card visual-card-1">
                        <div class="visual-header">
                            <i class="fas fa-wallet text-success"></i>
                            <span>Secured Escrow</span>
                        </div>
                        <div class="visual-body">
                            <h3>$5,400.00</h3>
                            <p>Funds in holding for Developer Contract</p>
                        </div>
                    </div>
                    
                    <div class="glass-card visual-card-2">
                        <div class="visual-header">
                            <i class="fas fa-comments text-primary"></i>
                            <span>Active Chats</span>
                        </div>
                        <div class="visual-chat-row">
                            <div class="avatar">JD</div>
                            <div class="chat-snippet">
                                <strong>John Doe (Client)</strong>
                                <p>The project files look incredible, payment approved!</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Value Statistics -->
            <section class="stats-showcase">
                <div class="stat-item">
                    <h2>15K+</h2>
                    <p>Verified Freelancers</p>
                </div>
                <div class="stat-divider"></div>
                <div class="stat-item">
                    <h2>8K+</h2>
                    <p>Successful Projects</p>
                </div>
                <div class="stat-divider"></div>
                <div class="stat-item">
                    <h2>$12M+</h2>
                    <p>Securely Transacted</p>
                </div>
            </section>

            <!-- Key Features Grid -->
            <section class="features-section">
                <div class="section-header">
                    <h2>Engineered for Seamless Collaboration</h2>
                    <p>Say goodbye to complex contracting. Freelance Hub streamlines every phase of the client-freelancer relationship.</p>
                </div>
                
                <div class="features-grid">
                    <div class="card card-interactive">
                        <div class="feature-icon icon-purple"><i class="fas fa-lock"></i></div>
                        <h3>Protected Payments</h3>
                        <p>Our secure invoice escrow system guarantees freelancers are paid on completion, while clients review work before releasing funds.</p>
                    </div>
                    
                    <div class="card card-interactive">
                        <div class="feature-icon icon-green"><i class="fas fa-comments-alt"></i></div>
                        <h3>Real-time Conversations</h3>
                        <p>Discuss details, share project files, and track progress using our integrated workspace chat messenger.</p>
                    </div>
                    
                    <div class="card card-interactive">
                        <div class="feature-icon icon-blue"><i class="fas fa-chart-line"></i></div>
                        <h3>Role-Based Dashboards</h3>
                        <p>Access clean visual analytics. Freelancers track monthly earnings and clients audit active contracting budget trends.</p>
                    </div>
                </div>
            </section>

            <!-- Footer Section -->
            <footer class="landing-footer">
                <p>&copy; 2026 Freelance Hub Inc. All rights reserved. Platform fee: 5% per project.</p>
            </footer>
        </div>
    `;

    // Bind Search Action
    const searchBtn = document.getElementById('landing-search-btn');
    const searchInput = document.getElementById('landing-search-input');
    
    if (searchBtn && searchInput) {
        const executeSearch = () => {
            const query = searchInput.value.trim();
            window.location.hash = `#projects?search=${encodeURIComponent(query)}`;
        };
        
        searchBtn.addEventListener('click', executeSearch);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') executeSearch();
        });
    }
}
