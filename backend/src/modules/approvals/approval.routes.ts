import { Router, Request, Response } from 'express';
import { 
  getAllApprovals, 
  processApproval,
  getApprovalById
} from './approval.service';
import { authenticate, authorize } from '../../middleware/authenticate';
import { ApprovalStatus } from '@prisma/client';

const router = Router();

// Apply auth middleware to all routes
router.use(authenticate);

// GET /api/v1/approvals
router.get('/', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as ApprovalStatus | undefined;
    
    // Managers only see their own assigned pending items
    const isManager = req.user?.role === 'MANAGER';
    const approverId = isManager ? req.user?.userId : undefined;

    const result = await getAllApprovals({ status, approverId });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/approvals/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await getApprovalById(req.params.id);
    res.json(result);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// POST /api/v1/approvals/:id/action
router.post('/:id/action', authorize('MANAGER', 'ADMIN'), async (req: Request, res: Response) => {
  try {
    const approvalId = req.params.id;
    const { status, remarks } = req.body;
    
    if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
      res.status(400).json({ error: 'Valid status (APPROVED or REJECTED) is required' });
      return;
    }
    
    const result = await processApproval(approvalId, status, remarks, req.user!.userId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
