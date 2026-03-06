# document_loader.py
import os
from langchain_community.document_loaders import PyPDFLoader, TextLoader, CSVLoader, UnstructuredExcelLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from vector_store import store_embeddings

def process_uploaded_files(session_id: str, file_paths: list[str]) -> int:
    """
    Loads documents from the filesystem, splits them into chunks,
    and stores their embeddings in the session's vector store.
    """
    all_documents = []
    
    for file_path in file_paths:
        ext = os.path.splitext(file_path)[1].lower()
        loader = None
        
        if ext == '.pdf':
            loader = PyPDFLoader(file_path)
        elif ext == '.txt':
            loader = TextLoader(file_path)
        elif ext == '.csv':
            loader = CSVLoader(file_path)
        elif ext in ['.xls', '.xlsx']:
            loader = UnstructuredExcelLoader(file_path)
        else:
            print(f"Unsupported file type: {ext} for file {file_path}")
            continue
            
        try:
            docs = loader.load()
            all_documents.extend(docs)
        except Exception as e:
            print(f"Error loading {file_path}: {str(e)}")
            
    if not all_documents:
        raise ValueError("No valid documents could be loaded.")
        
    # Split documents
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=150
    )
    
    chunks = text_splitter.split_documents(all_documents)
    print(f"Split documents into {len(chunks)} chunks.")
    
    # Store into in-memory vector database
    store_embeddings(session_id, chunks)
    
    return len(chunks)
