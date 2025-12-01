export const rateLimiter = (redis) => async (req, res, next) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const key = `rate:${ip}`;
  
  try {
    const requests = await redis.incr(key);
    if (requests === 1) await redis.expire(key, 60);
    if (requests > 30) return res.status(429).json({ error: 'Too many requests' });
    next();
  } catch (err) {
    next();
  }
};
