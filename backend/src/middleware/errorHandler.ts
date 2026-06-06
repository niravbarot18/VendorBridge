import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
  console.error(`❌ Error on path ${req.method} ${req.path}:`, err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error',
    code: err.code || 'INTERNAL_ERROR'
  });
}
