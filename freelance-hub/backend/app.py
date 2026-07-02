import os
from flask import Flask, send_from_directory, g, jsonify
from .config import Config
from .database import init_db, DATABASE_PATH

app = Flask(__name__, static_folder='../frontend')
app.config.from_object(Config)

# Register routes Blueprints
from .routes.auth import auth_bp
from .routes.projects import projects_bp
from .routes.chat import chat_bp
from .routes.payments import payments_bp
from .routes.reviews import reviews_bp
from .routes.reports import reports_bp

app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(projects_bp, url_prefix='/api/projects')
app.register_blueprint(chat_bp, url_prefix='/api/chat')
app.register_blueprint(payments_bp, url_prefix='/api/payments')
app.register_blueprint(reviews_bp, url_prefix='/api/reviews')
app.register_blueprint(reports_bp, url_prefix='/api/reports')

# Initialize DB on start if not exists
if not os.path.exists(DATABASE_PATH):
    print("Database file not found, initializing database...")
    init_db()

# Enable CORS manually to reduce dependencies
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

# Handle preflight options requests globally
@app.route('/api/<path:path>', methods=['OPTIONS'])
def options_handler(path):
    return jsonify({'status': 'ok'}), 200

# Serve static uploads
@app.route('/uploads/<path:filename>')
def serve_uploads(filename):
    return send_from_directory(Config.UPLOAD_FOLDER, filename)

# Serve client-side static files
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    # Check if path corresponds to a real file in frontend folder
    frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../frontend'))
    file_path = os.path.join(frontend_dir, path)
    
    if path != "" and os.path.exists(file_path):
        return send_from_directory(frontend_dir, path)
    else:
        return send_from_directory(frontend_dir, 'index.html')

# Database connection teardown
@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

if __name__ == '__main__':
    # Make sure upload folders exist
    os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)
    
    # Run server
    port = int(os.environ.get('PORT', 5000))
    print(f"Starting Freelance Hub server on http://localhost:{port}")
    app.run(host='0.0.0.0', port=port, debug=True)
