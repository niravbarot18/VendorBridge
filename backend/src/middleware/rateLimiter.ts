import rateLimit from 'express-rate-limit';

export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 1000, // limit each IP to 1000 requests per window (increased for local demo testing)
  message: {
    error: 'Too many requests from this IP, please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false
});
