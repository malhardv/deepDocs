# chat_engine.py
import re
from datetime import datetime
from langchain_core.messages import HumanMessage, AIMessage
from rag_pipeline import get_conversational_rag_chain
from vector_store import remove_store

# In-memory dictionary to store chat histories per session mapping
# session_id -> list of BaseMessage (HumanMessage, AIMessage)
session_histories = {}

def strip_thinking(text: str) -> str:
    """
    Removes <think>...</think> reasoning blocks that some models (e.g. Qwen)
    include in their output. Only the final answer is returned.
    """
    cleaned = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL)
    return cleaned.strip()

def get_session_history(session_id: str):
    """
    Retrieves the chat history for a given session.
    Initializes an empty list if it doesn't exist.
    """
    if session_id not in session_histories:
        session_histories[session_id] = []
    return session_histories[session_id]

def clear_session(session_id: str) -> bool:
    """
    Completely removes all traces of a session from memory
    (chat history and vector store embeddings).
    """
    cleared_history = False
    if session_id in session_histories:
        del session_histories[session_id]
        print(f"Cleared chat history for session {session_id}")
        cleared_history = True
        
    cleared_vector = remove_store(session_id)
    
    return cleared_history or cleared_vector

def ask_question(session_id: str, question: str) -> str:
    """
    Passes the user question through the conversational RAG chain
    while appending to the in-memory chat history.
    """
    print(f"[{datetime.now()}] Session {session_id} asked: {question}")
    
    # 1. Get the conversational chain
    rag_chain = get_conversational_rag_chain(session_id)
    
    # 2. Get the in-memory chat history for the session
    chat_history = get_session_history(session_id)
    
    # 3. Invoke the chain
    response = rag_chain.invoke({
        "input": question,
        "chat_history": chat_history
    })
    
    raw_answer = response.get("answer", "")
    
    # 4. Strip any <think>...</think> blocks before sending to the user
    answer_text = strip_thinking(raw_answer)
    
    # 5. Append the clean answer to the session's history
    chat_history.append(HumanMessage(content=question))
    chat_history.append(AIMessage(content=answer_text))
    
    return answer_text
