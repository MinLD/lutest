import { Router } from "express";
import { graphController } from "./graph.controller";

export const graphRoutes = Router();

graphRoutes.get("/production", graphController.getProductionGraph);
// Deprecated compatibility/debug endpoint. Production UI uses /api/graph/production.
graphRoutes.get("/", graphController.getGraph);
