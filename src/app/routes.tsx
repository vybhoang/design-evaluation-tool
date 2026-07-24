import type { ComponentType } from "react";
import { createBrowserRouter } from "react-router";
import Root from "./layouts/root";
import Landing from "./pages/landing";

// Route-level code splitting: react-router's `lazy` keeps the current page mounted
// until the target route's chunk resolves (no blank-screen flash), unlike a bare
// React.lazy + Suspense fallback would. Root/Landing stay eager — they're the
// always-visible shell and the most common first paint. `lazy` must return a
// route-shaped object ({ Component, ... }), so each loader remaps the page's
// default export rather than returning the raw module namespace.
async function page(imp: Promise<{ default: ComponentType }>) {
  const { default: Component } = await imp;
  return { Component };
}

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: Landing },
      { path: "new", lazy: () => page(import("./pages/home")) },
      { path: "analysis/:id", lazy: () => page(import("./pages/analysis")) },
      { path: "analysis/:id/session", lazy: () => page(import("./pages/session")) },
      { path: "analysis/:id/instruments", lazy: () => page(import("./pages/instruments")) },
      { path: "history", lazy: () => page(import("./pages/history")) },
      { path: "patterns", lazy: () => page(import("./pages/patterns")) },
      { path: "compare", lazy: () => page(import("./pages/compare")) },
      { path: "responses", lazy: () => page(import("./pages/responses")) },
      { path: "*", lazy: () => page(import("./pages/not-found")) },
    ],
  },
]);
