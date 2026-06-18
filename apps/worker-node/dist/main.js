"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 6532;
// 🌟 Hứng biến môi trường do Go Host truyền xuống
const ENV_MODE = process.env.LUTEST_ENV || 'unknown';
const TIMEOUT = process.env.WORKER_TIMEOUT || 'unknown';
app.get('/api/status', (req, res) => {
    const response = {
        status: 'ok',
        uptime: process.uptime(),
        service: 'lutest-worker', // Bổ sung trường thiếu
        runtime: 'node' // Bổ sung trường thiếu
    };
    res.json(response);
});
app.listen(PORT, () => {
    console.log(`[Lutest Worker] Ready on port ${PORT} | Mode: ${ENV_MODE} | Timeout: ${TIMEOUT}ms`);
});
