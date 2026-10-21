
import type { Request, Response } from "express";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import {
  createSession,
  deleteSession,
  getUserFromToken,
  login,
  register,
  SESSION_DURATION_MS,
} from "./auth.service.js";
import { loginSchema, registerSchema } from "./auth.schema.js";

const COOKIE_NAME = "spot_session";
const IS_PRODUCTION = process.env.NODE_ENV === "production";

const cookieOptions = {
  httpOnly: true,
  secure: IS_PRODUCTION,
  sameSite: "lax" as const,
  path: "/",
};

export async function registerController(req: Request, res: Response) {
  const parsed = registerSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "Données invalides",
      details: parsed.error.flatten(),
    });
  }

  try {
    const user = await register(parsed.data);
    const token = await createSession(user.id);

    res.cookie(COOKIE_NAME, token, {
      ...cookieOptions,
      maxAge: SESSION_DURATION_MS,
    });

    return res.status(201).json({ user });
  } catch (error) {
    if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === "P2002"
        ) {
        return res.status(409).json({
            error: "Adresse e-mail ou pseudo déjà utilisé",
        });
    }

    throw error;
  }
}

export async function loginController(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: "Données invalides" });
  }

  const user = await login(parsed.data);

  if (!user) {
    return res.status(401).json({
      error: "Identifiants incorrects",
    });
  }

  const token = await createSession(user.id);

  res.cookie(COOKIE_NAME, token, {
    ...cookieOptions,
    maxAge: SESSION_DURATION_MS,
  });

  return res.json({ user });
}

export async function meController(req: Request, res: Response) {
  const user = await getUserFromToken(req.cookies?.[COOKIE_NAME]);

  if (!user) {
    return res.status(401).json({ error: "Non authentifié" });
  }

  return res.json({ user });
}

export async function logoutController(req: Request, res: Response) {
  await deleteSession(req.cookies?.[COOKIE_NAME]);

  res.clearCookie(COOKIE_NAME, cookieOptions);

  return res.status(204).send();
}
