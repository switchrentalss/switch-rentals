import { Switch, Route, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/layout/sidebar";
import Dashboard from "@/pages/dashboard";
import Orders from "@/pages/orders";
import Inventory from "@/pages/inventory";
import Customers from "@/pages/customers";
import Reports from "@/pages/reports";
import FinancialDashboard from "@/pages/financial-dashboard";
import Books from "@/pages/books";
import Invoices from "@/pages/invoices";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import HomePage from "@/site/pages/home";
import CollectionsPage from "@/site/pages/collections";
import GalleryPage from "@/site/pages/gallery";
import AboutPage from "@/site/pages/about";
import ContactPage from "@/site/pages/contact";
import { AuthProvider, useAuth } from "@/lib/auth";
import type { ReactNode } from "react";

function OwnerOnly({ children }: { children: ReactNode }) {
  const { isOwner } = useAuth();
  if (!isOwner) return <Redirect to="/" />;
  return <>{children}</>;
}

function RequireStaff({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Checking sign-in…</div>;
  }
  if (!user) return <Redirect to="/login" />;
  return <>{children}</>;
}

function Operations() {
  return (
    <RequireStaff>
      <div className="min-h-screen flex bg-background">
        <Sidebar />
        <main className="flex-1 ml-64 min-w-0">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/app" component={Dashboard} />
            <Route path="/orders" component={Orders} />
            <Route path="/inventory" component={Inventory} />
            <Route path="/customers" component={Customers} />
            <Route path="/financial">
              <OwnerOnly>
                <FinancialDashboard />
              </OwnerOnly>
            </Route>
            <Route path="/books">
              <OwnerOnly>
                <Books />
              </OwnerOnly>
            </Route>
            <Route path="/invoices" component={Invoices} />
            <Route path="/reports">
              <OwnerOnly>
                <Reports />
              </OwnerOnly>
            </Route>
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
    </RequireStaff>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/site" component={HomePage} />
      <Route path="/collections" component={CollectionsPage} />
      <Route path="/gallery" component={GalleryPage} />
      <Route path="/about" component={AboutPage} />
      <Route path="/contact" component={ContactPage} />
      <Route component={Operations} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
