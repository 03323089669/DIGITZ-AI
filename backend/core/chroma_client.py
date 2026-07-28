import chromadb
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
CHROMA_DB_PATH = BASE_DIR / "chroma_db"


def get_chroma_client():
    # Local persistent ChromaDB (data stored in backend/chroma_db)
    return chromadb.PersistentClient(path=str(CHROMA_DB_PATH))


def verify_chroma():
    client = get_chroma_client()
    collections = client.list_collections()
    print(f"Available collections: {[c.name for c in collections]}")

    # Check data for Nestle
    try:
        nestle = client.get_collection("nestle")
        print(f"Documents count in Nestle: {nestle.count()}")
    except Exception:
        print("Nestle collection not found.")


if __name__ == "__main__":
    verify_chroma()