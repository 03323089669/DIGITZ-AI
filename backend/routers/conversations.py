import json
from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import io

from core.db import (
    create_conversation,
    get_conversations,
    get_conversation,
    delete_conversation,
    create_message,
    get_messages,
    get_brand,
)
from core.rag_chain import run_query
from routers.auth import get_current_user

router = APIRouter(prefix='/conversations', tags=['conversations'])


class ConversationCreatePayload(BaseModel):
    brand_key: str
    title: str


class MessageSendPayload(BaseModel):
    text: str
    mode: str | None = 'Creative'


@router.get('/')
def list_conversations(brand_key: str | None = Query(None), current_user: dict = Depends(get_current_user)):
    return {'conversations': get_conversations(current_user['id'], brand_key)}


@router.post('/')
def start_conversation(payload: ConversationCreatePayload, current_user: dict = Depends(get_current_user)):
    brand = get_brand(payload.brand_key)
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    
    conv = create_conversation(current_user['id'], payload.brand_key, payload.title)
    
    # Pre-populate with a welcome message
    welcome_text = f"Hello! I am your Digitz AI assistant for {brand['name']}. How can I assist you with your marketing or brand assets today?"
    create_message(conv['id'], sender='ai', text=welcome_text)
    
    return {'conversation': conv}


@router.delete('/{conv_id}')
def remove_conversation(conv_id: str, current_user: dict = Depends(get_current_user)):
    conv = get_conversation(conv_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if conv['user_id'] != current_user['id'] and current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Not authorized to delete this conversation")
    
    delete_conversation(conv_id)
    return {'conversation_id': conv_id, 'status': 'deleted'}


@router.get('/{conv_id}/messages')
def list_messages(conv_id: str, current_user: dict = Depends(get_current_user)):
    conv = get_conversation(conv_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if conv['user_id'] != current_user['id'] and current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Not authorized to view these messages")
    
    return {'messages': get_messages(conv_id)}


@router.post('/{conv_id}/messages')
def send_new_message(conv_id: str, payload: MessageSendPayload, current_user: dict = Depends(get_current_user)):
    conv = get_conversation(conv_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if conv['user_id'] != current_user['id'] and current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Not authorized to send messages in this conversation")
    
    # 1. Save user message
    user_msg = create_message(conv_id, sender='user', text=payload.text)
    
    # 2. Run RAG query
    result = run_query(payload.text, brand=conv['brand_key'], mode=payload.mode)
    
    # 3. Save AI message
    inferred_val = 1 if result.get('answer', '').startswith('[INFERRED]') or result.get('cross_brand') else 0
    ai_msg = create_message(
        conversation_id=conv_id,
        sender='ai',
        text=result['answer'],
        inferred=inferred_val,
        source_docs=json.dumps(result.get('source_docs', []))
    )
    
    return {
        'user_message': user_msg,
        'ai_message': ai_msg
    }


@router.get('/{conv_id}/export')
def export_chat_history(conv_id: str, format: str = Query('txt'), current_user: dict = Depends(get_current_user)):
    conv = get_conversation(conv_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if conv['user_id'] != current_user['id'] and current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Not authorized to export this conversation")
        
    messages = get_messages(conv_id)
    
    if format == 'json':
        output = io.BytesIO(json.dumps(messages, indent=2).encode('utf-8'))
        filename = f"chat-history-{conv_id}.json"
        media_type = 'application/json'
    else:
        # Default txt
        text_lines = []
        text_lines.append(f"Chat History - {conv['title']}")
        text_lines.append(f"Brand Key: {conv['brand_key']}")
        text_lines.append(f"Exported At: {datetime.utcnow().isoformat()}\n")
        text_lines.append("=" * 60 + "\n")
        
        for m in messages:
            sender_label = "You" if m['sender'] == 'user' else "Digitz AI"
            text_lines.append(f"[{m['created_at']}] {sender_label}: {m['text']}")
            if m.get('source_docs') and m['source_docs'] != '[]':
                try:
                    docs = json.loads(m['source_docs'])
                    citations = [d['title'] for d in docs]
                    text_lines.append(f"  (Sources: {', '.join(citations)})")
                except Exception:
                    pass
            text_lines.append("")
            
        output = io.BytesIO("\n".join(text_lines).encode('utf-8'))
        filename = f"chat-history-{conv_id}.txt"
        media_type = 'text/plain'
        
    output.seek(0)
    return StreamingResponse(
        output,
        media_type=media_type,
        headers={
            'Content-Disposition': f'attachment; filename="{filename}"',
        },
    )
