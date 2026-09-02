import { FormEvent, useState } from "react";
import { Redirect, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const { login, user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!loading && user) {
    return <Redirect to="/" />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email, password);
      setLocation("/");
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Sign in failed";
      const jsonPart = raw.replace(/^\d+:\s*/, "");
      try {
        const parsed = JSON.parse(jsonPart);
        setError(parsed.message || "Invalid email or password.");
      } catch {
        setError("Invalid email or password.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0c0a09] text-[#f6f1ea] flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-5 rounded-2xl border border-white/10 bg-[#1c1410] p-8">
        <div>
          <p className="text-[11px] tracking-[0.22em] uppercase text-[#c4a574]">Switch Rentals</p>
          <h1 className="font-serif text-3xl mt-2">Mill sign in</h1>
          <p className="text-sm text-white/60 mt-2">Owner and mill desk only. The public site does not need this.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-black/30 border-white/15"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-black/30 border-white/15"
            required
          />
        </div>
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        <Button type="submit" className="w-full h-11" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
