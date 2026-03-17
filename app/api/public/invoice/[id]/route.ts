import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

export type PublicInvoicePayload = {
  companyName: string;
  invoiceNumber: string;
  jobTitle: string;
  customerName: string;
  total: number;
  status: string;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing invoice id" }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  const { data: invoiceRow, error: invError } = await supabase
    .from("invoices")
    .select(
      "id, invoice_number, status, total, company_id, job_id, customer_id, companies(name), jobs(title), customers(name)"
    )
    .eq("id", id)
    .maybeSingle();

  if (invError) {
    return NextResponse.json({ error: invError.message }, { status: 500 });
  }
  if (!invoiceRow || typeof invoiceRow !== "object") {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const companies = invoiceRow.companies as { name?: string } | null | undefined;
  const jobs = invoiceRow.jobs as { title?: string } | null | undefined;
  const customers = invoiceRow.customers as { name?: string } | null | undefined;

  const payload: PublicInvoicePayload = {
    companyName:
      companies && typeof companies === "object" && "name" in companies
        ? String(companies.name ?? "")
        : "",
    invoiceNumber: String(invoiceRow.invoice_number ?? ""),
    jobTitle:
      jobs && typeof jobs === "object" && "title" in jobs
        ? String(jobs.title ?? "")
        : "",
    customerName:
      customers && typeof customers === "object" && "name" in customers
        ? String(customers.name ?? "")
        : "",
    total: Number(invoiceRow.total) || 0,
    status: String(invoiceRow.status ?? ""),
  };

  return NextResponse.json(payload);
}
