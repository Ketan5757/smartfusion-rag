import os
from datetime import date
from dotenv import load_dotenv
# from sentence_transformers import SentenceTransformer  # ← COMMENTED OUT
import fitz  # PyMuPDF
import psycopg2
from psycopg2.extras import Json

print("▶️ upload_pdf.py starting (stubbed embeddings)…")

# --- Load Environment Variables ---
load_dotenv()

# Debug: print loaded env vars
print("🔧 DB_NAME:", os.getenv("DB_NAME"))
print("🔧 DB_USER:", os.getenv("DB_USER"))
print("🔧 DB_HOST:", os.getenv("DB_HOST"), "DB_PORT:", os.getenv("DB_PORT"))

# --- Initialize Embedding Model (STUBBED) ---  
# model = SentenceTransformer("text-embedding-3-small")

# --- Database Connection ---
def get_db_connection():
    required = ["DB_NAME","DB_USER","DB_PASSWORD","DB_HOST","DB_PORT"]
    missing = [v for v in required if not os.getenv(v)]
    if missing:
        raise RuntimeError(f"Missing env vars: {missing}")
    conn = psycopg2.connect(
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
    )
    with conn.cursor() as c:
        c.execute("SELECT current_database()")
        print("✅ Connected to:", c.fetchone()[0])
    return conn

conn = get_db_connection()
cur  = conn.cursor()

# --- Core Functions ---
def extract_pdf_text(path):
    try:
        pages = []
        with fitz.open(path) as d:
            for p in d: pages.append(p.get_text())
        return "\n".join(pages)
    except Exception as e:
        print("PDF extract failed:", e)
        exit(1)

def chunk_text(text, chunk_size=1000, overlap=200):
    chunks, i = [], 0
    while i < len(text):
        chunks.append(text[i : i+chunk_size])
        i += chunk_size - overlap
    return chunks

def get_embedding(text):
    # 🛑 stubbed embedding so we can test inserts
    return [0.0] * 1536

def insert_into_db(fn, country, tg, owner, full_text, emb, job_area, source_type, metadata):
    print("📥 Inserting with values:")
    print("   filename   :", fn)
    print("   country    :", country)
    print("   target_group:", tg)
    print("   owner      :", owner)
    print("   job_area   :", job_area)
    print("   source_type:", source_type)
    print("   metadata   :", metadata)
    try:
        cur.execute(
            """
            INSERT INTO documents
              (filename, country, target_group, owner, creation_date,
               full_text, content_embedding, job_area, source_type, metadata)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """,
            (fn, country, tg, owner, date.today(),
             full_text, emb, job_area, source_type, Json(metadata))
        )
        conn.commit()
    except Exception as e:
        print("❌ Insert failed:", e)
        conn.rollback()
        exit(1)

# --- Main ---
if __name__ == "__main__":
    pdf = "Uploads/SRH_Transcript.pdf"
    if not os.path.exists(pdf):
        print("❌ PDF not found:", pdf); exit(1)

    print("📄 Extracting text…")
    text = extract_pdf_text(pdf)
    print(f"   Got {len(text)} chars")

    print("🔀 Chunking…")
    chunks = chunk_text(text)
    print(f"   {len(chunks)} chunks")

    for idx, chunk in enumerate(chunks, 1):
        print(f"   → chunk {idx}/{len(chunks)}")
        emb = get_embedding(chunk)
        insert_into_db(
            fn=f"{os.path.basename(pdf)}_chunk{idx}",
            country="Germany",
            tg="Students",
            owner="Ketan",
            full_text=chunk,
            emb=emb,
            job_area="Computer Science",
            source_type="PDF",
            metadata={"lang":"en","format":"resume"}
        )

    print("✅ Done inserting all chunks")
    cur.close()
    conn.close()
