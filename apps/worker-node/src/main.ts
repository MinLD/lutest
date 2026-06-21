import { createApp } from "./app";

const port = Number(process.env.PORT ?? 6532);
const envMode = process.env.LUTEST_ENV ?? "development";
const timeout = process.env.WORKER_TIMEOUT ?? "30000";

const app = createApp();

app.listen(port, () => {
  console.log(
    `[Lutest Worker] Ready on port ${port} | Mode: ${envMode} | Timeout: ${timeout}ms`,
  );
});
