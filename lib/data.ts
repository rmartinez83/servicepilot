import type { Customer, Technician, Job, Invoice } from "./models";
import * as db from "./db";

// Re-export format helpers (unchanged)
/** Format a date string for display. Date-only YYYY-MM-DD is parsed as local so it doesn't shift a day in other timezones. */
export function formatDate(dateStr: string): string {
  const s = (dateStr || "").trim().slice(0, 10);
  let date: Date;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-").map(Number);
    date = new Date(y, m - 1, d);
  } else {
    date = new Date(dateStr);
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatJobStatus(status: string): string {
  const map: Record<string, string> = {
    scheduled: "Scheduled",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return map[status] ?? status;
}

/** Format scheduled date and optional time for display (e.g. "Mar 9, 2025 2:30 PM" or "Mar 9, 2025"). */
export function formatScheduledDateTime(dateStr: string, timeStr?: string | null): string {
  const datePart = formatDate(dateStr);
  if (!timeStr || !/^\d{1,2}:\d{2}/.test(timeStr.trim())) return datePart;
  const [h, m] = timeStr.trim().split(":").map(Number);
  const hour = Math.min(23, Math.max(0, h ?? 0));
  const min = Math.min(59, Math.max(0, m ?? 0));
  const time = new Date(2000, 0, 1, hour, min);
  const timeFormatted = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(time);
  return `${datePart} ${timeFormatted}`;
}

/** Format scheduled date and time for table/list display: "Mar 10, 2025 · 10:00 AM" or date only when no time. */
export function formatScheduledDateAndTime(dateStr: string, timeStr?: string | null): string {
  const datePart = formatDate(dateStr);
  const timePart = formatScheduledTime(timeStr);
  return timePart ? `${datePart} · ${timePart}` : datePart;
}

/** Format scheduled time only for display (e.g. "10:00 AM"). Returns empty string if missing or invalid. */
export function formatScheduledTime(timeStr?: string | null): string {
  if (!timeStr || !/^\d{1,2}:\d{2}/.test(timeStr.trim())) return "";
  const [h, m] = timeStr.trim().split(":").map(Number);
  const hour = Math.min(23, Math.max(0, h ?? 0));
  const min = Math.min(59, Math.max(0, m ?? 0));
  const time = new Date(2000, 0, 1, hour, min);
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(time);
}

export function formatInvoiceStatus(
  status: string,
  _dueDate?: string
): { label: string; variant: "success" | "warning" | "error" | "info" | "default" } {
  const map: Record<string, { label: string; variant: "success" | "info" | "default" }> = {
    draft: { label: "Draft", variant: "default" },
    sent: { label: "Sent", variant: "info" },
    paid: { label: "Paid", variant: "success" },
  };
  return map[status] ?? { label: status, variant: "default" };
}

/** Format phone for display only: (XXX) XXX-XXXX. Accepts any input format; strips non-digits and formats. */
export function formatPhoneNumber(phone: string | null | undefined): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length < 10) return (phone ?? "").trim() || "—";
  const area = digits.slice(0, 3);
  const mid = digits.slice(3, 6);
  const last = digits.slice(6, 10);
  return `(${area}) ${mid}-${last}`;
}

/** Format phone as user types for input fields: (XXX) XXX-XXXX. Strips non-digits, returns partial format. */
export function formatPhoneInput(value: string | null | undefined): string {
  const digits = (value ?? "").replace(/\D/g, "").slice(0, 10);
  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

// --- Supabase-backed (customers, technicians, jobs) ---

export async function getCustomers(): Promise<Customer[]> {
  return db.fetchCustomers();
}

export async function getCustomerById(id: string): Promise<Customer | undefined> {
  return db.fetchCustomerById(id);
}

export async function getTechnicians(): Promise<Technician[]> {
  return db.fetchTechnicians();
}

export async function getTechnicianById(id: string | null): Promise<Technician | undefined> {
  return db.fetchTechnicianById(id);
}

export async function getJobs(): Promise<Job[]> {
  return db.fetchJobs();
}

export async function getJobById(id: string): Promise<Job | undefined> {
  return db.fetchJobById(id);
}

export interface JobWithRelations extends Job {
  customer: Customer;
  technician: Technician | null;
}

export async function getJobsWithRelations(): Promise<JobWithRelations[]> {
  const jobs = await db.fetchJobs();
  const result: JobWithRelations[] = [];
  for (const job of jobs) {
    const customer = await db.fetchCustomerById(job.customerId);
    const technician = job.technicianId
      ? await db.fetchTechnicianById(job.technicianId)
      : null;
    result.push({
      ...job,
      customer: customer ?? ({} as Customer),
      technician: technician ?? null,
    });
  }
  return result;
}

export async function getJobCountByCustomer(customerId: string): Promise<number> {
  return db.fetchJobCountByCustomer(customerId);
}

export async function getJobsThisWeekByTechnician(technicianId: string): Promise<number> {
  return db.fetchJobsThisWeekByTechnician(technicianId);
}

export async function addJob(input: db.NewJobInput): Promise<Job> {
  return db.insertJob(input);
}

export async function updateJob(id: string, input: db.JobUpdateInput): Promise<Job> {
  return db.updateJob(id, input);
}

export async function addCustomer(input: db.NewCustomerInput): Promise<Customer> {
  return db.insertCustomer(input);
}

export async function updateCustomer(id: string, input: db.CustomerUpdateInput): Promise<Customer> {
  return db.updateCustomer(id, input);
}

export async function addTechnician(input: db.NewTechnicianInput): Promise<Technician> {
  return db.insertTechnician(input);
}

export async function updateTechnician(id: string, input: db.TechnicianUpdateInput): Promise<Technician> {
  return db.updateTechnician(id, input);
}

// --- Invoices (Supabase-backed) ---

export async function getInvoices(): Promise<Invoice[]> {
  return db.fetchInvoices();
}

export async function getInvoiceById(id: string): Promise<Invoice | undefined> {
  return db.fetchInvoiceById(id);
}

export interface InvoiceWithRelations extends Invoice {
  job: Job;
  customer: Customer;
}

export async function getInvoicesWithRelations(): Promise<InvoiceWithRelations[]> {
  const invoices = await db.fetchInvoices();
  const result: InvoiceWithRelations[] = [];
  for (const inv of invoices) {
    const job = await db.fetchJobById(inv.jobId);
    const customer = await db.fetchCustomerById(inv.customerId);
    if (!job || !customer) continue;
    result.push({ ...inv, job, customer });
  }
  return result;
}

export async function addInvoice(input: db.NewInvoiceInput): Promise<Invoice> {
  return db.insertInvoice(input);
}

export async function updateInvoice(id: string, input: db.InvoiceUpdateInput): Promise<Invoice> {
  return db.updateInvoice(id, input);
}

export async function getInvoiceStats(): Promise<{
  draftCount: number;
  sentCount: number;
  outstandingAmount: number;
  paidThisMonthAmount: number;
  paidThisMonthCount: number;
}> {
  const invoices = await db.fetchInvoices();
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  let draftCount = 0;
  let sentCount = 0;
  let outstandingAmount = 0;
  let paidThisMonthAmount = 0;
  let paidThisMonthCount = 0;

  for (const inv of invoices) {
    if (inv.status === "draft") {
      draftCount++;
    } else if (inv.status === "sent") {
      sentCount++;
      outstandingAmount += inv.total;
    } else if (inv.status === "paid") {
      const paidMonth = (inv.paidAt || "").trim().slice(0, 7);
      if (paidMonth === thisMonth) {
        paidThisMonthAmount += inv.total;
        paidThisMonthCount++;
      }
    }
  }

  return {
    draftCount,
    sentCount,
    outstandingAmount,
    paidThisMonthAmount,
    paidThisMonthCount,
  };
}
