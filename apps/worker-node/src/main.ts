import { createApp } from "./app";
import { configService } from "./modules/config/config.service";

const config = configService.getWorkerConfig(process.env);

const app = createApp();

app.listen(config.port, () => {
  console.log(
    `[Lutest Worker] Ready on port ${config.port} | Mode: ${config.env} | Timeout: ${config.workerTimeoutMs}ms`,
  );
});
