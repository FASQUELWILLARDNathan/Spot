
import type { Request, Response, NextFunction } from "express";
import { getPersonalRecords } from "./records.service.js";
import { checkPersonalRecord } from "./records.service.js";
import { checkRecordSchema } from "./records.schema.js";

export async function listPersonalRecords(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = res.locals.user.id as string;

    const records = await getPersonalRecords(userId);

    res.json({ records });
  } catch (error) {
    next(error);
  }
}


export async function checkRecord(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = checkRecordSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: "Données de performance invalides",
        details: parsed.error.flatten(),
      });
      return;
    }

    const userId = res.locals.user.id as string;

    const result = await checkPersonalRecord(
      userId,
      parsed.data.exerciseId,
      parsed.data.weightKg,
      parsed.data.reps,
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
}
