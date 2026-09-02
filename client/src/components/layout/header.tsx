import { Bell, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate } from "@/lib/format";
import type { Enquiry, OrderWithCustomer } from "@shared/schema";

interface HeaderProps {
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
  onNewOrder?: () => void;
}

export function Header({ title, subtitle, actionLabel, onAction, onNewOrder }: HeaderProps) {
  const { data: orders } = useQuery<OrderWithCustomer[]>({
    queryKey: ["/api/orders"],
  });
  const { data: leads } = useQuery<Enquiry[]>({
    queryKey: ["/api/enquiries"],
  });

  const overdueOrders = (orders || []).filter((order) => order.status === "overdue");
  const newLeads = (leads || []).filter((lead) => lead.status === "new");
  const alertCount = overdueOrders.length + newLeads.length;
  const handleAction = onAction || onNewOrder;

  return (
    <header className="sticky top-0 z-30 bg-background/90 backdrop-blur border-b border-border px-6 py-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        </div>

        <div className="flex items-center space-x-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-full relative" aria-label="Alerts">
                <Bell className="w-4 h-4" />
                {alertCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-destructive text-destructive-foreground text-[10px] rounded-full flex items-center justify-center">
                    {alertCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Needs attention</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {alertCount === 0 && (
                <div className="px-2 py-6 text-sm text-muted-foreground text-center">Nothing waiting.</div>
              )}
              {overdueOrders.map((order) => (
                <DropdownMenuItem key={`order-${order.id}`} asChild>
                  <Link href="/orders" className="flex cursor-pointer flex-col items-start gap-0.5">
                    <span className="font-medium">Overdue · {order.orderNumber}</span>
                    <span className="text-xs text-muted-foreground">
                      {order.customer.name} · return was {formatDate(order.endDate)}
                    </span>
                  </Link>
                </DropdownMenuItem>
              ))}
              {newLeads.slice(0, 4).map((lead) => (
                <DropdownMenuItem key={`lead-${lead.id}`} asChild>
                  <Link href="/app" className="flex cursor-pointer flex-col items-start gap-0.5">
                    <span className="font-medium">Website lead · {lead.name}</span>
                    <span className="text-xs text-muted-foreground">{lead.company || lead.message || "New enquiry"}</span>
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {handleAction && (
            <Button onClick={handleAction} className="rounded-full px-4">
              <Plus className="w-4 h-4" />
              <span>{actionLabel || "New hire"}</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
