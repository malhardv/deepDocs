# vector_store.py
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings

# In-memory session store. Maps session_id -> FAISS index
vector_stores = {}

# Lazy-loaded embeddings — uses the HuggingFace Inference API with custom batching.
# No PyTorch or local model download required, perfectly stable on Render free tier.
_embeddings = None

import os
import time
from langchain_community.embeddings import HuggingFaceInferenceAPIEmbeddings

class BatchedHuggingFaceEmbeddings(HuggingFaceInferenceAPIEmbeddings):
    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        # HuggingFace API fails with {"error":...} (KeyError 0) if sent too much text at once.
        # We manually chunk into batches of 10 texts at a time to stay under the API limits.
        batch_size = 10
        all_embeddings = []
        
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            try:
                response_json = super().embed_documents(batch)
                
                # If HF api returned a dict format error, raise a clear error to stop FAISS from crashing
                if isinstance(response_json, dict) and "error" in response_json:
                    raise Exception(f"HuggingFace API Error: {response_json['error']}")
                    
                all_embeddings.extend(response_json)
                # Sleep briefly to avoid aggressive HF rate limits
                time.sleep(0.5)
            except Exception as e:
                print(f"Batch embedding failed at chunk {i}: {str(e)}")
                raise
                
        return all_embeddings

def get_embeddings():
    global _embeddings
    if _embeddings is None:
        api_key = os.environ.get("HF_TOKEN", "")
        print("Initializing remote HuggingFace Inference API embeddings (Batched)...")
        _embeddings = BatchedHuggingFaceEmbeddings(
            api_key=api_key,
            model_name="sentence-transformers/all-MiniLM-L6-v2"
        )
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
    except KeyError as e:
        if str(e).strip("'") == "0":
            raise ValueError(
                "HuggingFace API Error: The embedding service was rate-limited or rejected the token. "
                "Render is still using the HuggingFace Inference API instead of local processing. "
                "Please go to your Render 'ai-service' Settings, change the Build Command to exactly: "
                "bash build.sh "
                "and click Save Changes to force the local PyTorch framework to install!"
            )
        raise
    except Exception as e:
        # Give a heavily detailed message for any other opaque error
        raise ValueError(f"Embedding failed. Are you sure you set the build command to 'bash build.sh' in Render? Error: {repr(e)}")
    
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
