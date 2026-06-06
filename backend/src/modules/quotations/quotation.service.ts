import { prisma } from '../../config/database';
import { z } from 'zod';
import { QuotationStatus } from '@prisma/client';

export const submitQuotationSchema = z.object({
  rfqId: z.string().uuid(),
  vendorId: z.string().uuid(),
  totalPrice: z.number().positive(),
  deliveryDays: z.number().int().positive(),
  notes: z.string().optional(),
  items: z.array(z.object({
    rfqItemId: z.string().uuid(),
    unitPrice: z.number().positive(),
    totalPrice: z.number().positive(),
  })).min(1),
});

export async function submitQuotation(data: z.infer<typeof submitQuotationSchema>, actorName: string, actorRole: any) {
  return prisma.$transaction(async (tx) => {
    // Check if quotation already exists for this rfq + vendor
    const existing = await tx.quotation.findFirst({
      where: { rfqId: data.rfqId, vendorId: data.vendorId }
    });

    let quotation;

    if (existing) {
      // Delete old line items
      await tx.quotationItem.deleteMany({
        where: { quotationId: existing.id }
      });

      // Update quotation
      quotation = await tx.quotation.update({
        where: { id: existing.id },
        data: {
          totalPrice: data.totalPrice,
          deliveryDays: data.deliveryDays,
          notes: data.notes,
          status: 'SUBMITTED',
          submittedAt: new Date(),
          items: {
            create: data.items.map(item => ({
              rfqItemId: item.rfqItemId,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
            }))
          }
        },
        include: { items: true }
      });
    } else {
      // Create new quotation
      quotation = await tx.quotation.create({
        data: {
          rfqId: data.rfqId,
          vendorId: data.vendorId,
          totalPrice: data.totalPrice,
          deliveryDays: data.deliveryDays,
          notes: data.notes,
          status: 'SUBMITTED',
          submittedAt: new Date(),
          items: {
            create: data.items.map(item => ({
              rfqItemId: item.rfqItemId,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
            }))
          }
        },
        include: { items: true }
      });
    }

    // Update rfqVendor invite responded status
    await tx.rFQVendor.updateMany({
      where: { rfqId: data.rfqId, vendorId: data.vendorId },
      data: { respondedAt: new Date() }
    });

    // Notify procurement officers
    const rfq = await tx.rFQ.findUnique({ where: { id: data.rfqId } });
    const vendor = await tx.vendor.findUnique({ where: { id: data.vendorId } });
    const officers = await tx.user.findMany({ where: { role: 'PROCUREMENT_OFFICER' } });

    for (const off of officers) {
      await tx.notification.create({
        data: {
          userId: off.id,
          type: 'QUOTATION_RECEIVED',
          message: `Supplier "${vendor?.companyName}" has submitted a quotation for RFQ: "${rfq?.title}" (₹${data.totalPrice.toLocaleString('en-IN')}).`
        }
      });
    }

    // Add activity log
    await tx.activityLog.create({
      data: {
        actorId: (await tx.user.findFirst({ where: { email: vendor?.contactEmail } }))?.id || 'u2', // fallback
        entityType: 'QUOTATION',
        entityId: quotation.id,
        action: 'Submitted Quotation',
        metadata: { totalPrice: data.totalPrice, deliveryDays: data.deliveryDays }
      }
    });

    return quotation;
  });
}

export async function getQuotationById(id: string) {
  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: {
      rfq: true,
      vendor: true,
      items: true
    }
  });
  if (!quotation) throw new Error('Quotation not found');
  return quotation;
}

export async function awardQuotation(rfqId: string, quotationId: string, actorId: string, actorName: string, actorRole: any) {
  return prisma.$transaction(async (tx) => {
    // 1. Award selected quote
    await tx.quotation.update({
      where: { id: quotationId },
      data: { status: 'SELECTED' } // SELECTED === AWARDED
    });

    // Reject other quotes for this RFQ
    await tx.quotation.updateMany({
      where: { rfqId, id: { not: quotationId } },
      data: { status: 'REJECTED' }
    });

    // 2. Set RFQ status to CLOSED
    await tx.rFQ.update({
      where: { id: rfqId },
      data: { status: 'CLOSED' }
    });

    // 3. Create Approval Record
    // Route to first Manager in DB
    const manager = await tx.user.findFirst({ where: { role: 'MANAGER' } });
    if (!manager) throw new Error('No manager registered in the system to route approval');

    const approval = await tx.approval.create({
      data: {
        quotationId,
        approverId: manager.id,
        status: 'PENDING',
      }
    });

    const quote = await tx.quotation.findUnique({ where: { id: quotationId }, include: { vendor: true } });

    // Notify Manager
    await tx.notification.create({
      data: {
        userId: manager.id,
        type: 'APPROVAL_REQUESTED',
        message: `Action Required: Auditing & Approval needed for ₹${Number(quote?.totalPrice).toLocaleString('en-IN')} contract award to "${quote?.vendor?.companyName}".`
      }
    });

    // Log Activity
    await tx.activityLog.create({
      data: {
        actorId,
        entityType: 'RFQ',
        entityId: rfqId,
        action: 'Awarded RFQ',
        metadata: { quotationId, totalPrice: quote?.totalPrice }
      }
    });

    return approval;
  });
}
