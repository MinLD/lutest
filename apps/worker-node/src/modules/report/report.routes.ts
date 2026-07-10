import { Router } from "express";
import { reportController } from "./report.controller";

export const reportRoutes = Router();

reportRoutes.get("/latest", reportController.getLatestReport);
reportRoutes.get("/runtime/latest", reportController.getLatestRuntimeArtifact);
reportRoutes.get("/runtime/screenshot", reportController.getRuntimeScreenshot);
