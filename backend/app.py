import os
from datetime import date
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
import fitz  # PyMuPDF
import psycopg2
import openai

# ── Load env & initialize clients ──
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY missing in .env")
openai.api_key = OPENAI_API_KEY

# Local embedder
model = SentenceTransformer("BAAI/bge-small-en-v1.5")

# ── FastAPI setup ──
app = FastAPI(title="SmartFusion RAG API")

# ── CORS (allow your React dev server) ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
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

# ── PDF extraction & chunking ──
def extract_pdf_text(path: str) -> str:
    try:
        pages = []
        with fitz.open(path) as doc:
            for page in doc:
                pages.append(page.get_text())
        return "\n".join(pages)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF extraction failed: {e}")

def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> list[str]:
    chunks, start, L = [], 0, len(text)
    while start < L:
        end = min(start + chunk_size, L)
        chunks.append(text[start:end])
        start += chunk_size - overlap
    return chunks

# ── Ingest endpoint ──
@app.post("/ingest_pdf")
async def ingest_pdf(
    file: UploadFile = File(...),
    country: str = "Unknown",
    target_group: str = "Unknown",
    owner: str = "Unknown"
):
    # 1) Save uploaded file
    temp_path = f"/tmp/{file.filename}"
    contents = await file.read()
    with open(temp_path, "wb") as f:
        f.write(contents)

    # 2) Extract & chunk
    full_text = extract_pdf_text(temp_path)
    chunks = chunk_text(full_text)

    # 3) Embed & insert
    conn = get_db_connection()
    cur = conn.cursor()
    for chunk in chunks:
        emb = model.encode(chunk).tolist()
        cur.execute(
            """
            INSERT INTO documents
              (filename, country, target_group, owner, creation_date, full_text, content_embedding)
            VALUES (%s,%s,%s,%s,%s,%s,%s)
            """,
            (file.filename, country, target_group, owner, date.today(), chunk, emb)
        )
    conn.commit()
    cur.close()
    conn.close()

    return {"detail": f"Ingested {len(chunks)} chunks from {file.filename}"}

# ── Retrieval logic ──
def retrieve(query: str, k: int = 5):
    q_emb = model.encode(query).tolist()
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT filename, substring(full_text,1,150) AS snippet
        FROM documents
        ORDER BY content_embedding <=> (%s)::vector
        LIMIT %s
        """,
        (q_emb, k),
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return rows

# ── Request schema ──
class QueryRequest(BaseModel):
    question: str
    top_k: int = 5

# ── Endpoints ──
@app.post("/query")
def ask_question(req: QueryRequest):
    try:
        hits = retrieve(req.question, req.top_k)
        return [{"filename": fn, "snippet": snip} for fn, snip in hits]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/answer")
def answer_question(req: QueryRequest):
    try:
        # 1. fetch chunks
        hits = retrieve(req.question, req.top_k)
        context = "\n\n".join(snip for _, snip in hits)

        # 2. build prompt
        prompt = (
            "Use the following context to answer the question:\n\n"
            f"{context}\n\nQuestion: {req.question}\nAnswer:"
        )

        # 3. call ChatCompletion
        resp = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": prompt},
            ],
        )
        answer = resp.choices[0].message.content
        return {"answer": answer}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── Startup log ──
@app.on_event("startup")
def on_startup():
    print("🔌 SmartFusion RAG API starting…")
    print(f"✔️  OpenAI key loaded: {'yes' if openai.api_key else 'no'}")
    print("🚀  Endpoints: POST /ingest_pdf, /query, /answer")
