import { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router";
import { ThemeProvider, useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { TooltipProvider } from "../components/ui/tooltip";
import { Toaster } from "../components/ui/sonner";
import { Button } from "../components/ui/button";
import { StoreProvider } from "../store";
import { KeyboardShortcutsDialog } from "../components/keyboard-shortcuts-dialog";

function ShortcutHint() {
  return (
    <button
      onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "?" }))}
      className="px-2 py-1 text-xs text-muted-foreground rounded border border-dashed border-border hover:text-foreground hover:border-foreground/40 transition-colors"
      title="Keyboard shortcuts"
    >
      ?
    </button>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      title="Toggle dark mode"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {resolvedTheme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}

function navClass({ isActive }: { isActive: boolean }) {
  return `px-3 py-1.5 text-sm rounded-md transition-colors ${
    isActive ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground hover:bg-muted"
  }`;
}

function GlobalShortcuts() {
  const navigate = useNavigate();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      switch (e.key) {
        case "n": navigate("/new"); break;
        case "h": navigate("/history"); break;
        case "p": navigate("/patterns"); break;
        case "r": navigate("/responses"); break;
        case "c": navigate("/compare"); break;
        case "?": setShortcutsOpen((v) => !v); break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);

  return <KeyboardShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />;
}

export default function Root() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <StoreProvider>
      <TooltipProvider delayDuration={300}>
        <GlobalShortcuts />
        <div className="min-h-screen w-full bg-background flex flex-col">
          <header className="border-b bg-background sticky top-0 z-10">
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
              <NavLink to="/" className="flex items-baseline gap-3 shrink-0">
                <span className="font-serif text-xl tracking-tight">Cognition</span>
                <span className="text-xs text-muted-foreground border-l pl-3 hidden sm:inline">
                  Heuristic review · before you put it in front of users
                </span>
              </NavLink>
              <nav className="flex items-center gap-1 overflow-x-auto max-w-full -mx-1 px-1">
                <NavLink to="/new" className={navClass}>New</NavLink>
                <NavLink to="/history" className={navClass}>Runs</NavLink>
                <NavLink to="/patterns" className={navClass}>Patterns</NavLink>
                <NavLink to="/responses" className={navClass}>Responses</NavLink>
                <NavLink to="/compare" className={navClass}>Compare</NavLink>
                <ShortcutHint />
                <ThemeToggle />
              </nav>
            </div>
          </header>

          <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-6 flex flex-col gap-4 min-h-0">
            <Outlet />
          </main>

          <footer className="border-t mt-auto">
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 flex items-center justify-between gap-3 text-xs text-muted-foreground flex-wrap">
              <div className="flex items-center gap-3">
                <span className="font-serif text-sm tracking-tight text-foreground">Cognition</span>
                <span>·</span>
                <span>Runs stay on your device. No account, no telemetry.</span>
              </div>
              <div className="flex items-center gap-4">
                <a href="https://www.nngroup.com/articles/ten-usability-heuristics/" target="_blank" rel="noreferrer" className="hover:text-foreground underline-offset-2 hover:underline">Nielsen heuristics</a>
                <a href="https://www.w3.org/WAI/WCAG22/quickref/" target="_blank" rel="noreferrer" className="hover:text-foreground underline-offset-2 hover:underline">WCAG 2.2</a>
              </div>
            </div>
          </footer>

          <Toaster position="bottom-right" />
        </div>
      </TooltipProvider>
    </StoreProvider>
    </ThemeProvider>
  );
}
