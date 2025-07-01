import os
from dotenv import load_dotenv
# from sentence_transformers import SentenceTransformer  # Stubbed out to avoid unauthorized downloads
import psycopg2
from psycopg2.extras import Json

print("▶️ retrieve.py starting (stubbed embeddings)...")

# Load environment variables for DB connection
load_dotenv()

# ── Embedding stub ──
def get_embedding(text):
    """Return a 1536-dim zero vector so retrieval can proceed without external models."""
    return [0.0] * 1536

# ── Database Connection ──
conn = psycopg2.connect(
    dbname=os.getenv("DB_NAME"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
    host=os.getenv("DB_HOST"),
    port=os.getenv("DB_PORT")
)
cur = conn.cursor()

# ── Retrieval Function with Metadata Filters ──
def retrieve(query, k=5, country=None, job_area=None, source_type=None):
    """
    Perform semantic search with optional metadata filters.
    Returns list of (filename, snippet).
    """
    # 1) Compute embedding
    q_emb = get_embedding(query)

    # 2) Build dynamic WHERE clause
    filters = []
    params = []
    if country:
        filters.append("country = %s")
        params.append(country)
    if job_area:
        filters.append("job_area = %s")
        params.append(job_area)
    if source_type:
        filters.append("source_type = %s")
        params.append(source_type)

    where_sql = ""
    if filters:
        where_sql = "WHERE " + " AND ".join(filters)

    # 3) Final SQL with vector-ordering + optional filters
    sql = f"""
        SELECT filename,
               substring(full_text, 1, 150) AS snippet
        FROM documents
        {where_sql}
        ORDER BY content_embedding <=> %s::vector
        LIMIT %s
    """

    # 4) Parameter order: [*filter_values, q_emb, k]
    params.append(q_emb)
    params.append(k)

    cur.execute(sql, params)
    return cur.fetchall()

# ── CLI Interface ──
if __name__ == "__main__":
    q = input("Enter your question: ")
    country     = input("Country filter (leave blank for none): ").strip() or None
    job_area    = input("Job area filter (leave blank for none): ").strip() or None
    source_type = input("Source type filter (PDF/HTML, leave blank for none): ").strip() or None
    k_input     = input("Number of results [5]: ").strip()
    k = int(k_input) if k_input.isdigit() else 5

    results = retrieve(q, k=k, country=country, job_area=job_area, source_type=source_type)
    for fname, snippet in results:
        print(f"\n📄 {fname}\n— {snippet}…")

    cur.close()
    conn.close()

