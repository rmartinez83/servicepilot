export type JobStatus = "scheduled" | "in_progress" | "completed" | "cancelled";
export type InvoiceStatus = "draft" | "sent" | "paid";
export type Specialty = "HVAC" | "Plumbing" | "Electrical" | "Cleaning" | "Landscaping";

export interface Customer {
  id: string;
  companyId?: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  createdAt: string;
}

export interface Technician {
  id: string;
  companyId?: string;
  name: string;
  phone: string;
  email: string;
  active: boolean;
  specialty: Specialty;
}

export interface Job {
  id: string;
  companyId?: string;
  customerId: string;
  technicianId: string | null;
  title: string;
  description: string;
  scheduledDate: string;
  /** Time of day (e.g. "14:30" or "09:00") when present from DB. */
  scheduledTime?: string | null;
  status: JobStatus;
  price: number;
  /** Set when job is fetched with customer join. */
  customerName?: string;
  customerPhone?: string;
  /** Set when job is fetched with technician join. */
  technicianName?: string | null;
}

export interface Invoice {
  id: string;
  companyId?: string;
  jobId: string;
  customerId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  subtotal: number;
  total: number;
  createdAt: string;
  paidAt: string | null;
}
