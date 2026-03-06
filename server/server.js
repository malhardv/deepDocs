import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import FormData from 'form-data';
import fetch from 'node-fetch'; // need node-fetch for older node versions or use native fetch if available

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';

app.use(cors());
app.use(express.json());

// Set up in-memory multer storage
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB per file max
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['application/pdf', 'text/plain', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Unsupported file type: ${file.originalname}`), false);
        }
    }
}).array('files', 10); // Accept up to 10 files

async function warmUpAIService() {
    const maxAttempts = 9;
    for (let i = 0; i < maxAttempts; i++) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        try {
            const res = await fetch(`${AI_SERVICE_URL}/`, { signal: controller.signal });
            if (res.ok) {
                console.log('AI service is awake.');
                clearTimeout(timeout);
                return;
            }
        } catch (e) {
            console.log(`AI service not ready yet, retrying... (${i + 1}/${maxAttempts}) Error: ${e.message}`);
        } finally {
            clearTimeout(timeout);
        }
        await new Promise(r => setTimeout(r, 5000));
    }
    throw new Error('AI service did not wake up in time. Please try again in a moment.');
}
// Routes
app.post('/api/upload', (req, res) => {
    upload(req, res, async (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ error: `Upload error: ${err.message}` });
        } else if (err) {
            return res.status(400).json({ error: err.message });
        }

        const files = req.files;
        const sessionId = req.body.session_id;

        if (!files || files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded.' });
        }
        if (!sessionId) {
            return res.status(400).json({ error: 'Session ID is required.' });
        }

        try {
            // Wake up the AI service first (handles Render free-tier cold starts)
            await warmUpAIService();

            // Forward files to Python Service
            const formData = new FormData();
            formData.append('session_id', sessionId);

            files.forEach(file => {
                formData.append('files', file.buffer, {
                    filename: file.originalname,
                    contentType: file.mimetype
                });
            });

            console.log(`Forwarding ${files.length} files to AI service for session: ${sessionId}`);

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 120000);

            try {
                const response = await fetch(`${AI_SERVICE_URL}/api/upload`, {
                    method: 'POST',
                    body: formData,
                    headers: formData.getHeaders(),
                    signal: controller.signal // 2-minute timeout
                });

                if (!response.ok) {
                    const errorData = await response.text();
                    throw new Error(errorData || 'AI service error');
                }

                const data = await response.json();
                return res.json({ message: 'Documents uploaded and processed successfully', details: data });
            } finally {
                clearTimeout(timeout);
            }
        } catch (error) {
            console.error('Error forwarding files to AI service:', error);
            return res.status(500).json({ error: error.message || 'Failed to process documents on AI service.' });
        }
    });
});


app.post('/api/ask', async (req, res) => {
    const { session_id, question } = req.body;

    if (!session_id || !question) {
        return res.status(400).json({ error: 'session_id and question are required.' });
    }

    try {
        console.log(`Forwarding question to AI service for session: ${session_id}`);
        const response = await fetch(`${AI_SERVICE_URL}/api/ask`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ session_id, question })
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(errorData || 'AI service error');
        }

        const data = await response.json();
        return res.json(data); // returns { answer: "..." }
    } catch (error) {
        console.error('Error querying AI service:', error);
        return res.status(500).json({ error: error.message || 'Failed to get answer from AI service.' });
    }
});

app.post('/api/clear', async (req, res) => {
    const { session_id } = req.body;
    if (!session_id) {
        return res.status(400).json({ error: 'session_id is required.' });
    }

    try {
        console.log(`Clearing session: ${session_id}`);
        const response = await fetch(`${AI_SERVICE_URL}/api/clear`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ session_id })
        });

        if (!response.ok) {
            throw new Error('Failed to clear session on AI service');
        }
        return res.json({ message: 'Session cleared successfully.' });
    } catch (error) {
        console.error('Error clearing session:', error);
        return res.status(500).json({ error: 'Failed to clear session.' });
    }
});

app.listen(port, () => {
    console.log(`Server API listening on port ${port}`);
});
