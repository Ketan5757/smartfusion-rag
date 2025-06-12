# backend/app.py

import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
import psycopg2

# ── Load env & models ──
load_dotenv()
model = SentenceTransformer("BAAI/bge-small-en-v1.5")

# ── Database connection ──
def get_db_connection():
    return psycopg2.connect(
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT")
    )

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
    (q_emb, k)
)
    results = cur.fetchall()
    cur.close()
    conn.close()
    return results

# ── FastAPI setup ──
app = FastAPI(title="SmartFusion RAG API")

class QueryRequest(BaseModel):
    question: str
    top_k: int = 5

@app.post("/query")
def ask_question(req: QueryRequest):
    try:
        answers = retrieve(req.question, req.top_k)
        return [
            {"filename": fn, "snippet": snip}
            for fn, snip in answers
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
