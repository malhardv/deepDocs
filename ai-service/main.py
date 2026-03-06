# main.py
import os
import shutil
import tempfile
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import List

from document_loader import process_uploaded_files
from chat_engine import ask_question, clear_session

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "AI Service is running"}

@app.post("/api/upload")
async def upload_files(
    session_id: str = Form(...),
    files: List[UploadFile] = File(...)
):
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 files allowed.")
    
    # Save files to a temporary directory to process with LangChain loaders
    temp_dir = tempfile.mkdtemp()
    temp_file_paths = []
    
    try:
        for file in files:
            file_path = os.path.join(temp_dir, file.filename)
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            temp_file_paths.append(file_path)
            
        print(f"Processing {len(temp_file_paths)} files for session {session_id}...")
        
        # Pass to the RAG pipeline
        result = process_uploaded_files(session_id, temp_file_paths)
        
        return {"message": "Files processed successfully", "chunks": result}
        
    except Exception as e:
        print(f"Error processing files: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # ALWAYS clean up the temporary directory
        shutil.rmtree(temp_dir, ignore_errors=True)


@app.post("/api/ask")
async def askEndpoint(payload: dict):
    session_id = payload.get("session_id")
    question = payload.get("question")
    
    if not session_id or not question:
        raise HTTPException(status_code=400, detail="session_id and question are required")
        
    try:
        answer = ask_question(session_id, question)
        return {"answer": answer}
    except Exception as e:
        print(f"Error answering question: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/clear")
async def clear_session_endpoint(payload: dict):
    session_id = payload.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    success = clear_session(session_id)
    return {"message": "Session cleared", "success": success}
# Trigger reload 
