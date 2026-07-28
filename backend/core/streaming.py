"""
Real streaming support for Digitz AI using Server-Sent Events (SSE).
Provides token-by-token streaming from the active LLM provider.
"""
import json
import asyncio
from typing import AsyncGenerator

import requests

from .db import get_setting
from .llm_router import PROVIDERS, _resolve_api_key, _openai_headers
from .logging import get_logger

logger = get_logger(__name__)


async def stream_llm_response(
    prompt: str,
    system_instructions: str = "",
    chunk_size: int = 5,
) -> AsyncGenerator[str, None]:
    """Stream tokens from the active provider using SSE.

    Yields JSON-encoded token events: {"token": "Hello", "done": false}
    Final event: {"token": "", "done": true}
    On error: {"error": "message"}
    """
    provider = get_setting('active_provider', 'groq').lower()
    cfg = PROVIDERS.get(provider)
    if not cfg:
        yield json.dumps({"error": f"Unknown provider '{provider}'"})
        return

    api_key = _resolve_api_key(cfg)
    if not api_key:
        yield json.dumps({"error": f"No API key configured for {cfg.name}"})
        return

    url = cfg.chat_url
    model = cfg.chat_model
    headers = cfg.headers_fn(api_key) if cfg.headers_fn else _openai_headers(api_key)

    # Build streaming payload
    if provider == 'gemini':
        combined = f"{system_instructions}\n\n{prompt}" if system_instructions else prompt
        payload = {
            "contents": [{"role": "user", "parts": [{"text": combined}]}],
            "generationConfig": {"temperature": 0.2},
        }
        stream_url = f"{url}?alt=sse&key={api_key}"
    elif provider == 'claude':
        payload = {
            "model": model,
            "max_tokens": 1024,
            "stream": True,
            "system": system_instructions or "You are a helpful assistant.",
            "messages": [{"role": "user", "content": prompt}],
        }
        stream_url = url
    else:
        # OpenAI-compatible (Groq, OpenAI, DeepSeek)
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_instructions or "You are a helpful assistant."},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.3,
            "stream": True,
        }
        stream_url = url

    try:
        loop = asyncio.get_event_loop()
        resp = await loop.run_in_executor(
            None,
            lambda: requests.post(stream_url, headers=headers, json=payload, stream=True, timeout=120),
        )

        if resp.status_code != 200:
            error_text = resp.text[:200]
            logger.error(f"Streaming {cfg.name} error: {resp.status_code} - {error_text}")
            yield json.dumps({"error": f"{cfg.name} returned error ({resp.status_code}): {error_text}"})
            return

        buffer = ""
        for chunk in resp.iter_content(chunk_size=None, decode_unicode=True):
            if not chunk:
                continue

            if provider == 'gemini':
                # Gemini SSE format: data: {...}
                for line in chunk.split('\n'):
                    line = line.strip()
                    if line.startswith('data: '):
                        try:
                            data = json.loads(line[6:])
                            candidates = data.get('candidates', [])
                            if candidates:
                                content = candidates[0].get('content', {})
                                parts = content.get('parts', [])
                                for part in parts:
                                    token = part.get('text', '')
                                    if token:
                                        yield json.dumps({"token": token, "done": False})
                        except json.JSONDecodeError:
                            pass
            elif provider == 'claude':
                # Claude SSE format: event: content_block_delta / message_stop
                buffer += chunk
                while '\n' in buffer:
                    line, buffer = buffer.split('\n', 1)
                    line = line.strip()
                    if line.startswith('data: '):
                        try:
                            data = json.loads(line[6:])
                            if data.get('type') == 'content_block_delta':
                                delta = data.get('delta', {})
                                token = delta.get('text', '')
                                if token:
                                    yield json.dumps({"token": token, "done": False})
                        except json.JSONDecodeError:
                            pass
            else:
                # OpenAI-compatible SSE format: data: {"choices":[{"delta":{"content":"Hello"}}]}
                buffer += chunk
                while '\n' in buffer:
                    line, buffer = buffer.split('\n', 1)
                    line = line.strip()
                    if line == 'data: [DONE]':
                        break
                    if line.startswith('data: '):
                        try:
                            data = json.loads(line[6:])
                            choices = data.get('choices', [])
                            if choices:
                                delta = choices[0].get('delta', {})
                                token = delta.get('content', '')
                                if token:
                                    yield json.dumps({"token": token, "done": False})
                                finish_reason = choices[0].get('finish_reason')
                                if finish_reason:
                                    if finish_reason == 'stop':
                                        pass  # will send done below
                        except json.JSONDecodeError:
                            pass

        yield json.dumps({"token": "", "done": True})

    except requests.exceptions.Timeout:
        yield json.dumps({"error": "Request timed out. Please try again."})
    except Exception as e:
        logger.error(f"Streaming error: {e}")
        yield json.dumps({"error": f"Streaming failed: {str(e)[:100]}"})

