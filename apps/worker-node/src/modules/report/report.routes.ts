import { Router } from "express";
import { reportController } from "./report.controller";

export const reportRoutes = Router();

reportRoutes.get("/latest", reportController.getLatestReport);
