import { prisma } from '../../config/database';
import { z } from 'zod';
import { VendorStatus } from '@prisma/client';

export const createVendorSchema = z.object({
  companyName: z.string().min(2).max(255),
  gstNumber: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GST number').optional(),
  category: z.string().min(1).max(100),
  contactName: z.string().min(2).max(255),
  contactEmail: z.string().email(),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
  rating: z.number().default(4.0),
  location: z.string().default('Maharashtra'),
  notes: z.string().optional(),
});

export async function getAllVendors(filters: {
  status?: VendorStatus;
  category?: string;
  search?: string;
}) {
  const { status, category, search } = filters;

  const where: any = {};
  if (status) where.status = status;
  if (category) where.category = category;
  if (search) {
    where.OR = [
      { companyName: { contains: search } },
      { contactEmail: { contains: search } },
      { gstNumber: { contains: search } },
    ];
  }

  const vendors = await prisma.vendor.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  return vendors;
}

export async function getVendorById(id: string) {
  const vendor = await prisma.vendor.findUnique({
    where: { id },
    include: {
      quotations: {
        include: { rfq: { select: { id: true, title: true, deadline: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  });
  if (!vendor) throw new Error('Vendor not found');
  return vendor;
}

export async function createVendor(data: z.infer<typeof createVendorSchema>) {
  if (data.gstNumber) {
    const existing = await prisma.vendor.findUnique({
      where: { gstNumber: data.gstNumber },
    });
    if (existing) throw new Error('GST number already registered');
  }

  return prisma.vendor.create({
    data: {
      companyName: data.companyName,
      gstNumber: data.gstNumber,
      category: data.category,
      contactName: data.contactName,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
      address: data.address,
      status: 'ACTIVE', // Default active on onboarding for demo
      rating: data.rating,
      location: data.location,
      notes: data.notes
    }
  });
}

export async function updateVendor(id: string, data: Partial<z.infer<typeof createVendorSchema>>) {
  return prisma.vendor.update({ 
    where: { id }, 
    data 
  });
}

export async function updateVendorStatus(id: string, status: VendorStatus) {
  return prisma.vendor.update({ 
    where: { id }, 
    data: { status } 
  });
}

export async function deleteVendor(id: string) {
  return prisma.vendor.delete({ 
    where: { id } 
  });
}

export async function getVendorCategories() {
  const categories = await prisma.vendor.groupBy({
    by: ['category'],
    _count: { category: true },
    orderBy: { _count: { category: 'desc' } },
  });
  return categories.map(c => ({ category: c.category, count: c._count.category }));
}
export async function updateVendorRating(id: string, rating: number) {
  return prisma.vendor.update({
    where: { id },
    data: { rating }
  });
}
