"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Wrench } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { getSession, signIn, signUp, createCompanyAndMembership } from "@/lib/auth";
import { Button } from "@/components/ui/Button";

export default function SignupPage() {
  const router = useRouter();
  const { refreshCompanyId } = useAuth();
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const trimmedEmail = email.trim();
    const trimmedCompany = companyName.trim();
    try {
      // Step 1: Create auth user
      const { data: signUpData, error: signUpError } = await signUp(trimmedEmail, password, {
        fullName: fullName.trim() || undefined,
      });
      if (signUpError) {
        setError(`Sign-up failed: ${signUpError.message}`);
        return;
      }

      // Step 2: Get a session (required for RLS when creating company and membership)
      let userId: string | undefined = signUpData?.session?.user?.id;
      if (!userId) {
        const { data: sessionData } = await getSession();
        userId = sessionData.session?.user?.id;
      }
      if (!userId) {
        const { data: signInData, error: signInError } = await signIn(trimmedEmail, password);
        if (signInError) {
          const msg = signInError.message.toLowerCase();
          if (
            msg.includes("email not confirmed") ||
            msg.includes("confirm your email") ||
            msg.includes("confirm the signup")
          ) {
            setError(
              "Your account was created, but sign-in requires email confirmation. Check your email and click the confirmation link, then sign in. For MVP testing you can disable “Confirm email” in Supabase: Authentication → Providers → Email."
            );
            return;
          }
          setError(`Sign-in failed: ${signInError.message}`);
          return;
        }
        userId = signInData?.session?.user?.id ?? (await getSession()).data.session?.user?.id;
      }
      if (!userId) {
        setError(
          "Your account was created but we couldn’t start your session. Please sign in to continue."
        );
        return;
      }

      // Step 3: Ensure the Supabase client has a live session before calling the RPC
      // (the RPC uses auth.uid() on the server; no session = RPC fails or creates nothing)
      let { data: sessionData } = await getSession();
      if (!sessionData.session) {
        const { error: signInAgainError } = await signIn(trimmedEmail, password);
        if (signInAgainError) {
          setError(`Could not start your session: ${signInAgainError.message}. Please sign in and try again.`);
          return;
        }
        sessionData = (await getSession()).data;
      }
      if (!sessionData.session) {
        setError("Your account was created but we couldn’t start your session. Please sign in to continue.");
        return;
      }

      // Step 4: Create company and membership (RPC requires active session)
      const { companyId, error: companyError } = await createCompanyAndMembership(
        trimmedCompany,
        sessionData.session.user.id
      );
      if (companyError || !companyId) {
        setError(
          companyError?.message ??
            "Creating your company failed. Your account was created — please sign in and try again, or contact support."
        );
        return;
      }

      await refreshCompanyId();
      router.push("/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm space-y-8">
      <div className="flex flex-col items-center text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white">
          <Wrench className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-[var(--dark)]">Sevora</h1>
        <p className="mt-2 text-sm text-slate-500">
          Start your free trial. No credit card required.
        </p>
      </div>
      <div className="rounded-[10px] border border-[var(--border)] bg-card-bg p-6 shadow-md">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-[var(--dark)]">Create your account</h2>
          <p className="mt-1 text-sm text-slate-500">Sign up and start your 14-day free trial</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="signup-full-name" className="block text-sm font-medium text-slate-700">
              Full Name
            </label>
            <input
              id="signup-full-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoComplete="name"
              className="mt-1 h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-[var(--dark)] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label htmlFor="signup-company-name" className="block text-sm font-medium text-slate-700">
              Company Name
            </label>
            <input
              id="signup-company-name"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
              autoComplete="organization"
              placeholder="e.g. Acme HVAC"
              className="mt-1 h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-[var(--dark)] placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label htmlFor="signup-email" className="block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="signup-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="mt-1 h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-[var(--dark)] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label htmlFor="signup-password" className="block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="signup-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className="mt-1 h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-[var(--dark)] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          {error && (
            <p className="text-sm text-danger">{error}</p>
          )}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creating account…" : "Start Free Trial"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:text-primary-hover hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
