import os
import fitz  # PyMuPDF
import psycopg2
from datetime import date
from dotenv import load_dotenv
from openai import OpenAI, RateLimitError

# --- Load Environment Variables ---
load_dotenv()  # Load from .env file

# --- Initialize OpenAI Client (Fixed Version) ---
try:
    client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])  # Strict env var access
except KeyError:
    raise ValueError("❌ OPENAI_API_KEY not found in environment variables. "
                    "Please add it to .env file or export it.")

# --- Database Connection (Secure) ---
def get_db_connection():
    """Secure PostgreSQL connection with error handling"""
    try:
        return psycopg2.connect(
            dbname=os.environ.get("DB_NAME", "ragdb"),
            user=os.environ.get("DB_USER", "postgres"),
            password=os.environ["DB_PASSWORD"],  # Mandatory
            host=os.environ.get("DB_HOST", "localhost"),
            port=os.environ.get("DB_PORT", "5432")
        )
    except (psycopg2.Error, KeyError) as e:
        print(f"❌ Database connection failed: {e}")
        exit(1)

conn = get_db_connection()
cur = conn.cursor()

# --- Core Functions ---
def extract_pdf_text(pdf_path):
    """Extract text from PDF with error handling"""
    try:
        with fitz.open(pdf_path) as doc:
            return "".join(page.get_text() for page in doc)
    except Exception as e:
        print(f"❌ PDF extraction failed: {e}")
        exit(1)

def get_embedding(text):
    """Get OpenAI embedding with rate limit handling"""
    try:
        response = client.embeddings.create(
            model="text-embedding-3-small",
            input=text
        )
        return response.data[0].embedding
    except RateLimitError:
        print("❌ OpenAI rate limit exceeded. Check your quota.")
        exit(1)
    except Exception as e:
        print(f"❌ Embedding failed: {e}")
        exit(1)

def insert_into_db(filename, country, target_group, owner, full_text, embedding):
    """Safe database insertion with transaction rollback"""
    try:
        cur.execute("""
            INSERT INTO documents 
            (filename, country, target_group, owner, creation_date, full_text, content_embedding)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (filename, country, target_group, owner, date.today(), full_text, embedding))
        conn.commit()
    except psycopg2.Error as e:
        print(f"❌ Database insert failed: {e}")
        conn.rollback()
        exit(1)

# --- Main Execution ---
if __name__ == "__main__":
    try:
        pdf_path = "Ketan_Darekar_CV.pdf"
        
        if not os.path.exists(pdf_path):
            raise FileNotFoundError(f"❌ PDF not found at: {os.path.abspath(pdf_path)}")
        
        print("📄 Extracting text...")
        text = extract_pdf_text(pdf_path)
        
        print("🔢 Generating embedding...")
        embedding = get_embedding(text)
        
        print("💾 Saving to database...")
        insert_into_db(
            filename=os.path.basename(pdf_path),
            country="Germany",
            target_group="Students",
            owner="Ketan",
            full_text=text,
            embedding=embedding
        )
        print("✅ Success! PDF processed and stored.")
        
    except Exception as e:
        print(f"❌ Critical error: {e}")
    finally:
        cur.close()
        conn.close()