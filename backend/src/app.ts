import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { connectDatabase, disconnectDatabase } from './config/database';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';

// Route imports
import authRoutes from './modules/auth/auth.routes';
import vendorRoutes from './modules/vendors/vendor.routes';
import rfqRoutes from './modules/rfqs/rfq.routes';
import quotationRoutes from './modules/quotations/quotation.routes';
import approvalRoutes from './modules/approvals/approval.routes';
import poRoutes from './modules/purchase-orders/po.routes';
import invoiceRoutes from './modules/invoices/invoice.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import logRoutes from './modules/activity-logs/log.routes';

const app = express();

// ─── Middleware ───────────────────────────────
app.use(helmet());
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(rateLimiter);

// ─── Routes ──────────────────────────────────
const API = env.API_PREFIX || '/api/v1';

app.use(`${API}/auth`, authRoutes);
app.use(`${API}/vendors`, vendorRoutes);
app.use(`${API}/rfqs`, rfqRoutes);
app.use(`${API}/quotations`, quotationRoutes);
app.use(`${API}/approvals`, approvalRoutes);
app.use(`${API}/purchase-orders`, poRoutes);
app.use(`${API}/invoices`, invoiceRoutes);
app.use(`${API}/dashboard`, dashboardRoutes);
app.use(`${API}/activity-logs`, logRoutes);

// ─── Health Check ─────────────────────────────
app.get('/health', async (_req, res) => {
  try {
    const { prisma } = await import('./config/database');
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});

// ─── Error Handler ────────────────────────────
app.use(errorHandler);

// ─── Server Start ─────────────────────────────
async function bootstrap() {
  await connectDatabase();

  const server = app.listen(env.PORT, () => {
    console.log(`🚀 VendorBridge API running on port ${env.PORT}`);
    console.log(`   Environment: ${env.NODE_ENV}`);
    console.log(`   API Base: ${API}`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch(console.error);

export default app;
