import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Building2, Bell, CreditCard, Shield, Palette } from "lucide-react";

const sections = [
  {
    title: "Company profile",
    description: "Business name, address, logo, and contact details.",
    icon: Building2,
  },
  {
    title: "Notifications",
    description: "Email and in-app notification preferences.",
    icon: Bell,
  },
  {
    title: "Billing & subscription",
    description: "Plan, payment method, and invoice history.",
    icon: CreditCard,
  },
  {
    title: "Security",
    description: "Password, two-factor authentication, and sessions.",
    icon: Shield,
  },
  {
    title: "Appearance",
    description: "Theme and display preferences.",
    icon: Palette,
  },
];

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
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.title}>
              <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-slate-900">
                      {section.title}
                    </h2>
                    <p className="text-sm text-slate-500">
                      {section.description}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="shrink-0">
                  Configure
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
