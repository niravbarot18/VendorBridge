import { PrismaClient, UserRole, VendorStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding VendorBridge database...');

  // 1. Create Internal Users
  const adminPassword = await bcrypt.hash('Admin@123', 12);
  await prisma.user.upsert({
    where: { email: 'admin@vendorbridge.com' },
    update: {},
    create: {
      id: 'u1',
      name: 'Aarav Mehta',
      email: 'admin@vendorbridge.com',
      passwordHash: adminPassword,
      role: UserRole.ADMIN,
    },
  });

  const officerPassword = await bcrypt.hash('Officer@123', 12);
  await prisma.user.upsert({
    where: { email: 'priya@vendorbridge.com' },
    update: {},
    create: {
      id: 'u2',
      name: 'Priya Sharma',
      email: 'priya@vendorbridge.com',
      passwordHash: officerPassword,
      role: UserRole.PROCUREMENT_OFFICER,
    },
  });

  const managerPassword = await bcrypt.hash('Manager@123', 12);
  await prisma.user.upsert({
    where: { email: 'rajesh@vendorbridge.com' },
    update: {},
    create: {
      id: 'u3',
      name: 'Rajesh Patel',
      email: 'rajesh@vendorbridge.com',
      passwordHash: managerPassword,
      role: UserRole.MANAGER,
    },
  });

  // 2. Create Vendors
  const v1 = await prisma.vendor.upsert({
    where: { gstNumber: '27AAAAA1111A1Z1' },
    update: {},
    create: {
      id: 'v1',
      companyName: 'TechCorp Solutions',
      gstNumber: '27AAAAA1111A1Z1',
      category: 'IT',
      contactName: 'Vikram Gupta',
      contactEmail: 'user@techcorp.com',
      status: VendorStatus.ACTIVE,
      rating: 4.8,
      location: 'Maharashtra',
    },
  });

  const v2 = await prisma.vendor.upsert({
    where: { gstNumber: '29BBBBB2222B2Z2' },
    update: {},
    create: {
      id: 'v2',
      companyName: 'Logix Logistics',
      gstNumber: '29BBBBB2222B2Z2',
      category: 'Logistics',
      contactName: 'Anjali Nair',
      contactEmail: 'user@logix.com',
      status: VendorStatus.ACTIVE,
      rating: 4.2,
      location: 'Karnataka',
    },
  });

  const v3 = await prisma.vendor.upsert({
    where: { gstNumber: '07CCCCC3333C3Z3' },
    update: {},
    create: {
      id: 'v3',
      companyName: 'SteelCo Manufacturing',
      gstNumber: '07CCCCC3333C3Z3',
      category: 'Manufacturing',
      contactName: 'Amit Singh',
      contactEmail: 'user@steelco.com',
      status: VendorStatus.ACTIVE,
      rating: 3.9,
      location: 'Delhi',
    },
  });

  await prisma.vendor.upsert({
    where: { gstNumber: '19DDDDD4444D4Z4' },
    update: {},
    create: {
      id: 'v4',
      companyName: 'Global Exports LLC',
      gstNumber: '19DDDDD4444D4Z4',
      category: 'Office Supplies',
      contactName: 'Sanjay Dutt',
      contactEmail: 'deals@global.com',
      status: VendorStatus.BLACKLISTED,
      rating: 2.1,
      location: 'West Bengal',
    },
  });

  // 3. Create Vendor Users associated with their emails
  const vendorPassword = await bcrypt.hash('Vendor@123', 12);
  
  await prisma.user.upsert({
    where: { email: 'user@techcorp.com' },
    update: {},
    create: {
      id: 'u4',
      name: 'Vikram Gupta',
      email: 'user@techcorp.com',
      passwordHash: vendorPassword,
      role: UserRole.VENDOR,
    },
  });

  await prisma.user.upsert({
    where: { email: 'user@logix.com' },
    update: {},
    create: {
      id: 'u5',
      name: 'Anjali Nair',
      email: 'user@logix.com',
      passwordHash: vendorPassword,
      role: UserRole.VENDOR,
    },
  });

  await prisma.user.upsert({
    where: { email: 'user@steelco.com' },
    update: {},
    create: {
      id: 'u6',
      name: 'Amit Singh',
      email: 'user@steelco.com',
      passwordHash: vendorPassword,
      role: UserRole.VENDOR,
    },
  });

  console.log('✅ Seeding complete!');
  console.log('Credentials Summary:');
  console.log('   Admin:    admin@vendorbridge.com / Admin@123');
  console.log('   Officer:  priya@vendorbridge.com / Officer@123');
  console.log('   Manager:  rajesh@vendorbridge.com / Manager@123');
  console.log('   Vendors:  user@techcorp.com, user@logix.com, user@steelco.com / Vendor@123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
