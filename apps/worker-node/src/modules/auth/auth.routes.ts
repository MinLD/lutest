import { Router } from "express";
import { authController } from "./auth.controller";
export const authActionRoutes = Router();
export const authRoutes = Router();
authActionRoutes.post("/start", authController.start);
authActionRoutes.post("/clear", authController.clear);
authRoutes.get("/status", authController.status);
