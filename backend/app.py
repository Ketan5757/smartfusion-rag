# backend/app.py

import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
import psycopg2
import openai

# ── Load environment and initialize models ──
load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")  # requires OPENAI_API_KEY in .env
model = SentenceTransformer("BAAI/bge-small-en-v1.5")

# ── Database connection helper ──
def get_db_connection():
    """Establish a new database connection from environment variables."""
    try:
        conn = psycopg2.connect(
            dbname=os.getenv("DB_NAME"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            host=os.getenv("DB_HOST"),
            port=os.getenv("DB_PORT")
        )
        return conn
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Database connection failed: {e}")

# ── Retrieval logic ──
def retrieve(query: str, k: int = 5):
    """Retrieve top-k similar chunks for a given query."""
    # Embed the query
    q_emb = model.encode(query).tolist()
    # Query the database
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT filename, substring(full_text, 1, 150) AS snippet
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

# Request models
class QueryRequest(BaseModel):
    question: str
    top_k: int = 5

class AnswerRequest(BaseModel):
    question: str
    top_k: int = 5

# ── Raw retrieval endpoint ──
@app.post("/query")
def ask_question(req: QueryRequest):
    """Return top-k chunk snippets for a user query."""
    try:
        answers = retrieve(req.question, req.top_k)
        return [{"filename": fn, "snippet": snip} for fn, snip in answers]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── LLM answer synthesis endpoint using gpt-3.5-turbo ──
@app.post("/answer")
def answer_question(req: AnswerRequest):
    """Generate a natural language answer using retrieved chunks and GPT-3.5-turbo."""
    try:
        # 1. Retrieve relevant chunks
        chunks = retrieve(req.question, req.top_k)
        # 2. Build the context prompt
        context = "\n\n".join(snip for _, snip in chunks)
        prompt = (
            "Use the following context to answer the question:\n\n"
            f"{context}\n\nQuestion: {req.question}\nAnswer:"
        )
        # 3. Call OpenAI ChatCompletion with gpt-3.5-turbo
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": prompt}
            ]
        )
        answer = response.choices[0].message.content
        return {"answer": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
