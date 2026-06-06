import { Router, Request, Response } from 'express';
import { 
  getAllInvoices, 
  getInvoiceById, 
  createInvoice, 
  payInvoice
} from './invoice.service';
import { authenticate, authorize } from '../../middleware/authenticate';
import { InvoiceStatus } from '@prisma/client';

const router = Router();

// Apply auth middleware to all routes
router.use(authenticate);

// GET /api/v1/invoices
router.get('/', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as InvoiceStatus | undefined;
    const isVendor = req.user?.role === 'VENDOR';
    const vendorId = req.user?.vendorId;

    const result = await getAllInvoices({ 
      status, 
      ...(isVendor ? { vendorId } : {}) 
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/invoices/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await getInvoiceById(req.params.id);
    res.json(result);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// POST /api/v1/invoices
router.post('/', authorize('VENDOR', 'ADMIN'), async (req: Request, res: Response) => {
  try {
    const { poId } = req.body;
    if (!poId) {
      res.status(400).json({ error: 'poId is required' });
      return;
    }
    
    const result = await createInvoice(poId, req.user!.userId, req.user!.email);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/v1/invoices/:id/pay
router.post('/:id/pay', authorize('ADMIN', 'PROCUREMENT_OFFICER'), async (req: Request, res: Response) => {
  try {
    const invoiceId = req.params.id;
    const result = await payInvoice(invoiceId, req.user!.userId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
