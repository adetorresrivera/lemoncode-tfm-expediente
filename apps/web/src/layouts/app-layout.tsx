import { Link, Outlet } from "@tanstack/react-router";
import { Briefcase, FileText, LayoutDashboard, Menu } from "lucide-react";
import { useRef, useState } from "react";
import { ThemeToggle } from "@/common/components/theme-toggle";
import { Button } from "@/common/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/common/components/ui/sheet";

const WORDMARK_CLASS = "font-serif text-[28px] leading-[1.2] font-normal";

const NAV_ITEM_CLASS =
  "flex min-h-11 items-center gap-2 rounded-md px-4 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring";

interface MainNavProps {
  onNavigate?: () => void;
}

function MainNav({ onNavigate }: MainNavProps) {
  return (
    <nav aria-label="Principal">
      <ul className="flex flex-col gap-1">
        <li>
          <Link
            to="/applications"
            onClick={onNavigate}
            className={`${NAV_ITEM_CLASS} text-sidebar-foreground hover:bg-sidebar-accent/60 data-[status=active]:bg-sidebar-accent data-[status=active]:text-sidebar-accent-foreground`}
          >
            <Briefcase
              strokeWidth={1.5}
              className="size-5"
              aria-hidden="true"
            />
            Mis candidaturas
          </Link>
        </li>
        <li>
          <span
            aria-disabled="true"
            className={`${NAV_ITEM_CLASS} cursor-not-allowed text-sidebar-foreground/60`}
          >
            <LayoutDashboard
              strokeWidth={1.5}
              className="size-5"
              aria-hidden="true"
            />
            Tablero
            <span className="ml-auto text-[11px] font-normal uppercase tracking-[0.08em]">
              Próximamente
            </span>
          </span>
        </li>
        <li>
          <Link
            to="/documents"
            onClick={onNavigate}
            className={`${NAV_ITEM_CLASS} text-sidebar-foreground hover:bg-sidebar-accent/60 data-[status=active]:bg-sidebar-accent data-[status=active]:text-sidebar-accent-foreground`}
          >
            <FileText strokeWidth={1.5} className="size-5" aria-hidden="true" />
            Documentos
          </Link>
        </li>
      </ul>
    </nav>
  );
}

export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <a
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          mainRef.current?.focus();
        }}
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:inline-flex focus:h-11 focus:items-center focus:rounded-md focus:border focus:border-input focus:bg-card focus:px-4 focus:text-sm focus:font-semibold focus:text-foreground focus:ring-2 focus:ring-ring"
      >
        Saltar al contenido
      </a>
      <aside className="hidden lg:flex lg:fixed lg:inset-y-0 lg:w-64 flex-col gap-6 bg-sidebar text-sidebar-foreground border-r border-sidebar-border p-4">
        <p className={WORDMARK_CLASS}>Expediente</p>
        <MainNav />
        <div className="mt-auto">
          <ThemeToggle />
        </div>
      </aside>

      <header className="lg:hidden flex h-14 items-center gap-2 border-b border-sidebar-border bg-sidebar px-4 text-sidebar-foreground">
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Abrir menú"
              className="size-11 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring"
            >
              <Menu strokeWidth={1.5} className="size-5" aria-hidden="true" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="bg-sidebar text-sidebar-foreground border-sidebar-border"
            closeButtonClassName="focus:ring-sidebar-ring"
          >
            <SheetHeader>
              <SheetTitle
                className={`${WORDMARK_CLASS} text-sidebar-foreground`}
              >
                Expediente
              </SheetTitle>
              <SheetDescription className="sr-only">
                Navegación principal
              </SheetDescription>
            </SheetHeader>
            <div className="px-4">
              <MainNav onNavigate={() => setMenuOpen(false)} />
            </div>
            <div className="mt-auto p-4">
              <ThemeToggle />
            </div>
          </SheetContent>
        </Sheet>
        <p className={WORDMARK_CLASS}>Expediente</p>
      </header>

      <main
        id="main-content"
        ref={mainRef}
        tabIndex={-1}
        className="lg:pl-64 outline-none"
      >
        <div className="mx-auto w-full max-w-5xl px-4 py-6 lg:px-8 lg:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
