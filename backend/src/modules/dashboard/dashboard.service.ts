import { prisma } from '../../config/database';

export async function getDashboardSummary(userId: string, role: string, vendorId?: string) {
  // 1. Core Counts
  const activeVendorsCount = await prisma.vendor.count({
    where: { status: 'ACTIVE' }
  });

  const activeRFQsCount = await prisma.rFQ.count({
    where: { 
      status: 'PUBLISHED',
      ...(role === 'VENDOR' && vendorId ? { rfqVendors: { some: { vendorId } } } : {})
    }
  });

  const pendingApprovalsCount = await prisma.approval.count({
    where: { 
      status: 'PENDING',
      ...(role === 'MANAGER' ? { approverId: userId } : {})
    }
  });

  // 2. Spend calculations (sum of ISSUED or COMPLETED PO amounts)
  const pos = await prisma.purchaseOrder.findMany({
    where: {
      status: { in: ['ISSUED', 'COMPLETED', 'ACKNOWLEDGED'] },
      ...(role === 'VENDOR' && vendorId ? { approval: { quotation: { vendorId } } } : {})
    },
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

  const totalSpend = pos.reduce((sum, po) => sum + Number(po.amount), 0);

  // Category Spend
  const categorySpend: Record<string, number> = {
    'IT Hardware': 0,
    'IT & Tech Hardware': 0,
    'IT': 0,
    'Manufacturing': 0,
    'Logistics': 0,
    'Office Supplies': 0
  };

  pos.forEach(po => {
    const cat = po.approval.quotation.vendor.category;
    if (cat) {
      categorySpend[cat] = (categorySpend[cat] || 0) + Number(po.amount);
    }
  });

  // Consolidate duplicate IT categories for client charts
  const itTotal = (categorySpend['IT Hardware'] || 0) + (categorySpend['IT & Tech Hardware'] || 0) + (categorySpend['IT'] || 0);
  const cleanCategorySpend = {
    'IT': itTotal,
    'Manufacturing': categorySpend['Manufacturing'] || 0,
    'Logistics': categorySpend['Logistics'] || 0,
    'Office Supplies': categorySpend['Office Supplies'] || 0
  };

  // Recent activity logs
  const recentLogs = await prisma.activityLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      actor: { select: { name: true, role: true } }
    }
  });

  const cleanLogs = recentLogs.map(log => ({
    id: log.id,
    actorName: log.actor.name,
    actorRole: log.actor.role,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    timestamp: log.createdAt.toISOString(),
    details: (log.metadata as any)?.details || `${log.actor.name} executed ${log.action} on ${log.entityType}`
  }));

  // Notifications
  const notifications = await prisma.notification.findMany({
    where: { 
      userId,
      isRead: false
    },
    orderBy: { createdAt: 'desc' },
    take: 15
  });

  return {
    activeVendorsCount,
    activeRFQsCount,
    pendingApprovalsCount,
    totalSpend,
    categorySpend: cleanCategorySpend,
    recentLogs: cleanLogs,
    notifications: notifications.map(n => ({
      id: n.id,
      message: n.message,
      read: n.isRead,
      createdAt: n.createdAt.toISOString()
    }))
  };
}

export async function getUserNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 20
  });
}

export async function markNotificationsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true }
  });
}
