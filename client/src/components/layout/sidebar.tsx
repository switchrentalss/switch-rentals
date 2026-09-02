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
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

const millNav = [
  { name: "Home", href: "/", icon: LayoutDashboard },
  { name: "Orders", href: "/orders", icon: ClipboardList },
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
  const { user, isOwner, logout } = useAuth();
  const navigation = isOwner ? [...millNav, ...ownerNav] : millNav;

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
        <div className="bg-sidebar-accent rounded-xl p-3">
          <p className="text-sm font-medium text-white truncate">{user?.name || "Staff"}</p>
          <p className="text-xs text-sidebar-foreground/60 truncate">
            {isOwner ? "Owner · all mill and books" : "Executive · mill desk only"}
          </p>
          <p className="text-[11px] text-sidebar-foreground/50 truncate mt-1">{user?.email}</p>
          <Link href="/site">
            <span className="text-xs text-[#c4a574] hover:text-white cursor-pointer">Public website</span>
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2 h-8 w-full text-xs"
            onClick={() => logout()}
          >
            Sign out
          </Button>
        </div>
      </div>
    </aside>
  );
}
