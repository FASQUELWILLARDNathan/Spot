import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { profileRouter } from "./modules/profile/profile.routes.js";
import { weighInsRouter } from "./modules/weigh-ins/weigh-ins.routes.js";

export const app = express();

// Faire confiance au proxy local uniquement
app.set("trust proxy", "loopback");

app.disable("x-powered-by");

app.use(helmet());

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// Protection des requêtes qui modifient des données.
// Pour le développement local, on autorise le frontend Nuxt.
app.use((req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  const origin = req.headers.origin;

  if (origin && origin !== "http://localhost:3000") {
    return res.status(403).json({
      error: "Origine non autorisée",
    });
  }

  next();
});

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "spot-api",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRouter);
app.use("/api/weigh-ins", weighInsRouter);

// Gestion centralisée des erreurs
app.use((
  error: unknown,
  _req: express.Request,
  res: express.Response,
  _next: express.NextFunction
) => {
  console.error(error);

  res.status(500).json({
    error: "Une erreur interne est survenue",
  });
});