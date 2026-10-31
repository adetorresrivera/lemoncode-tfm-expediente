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
