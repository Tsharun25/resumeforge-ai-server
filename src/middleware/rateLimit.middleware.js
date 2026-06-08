const stores = new Map();

const getClientKey = (req) => {
  const forwardedFor = req.headers["x-forwarded-for"];
  const ip = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : forwardedFor?.split(",")[0];

  return `${ip || req.ip || req.socket?.remoteAddress || "unknown"}:${
    req.user?._id || "guest"
  }`;
};

export const createRateLimiter = ({
  windowMs = 60 * 1000,
  max = 30,
  message = "Too many requests. Please wait a moment and try again.",
} = {}) => {
  const storeKey = `${windowMs}:${max}:${message}`;

  if (!stores.has(storeKey)) {
    stores.set(storeKey, new Map());
  }

  const bucket = stores.get(storeKey);

  return (req, res, next) => {
    const now = Date.now();
    const key = getClientKey(req);
    const record = bucket.get(key);

    if (!record || record.resetAt <= now) {
      bucket.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });
      next();
      return;
    }

    record.count += 1;

    if (record.count > max) {
      res.set("Retry-After", Math.ceil((record.resetAt - now) / 1000));
      return res.status(429).json({
        success: false,
        message,
      });
    }

    next();
  };
};
