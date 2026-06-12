import { NavLink, Outlet } from "react-router";
import { ThemeProvider, useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { TooltipProvider } from "../components/ui/tooltip";
import { Toaster } from "../components/ui/sonner";
import { Button } from "../components/ui/button";
import { StoreProvider } from "../store";

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

export default function Root() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <StoreProvider>
      <TooltipProvider delayDuration={300}>
        <div className="size-full min-h-screen bg-background flex flex-col">
          <header className="border-b bg-background sticky top-0 z-10">
            <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between gap-4">
              <NavLink to="/" className="flex items-baseline gap-3">
                <span className="font-serif text-xl tracking-tight">Cognition</span>
                <span className="text-xs text-muted-foreground border-l pl-3 hidden sm:inline">
                  Heuristic review · before you put it in front of users
                </span>
              </NavLink>
              <nav className="flex items-center gap-1">
                <NavLink to="/new" className={navClass}>New</NavLink>
                <NavLink to="/history" className={navClass}>Runs</NavLink>
                <NavLink to="/patterns" className={navClass}>Patterns</NavLink>
                <NavLink to="/compare" className={navClass}>Compare</NavLink>
                <ThemeToggle />
              </nav>
            </div>
          </header>

          <main className="flex-1 max-w-[1600px] w-full mx-auto px-6 py-6 flex flex-col gap-4 min-h-0">
            <Outlet />
          </main>

          <footer className="border-t mt-auto">
            <div className="max-w-[1600px] mx-auto px-6 py-6 flex items-center justify-between gap-3 text-xs text-muted-foreground flex-wrap">
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
