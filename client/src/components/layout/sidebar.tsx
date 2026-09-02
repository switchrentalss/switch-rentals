import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ClipboardList,
  Package,
  Users,
  BarChart3,
  IndianRupee,
  FileText,
  BookOpen,
} from "lucide-react";
import { useWorkMode } from "@/lib/work-mode";
import { Button } from "@/components/ui/button";

const millNav = [
  { name: "Mill today", href: "/", icon: LayoutDashboard },
  { name: "Hires", href: "/orders", icon: ClipboardList },
  { name: "Catalogue", href: "/inventory", icon: Package },
  { name: "Clients", href: "/customers", icon: Users },
  { name: "Invoices", href: "/invoices", icon: FileText },
];

const ownerNav = [
  { name: "Books", href: "/books", icon: BookOpen },
  { name: "Money", href: "/financial", icon: IndianRupee },
  { name: "Reports", href: "/reports", icon: BarChart3 },
];

export function Sidebar() {
  const [location] = useLocation();
  const { mode, setMode } = useWorkMode();
  const navigation = mode === "owner" ? [...millNav, ...ownerNav] : millNav;

  return (
    <aside className="w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border fixed h-full left-0 top-0 z-40 flex flex-col">
      <div className="px-6 py-7 border-b border-sidebar-border">
        <p className="text-[11px] tracking-[0.22em] uppercase text-sidebar-primary">Crockery hire</p>
        <h1 className="font-serif text-[28px] leading-tight text-white mt-1">Switch Rentals</h1>
        <p className="text-sm text-sidebar-foreground/70 mt-1">Gupta Mills · Darukhana</p>
      </div>

      <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive =
            item.href === "/"
              ? location === "/" || location === "/app"
              : location.startsWith(item.href);
          return (
            <Link key={item.name} href={item.href}>
              <div
                className={cn(
                  "flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer",
                  isActive
                    ? "bg-sidebar-accent text-white font-medium"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent/70 hover:text-white"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.name}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 space-y-3 border-t border-sidebar-border">
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-sidebar-accent p-1">
          <Button
            type="button"
            size="sm"
            variant={mode === "floor" ? "secondary" : "ghost"}
            className="h-8 text-xs"
            onClick={() => setMode("floor")}
          >
            Floor
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "owner" ? "secondary" : "ghost"}
            className="h-8 text-xs"
            onClick={() => setMode("owner")}
          >
            Owner
          </Button>
        </div>
        <div className="bg-sidebar-accent rounded-xl p-3 flex items-center space-x-3">
          <div className="w-9 h-9 rounded-full bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center text-sm font-semibold">
            SC
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{mode === "owner" ? "Samir Chhabria" : "Mill desk"}</p>
            <p className="text-xs text-sidebar-foreground/60 truncate">{mode === "owner" ? "Partner view" : "Dispatch & returns"}</p>
            <Link href="/site">
              <span className="text-xs text-[#c4a574] hover:text-white cursor-pointer">Public website</span>
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}
