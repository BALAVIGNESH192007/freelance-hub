import jwt
import datetime
from functools import wraps
from flask import request, jsonify, g
from passlib.hash import pbkdf2_sha256
from .config import Config
from .database import query_db

def hash_password(password):
    return pbkdf2_sha256.hash(password)

def verify_password(password, hashed_password):
    try:
        return pbkdf2_sha256.verify(password, hashed_password)
    except Exception:
        return False

def generate_token(user_id, email, role):
    payload = {
        'sub': str(user_id),
        'email': email,
        'role': role,
        'iat': datetime.datetime.utcnow(),
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=Config.JWT_EXPIRY_HOURS)
    }
    return jwt.encode(payload, Config.JWT_SECRET, algorithm='HS256')

def decode_token(token):
    try:
        payload = jwt.decode(token, Config.JWT_SECRET, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def require_token(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'message': 'Authorization header is missing'}), 401
        
        parts = auth_header.split()
        if parts[0].lower() != 'bearer' or len(parts) < 2:
            return jsonify({'message': 'Invalid authorization header format'}), 401
        
        token = parts[1]
        payload = decode_token(token)
        if not payload:
            return jsonify({'message': 'Invalid or expired token'}), 401
        
        g.user_id = int(payload['sub'])
        g.user_email = payload['email']
        g.user_role = payload['role']
        return f(*args, **kwargs)
    return decorated

def require_role(role_name):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            # First check token (ensures g.user_role is set)
            auth_result = require_token(lambda *x, **y: None)(*args, **kwargs)
            if auth_result is not None:
                return auth_result
            
            # Allow admin role to bypass specific role limits (e.g., admin can view everything)
            if g.user_role != role_name and g.user_role != 'admin':
                return jsonify({'message': f'Access restricted to {role_name}s only'}), 403
            
            return f(*args, **kwargs)
        return decorated
    return decorator
