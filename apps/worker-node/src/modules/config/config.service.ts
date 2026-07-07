export interface WorkerConfig {
  port: number;
  env: string;
  workerTimeoutMs: number;
  projectPath?: string;
}

const toNumber = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
};

const getWorkerConfig = (env: NodeJS.ProcessEnv): WorkerConfig => {
  return {
    port: toNumber(env.PORT, 6532),
    env: env.LUTEST_ENV ?? "development",
    workerTimeoutMs: toNumber(env.WORKER_TIMEOUT, 30000),
    projectPath: env.LUTEST_PROJECT_PATH ?? env.PROJECT_PATH,
  };
};

export const configService = {
  getWorkerConfig,
};
