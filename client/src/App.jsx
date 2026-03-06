import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Bot, FileText, ShieldAlert } from 'lucide-react';
import { UploadArea } from './components/UploadArea';
import { ChatInterface } from './components/ChatInterface';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function App() {
  const [sessionId, setSessionId] = useState('');
  const [sessionActive, setSessionActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  useEffect(() => {
    const newSessionId = uuidv4();
    setSessionId(newSessionId);

    const handleBeforeUnload = () => {
      if (newSessionId) {
        const data = JSON.stringify({ session_id: newSessionId });
        navigator.sendBeacon(`${API_URL}/api/clear`, data);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      fetch(`${API_URL}/api/clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: newSessionId }),
        keepalive: true,
      }).catch(console.error);
    };
  }, []);

  const handleUploadComplete = (files) => {
    setUploadedFiles(files);
    setSessionActive(true);
  };

  const handleEndSession = async () => {
    try {
      await fetch(`${API_URL}/api/clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId })
      });
    } catch (e) {
      console.error("Failed to clear session", e);
    }
    setSessionId(uuidv4());
    setSessionActive(false);
    setUploadedFiles([]);
  };

  return (
    <div className="min-h-screen flex flex-col font-sans" style={{ backgroundColor: '#0f1117', color: '#e2e8f0' }}>
      {/* Navbar */}
      <header style={{ backgroundColor: '#1a1d27', borderBottom: '1px solid #2d3148' }} className="sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 group cursor-default">
            <div className="bg-primary-600 p-2 rounded-xl text-white shadow-md group-hover:scale-105 transition-transform duration-200">
              <Bot className="w-5 h-5" />
            </div>
            <h1 className="font-bold text-xl tracking-tight text-white">
              Deep<span className="text-primary-400">Docs</span>
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-2 text-sm px-3 py-1.5 rounded-full border" style={{ color: '#94a3b8', backgroundColor: '#21253a', borderColor: '#2d3148' }}>
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Strict Grounding Enforced</span>
            </div>
            {sessionActive && (
              <button
                onClick={handleEndSession}
                className="text-sm px-4 py-2 font-medium text-red-400 hover:text-red-300 rounded-lg transition-colors"
                style={{ ':hover': { backgroundColor: 'rgba(239,68,68,0.1)' } }}
              >
                End Session
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 flex flex-col items-center">
        {!sessionActive ? (
          <div className="w-full max-w-4xl space-y-8">
            <div className="text-center space-y-4 mb-10">
              <div className="flex items-center justify-center p-3 rounded-2xl mb-2 mx-auto w-16 h-16" style={{ backgroundColor: 'rgba(37,99,235,0.15)', color: '#60a5fa' }}>
                <FileText className="w-8 h-8" />
              </div>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white">
                Chat with your documents.
              </h2>
              <p className="text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: '#94a3b8' }}>
                Upload PDFs, CSVs, Excel files or Text documents. We'll read them and let you ask questions based strictly on their content. Completely ephemeral—no data is saved.
              </p>
            </div>

            <UploadArea
              onUploadComplete={handleUploadComplete}
              sessionId={sessionId}
            />
          </div>
        ) : (
          <div className="w-full max-w-4xl grid gap-8">
            <ChatInterface sessionId={sessionId} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-sm border-t" style={{ color: '#475569', borderColor: '#2d3148', backgroundColor: '#1a1d27' }}>
        DeepDocs • Ephemeral Session Storage
      </footer>
    </div>
  );
}

export default App;
