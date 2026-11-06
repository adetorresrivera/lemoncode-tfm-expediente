export interface StartupRetryOptions {
  attempts: number;
  delayMs: number;
  log: (line: string) => void;
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Retries a start-up step (Mongo connection, bucket check) so a cold or slow dependency costs a few
// attempts instead of a crash. Only the attempt number and err.message are logged: never the stack,
// the cause or the connection string.
export async function retryStartup<T>(
  step: () => Promise<T>,
  options: StartupRetryOptions,
): Promise<T> {
  const { attempts, delayMs, log, sleep = defaultSleep } = options;
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await step();
    } catch (err) {
      log(
        `Startup attempt ${attempt}/${attempts} failed: ${
          err instanceof Error ? err.message : "unknown error"
        }`,
      );
      if (attempt >= attempts) throw err;
      await sleep(delayMs);
    }
  }
}
