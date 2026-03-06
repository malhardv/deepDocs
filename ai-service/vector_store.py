# vector_store.py
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings

# In-memory session store. Maps session_id -> FAISS index
vector_stores = {}

# Lazy-loaded fastembed ONNX embeddings. Ultra-fast local execution with zero network timeout risks.
_embeddings = None

from langchain_community.embeddings.fastembed import FastEmbedEmbeddings

def get_embeddings():
    global _embeddings
    if _embeddings is None:
        print("Initializing lightning-fast local ONNX embeddings (FastEmbed)...")
        _embeddings = FastEmbedEmbeddings(model_name="BAAI/bge-small-en-v1.5")
    return _embeddings

def store_embeddings(session_id: str, chunks: list):
    """
    Creates a new FAISS vector store for the session and stores
    the document chunks. Overwrites any existing store for the session.
    """
    try:
        # Create the FAISS store from the current chunks
        vector_store = FAISS.from_documents(chunks, get_embeddings())
        
        # Save the store in memory
        vector_stores[session_id] = vector_store
        print(f"Stored vector index for session {session_id}")
    except Exception as e:
        # Give a heavily detailed message for any other opaque error
        raise ValueError(f"Embedding failed. Are you sure you set the build command and PYTHON_VERSION? Error: {repr(e)}")
    
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
