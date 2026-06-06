import { Router, Request, Response } from 'express';
import { loginUser, signupUser, refreshAccessToken, logoutUser, loginSchema, signupSchema } from './auth.service';
import { authenticate } from '../../middleware/authenticate';

const router = Router();

// POST /api/v1/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const body = loginSchema.parse(req.body);
    const result = await loginUser(body.email, body.password);
    
    // Cookie options
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.json({ accessToken: result.accessToken, user: result.user });
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
});

// POST /api/v1/auth/signup
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const body = signupSchema.parse(req.body);
    const user = await signupUser(body);
    res.status(201).json({ message: 'Account created successfully', user });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/v1/auth/refresh
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers['x-refresh-token'] || req.cookies?.refreshToken;
    if (!authHeader) throw new Error('No refresh token provided');
    const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ') 
      ? authHeader.split(' ')[1] 
      : authHeader;

    const tokens = await refreshAccessToken(token);
    res.cookie('refreshToken', tokens.refreshToken, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production', 
      sameSite: 'strict' 
    });
    res.json({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
});

// POST /api/v1/auth/logout
router.post('/logout', async (req: Request, res: Response) => {
  const token = req.body.refreshToken || req.cookies?.refreshToken;
  if (token) {
    await logoutUser(token);
  }
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out successfully' });
});

// GET /api/v1/auth/me
router.get('/me', authenticate, async (req: Request, res: Response) => {
  res.json({ user: req.user });
});

export default router;
