import { createContext, useContext, type ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "./queryClient";

export type StaffRole = "owner" | "executive";
export type Staff = { id: number; role: StaffRole; name: string; email: string };

type AuthContextValue = {
  user: Staff | null;
  loading: boolean;
  isOwner: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: user, isLoading } = useQuery<Staff | null>({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn,
    retry: false,
  });

  const loginMut = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/login", { email, password });
      return (await res.json()) as Staff;
    },
    onSuccess: (staff) => {
      queryClient.setQueryData(["/api/auth/me"], staff);
    },
  });

  const logoutMut = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.clear();
      queryClient.setQueryData(["/api/auth/me"], null);
    },
  });

  const value: AuthContextValue = {
    user: user ?? null,
    loading: isLoading,
    isOwner: user?.role === "owner",
    login: async (email, password) => {
      await loginMut.mutateAsync({ email, password });
    },
    logout: async () => {
      await logoutMut.mutateAsync();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

async function getQueryFn() {
  const res = await fetch("/api/auth/me", { credentials: "include" });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error("Could not check sign-in");
  return res.json();
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
