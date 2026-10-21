
import { randomBytes, createHash } from "node:crypto";
import argon2 from "argon2";
import { prisma } from "../../lib/prisma.js";
import type { LoginInput, RegisterInput } from "./auth.schema.js";

export const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

const publicUserSelect = {
  id: true,
  email: true,
  username: true,
  firstName: true,
  lastName: true,
  createdAt: true,
  profile: true,
} as const;

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");

  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashSessionToken(token),
      expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
    },
  });

  return token;
}

export async function register(input: RegisterInput) {
  const passwordHash = await argon2.hash(input.password, {
    type: argon2.argon2id,
  });

  return prisma.user.create({
    data: {
      email: input.email,
      username: input.username,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      profile: { create: {} },
    },
    select: publicUserSelect,
  });
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (!user) return null;

  const valid = await argon2.verify(
    user.passwordHash,
    input.password
  );

  if (!valid) return null;

  return prisma.user.findUnique({
    where: { id: user.id },
    select: publicUserSelect,
  });
}

export async function getUserFromToken(token?: string) {
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: {
      user: { select: publicUserSelect },
    },
  });

  if (!session || session.expiresAt <= new Date()) return null;

  return session.user;
}

export async function deleteSession(token?: string) {
  if (!token) return;

  await prisma.session.deleteMany({
    where: { tokenHash: hashSessionToken(token) },
  });
}
