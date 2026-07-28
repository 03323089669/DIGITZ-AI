from .llm_router import generate_embedding

def get_embeddings(text: str) -> dict:
    """Return embeddings for a text input from active provider."""
    return {
        'input': text,
        'embedding': generate_embedding(text),
    }
