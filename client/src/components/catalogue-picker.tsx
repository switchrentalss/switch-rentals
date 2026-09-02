import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { catalogueCode, formatINR } from "@/lib/format";
import type { InventoryItem } from "@shared/schema";
import { Package, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

export type HireLine = {
  itemId: number;
  itemName: string;
  quantity: number;
  ratePerDay: number;
  totalAmount: number;
};

type Slot = { itemId: number; available: number; totalStock: number };

export function CataloguePicker({
  inventory,
  days,
  selectedItems,
  setSelectedItems,
  datesReady = true,
  availability,
  availabilityLoading = false,
  requireDates = false,
}: {
  inventory: InventoryItem[] | undefined;
  days: number;
  selectedItems: HireLine[];
  setSelectedItems: (next: HireLine[]) => void;
  datesReady?: boolean;
  availability?: Slot[];
  availabilityLoading?: boolean;
  requireDates?: boolean;
}) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  const freeFor = (itemId: number, fallback: number) => {
    if (requireDates && (!datesReady || !availability)) return 0;
    if (!availability) return fallback;
    const row = availability.find((slot) => slot.itemId === itemId);
    return row ? row.available : fallback;
  };

  const filteredInventory = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return (inventory || []).filter((item) => {
      const code = catalogueCode(item).toLowerCase();
      const matchesSearch =
        !term ||
        item.name.toLowerCase().includes(term) ||
        code.includes(term) ||
        (item.description || "").toLowerCase().includes(term) ||
        item.category.toLowerCase().includes(term);
      const matchesCategory = selectedCategory === "" || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [inventory, searchTerm, selectedCategory]);

  const addItem = (item: InventoryItem) => {
    if (selectedItems.some((row) => row.itemId === item.id)) return;
    if (requireDates && !datesReady) {
      toast({ title: "Choose dates first", description: "Availability depends on when the hire runs." });
      return;
    }
    const free = freeFor(item.id, item.availableStock);
    if (requireDates && free < 1) {
      toast({ title: "Fully booked", description: `${catalogueCode(item)} has no free pieces on these dates.`, variant: "destructive" });
      return;
    }
    const rate = parseFloat(item.ratePerDay);
    setSelectedItems([
      ...selectedItems,
      { itemId: item.id, itemName: item.name, quantity: 1, ratePerDay: rate, totalAmount: rate * days },
    ]);
  };

  const setQty = (itemId: number, quantity: number) => {
    if (quantity <= 0) {
      setSelectedItems(selectedItems.filter((row) => row.itemId !== itemId));
      return;
    }
    setSelectedItems(
      selectedItems.map((row) =>
        row.itemId === itemId ? { ...row, quantity, totalAmount: quantity * row.ratePerDay * days } : row,
      ),
    );
  };

  const tryExactCode = () => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return;
    const hit = (inventory || []).find((item) => catalogueCode(item).toLowerCase() === term);
    if (hit) {
      addItem(hit);
      setSearchTerm("");
    }
  };

  const categories = Array.from(new Set((inventory || []).map((item) => item.category)));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Package className="h-5 w-5 text-primary" />
        <Label className="text-base font-semibold">Catalogue — type a code or name</Label>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="SRS-023 or old fashioned glass…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              tryExactCode();
            }
          }}
          className="pl-10 h-12"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <Button
            key={category}
            type="button"
            variant={selectedCategory === category ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(selectedCategory === category ? "" : category)}
            className="rounded-full"
          >
            {category}
          </Button>
        ))}
      </div>

      {selectedItems.length > 0 && (
        <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
          <p className="text-sm font-medium">On this hire</p>
          {selectedItems.map((line) => {
            const item = inventory?.find((row) => row.id === line.itemId);
            const cap = item ? freeFor(item.id, item.availableStock || item.totalStock) : 99;
            return (
              <div key={line.itemId} className="flex items-center gap-3 bg-background rounded-md border px-3 py-2">
                <div className="min-w-16 font-mono text-xs text-primary">{item ? catalogueCode(item) : ""}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{line.itemName}</p>
                  <p className="text-xs text-muted-foreground">{formatINR(line.ratePerDay)} / day · breakage {item?.replacementCost ? formatINR(item.replacementCost) : "—"}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setQty(line.itemId, line.quantity - 1)}>-</Button>
                  <Input
                    className="w-14 h-8 text-center"
                    type="number"
                    min={1}
                    max={requireDates ? cap : undefined}
                    value={line.quantity}
                    onChange={(e) => setQty(line.itemId, Number(e.target.value) || 0)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setQty(line.itemId, Math.min(cap || 999, line.quantity + 1))}
                  >
                    +
                  </Button>
                </div>
                <div className="w-20 text-right text-sm font-semibold tabular-nums">{formatINR(line.totalAmount)}</div>
                <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => setQty(line.itemId, 0)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {requireDates && !datesReady && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
          Set dispatch and billing dates first so we only offer pieces that are free that weekend.
        </p>
      )}
      {requireDates && datesReady && availabilityLoading && (
        <p className="text-sm text-muted-foreground">Checking bookings for these dates…</p>
      )}

      <div className="space-y-2 max-h-72 overflow-y-auto">
        {filteredInventory.map((item) => {
          const isSelected = selectedItems.some((row) => row.itemId === item.id);
          const free = freeFor(item.id, item.availableStock);
          return (
            <button
              key={item.id}
              type="button"
              disabled={isSelected || (requireDates && (!datesReady || free < 1))}
              onClick={() => addItem(item)}
              className="w-full text-left flex items-center gap-3 p-3 border rounded-lg hover:border-primary/50 disabled:opacity-50"
            >
              <span className="font-mono text-xs w-16 shrink-0 text-primary">{catalogueCode(item)}</span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium truncate">{item.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {item.category}
                  {requireDates && datesReady ? ` · ${free} free` : ` · ${item.availableStock} in mill`}
                  {` · ${formatINR(item.ratePerDay)}/day`}
                </span>
              </span>
              {isSelected ? <span className="text-xs text-primary">Added</span> : <span className="text-xs text-muted-foreground">Add</span>}
            </button>
          );
        })}
        {filteredInventory.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">No catalogue match. Load the Switch SKUs from Inventory if the list looks short.</p>
        )}
      </div>
    </div>
  );
}
