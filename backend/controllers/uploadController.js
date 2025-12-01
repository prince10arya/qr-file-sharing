import { randomBytes } from 'crypto';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';

export const uploadFileController = (sessionModel, jobModel, s3Client, bucket) => {
  return async (req, res) => {
    try {
      const { token } = req.params;
      const session = await sessionModel.get(token);

      if (!session) {
        if (req.file) {
          await s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: req.file.key }));
        }
        return res.status(404).json({ error: 'Session not found or expired' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const jobId = randomBytes(16).toString('hex');
      const job = await jobModel.create(
        jobId,
        token,
        session.shopId,
        req.file.originalname,
        req.file.key,
        req.file.size
      );

      res.json({ jobId: job.jobId, filename: job.filename, size: job.size });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
};
