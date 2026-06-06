import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const signupSchema = z.object({
  name: z.string().min(2).max(255),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER', 'VENDOR']).default('PROCUREMENT_OFFICER'),
  vendorId: z.string().optional() // Assosicated supplier if vendor
});

function generateTokens(userId: string, email: string, role: string, vendorId?: string) {
  const payload = { userId, email, role, ...(vendorId ? { vendorId } : {}) };
  const accessToken = jwt.sign(
    payload,
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES_IN as any }
  );
  const refreshToken = jwt.sign(
    payload,
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN as any }
  );
  return { accessToken, refreshToken };
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      passwordHash: true,
      role: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive) {
    throw new Error('Invalid credentials');
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    throw new Error('Invalid credentials');
  }

  // Look up if this user belongs to a vendor (e.g. check by matching contactEmail or search in vendor list,
  // but let's see if we can resolve vendorId dynamically based on the email domain or search for matching vendor contactEmail)
  let vendorId: string | undefined = undefined;
  if (user.role === 'VENDOR') {
    const matchedVendor = await prisma.vendor.findFirst({
      where: { contactEmail: email }
    });
    if (matchedVendor) {
      vendorId = matchedVendor.id;
    }
  }

  const { accessToken, refreshToken } = generateTokens(user.id, user.email, user.role, vendorId);

  // Store refresh token in MySQL
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.refreshToken.create({
    data: { token: refreshToken, userId: user.id, expiresAt },
  });

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, ...(vendorId ? { vendorId } : {}) },
  };
}

export async function signupUser(data: z.infer<typeof signupSchema>) {
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existing) {
    throw new Error('Email already registered');
  }

  const passwordHash = await bcrypt.hash(data.password, 12);

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role,
    },
    select: { id: true, name: true, email: true, role: true },
  });

  return user;
}

export async function refreshAccessToken(refreshToken: string) {
  let payload: any;
  try {
    payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
  } catch {
    throw new Error('Invalid refresh token');
  }

  const stored = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
  });

  if (!stored || stored.expiresAt < new Date()) {
    throw new Error('Refresh token expired or revoked');
  }

  const tokens = generateTokens(payload.userId, payload.email, payload.role, payload.vendorId);

  // Rotate refresh token
  await prisma.refreshToken.delete({ where: { token: refreshToken } });
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  await prisma.refreshToken.create({
    data: { token: tokens.refreshToken, userId: payload.userId, expiresAt },
  });

  return tokens;
}

export async function logoutUser(refreshToken: string) {
  await prisma.refreshToken.deleteMany({ where: { token: refreshToken } }).catch(() => {});
}
