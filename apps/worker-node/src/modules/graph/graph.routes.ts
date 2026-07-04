import { Router } from "express";
import { graphController } from "./graph.controller";

export const graphRoutes = Router();

graphRoutes.get("/production", graphController.getProductionGraph);
graphRoutes.get("/", graphController.getGraph);
