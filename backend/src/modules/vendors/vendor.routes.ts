import { Router, Request, Response } from 'express';
import { 
  getAllVendors, 
  getVendorById, 
  createVendor, 
  updateVendor, 
  updateVendorStatus, 
  deleteVendor, 
  getVendorCategories,
  createVendorSchema
} from './vendor.service';
import { authenticate, authorize } from '../../middleware/authenticate';
import { VendorStatus } from '@prisma/client';

const router = Router();

// Apply auth middleware to all routes
router.use(authenticate);

// GET /api/v1/vendors
router.get('/', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as VendorStatus | undefined;
    const category = req.query.category as string | undefined;
    const search = req.query.search as string | undefined;
    
    const result = await getAllVendors({ status, category, search });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/vendors/categories
router.get('/categories', async (_req: Request, res: Response) => {
  try {
    const result = await getVendorCategories();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/vendors/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await getVendorById(req.params.id);
    res.json(result);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// POST /api/v1/vendors
router.post('/', authorize('ADMIN', 'PROCUREMENT_OFFICER'), async (req: Request, res: Response) => {
  try {
    const body = createVendorSchema.parse(req.body);
    const result = await createVendor(body);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/v1/vendors/:id
router.put('/:id', authorize('ADMIN', 'PROCUREMENT_OFFICER'), async (req: Request, res: Response) => {
  try {
    const body = createVendorSchema.partial().parse(req.body);
    const result = await updateVendor(req.params.id, body);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/v1/vendors/:id/status
router.patch('/:id/status', authorize('ADMIN', 'PROCUREMENT_OFFICER'), async (req: Request, res: Response) => {
  try {
    const status = req.body.status as VendorStatus;
    if (!status) {
      res.status(400).json({ error: 'Status is required' });
      return;
    }
    const result = await updateVendorStatus(req.params.id, status);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/v1/vendors/:id
router.delete('/:id', authorize('ADMIN'), async (req: Request, res: Response) => {
  try {
    await deleteVendor(req.params.id);
    res.json({ message: 'Vendor deleted successfully' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
