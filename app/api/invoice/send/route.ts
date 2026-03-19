import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  let body: {
    invoiceId?: string;
    accessToken?: string;
    refreshToken?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { invoiceId, accessToken, refreshToken } = body;
  if (!invoiceId || !accessToken || !refreshToken) {
    return NextResponse.json(
      { error: "Missing invoiceId, accessToken, or refreshToken" },
      { status: 400 }
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (!url || !anonKey) {
    return NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 500 }
    );
  }

  const supabase = createClient(url, anonKey);
  const { error: sessionError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (sessionError) {
    return NextResponse.json(
      { error: "Invalid or expired session" },
      { status: 401 }
    );
  }

  const { data: invoiceRow, error: invError } = await supabase
    .from("invoices")
    .select("id, invoice_number, status, total, company_id, job_id, customer_id")
    .eq("id", invoiceId)
    .maybeSingle();

  if (invError || !invoiceRow) {
    return NextResponse.json(
      { error: "Invoice not found or access denied" },
      { status: 404 }
    );
  }

  if (invoiceRow.status !== "draft") {
    return NextResponse.json(
      { error: "Invoice is not in draft status" },
      { status: 400 }
    );
  }

  const [{ data: companyRow }, { data: jobRow }, { data: customerRow }] =
    await Promise.all([
      supabase
        .from("companies")
        .select("name")
        .eq("id", invoiceRow.company_id)
        .maybeSingle(),
      supabase
        .from("jobs")
        .select("title")
        .eq("id", invoiceRow.job_id)
        .maybeSingle(),
      supabase
        .from("customers")
        .select("name, email")
        .eq("id", invoiceRow.customer_id)
        .maybeSingle(),
    ]);

  const companyName =
    companyRow && typeof companyRow === "object" && "name" in companyRow
      ? String(companyRow.name ?? "")
      : "Company";
  const jobTitle =
    jobRow && typeof jobRow === "object" && "title" in jobRow
      ? String(jobRow.title ?? "")
      : "";
  const customerName =
    customerRow && typeof customerRow === "object" && "name" in customerRow
      ? String(customerRow.name ?? "")
      : "Customer";
  const customerEmail =
    customerRow && typeof customerRow === "object" && "email" in customerRow
      ? String(customerRow.email ?? "").trim()
      : "";

  if (!customerEmail) {
    return NextResponse.json(
      { error: "Customer has no email address" },
      { status: 400 }
    );
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    request.headers.get("origin") ||
    "http://localhost:3000";
  const invoiceUrl = `${baseUrl.replace(/\/$/, "")}/invoice/${invoiceId}`;
  const total = Number(invoiceRow.total) || 0;

  if (process.env.RESEND_API_KEY) {
    const { error: emailError } = await resend.emails.send({
      from:
        process.env.RESEND_FROM_EMAIL ?? "Sevora <onboarding@resend.dev>",
      to: customerEmail,
      subject: `Invoice ${invoiceRow.invoice_number} from ${companyName}`,
      html: `
        <p>Hi ${customerName},</p>
        <p>You have received an invoice from ${companyName}.</p>
        <ul>
          <li><strong>Invoice number:</strong> ${invoiceRow.invoice_number}</li>
          <li><strong>Job:</strong> ${jobTitle || "—"}</li>
          <li><strong>Total:</strong> $${total.toLocaleString()}</li>
        </ul>
        <p><a href="${invoiceUrl}">View Invoice →</a></p>
        <p>— ${companyName}</p>
      `,
    });
    if (emailError) {
      return NextResponse.json(
        { error: "Failed to send email", details: String(emailError.message) },
        { status: 500 }
      );
    }
  }

  const { error: updateError } = await supabase
    .from("invoices")
    .update({ status: "sent" })
    .eq("id", invoiceId);

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to update invoice status" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Invoice sent successfully",
  });
}
