"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 6532;
app.get("/api/status", (_req, res) => {
    const response = {
        status: "ok",
        uptime: process.uptime(),
        service: "lutest-worker",
        runtime: "node"
    };
    res.json(response);
});
app.listen(PORT, () => {
    console.log(`[Lutest Worker] Ready and listening on port ${PORT}`);
});
