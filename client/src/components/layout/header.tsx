import { Bell, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  title: string;
  subtitle: string;
  onNewOrder?: () => void;
}

export function Header({ title, subtitle, onNewOrder }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" className="relative p-2">
            <Bell className="w-5 h-5" />
            <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
          </Button>
          
          {onNewOrder && (
            <Button onClick={onNewOrder} className="flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>New Order</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
