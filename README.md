# DeepDocs 📄🤖

A session-based, ephemeral **Retrieval-Augmented Generation (RAG)** application that lets you chat with your uploaded documents. Built with a React frontend, Node.js/Express middleware, and a Python/FastAPI AI backend powered by LangChain and Groq.

> **Ephemeral by design** — all documents, embeddings, and conversation history are stored only in memory and are permanently deleted when the session ends.

---

## ✨ Features

- 📁 Upload up to **10 documents** per session (PDF, TXT, CSV, XLSX)
- 💬 Ask questions and get answers **strictly grounded** in your uploaded content
- 🧠 **Conversational memory** — follow-up questions are understood in context
- 🚫 **No hallucination** — the model is instructed to refuse questions outside the document scope
- 🔒 **Zero persistence** — embeddings and chat history are wiped on session end
- 🌑 Clean, modern **dark mode** UI

---

## 🏗 Architecture

```
Browser (React + Vite)
        │
        ▼
Node.js / Express  (port 5000)   ← Handles uploads, forwards to AI service
        │
        ▼
Python / FastAPI   (port 8000)   ← LangChain RAG pipeline, FAISS embeddings, Groq LLM
```

### Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS v4 |
| API Server | Node.js, Express, Multer |
| AI Service | Python, FastAPI, LangChain (LCEL) |
| LLM | [Groq](https://groq.com) (configurable model) |
| Embeddings | `sentence-transformers/all-MiniLM-L6-v2` (HuggingFace) |
| Vector Store | FAISS (in-memory, per-session) |

---

## 📂 Project Structure

```
DeepDocs/
├── client/                  # React + Vite frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatInterface.jsx
│   │   │   └── UploadArea.jsx
│   │   ├── App.jsx
│   │   └── index.css
│   └── package.json
│
├── server/                  # Node.js / Express middleware
│   ├── server.js
│   ├── .env
│   └── package.json
│
├── ai-service/              # Python FastAPI AI backend
│   ├── main.py              # FastAPI app & routes
│   ├── document_loader.py   # PDF/CSV/XLSX/TXT loaders
│   ├── rag_pipeline.py      # LangChain LCEL RAG chain
│   ├── vector_store.py      # FAISS in-memory store
│   ├── chat_engine.py       # Session history & question answering
│   └── .env
│
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+
- **Python** 3.10+
- A **[Groq API Key](https://console.groq.com)** (free tier available)

---

### 1. Clone the repository

```bash
git clone https://github.com/your-username/deepdocs.git
cd deepdocs
```

---

### 2. Set up the AI Service (Python / FastAPI)

```bash
cd ai-service

# Create and activate a virtual environment
python -m venv venv
.\venv\Scripts\activate        # Windows
# source venv/bin/activate     # macOS/Linux

# Install dependencies
pip install fastapi uvicorn langchain langchain-core langchain-community \
    langchain-groq langchain-huggingface langchain-text-splitters \
    faiss-cpu sentence-transformers pypdf python-multipart python-dotenv \
    unstructured "unstructured[xlsx]"
```

Create the `.env` file:

```env
# ai-service/.env
GROQ_API_KEY="your_groq_api_key_here"
```

Start the service:

```bash
python -m uvicorn main:app --reload --port 8000
```

---

### 3. Set up the API Server (Node.js / Express)

```bash
cd server
npm install
```

The `.env` file is optional (defaults are pre-configured):

```env
# server/.env
PORT=5000
AI_SERVICE_URL=http://127.0.0.1:8000
```

Start the server:

```bash
npm run dev
```

---

### 4. Set up the Frontend (React / Vite)

```bash
cd client
npm install
npm run dev
```

Open **[http://localhost:5173](http://localhost:5173)** in your browser.

---

## ⚙️ Environment Variables

| File | Variable | Description |
|---|---|---|
| `ai-service/.env` | `GROQ_API_KEY` | Your Groq API key |
| `server/.env` | `PORT` | Express server port (default: `5000`) |
| `server/.env` | `AI_SERVICE_URL` | URL of the Python AI service (default: `http://127.0.0.1:8000`) |

---

## 🔒 Privacy & Security

- **No database** — all data lives in server memory only
- **Session-scoped** — each browser tab gets a unique session ID
- **Auto-cleanup** — the session is cleared automatically when you close the tab (`beforeunload` event) or click **End Session**
- **Strict grounding** — the LLM is prompted to never answer outside the uploaded document content

---

## 📄 License

MIT License — feel free to use, modify, and distribute.
