
import { rateLimit, ipKeyGenerator } from "express-rate-limit";
import type { Request } from "express";

function getUserKey(req: Request): string {
  const user = req.res?.locals.user as
    | { id?: string }
    | undefined;

  if (user?.id) {
    return `user:${user.id}`;
  }

  return `ip:${ipKeyGenerator(req.ip ?? "127.0.0.1")}`;
}

// Maximum 10 créations par heure et par utilisateur.
export const workoutCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: getUserKey,
  message: {
    error: "Trop de séances créées. Réessaie dans une heure.",
  },
});

// Maximum 120 sauvegardes par minute et par utilisateur.
export const workoutModificationLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: getUserKey,
  message: {
    error: "Trop de modifications. Réessaie dans une minute.",
  },
});

// Maximum 20 suppressions par heure et par utilisateur.
export const workoutDeletionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: getUserKey,
  message: {
    error: "Trop de suppressions. Réessaie plus tard.",
  },
});
