
import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth.js";
import {
  listPersonalRecords,
  checkRecord,
} from "./records.controller.js";

export const recordsRouter = Router();

recordsRouter.use(requireAuth);

recordsRouter.get("/", listPersonalRecords);
recordsRouter.post("/check", checkRecord);