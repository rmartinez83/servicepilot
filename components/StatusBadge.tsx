"use client";

const JOB_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  scheduled: { bg: "#DBEAFE", text: "#1D4ED8", label: "Scheduled" },
  in_progress: { bg: "#EDE9FE", text: "#6D28D9", label: "In Progress" },
  completed: { bg: "#D1FAE5", text: "#065F46", label: "Completed" },
  cancelled: { bg: "#FEE2E2", text: "#991B1B", label: "Cancelled" },
};

const INVOICE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: "#F1F5F9", text: "#475569", label: "Draft" },
  sent: { bg: "#DBEAFE", text: "#1D4ED8", label: "Sent" },
  paid: { bg: "#D1FAE5", text: "#065F46", label: "Paid" },
};

const baseClass =
  "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium";

export function JobStatusBadge({ status }: { status: string }) {
  const style = JOB_STYLES[status] ?? {
    bg: "#F1F5F9",
    text: "#475569",
    label: status,
  };
  return (
    <span
      className={baseClass}
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {style.label}
    </span>
  );
}

export function InvoiceStatusBadge({ status }: { status: string }) {
  const style = INVOICE_STYLES[status] ?? {
    bg: "#F1F5F9",
    text: "#475569",
    label: status,
  };
  return (
    <span
      className={baseClass}
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {style.label}
    </span>
  );
}
