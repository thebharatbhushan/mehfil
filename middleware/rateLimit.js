// Tiny in-memory per-IP limiter (no new dependency). Fine for a single server instance.
const rateLimit = ({ windowMs, max }) => {
  const hits = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [key, rec] of hits) if (rec.reset < now) hits.delete(key);
  }, windowMs).unref();

  return (req, res, next) => {
    const now = Date.now();
    let rec = hits.get(req.ip);
    if (!rec || rec.reset < now) rec = { count: 0, reset: now + windowMs };
    rec.count += 1;
    hits.set(req.ip, rec);
    if (rec.count > max) {
      return res.status(429).json({ success: false, message: "Too many requests. Please try again later." });
    }
    next();
  };
};

export default rateLimit;
