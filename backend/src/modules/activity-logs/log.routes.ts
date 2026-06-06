import { Router, Request, Response } from 'express';
import { getActivityLogs } from './log.service';
import { authenticate, authorize } from '../../middleware/authenticate';

const router = Router();

// Apply auth middleware to all routes
router.use(authenticate);

// GET /api/v1/activity-logs
router.get('/', authorize('ADMIN', 'MANAGER', 'PROCUREMENT_OFFICER'), async (req: Request, res: Response) => {
  try {
    const search = req.query.search as string | undefined;
    const roleFilter = req.query.role as string | undefined;

    const result = await getActivityLogs(search, roleFilter);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
