import { useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";

// One-shot arrival after a mutation that navigated here (UI-SPEC A-7): the previous scene puts
// `{ focusHeading, notice }` in the history state of the navigation. This hook reads it once,
// focuses the heading the first time it attaches, publishes the notice after mount (a live region
// announces text that changes after mount) and clears the state of the current history entry, so
// a reload does not repeat either.
export function useArrivalNotice(): {
  notice: string;
  focusHeadingRef: (node: HTMLElement | null) => void;
} {
  const router = useRouter();
  const [arrival] = useState(() => {
    const { focusHeading, notice } = router.state.location.state;
    return {
      focusHeading: focusHeading === true,
      notice: typeof notice === "string" ? notice : "",
    };
  });
  const [notice, setNotice] = useState("");
  const focusedRef = useRef(false);

  const focusHeadingRef = useCallback(
    (node: HTMLElement | null) => {
      if (node === null || !arrival.focusHeading || focusedRef.current) return;
      focusedRef.current = true;
      node.focus();
    },
    [arrival.focusHeading],
  );

  useEffect(() => {
    if (!arrival.focusHeading && arrival.notice === "") return;
    const timer = setTimeout(() => setNotice(arrival.notice), 0);
    router.history.replace(router.state.location.href);
    return () => clearTimeout(timer);
  }, [arrival, router]);

  return { notice, focusHeadingRef };
}
