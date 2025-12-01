export class SignedURLCache {
  constructor(redis, ttlSeconds = 240) {
    this.redis = redis;
    this.ttl = ttlSeconds;
  }

  async get(jobId) {
    return await this.redis.get(`signed:${jobId}`);
  }

  async set(jobId, signedUrl) {
    await this.redis.setEx(`signed:${jobId}`, this.ttl, signedUrl);
  }
}
