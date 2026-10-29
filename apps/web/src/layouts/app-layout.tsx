import { Link, Outlet } from "@tanstack/react-router";
import { Briefcase, FileText, LayoutDashboard, Menu } from "lucide-react";
import { useState } from "react";
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

const NAV_ITEM_CLASS =
  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium";

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
          <span
            aria-disabled="true"
            className={`${NAV_ITEM_CLASS} cursor-not-allowed text-sidebar-foreground/60`}
          >
            <FileText strokeWidth={1.5} className="size-5" aria-hidden="true" />
            Documentos
            <span className="ml-auto text-[11px] font-normal uppercase tracking-[0.08em]">
              Próximamente
            </span>
          </span>
        </li>
      </ul>
    </nav>
  );
}

export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="hidden lg:flex lg:fixed lg:inset-y-0 lg:w-64 flex-col gap-6 bg-sidebar text-sidebar-foreground border-r border-sidebar-border p-4">
        <p className="font-serif text-2xl">Expediente</p>
        <MainNav />
        <div className="mt-auto">
          <ThemeToggle />
        </div>
      </aside>

      <header className="lg:hidden flex h-14 items-center justify-between border-b border-sidebar-border bg-sidebar px-4 text-sidebar-foreground">
        <p className="font-serif text-xl">Expediente</p>
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Abrir menú"
              className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <Menu strokeWidth={1.5} className="size-5" aria-hidden="true" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="bg-sidebar text-sidebar-foreground border-sidebar-border"
          >
            <SheetHeader>
              <SheetTitle className="font-serif text-2xl font-normal text-sidebar-foreground">
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
      </header>

      <main className="p-6 lg:pl-72">
        <Outlet />
      </main>
    </div>
  );
}
