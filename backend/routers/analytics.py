from fastapi import APIRouter, Depends
from core.db import get_analytics_summary, get_upload_summary
from routers.auth import get_current_user

router = APIRouter(prefix='/analytics', tags=['analytics'])


@router.get('/summary')
def get_analytics_dashboard_summary(current_user: dict = Depends(get_current_user)):
    summary = get_analytics_summary()
    upload_summary = get_upload_summary()

    # Include brand inventory and counts so the analytics page can render brand-level KPIs
    summary['brands'] = upload_summary.get('brands', [])
    summary['total_docs'] = upload_summary.get('total_docs', 0)
    summary['total_queries'] = upload_summary.get('total_queries', 0)
    summary['total_reports'] = upload_summary.get('total_reports', 0)
    summary['total_campaigns'] = upload_summary.get('total_campaigns', 0)
    summary['total_active_brands'] = upload_summary.get('total_active_brands', 0)
    return summary
