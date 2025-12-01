import express from 'express';
import multer from 'multer';
import multerS3 from 'multer-s3';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import cors from 'cors';
import QRCode from 'qrcode';
import { randomBytes } from 'crypto';
import dotenv from 'dotenv';
import { createClient } from 'redis';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_URL = process.env.PUBLIC_URL || 'http://localhost:5173';
const SESSION_TTL_MIN = parseInt(process.env.SESSION_TTL_MIN || '30');
const FILE_TTL_HOURS = parseInt(process.env.FILE_TTL_HOURS || '24');
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE_BYTES || '52428800');
const REDIS_URL = process.env.REDIS_URL;

// AWS S3 Configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});
const S3_BUCKET = process.env.S3_BUCKET;

// Redis client
const redis = createClient({ url: REDIS_URL });
redis.on('error', (err) => console.error('Redis error:', err));
await redis.connect();
console.log('Redis connected');

// Middleware
app.use(cors());
app.use(express.json());

// Multer S3 configuration
const upload = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: S3_BUCKET,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    },
    key: (req, file, cb) => {
      const uniqueName = `${Date.now()}-${randomBytes(8).toString('hex')}-${file.originalname}`;
      cb(null, uniqueName);
    }
  }),
  fileFilter: (req, file, cb) => {
    const allowedExtensions = /\.(pdf|png|jpg|jpeg|doc|docx)$/i;
    const allowedMimeTypes = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    const hasValidExtension = allowedExtensions.test(file.originalname);
    const hasValidMimeType = allowedMimeTypes.includes(file.mimetype);
    
    if (hasValidExtension || hasValidMimeType) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
  limits: { fileSize: MAX_FILE_SIZE }
});



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

    await redis.setEx(`session:${token}`, SESSION_TTL_MIN * 60, JSON.stringify({ shopId, expiresAt, createdAt: Date.now() }));

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
app.post('/api/upload/:token', upload.single('file'), async (req, res) => {
  try {
    const { token } = req.params;
    const sessionData = await redis.get(`session:${token}`);

    if (!sessionData) {
      if (req.file) {
        await s3Client.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: req.file.key }));
      }
      return res.status(404).json({ error: 'Session not found or expired' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const session = JSON.parse(sessionData);
    const jobId = randomBytes(16).toString('hex');
    const job = {
      jobId,
      token,
      shopId: session.shopId,
      filename: req.file.originalname,
      s3Key: req.file.key,
      size: req.file.size,
      uploadedAt: Date.now(),
      expiresAt: Date.now() + FILE_TTL_HOURS * 60 * 60 * 1000
    };

    await redis.setEx(`job:${jobId}`, FILE_TTL_HOURS * 60 * 60, JSON.stringify(job));
    await redis.sAdd(`session:${token}:jobs`, jobId);
    await redis.expire(`session:${token}:jobs`, FILE_TTL_HOURS * 60 * 60);

    res.json({ jobId, filename: job.filename, size: job.size });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get jobs for session
app.get('/api/jobs/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const sessionData = await redis.get(`session:${token}`);

    if (!sessionData) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = JSON.parse(sessionData);
    const jobIds = await redis.sMembers(`session:${token}:jobs`);
    const sessionJobs = [];

    for (const jobId of jobIds) {
      const jobData = await redis.get(`job:${jobId}`);
      if (jobData) {
        const job = JSON.parse(jobData);
        sessionJobs.push({ jobId: job.jobId, filename: job.filename, size: job.size, uploadedAt: job.uploadedAt });
      }
    }

    res.json({ jobs: sessionJobs, expiresAt: session.expiresAt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Download file
app.get('/api/files/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const jobData = await redis.get(`job:${jobId}`);

    if (!jobData) {
      return res.status(404).json({ error: 'File not found' });
    }

    const job = JSON.parse(jobData);
    const command = new GetObjectCommand({ Bucket: S3_BUCKET, Key: job.s3Key });
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    res.redirect(signedUrl);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
