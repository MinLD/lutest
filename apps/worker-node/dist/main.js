"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const config_service_1 = require("./modules/config/config.service");
const config = config_service_1.configService.getWorkerConfig(process.env);
const app = (0, app_1.createApp)();
app.listen(config.port, () => {
    console.log(`[Lutest Worker] Ready on port ${config.port} | Mode: ${config.env} | Timeout: ${config.workerTimeoutMs}ms`);
});
