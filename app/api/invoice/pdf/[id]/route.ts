import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 50;
const LINE_HEIGHT = 18;
const TITLE_SIZE = 18;
const LABEL_SIZE = 10;
const VALUE_SIZE = 12;

function formatInvoiceDate(createdAt: string): string {
  const s = (createdAt ?? "").trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return createdAt ? s : "—";
  const [y, m, d] = s.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function sanitizeFilename(num: string): string {
  return (num || "invoice").replace(/[^a-zA-Z0-9\-_.]/g, "_");
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id;
  if (!id) {
    return NextResponse.json({ error: "Missing invoice id" }, { status: 400 });
  }

  let body: { accessToken?: string; refreshToken?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { accessToken, refreshToken } = body;
  if (!accessToken || !refreshToken) {
    return NextResponse.json(
      { error: "Missing accessToken or refreshToken" },
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
    .select("id, invoice_number, status, subtotal, total, created_at, company_id, job_id, customer_id")
    .eq("id", id)
    .maybeSingle();

  if (invError || !invoiceRow) {
    return NextResponse.json(
      { error: "Invoice not found or access denied" },
      { status: 404 }
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
        .select("name")
        .eq("id", invoiceRow.customer_id)
        .maybeSingle(),
    ]);

  const companyName =
    companyRow && typeof companyRow === "object" && "name" in companyRow
      ? String(companyRow.name ?? "")
      : "";
  const jobTitle =
    jobRow && typeof jobRow === "object" && "title" in jobRow
      ? String(jobRow.title ?? "")
      : "";
  const customerName =
    customerRow && typeof customerRow === "object" && "name" in customerRow
      ? String(customerRow.name ?? "")
      : "";
  const invoiceNumber = String(invoiceRow.invoice_number ?? "");
  const status = String(invoiceRow.status ?? "").toUpperCase();
  const subtotal = Number(invoiceRow.subtotal) || 0;
  const total = Number(invoiceRow.total) || 0;
  const createdAt = formatInvoiceDate(String(invoiceRow.created_at ?? ""));

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const black = rgb(0, 0, 0);

  let y = PAGE_HEIGHT - MARGIN;

  page.drawText(companyName || "Company", {
    x: MARGIN,
    y,
    size: TITLE_SIZE,
    font: fontBold,
    color: black,
  });
  y -= LINE_HEIGHT;

  page.drawText(`Invoice # ${invoiceNumber}`, {
    x: MARGIN,
    y,
    size: VALUE_SIZE,
    font: font,
    color: black,
  });
  y -= LINE_HEIGHT * 1.5;

  page.drawText("Customer", {
    x: MARGIN,
    y,
    size: LABEL_SIZE,
    font: font,
    color: black,
  });
  y -= LINE_HEIGHT * 0.6;
  page.drawText(customerName || "—", {
    x: MARGIN,
    y,
    size: VALUE_SIZE,
    font: font,
    color: black,
  });
  y -= LINE_HEIGHT * 1.5;

  page.drawText("Job", {
    x: MARGIN,
    y,
    size: LABEL_SIZE,
    font: font,
    color: black,
  });
  y -= LINE_HEIGHT * 0.6;
  page.drawText(jobTitle || "—", {
    x: MARGIN,
    y,
    size: VALUE_SIZE,
    font: font,
    color: black,
  });
  y -= LINE_HEIGHT * 1.5;

  page.drawText("Invoice Date", {
    x: MARGIN,
    y,
    size: LABEL_SIZE,
    font: font,
    color: black,
  });
  y -= LINE_HEIGHT * 0.6;
  page.drawText(createdAt, {
    x: MARGIN,
    y,
    size: VALUE_SIZE,
    font: font,
    color: black,
  });
  y -= LINE_HEIGHT * 1.5;

  page.drawText("Status", {
    x: MARGIN,
    y,
    size: LABEL_SIZE,
    font: font,
    color: black,
  });
  y -= LINE_HEIGHT * 0.6;
  page.drawText(status, {
    x: MARGIN,
    y,
    size: VALUE_SIZE,
    font: font,
    color: black,
  });
  y -= LINE_HEIGHT * 1.5;

  page.drawText("Subtotal", {
    x: MARGIN,
    y,
    size: LABEL_SIZE,
    font: font,
    color: black,
  });
  y -= LINE_HEIGHT * 0.6;
  page.drawText(`$${subtotal.toLocaleString()}`, {
    x: MARGIN,
    y,
    size: VALUE_SIZE,
    font: font,
    color: black,
  });
  y -= LINE_HEIGHT * 1.2;

  page.drawText("Total", {
    x: MARGIN,
    y,
    size: LABEL_SIZE,
    font: fontBold,
    color: black,
  });
  y -= LINE_HEIGHT * 0.6;
  page.drawText(`$${total.toLocaleString()}`, {
    x: MARGIN,
    y,
    size: VALUE_SIZE + 2,
    font: fontBold,
    color: black,
  });

  const pdfBytes = await doc.save();
  const filename = `${sanitizeFilename(invoiceNumber)}.pdf`;

  return new Response(new Blob([pdfBytes as BlobPart]), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
