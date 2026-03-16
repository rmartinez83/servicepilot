"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { addTechnician } from "@/lib/data";
import type { Specialty } from "@/lib/models";
import { ArrowLeft, Mail, Phone, User, Wrench } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const SPECIALTY_OPTIONS: { value: Specialty; label: string }[] = [
  { value: "HVAC", label: "HVAC" },
  { value: "Plumbing", label: "Plumbing" },
  { value: "Electrical", label: "Electrical" },
  { value: "Cleaning", label: "Cleaning" },
  { value: "Landscaping", label: "Landscaping" },
];

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

export default function NewTechnicianPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState<Specialty>("HVAC");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const canSubmit =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    phone.trim().length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/technicians"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Technicians
            </Link>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">New Technician</h1>
          <p className="mt-1 text-slate-500">
            Add a new technician to your team.
          </p>
        </div>
      </div>

      <Card className="max-w-3xl">
        <CardHeader
          title="Technician details"
          subtitle="Name, contact, specialty, and status"
        />
        <CardContent>
          <form
            className="grid gap-5"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!canSubmit) return;
              setSaving(true);
              try {
                await addTechnician({
                  name: name.trim(),
                  specialty,
                  email: email.trim(),
                  phone: phone.trim(),
                  active,
                });
                router.push("/technicians");
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
                  placeholder="e.g. Jane Smith"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </Field>

              <Field label="Specialty" icon={<Wrench className="h-4 w-4" />}>
                <select
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value as Specialty)}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {SPECIALTY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email" icon={<Mail className="h-4 w-4" />}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. jane@example.com"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </Field>

              <Field label="Phone" icon={<Phone className="h-4 w-4" />}>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. (555) 333-4444"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </Field>
            </div>

            <Field label="Status" icon={<User className="h-4 w-4" />} hint="Inactive technicians are hidden from assignment by default.">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-slate-700">Active</span>
              </label>
            </Field>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
              <Link href="/technicians" className="sm:mr-auto">
                <Button variant="outline" className="w-full sm:w-auto">
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={!canSubmit || saving}
                className="w-full sm:w-auto"
              >
                {saving ? "Saving..." : "Add Technician"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
