import { Router, Request, Response } from 'express';
import { 
  getDashboardSummary, 
  getUserNotifications, 
  markNotificationsRead 
} from './dashboard.service';
import { authenticate } from '../../middleware/authenticate';

const router = Router();

// Apply auth middleware to all routes
router.use(authenticate);

// GET /api/v1/dashboard/summary
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const role = req.user!.role;
    const vendorId = req.user!.vendorId;

    const result = await getDashboardSummary(userId, role, vendorId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/dashboard/notifications
router.get('/notifications', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const result = await getUserNotifications(userId);
    res.json(result.map(n => ({
      id: n.id,
      message: n.message,
      read: n.isRead,
      createdAt: n.createdAt.toISOString()
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/dashboard/notifications/read
router.post('/notifications/read', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    await markNotificationsRead(userId);
    res.json({ message: 'Notifications marked as read' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
