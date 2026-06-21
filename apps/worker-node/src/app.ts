import express from "express";
import { statusRoutes } from "./modules/status/status.routes";
import { projectRoutes } from "./modules/project/project.routes";
import { graphRoutes } from "./modules/graph/graph.routes";
import { reportRoutes } from "./modules/report/report.routes";
import { notFoundHandler } from "./shared/middleware/not-found";
import { errorHandler } from "./shared/middleware/error-handler";

export const createApp = () => {
  const app = express();

  app.use(express.json());

  app.use("/api/status", statusRoutes);
  app.use("/api/project", projectRoutes);
  app.use("/api/graph", graphRoutes);
  app.use("/api/report", reportRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
