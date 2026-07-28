import hmac
import hashlib
import base64
import json
import time
from fastapi import APIRouter, Header, HTTPException, Depends
from pydantic import BaseModel, EmailStr

from core.db import create_user, get_user_by_email, verify_password, update_last_login

router = APIRouter(prefix='/auth', tags=['auth'])

JWT_SECRET = "digitz-super-secret-key-12345"

# --- JWT Utility ---
def base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode('utf-8')

def base64url_decode(data: str) -> bytes:
    padding = '=' * (4 - (len(data) % 4))
    return base64.urlsafe_b64decode(data + padding)

def create_jwt(payload: dict) -> str:
    payload['exp'] = int(time.time()) + (7 * 24 * 3600)  # 7 days expiration
    header = {"alg": "HS256", "typ": "JWT"}
    header_b64 = base64url_encode(json.dumps(header).encode('utf-8'))
    payload_b64 = base64url_encode(json.dumps(payload).encode('utf-8'))
    message = f"{header_b64}.{payload_b64}".encode('utf-8')
    signature = hmac.new(JWT_SECRET.encode('utf-8'), message, hashlib.sha256).digest()
    signature_b64 = base64url_encode(signature)
    return f"{header_b64}.{payload_b64}.{signature_b64}"

def verify_jwt(token: str) -> dict | None:
    try:
        parts = token.split('.')
        if len(parts) != 3:
            return None
        header_b64, payload_b64, signature_b64 = parts
        message = f"{header_b64}.{payload_b64}".encode('utf-8')
        expected_sig = hmac.new(JWT_SECRET.encode('utf-8'), message, hashlib.sha256).digest()
        expected_sig_b64 = base64url_encode(expected_sig)
        if not hmac.compare_digest(signature_b64, expected_sig_b64):
            return None
        payload = json.loads(base64url_decode(payload_b64).decode('utf-8'))
        if 'exp' in payload and payload['exp'] < time.time():
            return None
        return payload
    except Exception:
        return None

# --- Security Dependency ---
def get_current_user(authorization: str = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication token missing or invalid")
    token = authorization.split(" ")[1]
    payload = verify_jwt(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired session token")
    return payload

# --- Payloads ---
class LoginPayload(BaseModel):
    email: str
    password: str

class RegisterPayload(BaseModel):
    email: EmailStr
    password: str

# --- Endpoints ---
@router.post('/login')
def login(payload: LoginPayload):
    user = get_user_by_email(payload.email)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(payload.password, user['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if user.get('status') == 'inactive':
        raise HTTPException(status_code=403, detail="This account has been deactivated. Contact an admin.")

    update_last_login(user['id'])

    token = create_jwt({
        'id': user['id'],
        'email': user['email'],
        'role': user['role']
    })
    
    return {
        'access_token': token,
        'token_type': 'bearer',
        'user': {
            'id': user['id'],
            'email': user['email'],
            'role': user['role']
        }
    }

@router.post('/register')
def register(payload: RegisterPayload):
    existing = get_user_by_email(payload.email)
    if existing:
        raise HTTPException(status_code=400, detail="User already registered with this email")
    
    user = create_user(payload.email, payload.password, role='user')
    token = create_jwt({
        'id': user['id'],
        'email': user['email'],
        'role': user['role']
    })
    
    return {
        'access_token': token,
        'token_type': 'bearer',
        'user': user
    }

@router.get('/me')
def me(current_user: dict = Depends(get_current_user)):
    return {'user': current_user}
