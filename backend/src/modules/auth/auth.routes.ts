
import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  loginController,
  logoutController,
  meController,
  registerController,
} from "./auth.controller.js";

export const authRoutes = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Trop de tentatives, réessaie plus tard" },
});

authRoutes.post("/register", authLimiter, registerController);
authRoutes.post("/login", authLimiter, loginController);
authRoutes.get("/me", meController);
authRoutes.post("/logout", logoutController);
