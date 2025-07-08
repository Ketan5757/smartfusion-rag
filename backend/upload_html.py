import os
from datetime import date
from dotenv import load_dotenv
import requests
from bs4 import BeautifulSoup
from sentence_transformers import SentenceTransformer
import psycopg2

# --- Load config + model ---
load_dotenv()
model = SentenceTransformer("BAAI/bge-small-en-v1.5")

# --- DB connection (reuse your helper) ---
def get_db_connection():
    required = ["DB_NAME","DB_USER","DB_PASSWORD","DB_HOST","DB_PORT"]
    missing = [v for v in required if not os.getenv(v)]
    if missing:
        raise RuntimeError(f"Missing env vars: {missing}")
    return psycopg2.connect(
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT")
    )

conn = get_db_connection()
cur = conn.cursor()

# --- Helpers from upload_pdf.py ---
def chunk_text(text: str, chunk_size: int=1000, overlap: int=200):
    chunks, start = [], 0
    length = len(text)
    while start < length:
        end = min(start + chunk_size, length)
        chunks.append(text[start:end])
        start += chunk_size - overlap
    return chunks

def get_embedding(text: str):
    return model.encode(text).tolist()

def insert_into_db(filename, country, target_group, owner, full_text, embedding):
    cur.execute(
        """
        INSERT INTO documents
        (filename,
        country,
        job_area,
        source_type,
        target_group,
        owner,
        creation_date,
        full_text,
        content_embedding)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        ( filename,
         country,
         "Unknown",   # or pull from args
         "HTML",
         target_group,
         owner,
         date.today(),
         full_text,
         embedding
         )
         )
    conn.commit()
    conn.commit()

# --- Main HTML ingestion ---
if __name__ == "__main__":
    url = input("Enter URL to ingest: ").strip()
    print(f"🌐 Fetching {url} …")
    resp = requests.get(url)
    if resp.status_code != 200:
        print(f"❌ Failed to fetch URL: {resp.status_code}")
        exit(1)

    # Extract visible text
    soup = BeautifulSoup(resp.text, "html.parser")
    text = " ".join(soup.stripped_strings)
    print(f"📄 Extracted {len(text)} characters of text.")

    # Chunk & embed
    chunks = chunk_text(text, chunk_size=1000, overlap=200)
    print(f"🔀 Split into {len(chunks)} chunks.")

    for i, chunk in enumerate(chunks):
        print(f"   • Processing chunk {i+1}/{len(chunks)}…")
        emb = get_embedding(chunk)
        insert_into_db(
            filename=f"{url}_chunk{i}",
            country="Germany",
            target_group="Students",
            owner="Ketan",
            full_text=chunk,
            embedding=emb
        )

    print("✅ All HTML chunks processed and stored.")
    cur.close()
    conn.close()
