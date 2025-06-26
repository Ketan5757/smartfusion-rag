import os
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer
import psycopg2

# ── Config & Model ──
load_dotenv()
model = SentenceTransformer("text-embedding-3-small")

# ── DB Connection ──
conn = psycopg2.connect(
    dbname=os.getenv("DB_NAME"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
    host=os.getenv("DB_HOST"),
    port=os.getenv("DB_PORT")
)
cur = conn.cursor()

# ── Retrieval Function ──
def retrieve(query, k=5):
    q_emb = model.encode(query).tolist()
    cur.execute("""
        SELECT filename,
               substring(full_text,1,150) AS snippet 
        FROM documents
        ORDER BY content_embedding <=> %s
        LIMIT %s
    """, (q_emb, k))
    return cur.fetchall()

# ── CLI ──
if __name__ == "__main__":
    q = input("Enter your question: ")
    results = retrieve(q, k=5)
    for fname, snippet in results:
        print(f"\n📄 {fname}\n— {snippet}…")

    cur.close()
    conn.close()
