import json
import requests

from .settings import settings


def create_groq_client():
    if not settings.groq_api_key:
        return {
            'provider': 'groq',
            'status': 'missing_api_key',
            'note': 'Set GROQ_API_KEY in backend/.env or environment variables.',
        }

    return {
        'provider': 'groq',
        'status': 'configured',
        'model': settings.groq_model,
        'endpoint': settings.groq_api_url,
    }


def ask_groq(prompt: str) -> str:
    if not settings.groq_api_key:
        return (
            'Groq API key is not configured. Install your key in backend/.env as GROQ_API_KEY and restart the server.'
        )

    payload = {
        'model': settings.groq_model,
        'input': prompt,
    }
    headers = {
        'Authorization': f'Bearer {settings.groq_api_key}',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    }

    url = settings.groq_api_url.rstrip('/') + '/responses'
    response = requests.post(url, headers=headers, json=payload, timeout=30)

    if response.status_code != 200:
        body = response.text
        return f'Groq API request failed ({response.status_code}): {body}'

    data = response.json()

    def extract_text(item):
        if item is None:
            return ''
        if isinstance(item, str):
            return item
        if isinstance(item, dict):
            item_type = item.get('type')
            if item_type == 'reasoning_text':
                return ''
            if item_type == 'message' and item.get('role') == 'assistant':
                return extract_text(item.get('content'))
            if item_type == 'output_text' and isinstance(item.get('text'), str):
                return item['text']
            if 'output_text' in item and isinstance(item['output_text'], str):
                return item['output_text']
            if 'content' in item:
                return extract_text(item['content'])
            if 'output' in item:
                return extract_text(item['output'])
            if 'text' in item and isinstance(item['text'], str):
                return item['text']
        if isinstance(item, list):
            pieces = [extract_text(child) for child in item]
            return ' '.join([piece for piece in pieces if piece])
        return ''

    answer = ''
    if isinstance(data, dict):
        answer = extract_text(data.get('content')) or extract_text(data.get('output'))
    if not answer:
        answer = extract_text(data)
    return answer.strip() or json.dumps(data, indent=2)
