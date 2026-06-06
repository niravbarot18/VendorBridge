import { prisma } from '../../config/database';
import { POStatus } from '@prisma/client';

export async function getAllPOs(filters: {
  status?: POStatus;
  vendorId?: string; // Vendor user perspective filter
}) {
  const { status, vendorId } = filters;
  const where: any = {};
  if (status) where.status = status;
  
  if (vendorId) {
    where.approval = {
      quotation: {
        vendorId
      }
    };
  }

  const pos = await prisma.purchaseOrder.findMany({
    where,
    orderBy: { issuedAt: 'desc' },
    include: {
      generator: { select: { name: true } },
      approval: {
        include: {
          quotation: {
            include: {
              vendor: true,
              rfq: true
            }
          }
        }
      }
    }
  });

  return pos;
}

export async function getPOById(id: string) {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      generator: { select: { id: true, name: true, email: true } },
      approval: {
        include: {
          quotation: {
            include: {
              vendor: true,
              rfq: { include: { items: true } },
              items: { include: { rfqItem: true } }
            }
          }
        }
      }
    }
  });
  if (!po) throw new Error('Purchase Order not found');
  return po;
}

export async function acknowledgePO(poId: string, actorId: string, actorName: string) {
  return prisma.$transaction(async (tx) => {
    const po = await tx.purchaseOrder.findUnique({
      where: { id: poId },
      include: {
        approval: {
          include: {
            quotation: {
              include: {
                vendor: true
              }
            }
          }
        }
      }
    });

    if (!po) throw new Error('PO not found');
    if (po.status !== 'ISSUED') throw new Error('PO status is not ISSUED, cannot acknowledge');

    const updatedPo = await tx.purchaseOrder.update({
      where: { id: poId },
      data: {
        status: 'ACKNOWLEDGED'
      }
    });

    // Notify Procurement Officers
    const officers = await tx.user.findMany({ where: { role: 'PROCUREMENT_OFFICER' } });
    for (const off of officers) {
      await tx.notification.create({
        data: {
          userId: off.id,
          type: 'PO_GENERATED',
          message: `PO Acknowledged: Vendor "${po.approval.quotation.vendor.companyName}" accepted PO ${po.poNumber}.`
        }
      });
    }

    // Log Activity
    await tx.activityLog.create({
      data: {
        actorId,
        entityType: 'PO',
        entityId: poId,
        action: 'Acknowledged Purchase Order',
        metadata: { poNumber: po.poNumber }
      }
    });

    return updatedPo;
  });
}
