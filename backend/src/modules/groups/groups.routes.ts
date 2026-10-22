
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middlewares/requireAuth.js";
import { Prisma } from "@prisma/client";

export const groupsRouter = Router();

groupsRouter.use(requireAuth);

const createGroupSchema = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(300).optional(),
}).strict();

const publicUserSelect = {
  id: true,
  username: true,
  firstName: true,
  lastName: true,
} as const;

// Liste des groupes dont l'utilisateur est membre
groupsRouter.get("/", async (_req, res, next) => {
  try {
    const userId = res.locals.user.id as string;

    const groups = await prisma.group.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        _count: {
          select: { members: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    res.json({ groups });
  } catch (error) {
    next(error);
  }
});

// Créer un groupe
groupsRouter.post("/", async (req, res, next) => {
  try {
    const parsed = createGroupSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: "Données du groupe invalides",
        details: parsed.error.flatten(),
      });
      return;
    }

    const userId = res.locals.user.id as string;

    const group = await prisma.group.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        ownerId: userId,
        members: {
          create: {
            userId,
            role: "OWNER",
          },
        },
      },
      include: {
        members: {
          include: {
            user: { select: publicUserSelect },
          },
        },
      },
    });

    res.status(201).json({ group });
  } catch (error) {
    next(error);
  }
});

// Consulter un groupe dont on est membre
groupsRouter.get("/:id", async (req, res, next) => {
  try {
    const parsed = z.uuid().safeParse(req.params.id);

    if (!parsed.success) {
      res.status(400).json({
        error: "Identifiant invalide",
      });
      return;
    }

    const userId = res.locals.user.id as string;

    const group = await prisma.group.findFirst({
      where: {
        id: parsed.data,
        members: {
          some: { userId },
        },
      },
      include: {
        members: {
          include: {
            user: { select: publicUserSelect },
          },
          orderBy: { joinedAt: "asc" },
        },
      },
    });

    if (!group) {
      res.status(404).json({
        error: "Groupe introuvable",
      });
      return;
    }

    res.json({
        group,
        isOwner: group.ownerId === userId,
    })
  } catch (error) {
    next(error);
  }
});

const invitationSchema = z.object({
  receiverId: z.uuid(),
}).strict();

// Inviter un ami dans un groupe
groupsRouter.post("/:id/invitations", async (req, res, next) => {
  try {
    const groupId = z.uuid().safeParse(req.params.id);
    const body = invitationSchema.safeParse(req.body);

    if (!groupId.success || !body.success) {
      res.status(400).json({ error: "Données invalides" });
      return;
    }

    const senderId = res.locals.user.id as string;
    const { receiverId } = body.data;

    const group = await prisma.group.findFirst({
      where: { id: groupId.data, ownerId: senderId },
      include: { _count: { select: { members: true } } },
    });

    if (!group) {
      res.status(404).json({
        error: "Groupe introuvable ou accès refusé",
      });
      return;
    }

    if (group._count.members >= 20) {
      res.status(409).json({ error: "Le groupe est complet" });
      return;
    }

    if (senderId === receiverId) {
      res.status(400).json({ error: "Invitation impossible" });
      return;
    }

    // Seuls les amis acceptés peuvent être invités
    const friendship = await prisma.friendship.findFirst({
      where: {
        status: "ACCEPTED",
        OR: [
          { senderId, receiverId },
          { senderId: receiverId, receiverId: senderId },
        ],
      },
      select: { id: true },
    });

    if (!friendship) {
      res.status(403).json({
        error: "Tu dois être ami avec cet utilisateur",
      });
      return;
    }

    const existingMember = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: groupId.data,
          userId: receiverId,
        },
      },
    });

    if (existingMember) {
      res.status(409).json({
        error: "Cet utilisateur est déjà membre",
      });
      return;
    }

    const existingInvitation = await prisma.groupInvitation.findUnique({
      where: {
        groupId_receiverId: {
          groupId: groupId.data,
          receiverId,
        },
      },
    });

    if (existingInvitation?.status === "PENDING") {
      res.status(409).json({
        error: "Une invitation est déjà en attente",
      });
      return;
    }

    const invitation = await prisma.groupInvitation.upsert({
      where: {
        groupId_receiverId: {
          groupId: groupId.data,
          receiverId,
        },
      },
      create: {
        groupId: groupId.data,
        senderId,
        receiverId,
      },
      update: {
        senderId,
        status: "PENDING",
      },
    });

    res.status(201).json({ invitation });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      res.status(409).json({ error: "Invitation déjà existante" });
      return;
    }

    next(error);
  }
});

// Voir ses invitations reçues
groupsRouter.get("/invitations/received", async (_req, res, next) => {
  try {
    const userId = res.locals.user.id as string;

    const invitations = await prisma.groupInvitation.findMany({
      where: { receiverId: userId, status: "PENDING" },
      select: {
        id: true,
        createdAt: true,
        group: {
          select: { id: true, name: true, description: true },
        },
        sender: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    res.json({ invitations });
  } catch (error) {
    next(error);
  }
});

// Accepter ou refuser une invitation
groupsRouter.post("/invitations/:id/respond", async (req, res, next) => {
  try {
    const invitationId = z.uuid().safeParse(req.params.id);
    const body = z.object({
      action: z.enum(["ACCEPT", "DECLINE"]),
    }).strict().safeParse(req.body);

    if (!invitationId.success || !body.success) {
      res.status(400).json({ error: "Données invalides" });
      return;
    }

    const userId = res.locals.user.id as string;

    const invitation = await prisma.groupInvitation.findFirst({
      where: {
        id: invitationId.data,
        receiverId: userId,
        status: "PENDING",
      },
    });

    if (!invitation) {
      res.status(404).json({ error: "Invitation introuvable" });
      return;
    }

    if (body.data.action === "DECLINE") {
      const result = await prisma.groupInvitation.updateMany({
        where: {
          id: invitation.id,
          receiverId: userId,
          status: "PENDING",
        },
        data: { status: "DECLINED" },
      });

      if (!result.count) {
        res.status(409).json({ error: "Invitation déjà traitée" });
        return;
      }

      res.json({ success: true });
      return;
    }

    await prisma.$transaction(async (tx) => {
      // Verrouille le groupe pendant la vérification de capacité.
      await tx.$queryRaw`
        SELECT id FROM "Group"
        WHERE id = ${invitation.groupId}
        FOR UPDATE
      `;

      const pending = await tx.groupInvitation.findFirst({
        where: {
          id: invitation.id,
          receiverId: userId,
          status: "PENDING",
        },
      });

      if (!pending) throw new Error("INVITATION_NOT_PENDING");

      const count = await tx.groupMember.count({
        where: { groupId: invitation.groupId },
      });

      if (count >= 20) throw new Error("GROUP_FULL");

      await tx.groupMember.create({
        data: {
          groupId: invitation.groupId,
          userId,
          role: "MEMBER",
        },
      });

      await tx.groupInvitation.update({
        where: { id: invitation.id },
        data: { status: "ACCEPTED" },
      });
    });

    res.json({ success: true, groupId: invitation.groupId });
  } catch (error) {
    if (error instanceof Error && error.message === "GROUP_FULL") {
      res.status(409).json({ error: "Le groupe est complet" });
      return;
    }

    if (error instanceof Error && error.message === "INVITATION_NOT_PENDING") {
      res.status(409).json({ error: "Invitation déjà traitée" });
      return;
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      res.status(409).json({ error: "Déjà membre du groupe" });
      return;
    }

    next(error);
  }
});


/**
 * DELETE /api/groups/:id/leave
 * Quitter un groupe dont on est membre.
 * Le propriétaire ne peut pas quitter son groupe.
 */
groupsRouter.delete("/:id/leave", async (req, res, next) => {
  try {
    const parsedId = z.uuid().safeParse(req.params.id);

    if (!parsedId.success) {
      res.status(400).json({ error: "Identifiant de groupe invalide." });
      return;
    }

    const userId = res.locals.user.id as string;
    const groupId = parsedId.data;

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: {
        id: true,
        ownerId: true,
      },
    });

    if (!group) {
      res.status(404).json({ error: "Groupe introuvable." });
      return;
    }

    if (group.ownerId === userId) {
      res.status(403).json({
        error: "Le créateur ne peut pas quitter son groupe. Il doit le supprimer.",
      });
      return;
    }

    // deleteMany évite une erreur si l'utilisateur n'est pas membre.
    const result = await prisma.groupMember.deleteMany({
      where: {
        groupId,
        userId,
      },
    });

    if (result.count === 0) {
      res.status(404).json({
        error: "Tu n'es pas membre de ce groupe.",
      });
      return;
    }

    res.json({ message: "Tu as quitté le groupe." });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/groups/:id
 * Supprimer définitivement un groupe.
 * Seul son propriétaire peut le supprimer.
 */
groupsRouter.delete("/:id", async (req, res, next) => {
  try {
    const parsedId = z.uuid().safeParse(req.params.id);

    if (!parsedId.success) {
      res.status(400).json({ error: "Identifiant de groupe invalide." });
      return;
    }

    const userId = res.locals.user.id as string;
    const groupId = parsedId.data;

    // Suppression conditionnelle pour empêcher un utilisateur
    // non propriétaire de supprimer le groupe.
    const result = await prisma.group.deleteMany({
      where: {
        id: groupId,
        ownerId: userId,
      },
    });

    if (result.count === 0) {
      res.status(404).json({
        error: "Groupe introuvable ou suppression non autorisée.",
      });
      return;
    }

    // GroupMember et GroupInvitation sont supprimés
    // automatiquement grâce aux relations onDelete: Cascade.
    res.json({ message: "Groupe supprimé définitivement." });
  } catch (error) {
    next(error);
  }
});
