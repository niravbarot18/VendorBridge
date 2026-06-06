import { Router, Request, Response } from 'express';
import { 
  getAllPOs, 
  getPOById, 
  acknowledgePO
} from './po.service';
import { authenticate, authorize } from '../../middleware/authenticate';
import { POStatus } from '@prisma/client';

const router = Router();

// Apply auth middleware to all routes
router.use(authenticate);

// GET /api/v1/purchase-orders
router.get('/', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as POStatus | undefined;
    const isVendor = req.user?.role === 'VENDOR';
    const vendorId = req.user?.vendorId;

    const result = await getAllPOs({ 
      status, 
      ...(isVendor ? { vendorId } : {}) 
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/purchase-orders/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await getPOById(req.params.id);
    res.json(result);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// POST /api/v1/purchase-orders/:id/acknowledge
router.post('/:id/acknowledge', authorize('VENDOR', 'ADMIN'), async (req: Request, res: Response) => {
  try {
    const poId = req.params.id;
    const result = await acknowledgePO(poId, req.user!.userId, req.user!.email);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
