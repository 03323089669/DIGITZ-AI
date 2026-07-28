from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from core.db import create_brand, delete_brand, get_brand, get_brands, update_brand
from routers.auth import get_current_user

router = APIRouter(prefix='/brands', tags=['brands'])


class BrandCreatePayload(BaseModel):
    key: str
    name: str
    color: str | None = None
    description: str | None = None
    industry: str | None = None
    website: str | None = None
    status: str | None = 'active'
    logo_url: str | None = None
    ai_prompt: str | None = None


class BrandUpdatePayload(BaseModel):
    name: str | None = None
    color: str | None = None
    description: str | None = None
    industry: str | None = None
    website: str | None = None
    status: str | None = None
    logo_url: str | None = None
    ai_prompt: str | None = None


@router.get('/')
def list_brands():
    return {'brands': get_brands()}


@router.post('/')
def create_new_brand(payload: BrandCreatePayload, current_user: dict = Depends(get_current_user)):
    # Restrict creation to admins
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Only administrators can manage brands")

    existing = get_brand(payload.key)
    if existing:
        raise HTTPException(status_code=400, detail='Brand key already exists')
    brand = create_brand(
        key=payload.key,
        name=payload.name,
        color=payload.color,
        description=payload.description,
        industry=payload.industry,
        website=payload.website,
        status=payload.status or 'active',
        logo_url=payload.logo_url,
        ai_prompt=payload.ai_prompt
    )
    return {'brand': brand}


@router.put('/{brand_key}')
def edit_brand(brand_key: str, payload: BrandUpdatePayload, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Only administrators can manage brands")

    existing = get_brand(brand_key)
    if not existing:
        raise HTTPException(status_code=404, detail='Brand not found')
    brand = update_brand(
        key=brand_key,
        name=payload.name,
        color=payload.color,
        description=payload.description,
        industry=payload.industry,
        website=payload.website,
        status=payload.status,
        logo_url=payload.logo_url,
        ai_prompt=payload.ai_prompt
    )
    return {'brand': brand}


@router.delete('/{brand_key}')
def remove_brand(brand_key: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Only administrators can manage brands")

    delete_brand(brand_key)
    return {'brand_key': brand_key, 'status': 'deleted'}
