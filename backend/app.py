import os
import shutil
import math
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
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from typing import Any
from urllib.parse import urlparse
from fastapi import UploadFile, File
from fastapi import HTTPException
import traceback
from io import BytesIO
import base64
from fastapi.responses import Response

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
    file:        UploadFile = File(...),
    country:     str        = Form("Unknown"),
    job_area:    str        = Form("Unknown"),
    source_type: str        = Form("Unknown"),
    target_group:str        = Form("Unknown"),
    owner:       str        = Form("Unknown"),
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

        # ── Insert each chunk with its embedding and metadata ──
        for chunk, emb in zip(chunks, embeddings):
            print("→ embedding length:", len(emb))
            print("→ writing to DB:", os.getenv("DB_HOST"), "/", os.getenv("DB_NAME"))

            cur.execute(
                """
                INSERT INTO documents
                  (filename, country, job_area, source_type,
                   target_group, owner, creation_date,
                   full_text, content_embedding)
                VALUES (%s,      %s,      %s,       %s,
                        %s,          %s,    %s,
                        %s,          %s)
                """,
                (
                    file.filename,
                    country,
                    job_area,
                    source_type,
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
    url:         str = Query(..., description="Webpage URL to ingest"),
    country:     str = Query("Unknown"),
    job_area:    str = Query("Unknown"),
    source_type: str = Query("HTML"),
    target_group:str = Query("Unknown"),
    owner:       str = Query("Unknown"),
):
    # 1) fetch page
    resp = requests.get(url)
    if resp.status_code != 200:
        raise HTTPException(status_code=400, detail=f"Failed to fetch {url}: {resp.status_code}")

    # 2) parse HTML → raw text
    soup      = BeautifulSoup(resp.text, "html.parser")
    full_text = " ".join(soup.stripped_strings)    # ← define full_text here!

    # 3) split into chunks
    chunks = chunk_text(full_text)                 # ← now chunks exists

    # 4) embed & store
    conn = get_db_connection()
    cur  = conn.cursor()
    for i, chunk in enumerate(chunks):
        emb = get_embedding(chunk)
        host = urlparse(url).netloc.replace(".", "_")
        fn   = host
        cur.execute(
            """
            INSERT INTO documents
              (filename, country, job_area, source_type,
               target_group, owner, creation_date,
               full_text, content_embedding)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
              fn, country, job_area, source_type,
              target_group, owner, date.today(),
              chunk, emb
            )
        )
    conn.commit()
    cur.close()
    conn.close()

    return {"detail": f"Ingested {len(chunks)} chunks from {url}"}

# ── Retrieval logic ──
def retrieve(
    query: str,
    k: int,
    country: Optional[str] = None,
    job_area: Optional[str] = None,
    source_type: Optional[str] = None
):
    q_emb = get_embedding(query)

    filters = []
    params = []
    if country:
        filters.append("country ILIKE %s");      params.append(f"%{country}%")
    if job_area:
        filters.append("job_area ILIKE %s");     params.append(f"%{job_area}%")
    if source_type:
        filters.append("source_type ILIKE %s");  params.append(f"%{source_type}%")

    where_sql = ""
    if filters:
        where_sql = "WHERE " + " AND ".join(filters)

    sql = f"""
      SELECT filename,
             full_text,
             content_embedding <=> (%s)::vector AS distance
        FROM documents
       {where_sql}
       ORDER BY distance ASC
       LIMIT %s
    """

    # embed param first, then any filter params, then k
    db_params = [q_emb] + params + [k]

    conn = get_db_connection()
    cur  = conn.cursor()
    cur.execute(sql, db_params)
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return rows

# ── Request schema ──
class QueryRequest(BaseModel):
    question:     str
    top_k:        int
    country:      Optional[str] = None
    job_area:     Optional[str] = None
    source_type:  Optional[str] = None

# ── Query endpoint ──
@app.post("/query")
def ask_question(req: QueryRequest):
    try:
        # if req.country/job_area/source_type are None ⇒ retrieves ALL;
        # otherwise only those matching the metadata
        hits = retrieve(
            query       = req.question,
            k           = req.top_k,
            country     = req.country,
            job_area    = req.job_area,
            source_type = req.source_type
        )
        return [
            {"filename": fn, "snippet": snip}
            for fn, snip, _ in hits
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

    # ── Utility to recursively drop NaN/Inf floats ──
def sanitize(obj):
    if isinstance(obj, dict):
        return {k: sanitize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [sanitize(v) for v in obj]
    if isinstance(obj, float):
        # replace NaN or Inf with 0.0
        return obj if math.isfinite(obj) else 0.0
    return obj


# ── Answer endpoint ──
@app.post("/answer")
def answer_question(req: QueryRequest):
    try:
        # 1) fetch top-k chunks, now with metadata filters
        hits = retrieve(
            query      = req.question,
            k          = req.top_k,
            country    = req.country,
            job_area   = req.job_area,
            source_type= req.source_type
        )

        # 2) build context
        context = "\n\n".join(chunk for _, chunk, _ in hits)

        # 3) query GPT
        prompt = (
            "You are a helpful assistant. Use ONLY the context below to answer.\n\n"
            f"Context:\n{context}\n\n"
            f"Question: {req.question}\nAnswer:"
        )
        resp = openai.ChatCompletion.create(
            model="gpt-4-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user",   "content": prompt},
            ],
        )
        answer = resp.choices[0].message.content.strip()

        # 4) build sources
        sources = [
            {"filename": fn, "similarity": 1.0 / (1.0 + dist)}
            for fn, _, dist in hits
        ]

        # 5) sanitize and return
        response_data = {"answer": answer, "sources": sources}
        safe = sanitize(response_data)
        return JSONResponse(content=safe)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    
# ── Search endpoint ──
@app.get("/search/")
def search(
    q: Optional[str] = Query(None),
    country: Optional[str] = Query(None),
    job_area: Optional[str] = Query(None),
    source_type: Optional[str] = Query(None),
    k: int = Query(5, ge=1, le=50)
):
    
    if not q or not q.strip():
        filters, params = [], []
        if country:     filters.append("country ILIKE %s");    params.append(f"%{country}%")
        if job_area:    filters.append("job_area ILIKE %s");   params.append(f"%{job_area}%")
        if source_type: filters.append("source_type ILIKE %s");params.append(f"%{source_type}%")
        where = "WHERE " + " AND ".join(filters) if filters else ""
        sql = f"""
        SELECT filename
        FROM documents
        {where}
        GROUP BY filename
        ORDER BY MAX(creation_date) DESC
        """
        cur = get_db_connection().cursor()
        cur.execute(sql, params)
        files = [r[0] for r in cur.fetchall()]
        cur.close()
        return JSONResponse(content=[{"filename":f, "snippet":""} for f in files])


    # 1) embed the query
    emb = get_embedding(q)

    # 2) build case‐insensitive filters
    filters = []
    params: list[Any] = []

    if country:
        filters.append("country ILIKE %s")
        params.append(f"%{country}%")
    if job_area:
        filters.append("job_area ILIKE %s")
        params.append(f"%{job_area}%")
    if source_type:
        filters.append("source_type ILIKE %s")
        params.append(f"%{source_type}%")

    where_sql = ""
    if filters:
        where_sql = "WHERE " + " AND ".join(filters)

    # 3) full SQL
    sql = f"""
        SELECT filename,
               substring(full_text, 1, 200) AS snippet
        FROM documents
        {where_sql}
        ORDER BY content_embedding <=> %s::vector
        LIMIT %s
    """
    # append our vector + limit
    params.extend([emb, k])

    # 4) query
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(sql, params)
    rows = cur.fetchall()
    cur.close()
    conn.close()

    # 5) return
    return JSONResponse(
      content=[{"filename": fn, "snippet": sn} for fn, sn in rows]
    )

# ── Metadata endpoint ──
@app.get("/metadata")
def list_metadata():
    conn = get_db_connection()
    cur  = conn.cursor()
    # Distinct countries
    cur.execute("SELECT DISTINCT country FROM documents ORDER BY country;")
    countries = [row[0] for row in cur.fetchall()]
    # Distinct job areas
    cur.execute("SELECT DISTINCT job_area FROM documents ORDER BY job_area;")
    job_areas = [row[0] for row in cur.fetchall()]
    # Distinct source types
    cur.execute("SELECT DISTINCT source_type FROM documents ORDER BY source_type;")
    source_types = [row[0] for row in cur.fetchall()]
    cur.close()
    conn.close()
    return {
        "countries": countries,
        "job_areas": job_areas,
        "source_types": source_types
    }
    
    # ── List all stored filenames ──
@app.get("/documents")
def list_documents(
    country: Optional[str] = Query(None, description="Filter by country"),
    job_area: Optional[str] = Query(None, description="Filter by job_area"),
    source_type: Optional[str] = Query(None, description="Filter by source_type"),
):
    conn = get_db_connection()
    cur  = conn.cursor()

    # build dynamic WHERE clauses
    filters = []
    params  = []
    if country:
        filters.append("country ILIKE %s")
        params.append(f"%{country}%")
    if job_area:
        filters.append("job_area ILIKE %s")
        params.append(f"%{job_area}%")
    if source_type:
        filters.append("source_type ILIKE %s")
        params.append(f"%{source_type}%")

    where_sql = ("WHERE " + " AND ".join(filters)) if filters else ""

    sql = f"""
      SELECT filename
        FROM documents
       {where_sql}
    GROUP BY filename
    ORDER BY MAX(creation_date) DESC
    """
    cur.execute(sql, params)
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

@app.post("/api/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """
    Reads an audio/webm blob, POSTs to OpenAI’s whisper transcription
    REST endpoint, and returns the transcript text.
    """
    try:
        # 1) Read raw bytes
        data = await file.read()

        # 2) Prepare multipart/form-data payload
        files = {
            "file": (file.filename, data, file.content_type),
        }
        # whisper only needs the model param
        payload = {
            "model":    "whisper-1",
            "language": "en"    # force English transcription
            }

        # 3) Call REST API
        resp = requests.post(
            "https://api.openai.com/v1/audio/transcriptions",
            headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
            data=payload,
            files=files,
        )
        resp.raise_for_status()

        # 4) Parse JSON and return
        json_ = resp.json()
        return {"transcript": json_["text"]}

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Transcription failed: {e}")
    


@app.post("/api/tts")
async def tts(text: str = Form(...)):
    """
    Receives `text` as form-data, calls OpenAI’s REST /v1/audio/speech endpoint,
    and returns raw MP3 bytes with the correct MIME type.
    """
    try:
        payload = {
            "model":  "tts-1",
            "voice":  "alloy",
            "input":  text,
            "format": "mp3",
            "stream": False
        }
        headers = {
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type":  "application/json"
        }

        # Send the request
        r = requests.post(
            "https://api.openai.com/v1/audio/speech",
            headers=headers,
            json=payload,
            timeout=60
        )
        r.raise_for_status()

        # If the response is raw audio, grab bytes directly
        content_type = r.headers.get("Content-Type", "")
        if content_type.startswith("audio/"):
            audio_bytes = r.content
        else:
            # Otherwise expect a JSON body with base64-encoded "audio"
            try:
                data = r.json()
            except ValueError:
                print("❌ TTS upstream returned invalid JSON:\n", r.text)
                raise HTTPException(
                    status_code=500,
                    detail="TTS failed: upstream returned invalid JSON"
                )

            audio_b64 = data.get("audio")
            if not audio_b64:
                print("❌ TTS JSON missing ‘audio’ key:", data)
                raise HTTPException(
                    status_code=500,
                    detail="TTS failed: no audio in response"
                )
            audio_bytes = base64.b64decode(audio_b64)

        # Return raw MP3 bytes
        return Response(content=audio_bytes, media_type="audio/mpeg")

    except HTTPException:
        # Re-throw known HTTPExceptions
        raise
    except Exception as e:
        # Log unexpected errors
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"TTS failed: {e}")



# ── Startup log ──
@app.on_event("startup")
def on_startup():
    print("🔌 SmartFusion RAG API starting…")
    print(f"✔️  OpenAI key loaded: {'yes' if openai.api_key else 'no'}")
    print("🚀  Endpoints: POST /ingest_pdf, /ingest_url, /query, /answer, GET /search, GET /documents, DELETE /documents")
