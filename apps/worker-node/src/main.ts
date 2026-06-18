import express from "express";
import type { StatusResponse } from "@lutest/contracts";

const app = express();
const PORT = process.env.PORT || 6532;

app.get("/api/status", (_req, res) => {
  const response: StatusResponse = {
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
