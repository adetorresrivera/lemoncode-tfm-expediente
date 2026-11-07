import { act } from "@testing-library/react";
import { vi } from "vitest";

type JestShim = { advanceTimersByTime: (ms: number) => void };
const scope = globalThis as { jest?: JestShim };

/**
 * Starts Vitest's fake clock WITHOUT `shouldAdvanceTime`: nothing moves it but
 * the test, so a busy machine cannot eat into a fake-clock deadline (05 WR-01).
 *
 * Testing Library only drains its own `setTimeout(0)` (inside every `user.*`
 * call and `waitFor`) when it sees a `jest` global with fake timers; under
 * Vitest there is none, so the first `user.click` would hang on a frozen
 * clock. The shim below hands it Vitest's `advanceTimersByTime` for the
 * duration of the fake clock.
 */
export const useFakeClock = (): void => {
  vi.useFakeTimers();
  scope.jest = { advanceTimersByTime: vi.advanceTimersByTime };
};

export const useRealClock = (): void => {
  delete scope.jest;
  vi.useRealTimers();
};

/**
 * Lets pending promises (mocked fetch, React Query, state updates) settle while
 * the fake clock is active, without moving it.
 */
export const flushFakeClock = async (rounds = 5): Promise<void> => {
  for (let i = 0; i < rounds; i += 1) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
  }
};
