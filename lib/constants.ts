import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Calendar,
  Wrench,
  FileText,
  BarChart3,
  CreditCard,
  UserPlus,
  Settings,
} from "lucide-react";

export const APP_NAME = "ServicePilot";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const SIDEBAR_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Customers", href: "/customers", icon: Users },
  { label: "Jobs", href: "/jobs", icon: Briefcase },
  { label: "Schedule", href: "/schedule", icon: Calendar },
  { label: "Technicians", href: "/technicians", icon: Wrench },
  { label: "Invoices", href: "/invoices", icon: FileText },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Billing", href: "/billing", icon: CreditCard },
  { label: "Team", href: "/team", icon: UserPlus },
  { label: "Settings", href: "/settings", icon: Settings },
];
