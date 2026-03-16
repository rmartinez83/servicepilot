"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/components/providers/AuthProvider";
import { getCurrentUserCompanyRole, listCompanyMembers } from "@/lib/auth";
import {
  createInvite,
  listInvitesForCompany,
  type CompanyInvite,
  type InviteRole,
} from "@/lib/invites";
import { DEFAULT_COMPANY_ID } from "@/lib/auth";
import { UserPlus, Copy, Check } from "lucide-react";

const ROLE_OPTIONS: { value: InviteRole; label: string }[] = [
  { value: "technician", label: "Technician" },
  { value: "member", label: "Member" },
  { value: "admin", label: "Admin" },
];

function formatRole(role: string): string {
  const r = role.toLowerCase();
  if (r === "owner") return "Owner";
  if (r === "admin") return "Admin";
  if (r === "member") return "Member";
  if (r === "technician") return "Technician";
  return role;
}

export default function TeamPage() {
  const { currentCompanyId, user } = useAuth();
  const [role, setRole] = useState<string | null>(null);
  const [members, setMembers] = useState<Awaited<ReturnType<typeof listCompanyMembers>>["members"]>([]);
  const [invites, setInvites] = useState<CompanyInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<InviteRole>("technician");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [createdInviteLink, setCreatedInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const canManage = role === "owner" || role === "admin";

  useEffect(() => {
    if (!currentCompanyId || currentCompanyId === DEFAULT_COMPANY_ID || !user?.id) {
      setLoading(false);
      return;
    }
    Promise.all([
      getCurrentUserCompanyRole(currentCompanyId, user.id),
      listCompanyMembers(currentCompanyId),
      listInvitesForCompany(currentCompanyId),
    ]).then(([r, memResult, invResult]) => {
      setRole(r ?? null);
      setMembers(memResult.members ?? []);
      setInvites(invResult.invites ?? []);
    }).finally(() => setLoading(false));
  }, [currentCompanyId, user?.id]);

  async function handleCreateInvite(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !currentCompanyId || !user?.id || !canManage) return;
    setInviteError(null);
    setCreatedInviteLink(null);
    setInviteLoading(true);
    try {
      const { token, error } = await createInvite(
        currentCompanyId,
        trimmed,
        inviteRole,
        user.id,
        { expiresInDays: 7 }
      );
      if (error) {
        setInviteError(error.message);
        return;
      }
      const link = typeof window !== "undefined"
        ? `${window.location.origin}/invite/accept?token=${token}`
        : "";
      setCreatedInviteLink(link);
      setEmail("");
      const invResult = await listInvitesForCompany(currentCompanyId);
      if (!invResult.error) setInvites(invResult.invites);
    } finally {
      setInviteLoading(false);
    }
  }

  function copyInviteLink() {
    if (!createdInviteLink) return;
    navigator.clipboard.writeText(createdInviteLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-slate-500">Loading team…</p>
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--dark)]">Team</h1>
          <p className="mt-1 text-slate-500">
            Only owners and admins can invite and manage team members.
          </p>
        </div>
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-slate-600">
              You can view your team below. To invite others, ask your company owner or an admin.
            </p>
            <div className="mt-6">
              <h3 className="text-sm font-medium text-slate-500">Active members</h3>
              <ul className="mt-2 space-y-1 text-sm text-[var(--dark)]">
                {members.map((m) => (
                  <li key={m.id}>
                    {formatRole(m.role)} · <span className="text-slate-500 font-mono text-xs">{m.user_id.slice(0, 8)}…</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-6">
              <Link href="/dashboard">
                <Button variant="outline">Back to Dashboard</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pendingInvites = invites.filter((i) => i.status === "pending");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--dark)]">Team</h1>
        <p className="mt-1 text-slate-500">
          Invite employees and manage who has access to your company.
        </p>
      </div>

      {/* Invite form */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-[var(--dark)]">Invite by email</h2>
          <p className="text-sm text-slate-500">
            Generate an invite link to share. No email is sent yet—copy the link for testing.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleCreateInvite} className="flex flex-wrap items-end gap-3">
            <div className="min-w-[200px] flex-1">
              <label htmlFor="team-invite-email" className="block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="team-invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@example.com"
                className="mt-1 h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-[var(--dark)] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="w-36">
              <label htmlFor="team-invite-role" className="block text-sm font-medium text-slate-700">
                Role
              </label>
              <select
                id="team-invite-role"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as InviteRole)}
                className="mt-1 h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-[var(--dark)] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <Button type="submit" disabled={inviteLoading}>
              {inviteLoading ? "Creating…" : "Create invite link"}
            </Button>
          </form>
          {inviteError && <p className="text-sm text-danger">{inviteError}</p>}
          {createdInviteLink && (
            <div className="rounded-lg border border-[var(--border)] bg-slate-50 p-3">
              <p className="text-xs font-medium text-slate-500">Invite link (copy and share)</p>
              <div className="mt-1 flex items-center gap-2">
                <code className="flex-1 truncate text-sm text-[var(--dark)]">{createdInviteLink}</code>
                <Button type="button" variant="outline" size="sm" onClick={copyInviteLink}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending invites */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-[var(--dark)]">Pending invites</h2>
        </CardHeader>
        <CardContent>
          {pendingInvites.length === 0 ? (
            <p className="text-sm text-slate-500">No pending invites.</p>
          ) : (
            <ul className="space-y-2">
              {pendingInvites.map((inv) => (
                <li
                  key={inv.id || inv.token}
                  className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                >
                  <span className="text-[var(--dark)]">{inv.email}</span>
                  <span className="text-slate-500">{formatRole(inv.role)} · Pending</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Active members */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-[var(--dark)]">Active members</h2>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-sm text-slate-500">No members yet.</p>
          ) : (
            <ul className="space-y-2">
              {members.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                >
                  <span className="font-mono text-slate-500">{m.user_id.slice(0, 8)}…</span>
                  <span className="text-[var(--dark)]">{formatRole(m.role)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
