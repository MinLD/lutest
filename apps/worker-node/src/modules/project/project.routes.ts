import { Router } from "express";
import { projectController } from "./project.controller";

export const projectRoutes = Router();

projectRoutes.get("/", projectController.getProject);
