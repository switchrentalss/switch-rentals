import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { InventoryModal } from "@/components/modals/inventory-modal";
import { Package, Search, Filter, Plus, Edit } from "lucide-react";
import type { InventoryItem } from "@shared/schema";

function getStockStatus(item: InventoryItem): { status: string; variant: "default" | "secondary" | "destructive" } {
  const stockPercentage = (item.availableStock / item.totalStock) * 100;
  
  if (stockPercentage === 0) {
    return { status: "Out of Stock", variant: "destructive" };
  } else if (stockPercentage < 20) {
    return { status: "Low Stock", variant: "destructive" };
  } else {
    return { status: "In Stock", variant: "default" };
  }
}

function getMaintenanceStatus(status: string): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } {
  switch (status) {
    case "available":
      return { label: "Available", variant: "default" };
    case "out_for_rent":
      return { label: "Out for Rent", variant: "secondary" };
    case "needs_cleaning":
      return { label: "Needs Cleaning", variant: "outline" };
    case "in_repair":
      return { label: "In Repair", variant: "destructive" };
    case "broken_lost":
      return { label: "Broken/Lost", variant: "destructive" };
    default:
      return { label: "Available", variant: "default" };
  }
}

export default function Inventory() {
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: inventory, isLoading } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
  });

  const filteredInventory = inventory?.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="flex flex-col min-h-screen">
      <Header 
        title="Inventory" 
        subtitle="Manage your crockery items and track stock levels."
      />
      
      <div className="p-6 space-y-6 flex-1">
        {/* Search and Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 flex-1">
                <div className="flex-1 relative max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search inventory items..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                </Button>
              </div>
              <Button onClick={() => setShowInventoryModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Inventory Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Items</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-20 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            ) : filteredInventory.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm ? "No items found" : "No inventory items yet"}
                </h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm 
                    ? "Try adjusting your search terms"
                    : "Add your first inventory item to get started"
                  }
                </p>
                {!searchTerm && (
                  <Button onClick={() => setShowInventoryModal(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                      <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Available</th>
                      <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Out</th>
                      <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate/Day</th>
                      <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Maintenance</th>
                      <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Replace Cost</th>
                      <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredInventory.map((item) => {
                      const stockStatus = getStockStatus(item);
                      return (
                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-gray-200 rounded-lg mr-3 flex items-center justify-center">
                                <Package className="w-4 h-4 text-gray-500" />
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">{item.name}</div>
                                <div className="text-xs text-gray-500">{item.description}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap">
                            <Badge variant="outline" className="text-xs">{item.category}</Badge>
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">{item.totalStock}</td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-green-600 font-medium">{item.availableStock}</td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{item.totalStock - item.availableStock}</td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">₹{item.ratePerDay}</td>
                          <td className="px-3 py-4 whitespace-nowrap">
                            <Badge variant={stockStatus.variant} className="text-xs">
                              {stockStatus.status}
                            </Badge>
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                            <Button variant="ghost" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <InventoryModal 
        open={showInventoryModal} 
        onOpenChange={setShowInventoryModal}
      />
    </div>
  );
}
