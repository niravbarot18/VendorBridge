import { Router, Request, Response } from 'express';
import { 
  createRFQ, 
  getAllRFQs, 
  getRFQById, 
  publishRFQ, 
  closeRFQ, 
  getRFQComparison,
  createRFQSchema
} from './rfq.service';
import { authenticate, authorize } from '../../middleware/authenticate';
import { RFQStatus } from '@prisma/client';

const router = Router();

// Apply auth middleware to all routes
router.use(authenticate);

// GET /api/v1/rfqs
router.get('/', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as RFQStatus | undefined;
    const createdById = req.query.createdById as string | undefined;
    
    // If user is a vendor, restrict view to only their invited RFQs
    const isVendor = req.user?.role === 'VENDOR';
    const vendorId = req.user?.vendorId;

    const result = await getAllRFQs({ 
      status, 
      createdById, 
      ...(isVendor ? { vendorId } : {}) 
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/rfqs/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await getRFQById(req.params.id);
    res.json(result);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// GET /api/v1/rfqs/:id/compare
router.get('/:id/compare', authorize('ADMIN', 'PROCUREMENT_OFFICER'), async (req: Request, res: Response) => {
  try {
    const result = await getRFQComparison(req.params.id);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/v1/rfqs
router.post('/', authorize('ADMIN', 'PROCUREMENT_OFFICER'), async (req: Request, res: Response) => {
  try {
    const createdById = req.user!.userId;
    const body = createRFQSchema.parse(req.body);
    const result = await createRFQ(body, createdById);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/v1/rfqs/:id/publish
router.patch('/:id/publish', authorize('ADMIN', 'PROCUREMENT_OFFICER'), async (req: Request, res: Response) => {
  try {
    const result = await publishRFQ(req.params.id);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/v1/rfqs/:id/close
router.patch('/:id/close', authorize('ADMIN', 'PROCUREMENT_OFFICER'), async (req: Request, res: Response) => {
  try {
    const result = await closeRFQ(req.params.id);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
