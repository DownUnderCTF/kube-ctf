import { NonRetryableError } from "../error";

type BackoffConfig = {
  initialDelay?: number;
  maximumDelay?: number;
  maxRetries?: number;
  nonRetryableErrors?: (new (...args: unknown[]) => Error)[];
};

const DEFAULT_BACKOFF_CONFIG: Required<BackoffConfig> = {
  initialDelay: 500,
  maximumDelay: 30000,
  maxRetries: 5,
  nonRetryableErrors: [],
};

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  cfg: BackoffConfig = {},
) {
  let attempt = 0;
  const { initialDelay, maximumDelay, maxRetries, nonRetryableErrors } = {
    ...DEFAULT_BACKOFF_CONFIG,
    ...cfg,
  };
  let delay = initialDelay;

  while (true) {
    try {
      return await fn();
    } catch (error) {
      if (
        attempt >= maxRetries ||
        error instanceof NonRetryableError ||
        nonRetryableErrors.findIndex((t) => error instanceof t) !== -1
      ) {
        throw error;
      }
      const jitter = delay * (1 + Math.random() * 0.4);
      await new Promise((resolve) => setTimeout(resolve, jitter));
      delay = Math.min(delay * 2, maximumDelay);
    }
    attempt++;
  }
}
