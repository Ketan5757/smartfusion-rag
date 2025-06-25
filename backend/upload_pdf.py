import os
from datetime import date
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer
import fitz  # PyMuPDF
import psycopg2

# --- Load Environment Variables ---
load_dotenv()  # Loads DB credentials and other config from .env

# Debug: print loaded env vars
print("🔧 DB_NAME:", os.getenv("DB_NAME"))
print("🔧 DB_USER:", os.getenv("DB_USER"))
print("🔧 DB_HOST:", os.getenv("DB_HOST"), "DB_PORT:", os.getenv("DB_PORT"))

# --- Initialize Embedding Model ---
model = SentenceTransformer("text-embedding-3-small")

# --- Database Connection (Secure) ---
def get_db_connection():
    """Read DB params from .env and return a psycopg2 connection."""
    required_vars = ["DB_NAME", "DB_USER", "DB_PASSWORD", "DB_HOST", "DB_PORT"]
    missing = [var for var in required_vars if not os.getenv(var)]
    if missing:
        raise RuntimeError(f"❌ Missing required DB env vars: {', '.join(missing)}")

    try:
        conn = psycopg2.connect(
            dbname=os.getenv("DB_NAME"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            host=os.getenv("DB_HOST"),
            port=os.getenv("DB_PORT")
        )

        # Debug: verify connected database
        with conn.cursor() as debug_cur:
            debug_cur.execute("SELECT current_database()")
            db = debug_cur.fetchone()[0]
            print(f"✅ Connected to database: {db}")
        return conn
    except psycopg2.Error as e:
        print(f"❌ Database connection failed: {e}")
        exit(1)

# Create connection and cursor
conn = get_db_connection()
cur = conn.cursor()

# --- Core Functions ---
def extract_pdf_text(pdf_path):
    """Extract and return all text from a PDF."""
    try:
        text_pages = []
        with fitz.open(pdf_path) as doc:
            for page in doc:
                text_pages.append(page.get_text())
        return "\n".join(text_pages)
    except Exception as e:
        print(f"❌ PDF extraction failed: {e}")
        exit(1)


def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> list[str]:
    """Split text into overlapping chunks."""
    chunks = []
    start = 0
    length = len(text)
    while start < length:
        end = min(start + chunk_size, length)
        chunks.append(text[start:end])
        start += chunk_size - overlap
    return chunks


def get_embedding(text):
    """Generate and return an embedding list from local BGE model."""
    try:
        embedding = model.encode(text)
        return embedding.tolist()
    except Exception as e:
        print(f"❌ Embedding generation failed: {e}")
        exit(1)


def insert_into_db(filename, country, target_group, owner, full_text, embedding):
    """Insert a document record into the database."""
    try:
        cur.execute(
            """
            INSERT INTO documents
            (filename, country, target_group, owner, creation_date, full_text, content_embedding)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (
                filename,
                country,
                target_group,
                owner,
                date.today(),
                full_text,
                embedding
            )
        )
        conn.commit()
    except psycopg2.Error as e:
        print(f"❌ Database insert failed: {e}")
        conn.rollback()
        exit(1)

# --- Main Execution ---
if __name__ == "__main__":
    pdf_path = "Ketan_Darekar_CV.pdf"  
    if not os.path.exists(pdf_path):
        print(f"❌ PDF not found at: {os.path.abspath(pdf_path)}")
        exit(1)

    print("📄 Extracting text from PDF...")
    full_text = extract_pdf_text(pdf_path)
    print(f"   Extracted {len(full_text)} characters.")

    # --- Chunk PDF text ---
    print("🔀 Splitting text into chunks...")
    pdf_chunks = chunk_text(full_text, chunk_size=1000, overlap=200)
    print(f"   Generated {len(pdf_chunks)} chunks.")

    # --- Embed & insert each chunk ---
    for idx, chunk in enumerate(pdf_chunks):
        print(f"   Processing chunk {idx+1}/{len(pdf_chunks)}...")
        emb = get_embedding(chunk)
        insert_into_db(
            filename=f"{os.path.basename(pdf_path)}_chunk{idx}",
            country="Germany",
            target_group="Students",
            owner="Ketan",
            full_text=chunk,
            embedding=emb
        )
    print("✅ All PDF chunks processed and stored.")

    
    cur.close()
    conn.close()
