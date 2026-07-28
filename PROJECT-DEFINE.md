# PROJECT-DEFINE.md (Frontend/Backend + ChromaDB Connection)

> Ye document aapke project ke liye **one-place “define file” template** hai. Aap isko direct copy karke apne actual code concepts se map kar sakte ho. Isme:
> 1) Frontend/Backend ka brief definition
> 2) Suggested architecture & flow
> 3) ChromaDB (Chroma) ka connection ka proper define
> 4) Sample code blocks (Node.js/Express + Python/FastAPI style)
> 5) Important concepts (embeddings, vector store, retrieval)

---

## 1) Project Overview (1-2 lines)
**Digitz AI** ek web application/AI assistant platform hai jo user input leta hai, uska text embeddings banata hai, vector database (ChromaDB) me similarity search karta hai, relevant context nikaalta hai, aur phir LLM/model se response generate karta hai.

**Core idea:**
- UI (Frontend) → API (Backend) → Retrieval (ChromaDB) → Generation (LLM) → UI me output.

---

## 2) Frontend (Brief + Responsibilities)
### Frontend Definition
**Frontend** wo part hai jo browser me run hota hai (React/Vue/Next etc.). Iska kaam:
- User ko chat/input UI provide karna
- API calls karke backend se responses lena
- Loading/state/error handling
- Messages show karna (chat history)

### Typical Frontend Stack (examples)
- React / Next.js / Vue
- TailwindCSS / CSS Modules
- Fetch/Axios for API calls

### Frontend Key Concepts
- **Chat UI state:** `messages[]`, `isLoading`
- **API contract:** endpoints exactly same backend routes par call
- **Security:** API key ko frontend me expose na karein (backend proxy kare)

---

## 3) Backend (Brief + Responsibilities)
### Backend Definition
**Backend** wo server-side app hai jo APIs expose karta hai. Iska kaam:
- Authentication/validation (agar required)
- User request ko process karna
- Embeddings generate karna
- ChromaDB me query/search karna
- Relevant chunks/context assemble karke LLM ko dena
- Final response return karna

### Typical Backend Stack (examples)
**Option A:** Python + FastAPI
- `fastapi`, `uvicorn`

**Option B:** Node.js + Express
- `express`, `cors`, `dotenv`

### Backend Key Concepts
- **Vector store:** ChromaDB collection
- **Embeddings model:** text embeddings generate karta hai
- **Retriever:** query embeddings se similarity search
- **Context assembly:** top-k chunks ke saath prompt build

---

## 4) End-to-End Request Flow (Must Understand)
1. User UI me message type karta hai.
2. Frontend `POST /api/chat` (example) backend ko request bhejta hai.
3. Backend:
   - message ko embeddings me convert karta hai
   - ChromaDB me `similarity search` karta hai
   - top results se context banata hai
   - prompt/chain ke through LLM se answer nikaalta hai
4. Backend response JSON me frontend ko wapas deta hai.
5. Frontend chat me response show karta hai.

---

## 5) ChromaDB (Chroma) Connection — Proper Define
### ChromaDB kya hai?
ChromaDB ek **Vector Database** hai jo embeddings ko store karta hai aur similarity search karta hai.

### “Chroma connect” ka matlab
Do cheezen hoti hain:
1. **Chroma client/config** (persist ya in-memory)
2. **Collection setup** (collection name + embeddings function)

---

## 6) ChromaDB Setup Modes
### Mode 1: Persistent Storage (recommended)
- Data disk par store hota hai
- Next runs pe same embeddings/collections available rehte hain

### Mode 2: In-memory
- Restart ke baad data gone
- Testing ke liye

---

## 7) ChromaDB Data Model (Conceptual)
Har document chunk ke saath store hota hai:
- `id` (unique)
- `text` (chunk text)
- `metadata` (source, page, url, timestamp, user_id etc.)
- `embedding` (automatically generated via embeddings function)

---

## 8) Where ChromaDB connect hota hai? (Your Project Mapping)
Aapke project me usually files me yeh cheezen hoti hain:
- `db/` or `services/` me `chroma_client.py` / `chroma.js`
- `retrieval/` me `retrieve.py` / `retriever.ts`
- `routes/` me `chat.py` / `routes.ts`

**Is doc ka task:** aap in files ko search karke map kar lo.

---

## 9) Sample Code Block — Python (FastAPI + Chroma)
> Ye template hai. Apne embeddings provider ke hisaab se `Embeddings` part replace karein.

### 9.1 `chroma_store.py`
```python
import os
import chromadb

from chromadb.config import Settings

# Example: aapko Embeddings function define karni hogi
# from your_embeddings_lib import YourEmbeddings

CHROMA_PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "./chroma_data")
COLLECTION_NAME = os.getenv("CHROMA_COLLECTION", "digitz_collection")

def get_chroma_client():
    return chromadb.Client(
        settings=Settings(
            chroma_db_impl="duckdb+parquet",
            persist_directory=CHROMA_PERSIST_DIR,
        )
    )

def get_collection(embeddings_fn):
    client = get_chroma_client()
    return client.get_or_create_collection(
        name=COLLECTION_NAME,
        embedding_function=embeddings_fn,
    )
```

### 9.2 `ingest.py` (documents add)
```python
def ingest_chunks(collection, chunks):
    # chunks = [{"id": "1", "text": "...", "metadata": {...}}, ...]
    ids = [c["id"] for c in chunks]
    documents = [c["text"] for c in chunks]
    metadatas = [c["metadata"] for c in chunks]

    collection.add(
        ids=ids,
        documents=documents,
        metadatas=metadatas,
    )
```

### 9.3 `retrieve.py` (similarity search)
```python
def retrieve_context(collection, query_text, top_k=4):
    results = collection.query(
        query_texts=[query_text],
        n_results=top_k,
    )

    # results typically: {"documents": [[...]], "metadatas": [[...]], ...}
    docs = results.get("documents", [[]])[0]
    metas = results.get("metadatas", [[]])[0]

    context_parts = []
    for doc, meta in zip(docs, metas):
        context_parts.append(f"[SOURCE: {meta}]\n{doc}")

    return "\n\n".join(context_parts)
```

---

## 10) Sample Code Block — Node.js (Express + Chroma via JS)
> Chroma ka Node integration version dependent ho sakta hai. Aap apne installed SDK ke hisaab se adjust karein.

```js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;

    // 1) embeddings create (SDK/provider)
    // 2) chroma query (collection.query)
    // 3) build prompt
    // 4) call LLM

    return res.json({ answer: "Sample response" });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

app.listen(3000, () => console.log("Server running on 3000"));
```

---

## 11) API Contract (Recommended Endpoint Design)
### `POST /api/chat`
**Request:**
```json
{
  "message": "user text",
  "sessionId": "optional",
  "topK": 4
}
```

**Response:**
```json
{
  "answer": "final text",
  "sources": [
    {"metadata": {...}, "snippet": "..."}
  ]
}
```

---

## 12) Important Concepts (Short but Complete)
### 12.1 Embeddings
- Text → numeric vectors
- Same meaning vectors close hoti hain

### 12.2 Chunking
Documents ko chhote chunks me todte hain:
- e.g. 300-1000 tokens per chunk
- Overlap recommended (e.g. 50-100 tokens)

### 12.3 Similarity Search
- Query embedding se most similar stored chunks nikalna

### 12.4 Prompting
- Retrieved context ko LLM prompt me include karke grounded response
---

## 13) Security & Deployment Notes
- Frontend me LLM/Embedding API keys avoid
- Backend me `.env` se keys load
- Rate limiting (optional)
- Logging (request id/session id)

---

## 14) Configuration (What to Define in .env)
Example:
```env
CHROMA_PERSIST_DIR=./chroma_data
CHROMA_COLLECTION=digitz_collection

# Embeddings provider
EMBEDDINGS_MODEL=...

# LLM provider
LLM_MODEL=...
LLM_API_KEY=...
```

---

## 15) Project Checklist (Aapko map karna hai)
- [ ] Frontend entry: where UI renders chat
- [ ] Frontend API call: which backend route
- [ ] Backend route handler for chat
- [ ] Embeddings function file
- [ ] Chroma client/collection creation file
- [ ] Ingestion script (bulk add documents)
- [ ] Retrieval function (topK)
- [ ] Prompt builder + LLM call

---

## 16) Aapke Code ke according fill-in (How to customize)
Aap repo me apne actual files identify karke yahan fill kar do:
- **Chroma connect file path:** `__________`
- **Collection name:** `__________`
- **persist_directory / storage mode:** `__________`
- **Embedding function source/provider:** `__________`
- **Query function location:** `__________`

---

**End of document**

