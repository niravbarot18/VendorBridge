import { prisma } from '../../config/database';

export async function getActivityLogs(search?: string, roleFilter?: string) {
  const where: any = {};
  if (roleFilter) {
    where.actor = {
      role: roleFilter
    };
  }
  if (search) {
    where.OR = [
      { action: { contains: search } },
      { actor: { name: { contains: search } } }
    ];
  }

  const logs = await prisma.activityLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      actor: { select: { name: true, role: true } }
    },
    take: 100 // Cap logs retrieved
  });

  return logs.map(log => ({
    id: log.id,
    actorName: log.actor.name,
    actorRole: log.actor.role,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    timestamp: log.createdAt.toISOString(),
    details: (log.metadata as any)?.details || `${log.actor.name} executed ${log.action} on ${log.entityType}`
  }));
}
