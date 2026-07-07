import { Router } from "express";
import { scanController } from "./scan.controller";

export const scanRoutes = Router();

scanRoutes.post("/", scanController.runScan);
