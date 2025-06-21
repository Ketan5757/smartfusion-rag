import os
import shutil
from datetime import date
from typing import Optional
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
import fitz  # PyMuPDF
import psycopg2
import openai
import requests
from bs4 import BeautifulSoup
from fastapi import Query
from langchain.text_splitter import RecursiveCharacterTextSplitter
import traceback
from fastapi import HTTPException


# ── Setup upload directory ──
BASE_DIR = os.path.dirname(__file__)
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ── Load env & initialize clients ──
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY missing in .env")
openai.api_key = OPENAI_API_KEY

# Text embedding model 
def get_embedding(text: str) -> list[float]:
    response = openai.Embedding.create(
        input=text,
        model="text-embedding-3-small" 
    )
    return response['data'][0]['embedding']

# ── FastAPI setup ──
app = FastAPI(title="SmartFusion RAG API")

# ── CORS (allow your React dev server) ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Database connection helper ──
def get_db_connection():
    try:
        return psycopg2.connect(
            dbname=os.getenv("DB_NAME"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            host=os.getenv("DB_HOST"),
            port=os.getenv("DB_PORT"),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB connection failed: {e}")

# ── PDF/Text extraction & chunking ──
def extract_pdf_text(path: str) -> str:
    try:
        pages = []
        with fitz.open(path) as doc:
            for page in doc:
                # Use block layout to preserve structure
                blocks = page.get_text("blocks")  # (x0, y0, x1, y1, "text", block_no, block_type)
                blocks = sorted(blocks, key=lambda b: (b[1], b[0]))  # sort top-to-bottom, then left-to-right
                page_text = "\n".join(block[4].strip() for block in blocks if block[4].strip())
                pages.append(page_text)
        return "\n".join(pages)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF extraction failed: {e}")

def chunk_text(text: str, chunk_size: int = 800, overlap: int = 100) -> list[str]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=overlap,
        separators=["\n\n", "\n", ".", " "],  # smart fallbacks
        keep_separator=True
    )
    return splitter.split_text(text)

# ── Ingest PDF endpoint ──
@app.post("/ingest_pdf")
async def ingest_pdf(
    file: UploadFile = File(...),
    country: str = Form("Unknown"),
    target_group: str = Form("Unknown"),
    owner: str = Form("Unknown"),
):
    try:
        # ── Save upload to disk ──
        temp_path = os.path.join(UPLOAD_DIR, file.filename)
        file.file.seek(0)
        with open(temp_path, "wb") as out:
            shutil.copyfileobj(file.file, out)
        size = os.path.getsize(temp_path)

        # ── Quick open/auth check ──
        open_error = None
        try:
            doc = fitz.open(temp_path)
            if doc.is_encrypted and not doc.authenticate(""):
                open_error = "encrypted or password-protected"
            doc.close()
        except Exception as e:
            open_error = str(e)
        if open_error:
            return {
                "detail": "🚨 PDF open failed",
                "written_bytes": size,
                "open_error": open_error
            }

        # ── Extract & chunk ──
        full_text = extract_pdf_text(temp_path)
        chunks    = chunk_text(full_text)
        for i, ch in enumerate(chunks):
            print(f"🧩 Chunk {i+1}:\n{ch[:80]}...\n")

        # ── Connect & batch-embed ──
        conn = get_db_connection()
        cur  = conn.cursor()

        resp = openai.Embedding.create(
            input=chunks,
            model="text-embedding-3-small"
        )
        embeddings = [d["embedding"] for d in resp["data"]]

        # ── Insert each chunk with its embedding ──
        for chunk, emb in zip(chunks, embeddings):
            # ── DEBUG ──
            print("→ embedding length:", len(emb))
            print("→ writing to DB:", os.getenv("DB_HOST"), "/", os.getenv("DB_NAME"))

            cur.execute(
                """
                INSERT INTO documents
                  (filename, country, target_group, owner, creation_date, full_text, content_embedding)
                VALUES (%s,%s,%s,%s,%s,%s,%s)
                """,
                (
                    file.filename,
                    country,
                    target_group,
                    owner,
                    date.today(),
                    chunk,
                    emb
                )
            )

        conn.commit()
        cur.close()
        conn.close()

        return {
            "detail": f"Ingested {len(chunks)} chunks from {file.filename}",
            "written_bytes": size
        }

    except Exception as e:
        print("❌ ERROR in ingest_pdf:\n", traceback.format_exc())
        raise HTTPException(status_code=500, detail="Internal Server Error")

# ── Ingest URL endpoint ──
@app.post("/ingest_url")
async def ingest_url(
    url: str = Query(..., description="Webpage URL to ingest"),
    country: str = Query("Unknown"),
    target_group: str = Query("Unknown"),
    owner: str = Query("Unknown")
):
    resp = requests.get(url)
    if resp.status_code != 200:
        raise HTTPException(status_code=400, detail=f"Failed to fetch {url}: {resp.status_code}")
    soup = BeautifulSoup(resp.text, "html.parser")
    full_text = " ".join(soup.stripped_strings)
    chunks = chunk_text(full_text)

    conn = get_db_connection()
    cur = conn.cursor()
    for i, chunk in enumerate(chunks):
        emb = get_embedding(chunk)
        # ── DEBUG ──
    print("→ embedding length:", len(emb))
    print("→ writing to DB:", os.getenv("DB_HOST"), "/", os.getenv("DB_NAME"))
    cur.execute(
            """
            INSERT INTO documents
              (filename, country, target_group, owner, creation_date, full_text, content_embedding)
            VALUES (%s,%s,%s,%s,%s,%s,%s)
            """,
            (f"{url}_chunk{i}", country, target_group, owner, date.today(), chunk, emb)
        )
    conn.commit()
    cur.close()
    conn.close()

    return {"detail": f"Ingested {len(chunks)} chunks from {url}"}

# ── Retrieval logic ──
def retrieve(query: str, k: int = 5):
    # 1) Encode the user’s question
    q_emb = get_embedding(query)

    # 2) Build a global search over all chunks
    sql = """
      SELECT filename,
             full_text,
             content_embedding <=> (%s)::vector AS distance
        FROM documents
       ORDER BY distance ASC
       LIMIT %s
    """
    params = [q_emb, k]

    # (optional) debug print
    print("🔍 SQL:", sql.replace("\n", " "))
    print("🔢 params:", params)

    conn = get_db_connection()
    cur  = conn.cursor()
    cur.execute(sql, params)
    rows = cur.fetchall()
    print(f"✅ Retrieved {len(rows)} chunks across all PDFs")
    cur.close()
    conn.close()
    return rows

# ── Request schema ──
class QueryRequest(BaseModel):
    question: str
    top_k:    int              = 5
    filename: Optional[str]    = None

# ── Query endpoint ──
@app.post("/query")
def ask_question(req: QueryRequest):
    try:
        # retrieve across all PDFs
        hits = retrieve(req.question, req.top_k)
        return [
            {"filename": fn, "snippet": snip}
            for fn, snip, _ in hits
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Answer endpoint ──
@app.post("/answer")
def answer_question(req: QueryRequest):
    try:
        # 1) fetch top-k chunks globally
        hits = retrieve(req.question, req.top_k)

        # 2) build the combined context
        context = "\n\n".join(chunk for _, chunk, _ in hits)

        # 3) ask GPT using only that context
        prompt = (
            "You are a helpful assistant. Use ONLY the context below to answer.\n\n"
            f"Context:\n{context}\n\n"
            f"Question: {req.question}\nAnswer:"
        )
        resp = openai.ChatCompletion.create(
            model="gpt-4-turbo",
            messages=[
                {"role": "system",  "content": "You are a helpful assistant."},
                {"role": "user",    "content": prompt},
            ],
        )
        answer = resp.choices[0].message.content.strip()

        # 4) return the answer plus which files it came from
        sources = [
            {"filename": fn, "similarity": round(1.0/(1.0+dist), 3)}
            for fn, _, dist in hits
        ]

        return {"answer": answer, "sources": sources}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    # ── List all stored filenames ──
@app.get("/documents")
def list_documents():
    conn = get_db_connection()
    cur  = conn.cursor()
    cur.execute("""
      SELECT filename
        FROM documents
    GROUP BY filename
    ORDER BY MAX(creation_date) DESC
    """)
    files = [row[0] for row in cur.fetchall()]
    cur.close()
    conn.close()
    return files

# ── Delete a document’s chunks by filename ──
@app.delete("/documents")
def delete_document(filename: str = Query(..., description="Filename to delete")):
    conn = get_db_connection()
    cur  = conn.cursor()
    cur.execute("DELETE FROM documents WHERE filename = %s;", (filename,))
    conn.commit()
    cur.close()
    conn.close()
    return {"detail": f"Deleted all chunks for {filename}"}

    
# ── Startup log ──
@app.on_event("startup")
def on_startup():
    print("🔌 SmartFusion RAG API starting…")
    print(f"✔️  OpenAI key loaded: {'yes' if openai.api_key else 'no'}")
    print("🚀  Endpoints: POST /ingest_pdf, /ingest_url, /query, /answer")
