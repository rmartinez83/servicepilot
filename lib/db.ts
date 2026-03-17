import type { Customer, Technician, Job, JobStatus, Invoice, InvoiceStatus } from "./models";
import { getSupabase } from "./supabase/client";

const FETCH_TIMEOUT_MS = 15000;

/** Phase 1 multi-tenant: default company when no auth or no company_members row. */
export const CURRENT_COMPANY_ID = "00000000-0000-4000-8000-000000000001";

/** Set by AuthProvider after resolving session + company_members. Null = use CURRENT_COMPANY_ID. */
let _currentCompanyId: string | null = null;

/** Current tenant company id for all reads/writes. Falls back to default if not set (e.g. before auth init). */
export function getCurrentCompanyId(): string {
  return _currentCompanyId ?? CURRENT_COMPANY_ID;
}

/** Called by auth provider when session/company is resolved. Pass null to use default. */
export function setCurrentCompanyId(companyId: string | null): void {
  _currentCompanyId = companyId;
}

function withTimeout<T>(p: PromiseLike<T>, ms: number): Promise<T> {
  return Promise.race([
    Promise.resolve(p),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out")), ms)
    ),
  ]);
}

/** Convert Supabase/Postgrest error (plain object) to Error so catch blocks get a readable message. */
function toError(e: unknown): Error {
  if (e instanceof Error) return e;
  if (e != null && typeof e === "object" && "message" in e) {
    const msg = (e as { message: unknown }).message;
    return new Error(msg != null ? String(msg) : "Request failed");
  }
  return new Error(typeof e === "string" ? e : "Request failed");
}

// Supabase returns snake_case; raw rows may have string or number for numeric/date
type DbRow = Record<string, unknown>;

/** Normalize Supabase response data to an array so we never drop rows due to unexpected shape. */
function toRowArray(data: unknown): DbRow[] {
  if (data == null) return [];
  if (Array.isArray(data)) {
    return data.filter((r): r is DbRow => r != null && typeof r === "object");
  }
  if (typeof data === "object") {
    return Object.values(data).filter((r): r is DbRow => r != null && typeof r === "object");
  }
  return [];
}

function str(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

function mapCustomer(row: DbRow): Customer {
  const c: Customer = {
    id: str(row.id),
    name: str(row.name),
    phone: str(row.phone),
    email: str(row.email),
    address: str(row.address),
    notes: str(row.notes),
    createdAt: str(row.created_at),
  };
  if (row.company_id != null && row.company_id !== "") c.companyId = str(row.company_id);
  return c;
}

function mapTechnician(row: DbRow): Technician {
  const t: Technician = {
    id: str(row.id),
    name: str(row.name),
    phone: str(row.phone),
    email: str(row.email),
    active: row.active === true || str(row.active).toLowerCase() === "true",
    specialty: (str(row.specialty) || "HVAC") as Technician["specialty"],
  };
  if (row.company_id != null && row.company_id !== "") t.companyId = str(row.company_id);
  return t;
}

/** Normalize DB time (e.g. "14:30:00" or "09:00") to "HH:mm" for display/sort. */
function normalizeTime(v: unknown): string | null {
  if (v == null || v === "") return null;
  const s = str(v).trim();
  if (!s) return null;
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?/.exec(s);
  if (match) return `${match[1].padStart(2, "0")}:${match[2]}`;
  return s.slice(0, 5) || null;
}

function mapJob(row: DbRow): Job {
  const price = row.price;
  const numPrice =
    typeof price === "number" && Number.isFinite(price)
      ? price
      : Number(str(price)) || 0;
  const job: Job = {
    id: str(row.id),
    customerId: str(row.customer_id),
    technicianId: row.technician_id != null && row.technician_id !== "" ? str(row.technician_id) : null,
    title: str(row.title),
    description: str(row.description),
    scheduledDate: str(row.scheduled_date),
    scheduledTime: normalizeTime(row.scheduled_time) ?? undefined,
    status: (str(row.status) || "scheduled") as JobStatus,
    price: numPrice,
  };
  if (row.company_id != null && row.company_id !== "") job.companyId = str(row.company_id);
  return job;
}

function num(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return Number(str(v)) || 0;
}

function mapInvoice(row: DbRow): Invoice {
  const inv: Invoice = {
    id: str(row.id),
    jobId: str(row.job_id),
    customerId: str(row.customer_id),
    invoiceNumber: str(row.invoice_number),
    status: (str(row.status) || "draft") as InvoiceStatus,
    subtotal: num(row.subtotal),
    total: num(row.total),
    createdAt: str(row.created_at),
    paidAt: row.paid_at != null && row.paid_at !== "" ? str(row.paid_at) : null,
  };
  if (row.company_id != null && row.company_id !== "") inv.companyId = str(row.company_id);
  return inv;
}

export async function fetchCustomers(): Promise<Customer[]> {
  const { data, error } = await getSupabase()
    .from("customers")
    .select("*")
    .eq("company_id", getCurrentCompanyId())
    .order("created_at", { ascending: false });
  if (error) throw toError(error);
  return toRowArray(data).map(mapCustomer);
}

export async function fetchCustomerById(id: string): Promise<Customer | undefined> {
  const promise = getSupabase()
    .from("customers")
    .select("*")
    .eq("id", id)
    .eq("company_id", getCurrentCompanyId())
    .maybeSingle();
  const { data, error } = await withTimeout(promise, FETCH_TIMEOUT_MS);
  if (error) throw toError(error);
  if (data == null || typeof data !== "object") return undefined;
  return mapCustomer(data as DbRow);
}

export type NewCustomerInput = Pick<Customer, "name" | "phone" | "email"> & {
  address?: string;
  notes?: string;
};

export async function insertCustomer(input: NewCustomerInput): Promise<Customer> {
  const { data, error } = await getSupabase()
    .from("customers")
    .insert({
      company_id: getCurrentCompanyId(),
      name: input.name.trim(),
      phone: input.phone.trim(),
      email: input.email.trim(),
      address: (input.address ?? "").trim(),
      notes: (input.notes ?? "").trim(),
    })
    .select()
    .single();
  if (error) throw toError(error);
  if (data == null || typeof data !== "object") throw new Error("Insert customer did not return row");
  return mapCustomer(data as DbRow);
}

export type CustomerUpdateInput = {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
};

export async function updateCustomer(id: string, input: CustomerUpdateInput): Promise<Customer> {
  const body: Record<string, unknown> = {};
  if (input.name !== undefined) body.name = input.name.trim();
  if (input.phone !== undefined) body.phone = input.phone.trim();
  if (input.email !== undefined) body.email = input.email.trim();
  if (input.address !== undefined) body.address = input.address.trim();
  if (input.notes !== undefined) body.notes = input.notes.trim();
  if (Object.keys(body).length === 0) {
    const existing = await fetchCustomerById(id);
    if (!existing) throw new Error("Customer not found");
    return existing;
  }
  const { data, error } = await getSupabase()
    .from("customers")
    .update(body)
    .eq("id", id)
    .eq("company_id", getCurrentCompanyId())
    .select()
    .single();
  if (error) throw toError(error);
  if (data == null || typeof data !== "object") throw new Error("Update customer did not return row");
  return mapCustomer(data as DbRow);
}

export async function fetchTechnicians(): Promise<Technician[]> {
  const { data, error } = await getSupabase()
    .from("technicians")
    .select("*")
    .eq("company_id", getCurrentCompanyId())
    .order("active", { ascending: false })
    .order("name", { ascending: true });
  if (error) throw toError(error);
  return toRowArray(data).map(mapTechnician);
}

export async function fetchTechnicianById(id: string | null): Promise<Technician | undefined> {
  if (!id) return undefined;
  const promise = getSupabase()
    .from("technicians")
    .select("*")
    .eq("id", id)
    .eq("company_id", getCurrentCompanyId())
    .maybeSingle();
  const { data, error } = await withTimeout(promise, FETCH_TIMEOUT_MS);
  if (error) throw toError(error);
  if (data == null || typeof data !== "object") return undefined;
  return mapTechnician(data as DbRow);
}

export async function fetchJobs(): Promise<Job[]> {
  const { data, error } = await getSupabase()
    .from("jobs")
    .select("*")
    .eq("company_id", getCurrentCompanyId())
    .order("scheduled_date", { ascending: true });
  if (error) throw toError(error);
  return toRowArray(data).map(mapJob);
}

export async function fetchJobById(id: string): Promise<Job | undefined> {
  const promise = getSupabase()
    .from("jobs")
    .select("*")
    .eq("id", id)
    .eq("company_id", getCurrentCompanyId())
    .maybeSingle();
  const { data, error } = await withTimeout(promise, FETCH_TIMEOUT_MS);
  if (error) throw toError(error);
  if (data == null || typeof data !== "object") return undefined;
  return mapJob(data as DbRow);
}

export type NewJobInput = Omit<Job, "id">;

export type JobUpdateInput = {
  scheduledDate?: string;
  scheduledTime?: string | null;
  technicianId?: string | null;
  status?: Job["status"];
  description?: string;
  price?: number;
};

export async function updateJob(id: string, input: JobUpdateInput): Promise<Job> {
  const body: Record<string, unknown> = {};
  if (input.scheduledDate !== undefined) {
    const dateStr = String(input.scheduledDate).trim().slice(0, 10);
    if (dateStr) body.scheduled_date = dateStr;
  }
  if (input.scheduledTime !== undefined) body.scheduled_time = input.scheduledTime || null;
  if (input.technicianId !== undefined) body.technician_id = input.technicianId;
  if (input.status !== undefined) body.status = input.status;
  if (input.description !== undefined) body.description = input.description;
  if (input.price !== undefined) body.price = input.price;
  if (Object.keys(body).length === 0) {
    const existing = await fetchJobById(id);
    if (!existing) throw new Error("Job not found");
    return existing;
  }
  const { data, error } = await getSupabase()
    .from("jobs")
    .update(body)
    .eq("id", id)
    .eq("company_id", getCurrentCompanyId())
    .select()
    .single();
  if (error) throw toError(error);
  if (data == null || typeof data !== "object") throw new Error("Update job did not return row");
  return mapJob(data as DbRow);
}

export async function insertJob(input: NewJobInput): Promise<Job> {
  const row: Record<string, unknown> = {
    company_id: getCurrentCompanyId(),
    customer_id: input.customerId,
    technician_id: input.technicianId,
    title: input.title,
    description: input.description,
    scheduled_date: input.scheduledDate,
    scheduled_time: input.scheduledTime != null && input.scheduledTime !== "" ? input.scheduledTime : null,
    status: input.status,
    price: input.price,
  };
  const { data, error } = await getSupabase()
    .from("jobs")
    .insert(row)
    .select()
    .single();
  if (error) throw toError(error);
  if (data == null || typeof data !== "object") throw new Error("Insert job did not return row");
  return mapJob(data as DbRow);
}

export async function fetchJobCountByCustomer(customerId: string): Promise<number> {
  const promise = getSupabase()
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("company_id", getCurrentCompanyId())
    .eq("customer_id", customerId);
  const { count, error } = await withTimeout(promise, FETCH_TIMEOUT_MS);
  if (error) throw toError(error);
  return count ?? 0;
}

export async function fetchJobsThisWeekByTechnician(technicianId: string): Promise<number> {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().slice(0, 10);
  const promise = getSupabase()
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("company_id", getCurrentCompanyId())
    .eq("technician_id", technicianId)
    .gte("scheduled_date", weekAgoStr)
    .neq("status", "cancelled");
  const { count, error } = await withTimeout(promise, FETCH_TIMEOUT_MS);
  if (error) throw toError(error);
  return count ?? 0;
}

export type NewTechnicianInput = Pick<Technician, "name" | "phone" | "email" | "active" | "specialty">;

export type TechnicianUpdateInput = {
  name?: string;
  phone?: string;
  email?: string;
  active?: boolean;
  specialty?: Technician["specialty"];
};

export async function insertTechnician(input: NewTechnicianInput): Promise<Technician> {
  const { data, error } = await getSupabase()
    .from("technicians")
    .insert({
      company_id: getCurrentCompanyId(),
      name: input.name.trim(),
      phone: input.phone.trim(),
      email: input.email.trim(),
      active: input.active ?? true,
      specialty: (input.specialty || "HVAC") as Technician["specialty"],
    })
    .select()
    .single();
  if (error) throw toError(error);
  if (data == null || typeof data !== "object") throw new Error("Insert technician did not return row");
  return mapTechnician(data as DbRow);
}

export async function updateTechnician(id: string, input: TechnicianUpdateInput): Promise<Technician> {
  const body: Record<string, unknown> = {};
  if (input.name !== undefined) body.name = input.name.trim();
  if (input.phone !== undefined) body.phone = input.phone.trim();
  if (input.email !== undefined) body.email = input.email.trim();
  if (input.active !== undefined) body.active = input.active;
  if (input.specialty !== undefined) body.specialty = input.specialty;
  if (Object.keys(body).length === 0) {
    const existing = await fetchTechnicianById(id);
    if (!existing) throw new Error("Technician not found");
    return existing;
  }
  const { data, error } = await getSupabase()
    .from("technicians")
    .update(body)
    .eq("id", id)
    .eq("company_id", getCurrentCompanyId())
    .select()
    .single();
  if (error) throw toError(error);
  if (data == null || typeof data !== "object") throw new Error("Update technician did not return row");
  return mapTechnician(data as DbRow);
}

// --- Invoices ---

export async function fetchInvoices(): Promise<Invoice[]> {
  const { data, error } = await getSupabase()
    .from("invoices")
    .select("*")
    .eq("company_id", getCurrentCompanyId())
    .order("created_at", { ascending: false });
  if (error) throw toError(error);
  return toRowArray(data).map(mapInvoice);
}

export async function fetchInvoiceById(id: string): Promise<Invoice | undefined> {
  const promise = getSupabase()
    .from("invoices")
    .select("*")
    .eq("id", id)
    .eq("company_id", getCurrentCompanyId())
    .maybeSingle();
  const { data, error } = await withTimeout(promise, FETCH_TIMEOUT_MS);
  if (error) throw toError(error);
  if (data == null || typeof data !== "object") return undefined;
  return mapInvoice(data as DbRow);
}

async function getNextInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const { data, error } = await getSupabase()
    .from("invoices")
    .select("invoice_number")
    .eq("company_id", getCurrentCompanyId())
    .like("invoice_number", `${prefix}%`)
    .order("invoice_number", { ascending: false })
    .limit(1);
  if (error) throw toError(error);
  const rows = toRowArray(data);
  const last = rows[0];
  const lastNum = last ? parseInt(str(last.invoice_number).replace(prefix, ""), 10) : 0;
  const next = (Number.isFinite(lastNum) ? lastNum : 0) + 1;
  return `${prefix}${String(next).padStart(3, "0")}`;
}

export type NewInvoiceInput = {
  jobId: string;
  customerId: string;
  subtotal: number;
  total: number;
  status?: InvoiceStatus;
};

export async function insertInvoice(input: NewInvoiceInput): Promise<Invoice> {
  const invoiceNumber = await getNextInvoiceNumber();
  const { data, error } = await getSupabase()
    .from("invoices")
    .insert({
      company_id: getCurrentCompanyId(),
      job_id: input.jobId,
      customer_id: input.customerId,
      invoice_number: invoiceNumber,
      status: input.status ?? "draft",
      subtotal: input.subtotal,
      total: input.total,
    })
    .select()
    .single();
  if (error) throw toError(error);
  if (data == null || typeof data !== "object") throw new Error("Insert invoice did not return row");
  return mapInvoice(data as DbRow);
}

export type InvoiceUpdateInput = {
  status?: InvoiceStatus;
  subtotal?: number;
  total?: number;
  paidAt?: string | null;
};

export async function updateInvoice(id: string, input: InvoiceUpdateInput): Promise<Invoice> {
  const body: Record<string, unknown> = {};
  if (input.status !== undefined) body.status = input.status;
  if (input.subtotal !== undefined) body.subtotal = input.subtotal;
  if (input.total !== undefined) body.total = input.total;
  if (input.paidAt !== undefined) body.paid_at = input.paidAt;
  if (Object.keys(body).length === 0) {
    const existing = await fetchInvoiceById(id);
    if (!existing) throw new Error("Invoice not found");
    return existing;
  }
  const { data, error } = await getSupabase()
    .from("invoices")
    .update(body)
    .eq("id", id)
    .eq("company_id", getCurrentCompanyId())
    .select()
    .single();
  if (error) throw toError(error);
  if (data == null || typeof data !== "object") throw new Error("Update invoice did not return row");
  return mapInvoice(data as DbRow);
}
