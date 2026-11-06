export interface StartupRetryOptions {
  attempts: number;
  delayMs: number;
  log: (line: string) => void;
  sleep?: (ms: number) => Promise<void>;
}

export async function retryStartup<T>(
  step: () => Promise<T>,
  options: StartupRetryOptions,
): Promise<T> {
  void options; // RED stub: no retry yet
  return step();
}
