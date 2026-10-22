import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { profileRouter } from "./modules/profile/profile.routes.js";
import { weighInsRouter } from "./modules/weigh-ins/weigh-ins.routes.js";
import { exercisesRouter } from "./modules/exercises/exercises.routes.js";
import { workoutsRouter } from "./modules/workouts/workouts.routes.js";
import { recordsRouter } from "./modules/records/records.routes.js";
import { progressRouter } from "./modules/progress/progress.routes.js";
import { performancesRouter } from './modules/performances/performances.routes.js'
import { apiRateLimiter } from "./middlewares/api-rate-limit.js";
import { friendsRouter } from "./modules/friends/friends.routes.js";
import { groupsRouter } from "./modules/groups/groups.routes.js";
import { groupStatsRouter } from "./modules/groups/groups.stats.routes.js";
import { privacyRouter } from "./modules/profile/privacy.routes.js";
import { groupLeaderboardRouter } from "./modules/groups/groups.leaderboard.routes.js";

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

app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

// Protection des requêtes qui modifient des données.
// Pour le développement local, on autorise le frontend Nuxt.
app.use((req, _res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  const allowedOrigins = new Set([
    "http://localhost:3000",
  ]);

  app.use(
    cors({
      origin: [...allowedOrigins],
      credentials: true,
    }),
  );

  next();
});

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "spot-api",
  });
});

app.use("/api", apiRateLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRouter);
app.use("/api/weigh-ins", weighInsRouter);
app.use("/api/exercises", exercisesRouter);
app.use("/api/workouts", workoutsRouter);
app.use("/api/records", recordsRouter);
app.use("/api/progress", progressRouter);
app.use('/api/performances', performancesRouter)
app.use("/api/friends", friendsRouter);
app.use("/api/groups", groupsRouter);
app.use("/api/groups", groupStatsRouter);
app.use("/api/profile/privacy", privacyRouter);
app.use("/api/groups", groupLeaderboardRouter);

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