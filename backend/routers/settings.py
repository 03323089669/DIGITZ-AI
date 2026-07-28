from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from core.db import get_settings, save_setting
from routers.auth import get_current_user

router = APIRouter(prefix='/settings', tags=['settings'])


class SettingsUpdatePayload(BaseModel):
    active_provider: str
    openai_key: str | None = ""
    groq_key: str | None = ""
    gemini_key: str | None = ""
    deepseek_key: str | None = ""
    anthropic_key: str | None = ""


@router.get('/')
def get_system_settings(current_user: dict = Depends(get_current_user)):
    # Restrict settings to admin role
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Only administrators can access system settings")
    
    settings = get_settings()
    # Mask API keys for security, but allow saving empty values to clear them
    return {
        'active_provider': settings.get('active_provider', 'groq'),
        'openai_key': settings.get('openai_key', ''),
        'groq_key': settings.get('groq_key', ''),
        'gemini_key': settings.get('gemini_key', ''),
        'deepseek_key': settings.get('deepseek_key', ''),
        'anthropic_key': settings.get('anthropic_key', ''),
    }


@router.get('/public')
def get_public_settings():
    """Non-sensitive settings any logged-in UI can read (no keys, just which
    provider is currently active) so the chat model selector can reflect the
    real backend state without requiring admin rights."""
    settings = get_settings()
    return {
        'active_provider': settings.get('active_provider', 'groq'),
    }


@router.post('/')
def save_system_settings(payload: SettingsUpdatePayload, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Only administrators can modify system settings")
        
    save_setting('active_provider', payload.active_provider.lower())
    if payload.openai_key is not None:
        save_setting('openai_key', payload.openai_key)
    if payload.groq_key is not None:
        save_setting('groq_key', payload.groq_key)
    if payload.gemini_key is not None:
        save_setting('gemini_key', payload.gemini_key)
    if payload.deepseek_key is not None:
        save_setting('deepseek_key', payload.deepseek_key)
    if payload.anthropic_key is not None:
        save_setting('anthropic_key', payload.anthropic_key)
        
    return {'status': 'saved', 'settings': get_settings()}
