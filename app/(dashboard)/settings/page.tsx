import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { Building2, Bell, CreditCard, Shield, FileText } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="mt-1 text-slate-500">
          Manage your account and application preferences.
        </p>
      </div>

      <div className="space-y-4">
        {/* Company Profile */}
        <Card>
          <CardContent className="space-y-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">Company Profile</h2>
                  <p className="text-sm text-slate-500">
                    Business name, address, and contact details.
                  </p>
                </div>
              </div>
              <Badge variant="info">Coming soon</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Invoice Settings */}
        <Card>
          <CardHeader title="Invoice Settings" subtitle="Customize invoice formatting and payment language." />
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                <FileText className="h-4 w-4" />
              </div>
              <Badge variant="info">Coming soon</Badge>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700" htmlFor="invoice-prefix">
                  Invoice prefix
                </label>
                <input
                  id="invoice-prefix"
                  type="text"
                  disabled
                  defaultValue="INV-"
                  className="h-10 w-full rounded-lg border border-[var(--border)] bg-slate-50 px-3 text-sm text-[var(--dark)] opacity-80"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700" htmlFor="payment-terms">
                  Payment terms
                </label>
                <select
                  id="payment-terms"
                  disabled
                  defaultValue=""
                  className="h-10 w-full rounded-lg border border-[var(--border)] bg-slate-50 px-3 text-sm text-[var(--dark)] opacity-80"
                >
                  <option value="" disabled>
                    Optional
                  </option>
                  <option value="due_on_receipt">Due on receipt</option>
                  <option value="net_15">Net 15</option>
                  <option value="net_30">Net 30</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700" htmlFor="default-notes">
                Default notes
              </label>
              <textarea
                id="default-notes"
                disabled
                defaultValue=""
                rows={3}
                placeholder="Optional note shown on new invoices (e.g., Thank you for your business)."
                className="w-full rounded-lg border border-[var(--border)] bg-slate-50 px-3 py-2 text-sm text-[var(--dark)] opacity-80"
              />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardContent className="space-y-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <Bell className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">Notifications</h2>
                  <p className="text-sm text-slate-500">
                    Email and in-app preferences.
                  </p>
                </div>
              </div>
              <Badge variant="info">Coming soon</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Billing & Subscription */}
        <Card>
          <CardContent className="space-y-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">Billing & Subscription</h2>
                  <p className="text-sm text-slate-500">
                    Manage your plan, invoices, and payment settings.
                  </p>
                </div>
              </div>
              <Link href="/billing">
                <Button variant="outline" size="sm">
                  Manage billing
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardContent className="space-y-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">Security</h2>
                  <p className="text-sm text-slate-500">
                    Password, two-factor authentication, and sessions.
                  </p>
                </div>
              </div>
              <Badge variant="info">Coming soon</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
