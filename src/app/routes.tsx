import { createBrowserRouter } from "react-router";
import Root from "./layouts/root";
import Landing from "./pages/landing";
import Home from "./pages/home";
import AnalysisPage from "./pages/analysis";
import SessionPage from "./pages/session";
import InstrumentsPage from "./pages/instruments";
import HistoryPage from "./pages/history";
import PatternsPage from "./pages/patterns";
import ComparePage from "./pages/compare";
import ResponsesPage from "./pages/responses";
import NotFound from "./pages/not-found";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: Landing },
      { path: "new", Component: Home },
      { path: "analysis/:id", Component: AnalysisPage },
      { path: "analysis/:id/session", Component: SessionPage },
      { path: "analysis/:id/instruments", Component: InstrumentsPage },
      { path: "history", Component: HistoryPage },
      { path: "patterns", Component: PatternsPage },
      { path: "compare", Component: ComparePage },
      { path: "responses", Component: ResponsesPage },
      { path: "*", Component: NotFound },
    ],
  },
]);
