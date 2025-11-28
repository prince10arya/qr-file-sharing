import express from 'express';
import multer from 'multer';
import cors from 'cors';
import QRCode from 'qrcode';
import { randomBytes } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_URL = process.env.PUBLIC_URL || 'http://localhost:5173';
const UPLOAD_DIR = process.env.UPLOAD_DIR || join(__dirname, 'uploads');
const SESSION_TTL_MIN = parseInt(process.env.SESSION_TTL_MIN || '30');
const FILE_TTL_HOURS = parseInt(process.env.FILE_TTL_HOURS || '24');
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE_BYTES || '52428800');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// In-memory storage
const sessions = new Map();
const jobs = new Map();

// Middleware
app.use(cors());
app.use(express.json());

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${randomBytes(8).toString('hex')}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = /\.(pdf|png|jpg|jpeg|doc|docx)$/i;
  cb(null, allowed.test(file.originalname));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE }
});

// Cleanup expired sessions and files
setInterval(() => {
  const now = Date.now();

  for (const [token, session] of sessions.entries()) {
    if (session.expiresAt < now) {
      sessions.delete(token);
    }
  }

  for (const [jobId, job] of jobs.entries()) {
    if (job.expiresAt < now) {
      try {
        if (fs.existsSync(job.filePath)) {
          fs.unlinkSync(job.filePath);
        }
      } catch (err) {
        console.error('Cleanup error:', err);
      }
      jobs.delete(jobId);
    }
  }
}, 60000);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Create session
app.post('/api/sessions', async (req, res) => {
  try {
    const { shopId } = req.body;
    const token = randomBytes(10).toString('hex');
    const expiresAt = Date.now() + SESSION_TTL_MIN * 60 * 1000;

    sessions.set(token, { shopId, expiresAt, createdAt: Date.now() });

    const uploadUrl = `${PUBLIC_URL}/upload/${token}`;
    const qrDataUrl = await QRCode.toDataURL(uploadUrl);

    res.json({ token, uploadUrl, qrDataUrl, expiresAt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload file
app.get("/",(req, res)=>{
  res.send("Backend is running");
})
app.post('/api/upload/:token', upload.single('file'), (req, res) => {
  try {
    const { token } = req.params;
    const session = sessions.get(token);

    if (!session) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Session not found or expired' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const jobId = randomBytes(16).toString('hex');
    const job = {
      jobId,
      token,
      shopId: session.shopId,
      filename: req.file.originalname,
      filePath: req.file.path,
      size: req.file.size,
      uploadedAt: Date.now(),
      expiresAt: Date.now() + FILE_TTL_HOURS * 60 * 60 * 1000
    };

    jobs.set(jobId, job);

    res.json({ jobId, filename: job.filename, size: job.size });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get jobs for session
app.get('/api/jobs/:token', (req, res) => {
  try {
    const { token } = req.params;
    const session = sessions.get(token);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const sessionJobs = Array.from(jobs.values())
      .filter(job => job.token === token)
      .map(({ jobId, filename, size, uploadedAt }) => ({
        jobId, filename, size, uploadedAt
      }));

    res.json({ jobs: sessionJobs, expiresAt: session.expiresAt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Download file
app.get('/api/files/:jobId', (req, res) => {
  try {
    const { jobId } = req.params;
    const job = jobs.get(jobId);

    if (!job) {
      return res.status(404).json({ error: 'File not found' });
    }

    if (!fs.existsSync(job.filePath)) {
      jobs.delete(jobId);
      return res.status(404).json({ error: 'File no longer exists' });
    }

    res.download(job.filePath, job.filename);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
