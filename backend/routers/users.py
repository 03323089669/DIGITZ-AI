from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr

from routers.auth import get_current_user
from core.db import (
    get_users,
    get_user_by_email,
    get_user_by_id,
    update_user_status,
    update_user_role,
    invite_user,
)

router = APIRouter(prefix='/users', tags=['users'])

VALID_ROLES = {'admin', 'manager', 'analyst', 'viewer'}


def _require_admin(current_user: dict) -> None:
    if current_user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Only admins can manage team members")


class InvitePayload(BaseModel):
    email: EmailStr
    role: str = 'viewer'
    name: str | None = None
    brand_keys: list[str] = []


class StatusPayload(BaseModel):
    status: str  # 'active' | 'inactive'


class RolePayload(BaseModel):
    role: str
    brand_keys: list[str] | None = None


@router.get('')
@router.get('/')
def list_users(current_user: dict = Depends(get_current_user)):
    _require_admin(current_user)
    return {'users': get_users()}


@router.post('/invite')
def invite(payload: InvitePayload, current_user: dict = Depends(get_current_user)):
    _require_admin(current_user)

    if payload.role not in VALID_ROLES:
        raise HTTPException(status_code=422, detail=f"role must be one of {sorted(VALID_ROLES)}")

    if get_user_by_email(payload.email):
        raise HTTPException(status_code=400, detail="A user with this email already exists")

    result = invite_user(
        email=payload.email,
        role=payload.role,
        name=payload.name,
        brand_keys=payload.brand_keys,
        invited_by=current_user['id'],
    )

    # IMPORTANT: no SMTP/email service is configured in this project, so no email is
    # actually sent. The account is real and can log in immediately with this temp
    # password — the admin must share it manually (or wire up an email provider here).
    return {
        'message': 'User account created. Email delivery is not configured — share the temp password manually.',
        'user': {k: v for k, v in result.items() if k != 'temp_password'},
        'temp_password': result['temp_password'],
        'email_sent': False,
    }


@router.patch('/{user_id}/status')
def set_status(user_id: str, payload: StatusPayload, current_user: dict = Depends(get_current_user)):
    _require_admin(current_user)

    if payload.status not in {'active', 'inactive'}:
        raise HTTPException(status_code=422, detail="status must be 'active' or 'inactive'")

    target = get_user_by_id(user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target['role'] == 'admin' and payload.status == 'inactive':
        raise HTTPException(status_code=400, detail="Cannot deactivate an admin account")
    if target['id'] == current_user['id']:
        raise HTTPException(status_code=400, detail="You cannot deactivate your own account")

    updated = update_user_status(user_id, payload.status)
    updated.pop('password_hash', None)
    return {'user': updated}


@router.patch('/{user_id}')
def edit_user(user_id: str, payload: RolePayload, current_user: dict = Depends(get_current_user)):
    _require_admin(current_user)

    if payload.role not in VALID_ROLES:
        raise HTTPException(status_code=422, detail=f"role must be one of {sorted(VALID_ROLES)}")

    target = get_user_by_id(user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    updated = update_user_role(user_id, payload.role, payload.brand_keys)
    updated.pop('password_hash', None)
    return {'user': updated}
