import express from 'express';
import compression from 'compression';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from 'redis';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

// Middleware
import { rateLimiter } from './middleware/rateLimiter.js';
import { createUploadMiddleware } from './middleware/upload.js';

// Models
import { Session } from './models/Session.js';
import { Job } from './models/Job.js';
import { QRCache } from './models/QRCache.js';
import { SignedURLCache } from './models/SignedURLCache.js';

// Controllers
import { createSessionController } from './controllers/sessionController.js';
import { uploadFileController } from './controllers/uploadController.js';
import { getJobsController } from './controllers/jobController.js';
import { downloadFileController } from './controllers/fileController.js';

// Routes
import { createSessionRoutes } from './routes/sessionRoutes.js';
import { createUploadRoutes } from './routes/uploadRoutes.js';
import { createJobRoutes } from './routes/jobRoutes.js';
import { createFileRoutes } from './routes/fileRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_URL = process.env.PUBLIC_URL || 'http://localhost:5173';
const SESSION_TTL_MIN = parseInt(process.env.SESSION_TTL_MIN || '30');
const FILE_TTL_HOURS = parseInt(process.env.FILE_TTL_HOURS || '24');
const FILE_DELETE_MIN = parseInt(process.env.FILE_DELETE_MIN || '10');
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE_BYTES || '52428800');
const REDIS_URL = process.env.REDIS_URL;
const S3_BUCKET = process.env.S3_BUCKET;

// AWS S3 Configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// Redis client
const redis = createClient({ url: REDIS_URL });
redis.on('error', (err) => console.error('Redis error:', err));
await redis.connect();
console.log('Redis connected');

// Initialize Models
const sessionModel = new Session(redis, SESSION_TTL_MIN);
const jobModel = new Job(redis, FILE_TTL_HOURS, FILE_DELETE_MIN);
const qrCache = new QRCache(redis);
const signedURLCache = new SignedURLCache(redis);

// Initialize Middleware
const uploadMiddleware = createUploadMiddleware(s3Client, S3_BUCKET, MAX_FILE_SIZE);

// Initialize Controllers
const sessionController = createSessionController(sessionModel, qrCache, PUBLIC_URL);
const uploadController = uploadFileController(sessionModel, jobModel, s3Client, S3_BUCKET);
const jobController = getJobsController(jobModel);
const fileController = downloadFileController(jobModel, signedURLCache, s3Client, S3_BUCKET);

// App Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(rateLimiter(redis));

// Health check
app.get('/', (req, res) => res.send('Backend is running'));
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: Date.now() }));

// API Routes
app.use('/api', createSessionRoutes(sessionController));
app.use('/api', createUploadRoutes(uploadController, uploadMiddleware));
app.use('/api', createJobRoutes(jobController));
app.use('/api', createFileRoutes(fileController));

// Cleanup job - runs every minute
setInterval(async () => {
  try {
    const expiredJobs = await jobModel.getExpired();
    
    for (const jobId of expiredJobs) {
      const job = await jobModel.get(jobId);
      if (job) {
        try {
          await s3Client.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: job.s3Key }));
          console.log(`Deleted file from S3: ${job.s3Key}`);
        } catch (err) {
          console.error(`Failed to delete S3 file: ${job.s3Key}`, err);
        }
        await jobModel.delete(jobId);
      } else {
        await jobModel.delete(jobId);
      }
    }
    
    if (expiredJobs.length > 0) {
      console.log(`Cleaned up ${expiredJobs.length} expired files`);
    }
  } catch (err) {
    console.error('Cleanup job error:', err);
  }
}, 60000);

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log(`Files will be auto-deleted after ${FILE_DELETE_MIN} minutes`);
});
