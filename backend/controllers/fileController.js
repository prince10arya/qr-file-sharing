import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const downloadFileController = (jobModel, signedURLCache, s3Client, bucket) => {
  return async (req, res) => {
    try {
      const { jobId } = req.params;
      
      // Check cached signed URL
      let signedUrl = await signedURLCache.get(jobId);
      
      if (signedUrl) {
        return res.redirect(signedUrl);
      }
      
      const job = await jobModel.get(jobId);
      
      if (!job) {
        return res.status(404).json({ error: 'File not found' });
      }

      const command = new GetObjectCommand({ Bucket: bucket, Key: job.s3Key });
      signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
      
      // Cache signed URL for 4 minutes
      await signedURLCache.set(jobId, signedUrl);

      res.redirect(signedUrl);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
};
