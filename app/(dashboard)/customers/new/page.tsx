"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { addCustomer, formatPhoneInput } from "@/lib/data";
import { ArrowLeft, Mail, MapPin, FileText, Phone, User } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewCustomerPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const canSubmit =
    name.trim().length > 0 &&
    phone.trim().length > 0 &&
    email.trim().length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/customers"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Customers
            </Link>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">New Customer</h1>
          <p className="mt-1 text-slate-500">
            Add a new customer to your database.
          </p>
        </div>
      </div>

      <Card className="max-w-3xl">
        <CardHeader
          title="Customer details"
          subtitle="Contact information and notes"
        />
        <CardContent>
          <form
            className="grid gap-5"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!canSubmit) return;
              setSaving(true);
              try {
                await addCustomer({
                  name: name.trim(),
                  phone: phone.trim(),
                  email: email.trim(),
                  address: address.trim() || undefined,
                  notes: notes.trim() || undefined,
                });
                router.push("/customers");
              } finally {
                setSaving(false);
              }
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" icon={<User className="h-4 w-4" />}>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </Field>

              <Field label="Phone" icon={<Phone className="h-4 w-4" />}>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
                  placeholder="e.g. (555) 123-4567"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </Field>
            </div>

            <Field label="Email" icon={<Mail className="h-4 w-4" />}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. contact@acme.com"
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </Field>

            <Field label="Address" icon={<MapPin className="h-4 w-4" />}>
              <AddressAutocomplete
                value={address}
                onChange={setAddress}
                placeholder="Street, city, state, zip"
              />
            </Field>

            <Field
              label="Notes"
              icon={<FileText className="h-4 w-4" />}
              hint="Optional internal notes."
            >
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="e.g. Prefers morning appointments."
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </Field>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
              <Link href="/customers" className="sm:mr-auto">
                <Button variant="outline" className="w-full sm:w-auto">
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={!canSubmit || saving}
                className="w-full sm:w-auto"
              >
                {saving ? "Saving..." : "Add Customer"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  icon,
  hint,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          {icon && <span className="text-slate-400">{icon}</span>}
          {label}
        </label>
        {hint && <span className="text-xs text-slate-500">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
