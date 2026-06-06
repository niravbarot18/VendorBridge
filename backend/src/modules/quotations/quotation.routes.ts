import { Router, Request, Response } from 'express';
import { 
  submitQuotation, 
  getQuotationById, 
  awardQuotation,
  submitQuotationSchema
} from './quotation.service';
import { authenticate, authorize } from '../../middleware/authenticate';

const router = Router();

// Apply auth middleware to all routes
router.use(authenticate);

// GET /api/v1/quotations/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await getQuotationById(req.params.id);
    res.json(result);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// POST /api/v1/quotations
router.post('/', authorize('VENDOR', 'ADMIN'), async (req: Request, res: Response) => {
  try {
    const body = submitQuotationSchema.parse(req.body);
    const result = await submitQuotation(body, req.user!.email, req.user!.role);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/v1/quotations/:id/award
router.post('/:id/award', authorize('ADMIN', 'PROCUREMENT_OFFICER'), async (req: Request, res: Response) => {
  try {
    const quotationId = req.params.id;
    const rfqId = req.body.rfqId;
    if (!rfqId) {
      res.status(400).json({ error: 'rfqId is required' });
      return;
    }
    const result = await awardQuotation(rfqId, quotationId, req.user!.userId, req.user!.email, req.user!.role);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
