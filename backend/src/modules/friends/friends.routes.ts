
import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middlewares/requireAuth.js";

export const friendsRouter = Router();

friendsRouter.use(requireAuth);

const idSchema = z.uuid();

const publicUserSelect = {
  id: true,
  username: true,
  firstName: true,
  lastName: true,
} as const;

function currentUserId(res: any): string {
  return res.locals.user.id as string;
}

// Rechercher des utilisateurs
friendsRouter.get("/search", async (req, res, next) => {
  try {
    const parsed = z.string()
      .trim()
      .min(2)
      .max(40)
      .safeParse(req.query.q);

    if (!parsed.success) {
      res.status(400).json({
        error: "Recherche invalide (2 à 40 caractères)",
      });
      return;
    }

    const userId = currentUserId(res);

    const users = await prisma.user.findMany({
      where: {
        id: { not: userId },
        username: {
          contains: parsed.data,
          mode: "insensitive",
        },
      },
      select: publicUserSelect,
      take: 10,
      orderBy: { username: "asc" },
    });

    res.json({ users });
  } catch (error) {
    next(error);
  }
});

// Liste des amis et demandes
friendsRouter.get("/", async (_req, res, next) => {
  try {
    const userId = currentUserId(res);

    const relations = await prisma.friendship.findMany({
      where: {
        OR: [
          { senderId: userId },
          { receiverId: userId },
        ],
      },
      include: {
        sender: { select: publicUserSelect },
        receiver: { select: publicUserSelect },
      },
      orderBy: { createdAt: "desc" },
    });

    const friends = relations
      .filter((relation) => relation.status === "ACCEPTED")
      .map((relation) => ({
        friendshipId: relation.id,
        user: relation.senderId === userId
          ? relation.receiver
          : relation.sender,
      }));

    const incoming = relations
      .filter(
        (relation) =>
          relation.status === "PENDING" &&
          relation.receiverId === userId,
      )
      .map((relation) => ({
        friendshipId: relation.id,
        user: relation.sender,
      }));

    const outgoing = relations
      .filter(
        (relation) =>
          relation.status === "PENDING" &&
          relation.senderId === userId,
      )
      .map((relation) => ({
        friendshipId: relation.id,
        user: relation.receiver,
      }));

    res.json({ friends, incoming, outgoing });
  } catch (error) {
    next(error);
  }
});

// Envoyer une demande d'ami
friendsRouter.post("/requests", async (req, res, next) => {
  try {
    const parsed = z.object({
      receiverId: z.uuid(),
    }).strict().safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: "Données invalides" });
      return;
    }

    const senderId = currentUserId(res);
    const { receiverId } = parsed.data;

    if (senderId === receiverId) {
      res.status(400).json({
        error: "Impossible de s'ajouter soi-même",
      });
      return;
    }

    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
      select: { id: true },
    });

    if (!receiver) {
      res.status(404).json({
        error: "Utilisateur introuvable",
      });
      return;
    }

    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { senderId, receiverId },
          {
            senderId: receiverId,
            receiverId: senderId,
          },
        ],
      },
    });

    if (existing) {
      res.status(409).json({
        error: "Une relation ou demande existe déjà",
      });
      return;
    }

    const friendship = await prisma.friendship.create({
      data: {
        senderId,
        receiverId,
      },
    });

    res.status(201).json({ friendship });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      res.status(409).json({
        error: "Une demande existe déjà",
      });
      return;
    }

    next(error);
  }
});

// Accepter une demande reçue
friendsRouter.post(
  "/requests/:id/accept",
  async (req, res, next) => {
    try {
      const parsed = idSchema.safeParse(req.params.id);

      if (!parsed.success) {
        res.status(400).json({ error: "Identifiant invalide" });
        return;
      }

      const result = await prisma.friendship.updateMany({
        where: {
          id: parsed.data,
          receiverId: currentUserId(res),
          status: "PENDING",
        },
        data: { status: "ACCEPTED" },
      });

      if (result.count === 0) {
        res.status(404).json({
          error: "Demande introuvable",
        });
        return;
      }

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  },
);

// Refuser, annuler une demande ou supprimer un ami
friendsRouter.delete("/:id", async (req, res, next) => {
  try {
    const parsed = idSchema.safeParse(req.params.id);

    if (!parsed.success) {
      res.status(400).json({ error: "Identifiant invalide" });
      return;
    }

    const userId = currentUserId(res);

    const result = await prisma.friendship.deleteMany({
      where: {
        id: parsed.data,
        OR: [
          { senderId: userId },
          { receiverId: userId },
        ],
      },
    });

    if (result.count === 0) {
      res.status(404).json({
        error: "Relation introuvable",
      });
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
