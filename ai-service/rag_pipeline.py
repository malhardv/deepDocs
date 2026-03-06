# rag_pipeline.py
import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables import RunnablePassthrough, RunnableLambda
from langchain_core.output_parsers import StrOutputParser
from vector_store import get_retriever

load_dotenv()

# Initialize the Groq Chat Model
try:
    llm = ChatGroq(
        model="qwen/qwen3-32b",
        temperature=0.2, # Low temperature for more deterministic/grounded answers
        max_tokens=None,
        timeout=None,
        max_retries=2,
    )
except Exception as e:
    print(f"Error initializing ChatGroq: {e}\nEnsure GROQ_API_KEY is set in .env")
    llm = None

def get_conversational_rag_chain(session_id: str):
    """
    Builds the conversational RAG chain for a specific session using LCEL.
    """
    if llm is None:
        raise RuntimeError("LLM not initialized. Check your Groq API key.")

    retriever = get_retriever(session_id, k=4)

    # 1. Provide a prompt to contextualize the question based on chat history
    contextualize_q_system_prompt = (
        "Given a chat history and the latest user question "
        "which might reference context in the chat history, "
        "formulate a standalone question which can be understood "
        "without the chat history. Do NOT answer the question, "
        "just reformulate it if needed and otherwise return it as is."
    )
    contextualize_q_prompt = ChatPromptTemplate.from_messages([
        ("system", contextualize_q_system_prompt),
        MessagesPlaceholder("chat_history"),
        ("human", "{input}"),
    ])
    
    def contextualize_question(inputs: dict) -> str:
        # If there's chat history, rewrite the question
        if inputs.get("chat_history"):
            chain = contextualize_q_prompt | llm | StrOutputParser()
            return chain.invoke(inputs)
        return inputs["input"]

    def format_docs(docs) -> str:
        return "\n\n".join(doc.page_content for doc in docs)

    # The retriever chain that fetches and formats documents based on contextualized query
    retriever_chain = RunnableLambda(contextualize_question) | retriever | format_docs

    # 2. Provide the main QA prompt
    qa_system_prompt = (
        "You are a helpful AI assistant answering questions about uploaded documents. "
        "Use the following pieces of retrieved context to answer the question. "
        "RULES:\n"
        "1. You must answer ONLY using the retrieved document context below.\n"
        "2. If the answer is not present in the documents, respond EXACTLY with "
        "this sentence: 'The uploaded documents do not contain information about this.'\n"
        "3. Do not formulate answers using outside knowledge or hallucinate information.\n"
        "4. DO NOT reveal your internal reasoning, thinking process, or chain-of-thought.\n"
        "5. Output ONLY the final answer text.\n\n"
        "CONTEXT:\n"
        "{context}"
    )
    qa_prompt = ChatPromptTemplate.from_messages([
        ("system", qa_system_prompt),
        MessagesPlaceholder("chat_history"),
        ("human", "{input}"),
    ])

    # Build the full RAG chain using LCEL
    # First, generate the context.
    # Second, use context + inputs to generate the answer.
    # We assign it to "answer" since the invoking code expects response["answer"]
    rag_chain = (
        RunnablePassthrough.assign(context=retriever_chain)
        | RunnablePassthrough.assign(answer=qa_prompt | llm | StrOutputParser())
    )

    return rag_chain
