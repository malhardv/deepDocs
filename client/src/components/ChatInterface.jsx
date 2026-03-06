import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import ReactMarkdown from 'react-markdown';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export function ChatInterface({ sessionId }) {
    const [messages, setMessages] = useState([
        {
            id: 'welcome',
            role: 'assistant',
            content: 'Your documents are successfully processed! What would you like to know about them?'
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userQuestion = input.trim();
        setInput('');

        const newUserMsg = { id: Date.now().toString(), role: 'user', content: userQuestion };
        setMessages(prev => [...prev, newUserMsg]);
        setIsLoading(true);

        try {
            const response = await fetch(`${API_URL}/api/ask`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionId, question: userQuestion }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to get answer');
            }

            const data = await response.json();
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.answer
            }]);
        } catch (error) {
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'error',
                content: `Error: ${error.message}. Please try again.`
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[650px] w-full max-w-4xl mx-auto rounded-xl border shadow-2xl overflow-hidden"
            style={{ backgroundColor: '#1a1d27', borderColor: '#2d3148' }}>

            {/* Header */}
            <div className="px-6 py-4 border-b sticky top-0 z-10 flex justify-between items-center"
                style={{ backgroundColor: '#21253a', borderColor: '#2d3148' }}>
                <div>
                    <h2 className="text-lg font-semibold text-white">Document Assistant</h2>
                    <p className="text-xs" style={{ color: '#475569' }}>Session ID: {sessionId.substring(0, 8)}...</p>
                </div>
                <div className="flex items-center space-x-2">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                    <span className="text-xs font-medium" style={{ color: '#94a3b8' }}>Active Session</span>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6" style={{ backgroundColor: '#0f1117' }}>
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={cn("flex w-full", msg.role === 'user' ? "justify-end" : "justify-start")}
                    >
                        <div className={cn("flex max-w-[80%] gap-3", msg.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                            {/* Avatar */}
                            <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm mt-1",
                            )}
                                style={
                                    msg.role === 'user'
                                        ? { backgroundColor: '#2563eb', color: 'white' }
                                        : msg.role === 'error'
                                            ? { backgroundColor: 'rgba(239,68,68,0.15)', color: '#f87171' }
                                            : { backgroundColor: '#21253a', color: '#60a5fa', border: '1px solid #2d3148' }
                                }>
                                {msg.role === 'user' ? <User size={16} /> :
                                    msg.role === 'error' ? <AlertCircle size={16} /> : <Bot size={16} />}
                            </div>

                            {/* Chat Bubble */}
                            <div className="px-5 py-3.5 rounded-2xl text-sm shadow-sm"
                                style={
                                    msg.role === 'user'
                                        ? { backgroundColor: '#2563eb', color: 'white', borderRadius: '1rem 0.25rem 1rem 1rem' }
                                        : msg.role === 'error'
                                            ? { backgroundColor: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '0.25rem 1rem 1rem 1rem' }
                                            : { backgroundColor: '#21253a', color: '#cbd5e1', border: '1px solid #2d3148', borderRadius: '0.25rem 1rem 1rem 1rem' }
                                }>
                                {msg.role === 'user' || msg.role === 'error' ? (
                                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                ) : (
                                    <div className="prose prose-invert prose-sm max-w-none">
                                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex w-full justify-start">
                        <div className="flex max-w-[80%] gap-3 flex-row">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm mt-1"
                                style={{ backgroundColor: '#21253a', color: '#60a5fa', border: '1px solid #2d3148' }}>
                                <Bot size={16} />
                            </div>
                            <div className="px-5 py-3.5 rounded-2xl text-sm shadow-sm flex items-center gap-2"
                                style={{ backgroundColor: '#21253a', color: '#94a3b8', border: '1px solid #2d3148', borderRadius: '0.25rem 1rem 1rem 1rem' }}>
                                <Loader2 className="w-4 h-4 animate-spin text-primary-400" />
                                <span>Thinking...</span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t" style={{ backgroundColor: '#1a1d27', borderColor: '#2d3148' }}>
                <form onSubmit={handleSubmit} className="flex gap-3 relative max-w-4xl mx-auto">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={isLoading}
                        placeholder="Ask a question about your documents..."
                        className="flex-1 py-3 pl-4 pr-14 rounded-xl outline-none transition-all shadow-sm"
                        style={{
                            backgroundColor: '#21253a',
                            color: '#e2e8f0',
                            border: '1px solid #2d3148',
                        }}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-40"
                    >
                        <Send size={18} />
                    </button>
                </form>
                <p className="text-center text-xs mt-2" style={{ color: '#334155' }}>
                    AI can make mistakes. All interactions are cleared when the session ends.
                </p>
            </div>
        </div>
    );
}
