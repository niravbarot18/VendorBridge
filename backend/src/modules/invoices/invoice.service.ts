import { prisma } from '../../config/database';
import { InvoiceStatus } from '@prisma/client';


const BRIDGE_COMPANY_STATE = "Maharashtra";

export async function getAllInvoices(filters: {
  status?: InvoiceStatus;
  vendorId?: string; // Vendor role context filter
}) {
  const { status, vendorId } = filters;
  const where: any = {};
  if (status) where.status = status;
  
  if (vendorId) {
    where.purchaseOrder = {
      approval: {
        quotation: {
          vendorId
        }
      }
    };
  }

  const invoices = await prisma.invoice.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      generator: { select: { name: true } },
      purchaseOrder: {
        include: {
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
      }
    }
  });

  return invoices;
}

export async function getInvoiceById(id: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      generator: { select: { id: true, name: true, email: true } },
      purchaseOrder: {
        include: {
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
      }
    }
  });
  if (!invoice) throw new Error('Invoice not found');
  return invoice;
}

export async function createInvoice(poId: string, actorId: string, actorName: string) {
  return prisma.$transaction(async (tx) => {
    // 1. Find PO & check duplicate invoice
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
    if (po.status !== 'ACKNOWLEDGED') {
      throw new Error('Purchase Order must be acknowledged by vendor before generating an invoice');
    }

    const existingInvoice = await tx.invoice.findUnique({ where: { poId } });
    if (existingInvoice) throw new Error('Invoice already exists for this PO');

    const vendor = po.approval.quotation.vendor;
    
    // 2. GST Tax Computation
    // intrastate: CGST 9% + SGST 9% (if vendor location === COMPANY state "Maharashtra")
    // interstate: IGST 18% (if vendor location !== COMPANY state)
    const isSameState = vendor.location.trim().toLowerCase() === BRIDGE_COMPANY_STATE.toLowerCase();
    
    const subtotal = Number(po.amount);
    const taxRate = 0.18;
    const totalTax = subtotal * taxRate;
    
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (isSameState) {
      cgst = totalTax / 2;
      sgst = totalTax / 2;
    } else {
      igst = totalTax;
    }

    const totalAmount = subtotal + totalTax;

    // 3. Auto-generate sequential invoice number INV-YYYY-NNNN
    const count = await tx.invoice.count();
    const currentYear = new Date().getFullYear();
    const nextSequence = String(count + 1).padStart(4, '0');
    const invoiceNumber = `INV-${currentYear}-${nextSequence}`;

    const invoice = await tx.invoice.create({
      data: {
        poId,
        generatedBy: actorId,
        invoiceNumber,
        subtotal,
        cgst,
        sgst,
        igst,
        totalAmount,
        status: 'SENT' // Set to sent automatically on submission
      }
    });

    // Notify Procurement Officers
    const officers = await tx.user.findMany({ where: { role: 'PROCUREMENT_OFFICER' } });
    for (const off of officers) {
      await tx.notification.create({
        data: {
          userId: off.id,
          type: 'INVOICE_SENT',
          message: `Invoice Received: Vendor "${vendor.companyName}" submitted Invoice ${invoiceNumber} for ₹${totalAmount.toLocaleString('en-IN')}.`
        }
      });
    }

    // Log Activity
    await tx.activityLog.create({
      data: {
        actorId,
        entityType: 'INVOICE',
        entityId: invoice.id,
        action: 'Sent Invoice',
        metadata: { invoiceNumber, totalAmount }
      }
    });

    return invoice;
  });
}

export async function payInvoice(invoiceId: string, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        purchaseOrder: {
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
        }
      }
    });

    if (!invoice) throw new Error('Invoice not found');
    if (invoice.status === 'PAID') throw new Error('Invoice is already paid');

    const updatedInvoice = await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'PAID',
        paidAt: new Date()
      }
    });

    // Update PO to COMPLETED
    await tx.purchaseOrder.update({
      where: { id: invoice.poId },
      data: { status: 'COMPLETED' }
    });

    const vendor = invoice.purchaseOrder.approval.quotation.vendor;

    // Notify Vendor User account
    const vendorUser = await tx.user.findFirst({
      where: { email: vendor.contactEmail }
    });
    
    if (vendorUser) {
      await tx.notification.create({
        data: {
          userId: vendorUser.id,
          type: 'INVOICE_PAID',
          message: `Payment Received: Invoice ${invoice.invoiceNumber} has been marked as PAID by Finance.`
        }
      });
    }

    // Log Activity
    await tx.activityLog.create({
      data: {
        actorId,
        entityType: 'INVOICE',
        entityId: invoiceId,
        action: 'Paid Invoice',
        metadata: { invoiceNumber: invoice.invoiceNumber, amount: invoice.totalAmount }
      }
    });

    return updatedInvoice;
  });
}
