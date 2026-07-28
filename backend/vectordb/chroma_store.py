import chromadb
import traceback
import sys
import time as _time
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
CHROMA_DB_PATH = BASE_DIR / "chroma_db"
EXPECTED_EMBEDDING_DIM = 384  # all-MiniLM-L6-v2


class ChromaStore:
    def __init__(self):
        print(f"[CHROMA] Initializing PersistentClient at: {CHROMA_DB_PATH}"); sys.stdout.flush()
        self.client = chromadb.PersistentClient(path=str(CHROMA_DB_PATH))
        collections = [c.name for c in self.client.list_collections()]
        print(f"[CHROMA] Client ready. Existing collections: {collections}"); sys.stdout.flush()

    def _get_collection(self, collection_name: str = "default", verbose: bool = False):
        """Get or create collection. Normalizes name: lowercase, underscores, no 'brand_' prefix for standard keys."""
        safe_name = collection_name.lower().replace(" ", "_")
        # Only add brand_ prefix if name is too short (e.g., single chars)
        if len(safe_name) < 2:
            safe_name = f"brand_{safe_name}"
        if verbose:
            print(f"[CHROMA] get_or_create_collection(name='{safe_name}')")
        return self.client.get_or_create_collection(name=safe_name)

    def get_collection_info(self, brand_key: str) -> dict:
        """Get detailed collection info for diagnostics."""
        try:
            collection = self._get_collection(brand_key or "default")
            count = collection.count()
            return {
                "name": collection.name,
                "count": count,
                "exists": True,
                "path": str(CHROMA_DB_PATH / collection.name),
                "embedding_dim": EXPECTED_EMBEDDING_DIM,
            }
        except Exception as e:
            return {
                "name": brand_key,
                "count": 0,
                "exists": False,
                "error": str(e),
            }

    def verify_collection(self, brand_key: str) -> dict:
        """Verify if a collection is healthy and contains valid embeddings."""
        result = {
            "brand_key": brand_key,
            "collection_name": None,
            "count": 0,
            "healthy": False,
            "corrupted": False,
            "details": "",
        }
        try:
            collection = self._get_collection(brand_key or "default")
            result["collection_name"] = collection.name
            count = collection.count()
            result["count"] = count

            if count == 0:
                result["corrupted"] = True
                result["details"] = f"Collection '{collection.name}' exists but has 0 documents."
                return result

            # Peek at one record to verify dimension
            try:
                peek = collection.peek()
                if peek and peek.get("embeddings") and len(peek["embeddings"]) > 0:
                    dim = len(peek["embeddings"][0])
                    result["embedding_dim"] = dim
                    if dim != EXPECTED_EMBEDDING_DIM:
                        result["corrupted"] = True
                        result["details"] = f"Embedding dim mismatch: got {dim}, expected {EXPECTED_EMBEDDING_DIM}"
                        return result
                    result["healthy"] = True
                    result["details"] = f"Healthy collection with {count} documents, dim={dim}"
                else:
                    result["corrupted"] = True
                    result["details"] = "Collection peek returned empty embeddings"
            except Exception as peek_e:
                result["corrupted"] = True
                result["details"] = f"Collection peek failed: {peek_e}"

        except Exception as e:
            result["details"] = f"Collection access error: {e}"

        return result

    def upsert_chunk(self, brand_key: str, document_id: str, doc_title: str,
                     chunk_index: int, chunk_text: str, embedding: list[float]):
        """Insert or update a single chunk in ChromaDB with verification."""
        start = _time.time()
        try:
            collection = self._get_collection(brand_key or "default", verbose=True)
            chunk_id = f"{document_id}_{chunk_index}"
            metadata = {
                "document_id": document_id,
                "document_title": doc_title,
                "brand": brand_key,
                "chunk_index": chunk_index
            }
            emb_len = len(embedding) if embedding else 0
            print(f"[CHROMA_UPSERT] collection='{collection.name}' chunk_id='{chunk_id}' "
                  f"text_len={len(chunk_text)} emb_dim={emb_len}")

            collection.upsert(
                ids=[chunk_id],
                embeddings=[embedding],
                documents=[chunk_text],
                metadatas=[metadata]
            )

            elapsed = _time.time() - start
            post_count = collection.count()
            print(f"[CHROMA_UPSERT] OK. Collection count now: {post_count} (took {elapsed:.3f}s)")
            sys.stdout.flush()

            # Verify upsert was successful
            if post_count == 0:
                print(f"[CHROMA_WARN] Upsert reported success but collection count is STILL 0!")
                sys.stdout.flush()

        except Exception as e:
            print(f"[CHROMA_ERROR] upsert_chunk failed: {e}")
            traceback.print_exc()
            raise

    def query(self, brand_key: str, query_text: str, top_k: int = 5):
        """Query ChromaDB. Returns hits or empty list on any issue."""
        try:
            print(f"[CHROMA_QUERY] brand_key='{brand_key}' top_k={top_k} query='{query_text[:60]}...'")
            sys.stdout.flush()

            collection = self._get_collection(brand_key or "default", verbose=True)
            count = collection.count()
            print(f"[CHROMA_QUERY] Collection '{collection.name}' count = {count}")
            sys.stdout.flush()

            if count == 0:
                print(f"[CHROMA_QUERY] Collection '{collection.name}' is EMPTY.")
                return []

            n_results = min(top_k, count)
            q_start = _time.time()

            try:
                # Primary Strategy: Generate query embedding and query with it directly.
                # This guarantees that local sentence-transformers dim (384) is used explicitly.
                from core.llm_router import generate_embedding
                q_emb = generate_embedding(query_text)
                if q_emb:
                    print(f"[CHROMA_QUERY] Querying with embedding dim={len(q_emb)}")
                    results = collection.query(
                        query_embeddings=[q_emb],
                        n_results=n_results,
                        include=["documents", "metadatas", "distances"]
                    )
                else:
                    raise ValueError("Embedding generation returned None")
            except Exception as e1:
                print(f"[CHROMA_QUERY] Query by embedding failed ({e1}). Trying fallback query_texts...")
                results = collection.query(
                    query_texts=[query_text],
                    n_results=n_results,
                    include=["documents", "metadatas", "distances"]
                )

            hits = []
            if results and results.get("documents") and len(results["documents"]) > 0:
                docs = results["documents"][0]
                metas = results["metadatas"][0] if results.get("metadatas") else [{}] * len(docs)
                distances = results["distances"][0] if results.get("distances") else [0.0] * len(docs)
                ids_list = results["ids"][0] if results.get("ids") else [""] * len(docs)

                print(f"[CHROMA_QUERY] Retrieved {len(docs)} documents from Chroma")
                for idx, (doc, meta, dist, cid) in enumerate(zip(docs, metas, distances, ids_list)):
                    sim = max(0.0, 1.0 - (dist / 2.0)) if dist is not None else 0.8
                    brand_from_meta = (meta or {}).get("brand", brand_key)
                    print(f"[CHROMA_QUERY]   Hit #{idx}: id='{cid}' sim={sim:.4f} brand='{brand_from_meta}' "
                          f"doc_len={len(doc)}")
                    hits.append({
                        "document": doc,
                        "metadata": meta or {},
                        "similarity": sim
                    })
            else:
                print(f"[CHROMA_QUERY] No results returned. Keys: {list(results.keys()) if results else 'None'}")

            return hits

        except Exception as e:
            print(f"[CHROMA_ERROR] query() exception: {e}")
            traceback.print_exc()
            return []

    def list_collections(self):
        try:
            collections = self.client.list_collections()
            res = []
            for c in collections:
                cnt = c.count()
                print(f"[CHROMA_LIST] Collection: '{c.name}' count={cnt}")
                res.append({"name": c.name, "count": cnt})
            return res
        except Exception as e:
            print(f"[CHROMA_ERROR] list_collections: {e}")
            return []

    def get_collection_count(self, brand_key: str) -> int:
        """Get document count for a specific brand collection."""
        try:
            collection = self._get_collection(brand_key or "default")
            return collection.count()
        except Exception:
            return 0


store = ChromaStore()
