import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

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
    .select("id, invoice_number, status, total, company_id, job_id, customer_id, created_at")
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
  const totalAmount = total.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const createdAtRaw =
    invoiceRow && "created_at" in invoiceRow ? (invoiceRow as { created_at?: string | null }).created_at : null;
  let createdAt = "—";
  if (createdAtRaw) {
    const d = new Date(String(createdAtRaw));
    createdAt = Number.isFinite(d.getTime())
      ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : String(createdAtRaw);
  }

  if (process.env.RESEND_API_KEY) {
    const { error: emailError } = await resend.emails.send({
      from:
        process.env.RESEND_FROM_EMAIL ?? "Sevora <onboarding@resend.dev>",
      to: customerEmail,
      subject: `Invoice ${invoiceRow.invoice_number} from ${companyName}`,
      html: `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>New Invoice</title>
  </head>
  <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;padding:24px;">
        <div style="margin-bottom:18px;">
          <div style="font-size:24px;font-weight:800;color:#0f172a;line-height:1.2;">
            ${escapeHtml(companyName)}
          </div>
          <div style="margin-top:6px;font-size:18px;font-weight:700;color:#2563eb;">
            New Invoice
          </div>
        </div>

        <div style="color:#334155;font-size:15px;line-height:1.6;">
          <p style="margin:0 0 12px;">Hi ${escapeHtml(customerName)},</p>
          <p style="margin:0 0 18px;">
            Thanks for choosing ${escapeHtml(companyName)}. Your invoice is ready.
          </p>

          <div style="border:1px solid #e5e7eb;background:#f9fafb;border-radius:12px;padding:16px;margin:18px 0;">
            <div style="margin:0 0 8px;color:#475569;font-size:14px;">
              <div style="margin:0;"><strong style="color:#0f172a;">Invoice #:</strong> ${escapeHtml(invoiceRow.invoice_number)}</div>
              <div style="margin:0;"><strong style="color:#0f172a;">Service:</strong> ${escapeHtml(jobTitle || "—")}</div>
              <div style="margin:0;"><strong style="color:#0f172a;">Date:</strong> ${escapeHtml(createdAt)}</div>
            </div>

            <div style="padding-top:10px;border-top:1px solid #e5e7eb;margin-top:10px;">
              <div style="font-size:13px;color:#64748b;margin-bottom:4px;"><strong>Amount Due</strong></div>
              <div style="font-size:22px;font-weight:900;color:#0f172a;line-height:1.2;">
                $${escapeHtml(totalAmount)}
              </div>
            </div>
          </div>

          <div style="text-align:center;margin:22px 0 10px;">
            <a
              href="${escapeHtml(invoiceUrl)}"
              style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;font-size:14px;"
            >
              View Invoice
            </a>
          </div>

          <p style="margin:18px 0 0;color:#475569;">
            If you have any questions, reply to this email.
          </p>
          <p style="margin:10px 0 0;color:#475569;font-weight:600;">
            ${escapeHtml(companyName)}
          </p>
        </div>
      </div>
    </div>
  </body>
</html>`,
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
