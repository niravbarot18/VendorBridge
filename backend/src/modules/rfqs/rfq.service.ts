import { prisma } from '../../config/database';
import { z } from 'zod';
import { RFQStatus, RFQVendor } from '@prisma/client';

export const createRFQSchema = z.object({
  title: z.string().min(5).max(500),
  description: z.string().optional(),
  deadline: z.string(), // YYYY-MM-DD format
  items: z.array(z.object({
    description: z.string().min(2),
    quantity: z.number().positive(),
    unit: z.string().min(1),
    estimatedPrice: z.number().positive().optional(),
  })).min(1),
  vendorIds: z.array(z.string().uuid()).min(1),
});

export async function createRFQ(data: z.infer<typeof createRFQSchema>, createdById: string) {
  return prisma.$transaction(async (tx) => {
    const rfq = await tx.rFQ.create({
      data: {
        title: data.title,
        description: data.description,
        deadline: new Date(data.deadline),
        createdById,
        status: 'PUBLISHED', // Direct publish on creation for demo convenience
        items: {
          create: data.items.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            estimatedPrice: item.estimatedPrice,
          })),
        },
        rfqVendors: {
          create: data.vendorIds.map(vendorId => ({ vendorId })),
        },
      },
      include: {
        items: true,
        rfqVendors: { include: { vendor: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    // Create notifications for invited suppliers
    for (const vId of data.vendorIds) {
      // Find user matching vendor contact email
      const vendor = await tx.vendor.findUnique({ where: { id: vId } });
      if (vendor) {
        const vendorUser = await tx.user.findFirst({
          where: { email: vendor.contactEmail }
        });
        if (vendorUser) {
          await tx.notification.create({
            data: {
              userId: vendorUser.id,
              type: 'RFQ_CREATED',
              message: `You have been invited to submit a quotation for: "${rfq.title}". Bidding closes on ${data.deadline}.`
            }
          });
        }
      }
    }

    return rfq;
  });
}

export async function getAllRFQs(filters: {
  status?: RFQStatus;
  createdById?: string;
  vendorId?: string; // Vendor role context filter
}) {
  const { status, createdById, vendorId } = filters;
  const where: any = {};
  if (status) where.status = status;
  if (createdById) where.createdById = createdById;
  
  if (vendorId) {
    // If user is a vendor, only show RFQs they are invited to
    where.rfqVendors = {
      some: { vendorId }
    };
  }

  const rfqs = await prisma.rFQ.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      createdBy: { select: { id: true, name: true } },
      items: true,
      rfqVendors: { include: { vendor: { select: { companyName: true } } } },
      _count: { select: { quotations: true } },
    },
  });

  return rfqs;
}

export async function getRFQById(id: string) {
  const rfq = await prisma.rFQ.findUnique({
    where: { id },
    include: {
      items: true,
      rfqVendors: {
        include: { vendor: { select: { id: true, companyName: true, contactEmail: true, rating: true, location: true } } },
      },
      quotations: {
        include: {
          vendor: { select: { id: true, companyName: true, rating: true, location: true } },
          items: true,
        },
      },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });
  if (!rfq) throw new Error('RFQ not found');
  return rfq;
}

export async function publishRFQ(id: string) {
  return prisma.rFQ.update({
    where: { id },
    data: { status: 'PUBLISHED' },
  });
}

export async function closeRFQ(id: string) {
  return prisma.rFQ.update({
    where: { id },
    data: { status: 'CLOSED' },
  });
}

export async function getRFQComparison(rfqId: string) {
  const quotations = await prisma.quotation.findMany({
    where: { rfqId, status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'SELECTED', 'DRAFT'] } },
    include: {
      vendor: { select: { id: true, companyName: true, rating: true, location: true } },
      items: { include: { rfqItem: true } },
    },
    orderBy: { totalPrice: 'asc' },
  });

  return quotations;
}
