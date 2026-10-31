import { createRouter, type RouterHistory } from "@tanstack/react-router";
import { routeTree } from "../../routeTree.gen";
import { parseSearch, stringifySearch } from "./search-params";

export function createAppRouter(history?: RouterHistory) {
  return createRouter({ routeTree, history, parseSearch, stringifySearch });
}

export const router = createAppRouter();

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// State a scene passes through the history entry of a navigation (UI-SPEC A-7); read once by
// `useArrivalNotice` in the destination scene.
declare module "@tanstack/history" {
  interface HistoryState {
    focusHeading?: boolean;
    notice?: string;
  }
}
