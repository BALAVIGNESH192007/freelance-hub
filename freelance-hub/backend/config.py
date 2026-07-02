import os

class Config:
    # Flask settings
    SECRET_KEY = os.environ.get('SECRET_KEY', 'freelance-hub-super-secret-key-12345')
    
    # JWT settings
    JWT_SECRET = os.environ.get('JWT_SECRET', 'jwt-hub-token-signing-key-98765')
    JWT_EXPIRY_HOURS = 24
    
    # Upload settings
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB limit
    
    # Allowed resume / portfolio extensions
    ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg', 'zip'}
