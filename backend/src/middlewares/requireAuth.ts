
import type { Request, Response, NextFunction } from "express";
import { getUserFromToken } from "../modules/auth/auth.service.js";

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const token = req.cookies?.spot_session;

    if (typeof token !== "string" || !token) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }

    const user = await getUserFromToken(token);

    if (!user) {
      res.status(401).json({ error: "Session invalide ou expirée" });
      return;
    }

    res.locals.user = user;
    next();
  } catch (error) {
    next(error);
  }
}
