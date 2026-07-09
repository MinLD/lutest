import express from "express";
import { statusRoutes } from "./modules/status/status.routes";
import { projectRoutes } from "./modules/project/project.routes";
import { graphRoutes } from "./modules/graph/graph.routes";
import { reportRoutes } from "./modules/report/report.routes";
import { notFoundHandler } from "./shared/middleware/not-found";
import { errorHandler } from "./shared/middleware/error-handler";
import { scanRoutes } from "./modules/scan/scan.routes";
import { authActionRoutes, authRoutes } from "./modules/auth/auth.routes";

export const createApp = () => {
  const app = express();

  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "content-type");

    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }

    next();
  });

  app.use(express.json());

  app.use("/api/status", statusRoutes);
  app.use("/api/project", projectRoutes);
  app.use("/api/graph", graphRoutes);
  app.use("/api/report", reportRoutes);
  app.use("/api/actions/scan", scanRoutes);
  app.use("/api/actions/auth", authActionRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/scan", scanRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
