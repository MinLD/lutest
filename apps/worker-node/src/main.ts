import express from 'express';
import type { StatusResponse } from '@lutest/contracts';

const app = express();
const PORT = process.env.PORT || 6532;

// 🌟 Hứng biến môi trường do Go Host truyền xuống
const ENV_MODE = process.env.LUTEST_ENV || 'unknown';
const TIMEOUT = process.env.WORKER_TIMEOUT || 'unknown';

app.get('/api/status', (req, res) => {
  const response: StatusResponse = { 
    status: 'ok', 
    uptime: process.uptime(),
    service: 'lutest-worker', // Bổ sung trường thiếu
    runtime: 'node'           // Bổ sung trường thiếu
  };
  res.json(response);
});
app.listen(PORT, () => {
  console.log(`[Lutest Worker] Ready on port ${PORT} | Mode: ${ENV_MODE} | Timeout: ${TIMEOUT}ms`);
});