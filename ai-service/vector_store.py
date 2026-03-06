# vector_store.py
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings

# In-memory session store. Maps session_id -> FAISS index
vector_stores = {}

# Lazy-loaded embeddings model — loaded only on first use so the server
# can start up and pass health checks before the model finishes downloading.
_embeddings = None

def get_embeddings():
    global _embeddings
    if _embeddings is None:
        print("Loading embedding model (first-time setup)...")
        _embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
        print("Embedding model loaded.")
    return _embeddings

def store_embeddings(session_id: str, chunks: list):
    """
    Creates a new FAISS vector store for the session and stores
    the document chunks. Overwrites any existing store for the session.
    """
    # Create the FAISS store from the current chunks
    vector_store = FAISS.from_documents(chunks, get_embeddings())
    
    # Save the store in memory
    vector_stores[session_id] = vector_store
    print(f"Stored vector index for session {session_id}")
    
def get_retriever(session_id: str, k: int = 4):
    """
    Returns a retriever for the given session.
    """
    if session_id not in vector_stores:
        raise ValueError(f"No documents uploaded for session {session_id}")
        
    return vector_stores[session_id].as_retriever(
        search_type="similarity",
        search_kwargs={"k": k}
    )

def remove_store(session_id: str) -> bool:
    """
    Deletes the vector store for a session from memory.
    """
    if session_id in vector_stores:
        del vector_stores[session_id]
        print(f"Removed vector index for session {session_id}")
        return True
    return False
