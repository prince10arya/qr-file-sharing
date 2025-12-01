export class QRCache {
  constructor(redis, ttlSeconds = 300) {
    this.redis = redis;
    this.ttl = ttlSeconds;
  }

  async get(url) {
    return await this.redis.get(`qr:${url}`);
  }

  async set(url, qrDataUrl) {
    await this.redis.setEx(`qr:${url}`, this.ttl, qrDataUrl);
  }
}
