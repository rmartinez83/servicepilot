"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Wrench } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { getInviteByToken, acceptInvite } from "@/lib/invites";
import { Button } from "@/components/ui/Button";

function formatRole(role: string): string {
  const r = role.toLowerCase();
  if (r === "technician") return "Technician";
  if (r === "member") return "Member";
  if (r === "admin") return "Admin";
  return role;
}

function AcceptContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, refreshCompanyId } = useAuth();
  const token = searchParams.get("token");

  const [info, setInfo] = useState<Awaited<ReturnType<typeof getInviteByToken>>["info"]>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    getInviteByToken(token).then(({ info: i }) => {
      setInfo(i);
      setLoading(false);
    });
  }, [token]);

  async function handleAccept() {
    if (!token) return;
    setError(null);
    setAccepting(true);
    try {
      const result = await acceptInvite(token);
      if (!result.ok) {
        setError(result.error ?? "Failed to accept invite");
        return;
      }
      await refreshCompanyId();
      router.push("/dashboard");
      router.refresh();
    } finally {
      setAccepting(false);
    }
  }

  if (!token) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--page-bg)] p-4">
        <div className="w-full max-w-sm rounded-lg border border-[var(--border)] bg-card-bg p-6 shadow-md text-center">
          <h1 className="text-lg font-semibold text-[var(--dark)]">Invalid invite</h1>
          <p className="mt-2 text-sm text-slate-500">This invite link is missing a token.</p>
          <Link href="/" className="mt-4 inline-block">
            <Button variant="outline">Go home</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--page-bg)]">
        <p className="text-sm text-slate-500">Loading invite…</p>
      </div>
    );
  }

  if (!info) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--page-bg)] p-4">
        <div className="w-full max-w-sm rounded-lg border border-[var(--border)] bg-card-bg p-6 shadow-md text-center">
          <h1 className="text-lg font-semibold text-[var(--dark)]">Invite not found or expired</h1>
          <p className="mt-2 text-sm text-slate-500">This link may have been used or may have expired.</p>
          <Link href="/" className="mt-4 inline-block">
            <Button variant="outline">Go home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const expired = info.expires_at ? new Date(info.expires_at) < new Date() : false;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--page-bg)] p-4">
      <div className="flex flex-col items-center text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white">
          <Wrench className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-[var(--dark)]">Sevora</h1>
      </div>
      <div className="mt-8 w-full max-w-sm rounded-lg border border-[var(--border)] bg-card-bg p-6 shadow-md">
        <h2 className="text-lg font-semibold text-[var(--dark)]">You’re invited</h2>
        <p className="mt-2 text-sm text-slate-600">
          Join <strong>{info.company_name}</strong> as <strong>{formatRole(info.role)}</strong>.
        </p>
        {expired && (
          <p className="mt-2 text-sm text-danger">This invite has expired.</p>
        )}
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        <div className="mt-6 space-y-3">
          {!user ? (
            <>
              <p className="text-sm text-slate-500">Sign in or create an account to accept this invite.</p>
              <Link href={`/login?next=${encodeURIComponent(`/invite/accept?token=${token}`)}`}>
                <Button className="w-full">Sign in</Button>
              </Link>
              <Link href={`/signup?next=${encodeURIComponent(`/invite/accept?token=${token}`)}`} className="block">
                <Button variant="outline" className="w-full">Create account</Button>
              </Link>
            </>
          ) : expired ? (
            <Link href="/dashboard">
              <Button variant="outline" className="w-full">Go to dashboard</Button>
            </Link>
          ) : (
            <>
              <Button className="w-full" onClick={handleAccept} disabled={accepting}>
                {accepting ? "Accepting…" : "Accept invite"}
              </Button>
              <Link href="/dashboard" className="block">
                <Button variant="outline" className="w-full">Cancel</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InviteAcceptPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[var(--page-bg)]">
        <p className="text-sm text-slate-500">Loading…</p>
      </div>
    }>
      <AcceptContent />
    </Suspense>
  );
}
