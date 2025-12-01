export class Job {
  constructor(redis, fileTTLHours, deleteMinutes) {
    this.redis = redis;
    this.fileTTL = fileTTLHours * 60 * 60;
    this.deleteTime = deleteMinutes * 60 * 1000;
  }

  async create(jobId, token, shopId, filename, s3Key, size) {
    const deleteAt = Date.now() + this.deleteTime;
    const job = {
      jobId,
      token,
      shopId,
      filename,
      s3Key,
      size,
      uploadedAt: Date.now(),
      deleteAt,
      expiresAt: Date.now() + this.fileTTL * 1000
    };

    await this.redis.setEx(`job:${jobId}`, this.fileTTL, JSON.stringify(job));
    await this.redis.sAdd(`session:${token}:jobs`, jobId);
    await this.redis.expire(`session:${token}:jobs`, this.fileTTL);
    await this.redis.zAdd('files:cleanup', { score: deleteAt, value: jobId });

    return job;
  }

  async get(jobId) {
    const data = await this.redis.get(`job:${jobId}`);
    return data ? JSON.parse(data) : null;
  }

  async getBySession(token) {
    const pipeline = this.redis.multi();
    pipeline.get(`session:${token}`);
    pipeline.sMembers(`session:${token}:jobs`);
    const [sessionData, jobIds] = await pipeline.exec();

    if (!sessionData) return null;

    const session = JSON.parse(sessionData);
    
    if (jobIds.length > 0) {
      const jobPipeline = this.redis.multi();
      jobIds.forEach(id => jobPipeline.get(`job:${id}`));
      const jobsData = await jobPipeline.exec();
      
      const jobs = jobsData
        .filter(data => data)
        .map(data => {
          const job = JSON.parse(data);
          return { jobId: job.jobId, filename: job.filename, size: job.size, uploadedAt: job.uploadedAt };
        });
      
      return { jobs, expiresAt: session.expiresAt };
    }

    return { jobs: [], expiresAt: session.expiresAt };
  }

  async delete(jobId) {
    await this.redis.del(`job:${jobId}`);
    await this.redis.zRem('files:cleanup', jobId);
  }

  async getExpired() {
    const now = Date.now();
    return await this.redis.zRangeByScore('files:cleanup', 0, now);
  }
}
