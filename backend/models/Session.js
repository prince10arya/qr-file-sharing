export class Session {
  constructor(redis, ttlMinutes) {
    this.redis = redis;
    this.ttl = ttlMinutes * 60;
  }

  async create(token, shopId) {
    const expiresAt = Date.now() + this.ttl * 1000;
    const sessionData = { shopId, expiresAt, createdAt: Date.now() };
    await this.redis.setEx(`session:${token}`, this.ttl, JSON.stringify(sessionData));
    return { token, expiresAt };
  }

  async get(token) {
    const data = await this.redis.get(`session:${token}`);
    return data ? JSON.parse(data) : null;
  }

  async delete(token) {
    await this.redis.del(`session:${token}`);
  }
}
