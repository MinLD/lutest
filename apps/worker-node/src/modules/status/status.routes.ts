import { Router } from "express";
import { statusController } from "./status.controller";

export const statusRoutes = Router();
statusRoutes.get("/", statusController.getStatus);
