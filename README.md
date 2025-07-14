# 🚀 SmartFusion RAG  
**Hybrid AI Question Answering System for PDFs & Web Content**

SmartFusion RAG is an AI-powered document question-answering system developed as part of a Master's Thesis in Applied Computer Science. It enables users to ask natural language questions across large-scale **PDF documents** and **HTML webpages**, combining **semantic vector search** with **SQL-based metadata filtering** for precise and scalable Retrieval-Augmented Generation (RAG).

---

## 🧠 Thesis Objective

The goal is to explore how to combine traditional metadata filtering (e.g., country, job area, source type) with modern embedding-based retrieval to create a robust and flexible question-answering system that works across unstructured document formats.

---

## 🎯 Research Questions

1. How can document metadata be stored and used effectively for filtered retrieval in a Hybrid RAG system?  
2. What is the best way to combine SQL-based metadata filtering with embedding-based document search?  
3. How can large-scale text data (PDFs & HTML) be efficiently processed and stored for Retrieval-Augmented Generation?  
4. How can follow-up questions improve user interaction in a multi-document RAG system?  
5. *(Optional)* How does the inclusion of HTML pages and speech-to-text inputs affect performance and usability?

---

## ✨ Key Features

- Upload and ingest **PDF documents** or **HTML web pages**
- **Extract, chunk, and embed** document content using `text-embedding-3-small`
- Store **semantic embeddings + metadata** in PostgreSQL using `pgvector`
- **Ask questions** over stored content with **GPT-4.0 Turbo**
- Apply **metadata filters** (country, job area, source type, etc.) at query time
- Receive answers with source file references
- Clean, modern **React frontend** and **FastAPI backend**

---

## 🛠️ Tech Stack

| Layer         | Technology                        |
|---------------|-----------------------------------|
| Frontend      | React.js                          |
| Backend       | FastAPI                           |
| Embedding     | OpenAI `text-embedding-3-small`   |
| LLM           | OpenAI GPT-4.0 Turbo              |
| Database      | PostgreSQL + pgvector extension   |
| Chunking      | LangChain Recursive Text Splitter |
| PDF Parsing   | PyMuPDF (fitz)                    |
| HTML Parsing  | BeautifulSoup                     |
| Env Mgmt      | python-dotenv                     |

---