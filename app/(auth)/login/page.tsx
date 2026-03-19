"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Wrench } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/Button";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = await signIn(email.trim(), password);
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    const next = searchParams.get("next");
    const path = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
    router.push(path);
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm space-y-8">
      <div className="flex flex-col items-center text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white">
          <Wrench className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-[var(--dark)]">Sevora</h1>
        <p className="mt-2 text-sm text-slate-500">
          Simple scheduling and invoicing for service businesses.
        </p>
      </div>
      <div className="rounded-[10px] border border-[var(--border)] bg-card-bg p-6 shadow-md">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-[var(--dark)]">Sign in</h2>
          <p className="mt-1 text-sm text-slate-500">Sign in to your account</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="login-email" className="block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="mt-1 h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-[var(--dark)] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label htmlFor="login-password" className="block text-sm font-medium text-slate-700">
            Password
          </label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="mt-1 h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-[var(--dark)] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        {error && (
          <p className="text-sm text-danger">{error}</p>
        )}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Signing in…" : "Sign in"}
        </Button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          <Link href="/" className="text-primary hover:text-primary-hover hover:underline">Back to app</Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-sm animate-pulse rounded-[10px] border border-[var(--border)] bg-card-bg p-6 shadow-md h-64" />}>
      <LoginForm />
    </Suspense>
  );
}
