
import { rateLimit } from "express-rate-limit";
import type { Request, Response } from "express";

function getUserKey(_req: Request, res: Response): string {
  const user = res.locals.user as { id?: string } | undefined;

  if (!user?.id) {
    throw new Error("Social rate limiter requires authentication");
  }

  return `user:${user.id}`;
}

function createSocialLimiter(
  limit: number,
  windowMs: number,
  message: string,
) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: getUserKey,
    message: { error: message },
  });
}

export const friendRequestLimiter = createSocialLimiter(
  10,
  60 * 60 * 1000,
  "Trop de demandes d'amis. Réessaie dans une heure.",
);

export const groupCreationLimiter = createSocialLimiter(
  5,
  24 * 60 * 60 * 1000,
  "Trop de groupes créés. Réessaie plus tard.",
);

export const groupInvitationLimiter = createSocialLimiter(
  20,
  60 * 60 * 1000,
  "Trop d'invitations envoyées. Réessaie dans une heure.",
);

export const invitationResponseLimiter = createSocialLimiter(
  30,
  60 * 60 * 1000,
  "Trop de réponses aux invitations. Réessaie dans une heure.",
);
