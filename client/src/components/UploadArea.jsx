import React, { useCallback, useState } from 'react';
import { Upload, X, File, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export function UploadArea({ onUploadComplete, sessionId }) {
    const [files, setFiles] = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');

    const handleDrag = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setIsDragging(true);
        } else if (e.type === 'dragleave') {
            setIsDragging(false);
        }
    }, []);

    const validateFiles = (newFiles) => {
        const validTypes = [
            'application/pdf',
            'text/plain',
            'text/csv',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ];

        if (files.length + newFiles.length > 10) {
            setErrorMessage('Maximum 10 files allowed per session.');
            return [];
        }

        const validFiles = newFiles.filter(file => {
            if (!validTypes.includes(file.type)) {
                setErrorMessage(`Unsupported file type: ${file.name}`);
                return false;
            }
            if (file.size > 50 * 1024 * 1024) {
                setErrorMessage(`File too large: ${file.name} (Max 50MB)`);
                return false;
            }
            return true;
        });

        if (validFiles.length > 0) setErrorMessage('');
        return validFiles;
    };

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const droppedFiles = Array.from(e.dataTransfer.files);
            const validFiles = validateFiles(droppedFiles);
            setFiles(prev => [...prev, ...validFiles]);
        }
    }, [files]);

    const handleFileInput = (e) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFiles = Array.from(e.target.files);
            const validFiles = validateFiles(selectedFiles);
            setFiles(prev => [...prev, ...validFiles]);
        }
    };

    const removeFile = (indexToRemove) => {
        setFiles(files.filter((_, index) => index !== indexToRemove));
    };

    const handleUpload = async () => {
        if (files.length === 0) return;
        setIsUploading(true);
        setUploadStatus(null);
        setErrorMessage('');

        try {
            const formData = new FormData();
            formData.append('session_id', sessionId);
            files.forEach(file => formData.append('files', file));

            const response = await fetch(`${API_URL}/api/upload`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to upload files');
            }

            setUploadStatus('success');
            onUploadComplete(files);
        } catch (err) {
            setUploadStatus('error');
            setErrorMessage(err.message);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="w-full max-w-3xl mx-auto p-6 rounded-xl border shadow-xl"
            style={{ backgroundColor: '#1a1d27', borderColor: '#2d3148' }}>
            <div className="mb-6">
                <h2 className="text-xl font-semibold text-white">Knowledge Base</h2>
                <p className="text-sm mt-1" style={{ color: '#64748b' }}>
                    Upload up to 10 documents (PDF, TXT, CSV, XLSX) for this session.
                </p>
            </div>

            <div
                className={cn(
                    "relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200",
                    isDragging
                        ? "border-primary-500 bg-primary-900/20"
                        : "hover:border-slate-500",
                    isUploading && "opacity-50 pointer-events-none"
                )}
                style={!isDragging ? { borderColor: '#2d3148', backgroundColor: '#21253a' } : {}}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                <input
                    type="file"
                    multiple
                    accept=".pdf,.txt,.csv,.xlsx"
                    onChange={handleFileInput}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={isUploading || files.length >= 10 || uploadStatus === 'success'}
                />

                <div className="flex flex-col items-center justify-center space-y-4 pointer-events-none">
                    <div className="p-4 rounded-full" style={{ backgroundColor: '#2d3148' }}>
                        <Upload className="w-8 h-8 text-primary-400" />
                    </div>
                    <div>
                        <p className="font-medium text-slate-200">
                            Click to upload or drag and drop
                        </p>
                        <p className="text-sm mt-1" style={{ color: '#64748b' }}>
                            Maximum 10 files per session
                        </p>
                    </div>
                </div>
            </div>

            {errorMessage && (
                <div className="mt-4 p-3 rounded-lg flex items-center text-sm border"
                    style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#f87171', borderColor: 'rgba(239,68,68,0.2)' }}>
                    <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                    {errorMessage}
                </div>
            )}

            {files.length > 0 && (
                <div className="mt-6">
                    <h3 className="text-sm font-medium mb-3 flex justify-between items-center" style={{ color: '#94a3b8' }}>
                        <span>Selected Files ({files.length}/10)</span>
                        {uploadStatus === 'success' && (
                            <span className="flex items-center text-xs px-2 py-1 rounded-full"
                                style={{ color: '#4ade80', backgroundColor: 'rgba(74,222,128,0.1)' }}>
                                <CheckCircle2 className="w-3 h-3 mr-1" /> Ready
                            </span>
                        )}
                    </h3>
                    <ul className="space-y-2 mb-6">
                        {files.map((file, index) => (
                            <li key={`${file.name}-${index}`}
                                className="flex items-center justify-between p-3 rounded-lg border"
                                style={{ backgroundColor: '#21253a', borderColor: '#2d3148' }}>
                                <div className="flex items-center overflow-hidden">
                                    <File className="w-4 h-4 mr-3 flex-shrink-0" style={{ color: '#60a5fa' }} />
                                    <span className="text-sm truncate" style={{ color: '#cbd5e1' }}>{file.name}</span>
                                </div>
                                {uploadStatus !== 'success' && !isUploading && (
                                    <button
                                        onClick={() => removeFile(index)}
                                        className="p-1 rounded-md transition-colors"
                                        style={{ color: '#475569' }}
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>

                    {uploadStatus !== 'success' && (
                        <button
                            onClick={handleUpload}
                            disabled={isUploading || files.length === 0}
                            className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    Processing Documents...
                                </>
                            ) : (
                                'Process Documents & Start Session'
                            )}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
