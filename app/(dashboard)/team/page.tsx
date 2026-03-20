"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  getCurrentUserCompanyRole,
  listCompanyMembers,
  removeCompanyMember,
  updateCompanyMemberRole,
  type TeamMemberRole,
} from "@/lib/auth";
import {
  createInvite,
  cancelInvite,
  listInvitesForCompany,
  type CompanyInvite,
  type InviteRole,
} from "@/lib/invites";
import { DEFAULT_COMPANY_ID } from "@/lib/auth";
import { Check, Copy, Trash2 } from "lucide-react";

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

function companyMemberRoleToTeamRole(role: string): TeamMemberRole {
  const r = role.toLowerCase();
  if (r === "owner") return "owner";
  if (r === "admin") return "admin";
  return "technician"; // company_members.role = 'member' maps to Technician in the UI
}

function roleBadgeVariant(role: string): "default" | "success" | "warning" | "error" | "info" {
  const r = role.toLowerCase();
  if (r === "owner") return "info";
  if (r === "admin") return "warning";
  return "success";
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
  const [actionError, setActionError] = useState<string | null>(null);
  const [updatingMemberUserId, setUpdatingMemberUserId] = useState<string | null>(null);
  const [removingMemberUserId, setRemovingMemberUserId] = useState<string | null>(null);
  const [cancelingInviteId, setCancelingInviteId] = useState<string | null>(null);
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);

  const canManage = role === "owner" || role === "admin";

  async function refreshTeamData() {
    if (!currentCompanyId || currentCompanyId === DEFAULT_COMPANY_ID || !user?.id) {
      setLoading(false);
      return;
    }
    setActionError(null);
    setLoading(true);
    try {
      const [r, memResult, invResult] = await Promise.all([
        getCurrentUserCompanyRole(currentCompanyId, user.id),
        listCompanyMembers(currentCompanyId),
        listInvitesForCompany(currentCompanyId),
      ]);
      setRole(r ?? null);
      setMembers(memResult.members ?? []);
      setInvites(invResult.invites ?? []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : "Failed to load team data";
      setActionError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshTeamData();
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

  function getInviteAcceptLink(token: string): string | null {
    if (typeof window === "undefined") return null;
    return `${window.location.origin}/invite/accept?token=${encodeURIComponent(token)}`;
  }

  async function handleCopyInvite(inv: CompanyInvite) {
    const link = getInviteAcceptLink(inv.token);
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopiedInviteId(inv.id);
    setTimeout(() => setCopiedInviteId(null), 2000);
  }

  async function handleCancelInvite(inviteId: string) {
    if (!currentCompanyId) return;
    setCancelingInviteId(inviteId);
    setActionError(null);
    try {
      const res = await cancelInvite(currentCompanyId, inviteId);
      if (!res.ok) throw new Error(res.error ?? "Failed to cancel invite");
      await refreshTeamData();
    } catch (e) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : "Failed to cancel invite";
      setActionError(msg);
    } finally {
      setCancelingInviteId(null);
    }
  }

  async function handleUpdateMemberRole(memberUserId: string, nextRole: TeamMemberRole) {
    if (!currentCompanyId) return;
    setUpdatingMemberUserId(memberUserId);
    setActionError(null);
    try {
      const res = await updateCompanyMemberRole(currentCompanyId, memberUserId, nextRole);
      if (!res.ok) throw new Error(res.error ?? "Failed to update role");
      await refreshTeamData();
    } catch (e) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : "Failed to update role";
      setActionError(msg);
    } finally {
      setUpdatingMemberUserId(null);
    }
  }

  async function handleRemoveMember(memberUserId: string) {
    if (!currentCompanyId) return;
    if (!user?.id) return;
    if (memberUserId === user.id) return; // prevent removing yourself
    setRemovingMemberUserId(memberUserId);
    setActionError(null);
    try {
      const res = await removeCompanyMember(currentCompanyId, memberUserId);
      if (!res.ok) throw new Error(res.error ?? "Failed to remove member");
      await refreshTeamData();
    } catch (e) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : "Failed to remove member";
      setActionError(msg);
    } finally {
      setRemovingMemberUserId(null);
    }
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
              <div className="mt-4 space-y-3">
                {members.map((m) => {
                  const name = (m.fullName ?? "").trim() || (m.email ?? "").trim() || "Unknown";
                  const emailText = (m.email ?? "").trim() || "—";
                  const teamRole = companyMemberRoleToTeamRole(m.role);
                  return (
                    <div
                      key={m.id}
                      className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-left"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-[var(--dark)] truncate">{name}</p>
                          <p className="text-sm text-slate-500 break-all">{emailText}</p>
                        </div>
                        <Badge variant={roleBadgeVariant(teamRole)}>{formatRole(teamRole)}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
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

      {actionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {actionError}
        </div>
      )}

      {/* Invite form */}
      <Card>
        <CardHeader
          title="Invite by email"
          subtitle="Generate an invite link to share. No email is sent yet—copy the link for testing."
        />
        <CardContent className="space-y-4">
          <form onSubmit={handleCreateInvite} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_160px_auto] sm:items-end">
            <div>
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
            <div>
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
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" disabled={inviteLoading} className="sm:justify-self-end">
              {inviteLoading ? "Creating…" : "Create invite link"}
            </Button>
          </form>
          {inviteError && <p className="text-sm text-danger">{inviteError}</p>}
          {createdInviteLink && (
            <div className="rounded-lg border border-[var(--border)] bg-slate-50 p-3">
              <p className="text-xs font-medium text-slate-500">Invite link (copy and share)</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
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
        <CardHeader title="Pending invites" />
        <CardContent>
          {pendingInvites.length === 0 ? (
            <p className="text-sm text-slate-500">No pending invites.</p>
          ) : (
            <div className="space-y-2">
              {pendingInvites.map((inv) => (
                <div
                  key={inv.id || inv.token}
                  className="flex items-start justify-between gap-3 rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-[var(--dark)] break-all">{inv.email}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant={inv.role === "admin" ? "warning" : inv.role === "technician" ? "success" : "default"}>
                        {formatRole(inv.role)}
                      </Badge>
                      <Badge variant="default">Pending</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void handleCopyInvite(inv)}
                      className="shrink-0"
                    >
                      {copiedInviteId === inv.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      <span className="ml-2">{copiedInviteId === inv.id ? "Copied" : "Copy link"}</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void handleCancelInvite(inv.id)}
                      disabled={cancelingInviteId === inv.id}
                      className="shrink-0 border-red-200 text-red-600 hover:bg-red-50 focus-visible:ring-red-400"
                    >
                      {cancelingInviteId === inv.id ? "Cancelling…" : "Cancel"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active members */}
      <Card>
        <CardHeader title="Active members" />
        <CardContent>
          {members.length === 0 ? (
            <p className="text-sm text-slate-500">No members yet.</p>
          ) : (
            <div className="space-y-2">
              {members.map((m) => {
                const name = (m.fullName ?? "").trim() || (m.email ?? "").trim() || "Unknown";
                const emailText = (m.email ?? "").trim() || "—";
                const teamRole = companyMemberRoleToTeamRole(m.role);
                return (
                  <div
                    key={m.id}
                    className="flex flex-col gap-3 rounded-lg border border-[var(--border)] px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-[var(--dark)] truncate">{name}</p>
                      <p className="mt-0.5 text-sm text-slate-500 break-all">{emailText}</p>
                      <div className="mt-2">
                        <Badge variant={roleBadgeVariant(m.role)}>
                          {teamRole === "technician" ? "Technician" : formatRole(teamRole)}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 sm:flex-none">
                        <select
                          value={teamRole}
                          onChange={(e) => void handleUpdateMemberRole(m.user_id, e.target.value as TeamMemberRole)}
                          disabled={updatingMemberUserId === m.user_id}
                          className="h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-[var(--dark)] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="technician">Technician</option>
                          <option value="admin">Admin</option>
                          <option value="owner">Owner</option>
                        </select>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void handleRemoveMember(m.user_id)}
                        disabled={removingMemberUserId === m.user_id || m.user_id === user?.id}
                        className="shrink-0 border-red-200 text-red-600 hover:bg-red-50 focus-visible:ring-red-400"
                      >
                        {removingMemberUserId === m.user_id ? "Removing…" : <span className="inline-flex items-center gap-2"><Trash2 className="h-4 w-4" />Remove</span>}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
