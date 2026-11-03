import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "@/common/components/theme-toggle";
import {
  applyTheme,
  initTheme,
  isThemePreference,
  readThemePreference,
  setThemePreference,
  THEME_STORAGE_KEY,
} from "./theme";

type ChangeListener = (event: { matches: boolean }) => void;

interface SystemScheme {
  setDark(dark: boolean): void;
  listenerCount(): number;
}

function stubSystemScheme(initialDark: boolean): SystemScheme {
  let dark = initialDark;
  const listeners = new Set<ChangeListener>();

  vi.stubGlobal("matchMedia", (query: string) => ({
    get matches() {
      return dark;
    },
    media: query,
    onchange: null,
    addEventListener(type: string, listener: ChangeListener) {
      if (type === "change") listeners.add(listener);
    },
    removeEventListener(type: string, listener: ChangeListener) {
      if (type === "change") listeners.delete(listener);
    },
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  }));

  return {
    setDark(next) {
      dark = next;
      listeners.forEach((listener) => listener({ matches: next }));
    },
    listenerCount: () => listeners.size,
  };
}

const root = () => document.documentElement;

describe("theme store", () => {
  let cleanupInit: (() => void) | undefined;

  beforeEach(() => {
    cleanupInit = undefined;
  });

  afterEach(() => {
    cleanupInit?.();
    vi.restoreAllMocks();
    root().style.colorScheme = "";
  });

  it("follows a dark system when nothing is stored", () => {
    stubSystemScheme(true);
    cleanupInit = initTheme();

    expect(root()).toHaveClass("dark");
    expect(root().style.colorScheme).toBe("dark");
  });

  it("keeps the light choice even when the system is dark", () => {
    stubSystemScheme(true);
    localStorage.setItem(THEME_STORAGE_KEY, "light");
    cleanupInit = initTheme();

    expect(root()).not.toHaveClass("dark");
    expect(root().style.colorScheme).toBe("light");
  });

  it("stores and applies an explicit dark choice, then releases it with system", () => {
    stubSystemScheme(false);
    setThemePreference("dark");

    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(root()).toHaveClass("dark");

    setThemePreference("system");

    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("system");
    expect(root()).not.toHaveClass("dark");
  });

  it("survives a storage that throws on read and write", () => {
    stubSystemScheme(false);
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    expect(readThemePreference()).toBe("system");
    expect(() => setThemePreference("dark")).not.toThrow();
    expect(root()).toHaveClass("dark");
  });

  it("treats an unknown stored value as system", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "purple");

    expect(readThemePreference()).toBe("system");
    expect(isThemePreference("purple")).toBe(false);
    expect(isThemePreference("dark")).toBe(true);
  });

  it("applies a system change only while the preference is system", () => {
    const system = stubSystemScheme(false);
    cleanupInit = initTheme();
    expect(root()).not.toHaveClass("dark");

    system.setDark(true);
    expect(root()).toHaveClass("dark");

    system.setDark(false);
    expect(root()).not.toHaveClass("dark");

    setThemePreference("light");
    system.setDark(true);
    expect(root()).not.toHaveClass("dark");
  });

  it("removes the system listener on cleanup", () => {
    const system = stubSystemScheme(false);
    const stop = initTheme();
    expect(system.listenerCount()).toBe(1);

    stop();
    expect(system.listenerCount()).toBe(0);
  });

  it("applyTheme resolves system against the current scheme", () => {
    stubSystemScheme(true);
    applyTheme("system");
    expect(root()).toHaveClass("dark");

    applyTheme("light");
    expect(root()).not.toHaveClass("dark");
  });
});

describe("ThemeToggle", () => {
  it("offers Sistema, Claro and Oscuro and checks Sistema by default", () => {
    render(createElement(ThemeToggle));

    expect(screen.getByRole("radio", { name: "Sistema" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Claro" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "Oscuro" })).not.toBeChecked();
  });

  it("applies Oscuro on click and keeps it when clicked again", async () => {
    const user = userEvent.setup();
    render(createElement(ThemeToggle));

    await user.click(screen.getByRole("radio", { name: "Oscuro" }));
    expect(screen.getByRole("radio", { name: "Oscuro" })).toBeChecked();
    expect(root()).toHaveClass("dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");

    await user.click(screen.getByRole("radio", { name: "Oscuro" }));
    expect(screen.getByRole("radio", { name: "Oscuro" })).toBeChecked();
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(root()).toHaveClass("dark");
  });
});
