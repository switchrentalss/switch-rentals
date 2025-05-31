import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomerModal } from "@/components/modals/customer-modal";
import { Users, Search, Filter, Plus, Mail, Phone, Edit } from "lucide-react";
import type { Customer } from "@shared/schema";

export default function Customers() {
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: customers, isLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const filteredCustomers = customers?.filter(customer => 
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.company?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="flex flex-col min-h-screen">
      <Header 
        title="Customers" 
        subtitle="Manage your customer information and contact details."
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
                    placeholder="Search customers..."
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
              <Button onClick={() => setShowCustomerModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Customer
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Customers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            [...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse">
                    <div className="w-12 h-12 bg-gray-200 rounded-full mb-4"></div>
                    <div className="h-5 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : filteredCustomers.length === 0 ? (
            <div className="col-span-full">
              <Card>
                <CardContent className="p-12">
                  <div className="text-center">
                    <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {searchTerm ? "No customers found" : "No customers yet"}
                    </h3>
                    <p className="text-gray-500 mb-4">
                      {searchTerm 
                        ? "Try adjusting your search terms"
                        : "Add your first customer to get started"
                      }
                    </p>
                    {!searchTerm && (
                      <Button onClick={() => setShowCustomerModal(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Customer
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            filteredCustomers.map((customer) => (
              <Card key={customer.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-primary font-semibold text-lg">
                          {customer.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{customer.name}</h3>
                        {customer.company && (
                          <p className="text-sm text-gray-500">{customer.company}</p>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <Mail className="w-4 h-4 mr-2" />
                      <span className="truncate">{customer.email}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Phone className="w-4 h-4 mr-2" />
                      <span>{customer.phone}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-500 truncate">{customer.address}</p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <CustomerModal 
        open={showCustomerModal} 
        onOpenChange={setShowCustomerModal}
      />
    </div>
  );
}
