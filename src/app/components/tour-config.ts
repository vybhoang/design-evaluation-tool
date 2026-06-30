export type TourStep = {
  id: string;
  title: string;
  body: string;
  /** CSS selector for the element to spotlight. Absent = centered card. */
  target?: string;
  placement?: "top" | "bottom" | "left" | "right" | "center";
  /**
   * Which route context this step requires.
   * TourProvider navigates before the step renders.
   * 'analysis' and 'session' steps fall back to a centered card when no history exists.
   */
  tourRoute?: "new" | "analysis" | "session";
};

export const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to Cognition",
    body: "A two-phase UX research tool: run a fast AI heuristic review to find what is worth testing, then run targeted real-user sessions to confirm or refute those findings.",
    placement: "center",
    tourRoute: "new",
  },
  {
    id: "upload",
    title: "Upload your design",
    body: "Drag, drop, click to browse, or paste (Ctrl/Cmd+V) any PNG or JPG screenshot. Files never leave your device.",
    target: "[data-tour='upload-area']",
    placement: "right",
    tourRoute: "new",
  },
  {
    id: "context",
    title: "Set your analysis context",
    body: "Choose the design type, target audience, and primary goal. This calibrates the heuristic checks so a checkout flow for enterprise users gets different scrutiny than a mobile onboarding for Gen Z.",
    target: "[data-tour='context-fields']",
    placement: "top",
    tourRoute: "new",
  },
  {
    id: "analyze",
    title: "Run the heuristic review",
    body: "Click Run analysis to cross-reference your design against WCAG 2.2, Nielsen's 10 heuristics, and cognitive-load research. Each finding cites the published source it came from.",
    target: "[data-tour='analyze-btn']",
    placement: "top",
    tourRoute: "new",
  },
  {
    id: "stepper",
    title: "The 3-step workflow",
    body: "This stepper tracks where you are: Upload, Heuristic Check, then Test with Humans. Completed steps are clickable so you can jump back at any time.",
    target: "[data-tour='workflow-stepper']",
    placement: "bottom",
    tourRoute: "new",
  },
  {
    id: "findings",
    title: "Review your findings",
    body: "Findings are pinned directly onto your design. Each one has a severity (critical, warning, or info), a cited UX principle, and a suggested interview question to take into a real session.",
    target: "[data-tour='results-panel']",
    placement: "left",
    tourRoute: "analysis",
  },
  {
    id: "session",
    title: "Moderate a real session",
    body: "Click Moderate session to open the live session view. Your AI-generated questions become your interview guide. The Instruments tab lets you run Scales, First-click tasks, Task completion runs, and Card sorts.",
    target: "[data-tour='moderate-session-btn']",
    placement: "left",
    tourRoute: "analysis",
  },
  {
    id: "capture",
    title: "Log observations in real time",
    body: "During a session, type what you hear or observe and press Enter to log it with a timestamp. Tag each response to a finding and mark it confirmed, refuted, or mixed to build your evidence base.",
    target: "[data-tour='session-capture']",
    placement: "right",
    tourRoute: "session",
  },
  {
    id: "responses",
    title: "Analyze across sessions",
    body: "The Responses page collects everything you have logged. Use Coding to apply thematic codes, Quotes to star the most telling moments, and Evidence to review your full validation trail.",
    target: "[data-tour='nav-responses']",
    placement: "bottom",
  },
  {
    id: "patterns",
    title: "Spot recurring patterns",
    body: "Patterns shows which findings have appeared across all your analyses. The more runs that flag the same issue, the stronger the signal and the higher the priority.",
    target: "[data-tour='nav-patterns']",
    placement: "bottom",
  },
  {
    id: "done",
    title: "You are ready to go",
    body: "Start by uploading your first design. Press N to jump straight to a new analysis, or ? to see all keyboard shortcuts. All your data stays on this device.",
    placement: "center",
    tourRoute: "new",
  },
];
