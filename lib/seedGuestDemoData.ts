import { getSupabase } from "@/lib/supabase/client";
import { getCurrentUserPrimaryCompany, getSession } from "@/lib/auth";

const GUEST_EMAIL = "guest@gmail.com";
const GUEST_COMPANY_NAME = "Guest Account";

type SeedSummary = {
  createdCustomers: number;
  createdTechnicians: number;
  createdJobs: number;
  dateStart: string;
  dateEnd: string;
};

function toLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export async function seedGuestDemoData(): Promise<SeedSummary> {
  if (typeof window === "undefined") {
    throw new Error("seedGuestDemoData must be called from the client.");
  }

  const { data } = await getSession();
  const userEmail = (data.session?.user?.email ?? "").trim().toLowerCase();
  if (!userEmail) throw new Error("No authenticated user.");

  const { companyId } = await getCurrentUserPrimaryCompany();
  if (!companyId) throw new Error("No company membership found for this user.");

  const supabase = getSupabase();
  const { data: companyRow, error: companyErr } = await supabase
    .from("companies")
    .select("id, name")
    .eq("id", companyId)
    .maybeSingle();
  if (companyErr) throw new Error(companyErr.message);

  const companyName = (companyRow?.name ?? "").trim();

  const allowed =
    userEmail === GUEST_EMAIL || companyName.toLowerCase() === GUEST_COMPANY_NAME.toLowerCase();
  if (!allowed) {
    throw new Error("Seeding is restricted to the Guest demo account.");
  }

  // --- Customers (Florida-based) ---
  const demoCustomers = [
    {
      name: "Sofia Martinez",
      phone: "(305) 555-0182",
      email: "sofia.martinez.guest@sevora-demo.local",
      address: "1201 Brickell Ave, Miami, FL 33131",
    },
    {
      name: "Ethan Reynolds",
      phone: "(786) 555-0147",
      email: "ethan.reynolds.guest@sevora-demo.local",
      address: "8850 SW 132nd St, Kendall, FL 33176",
    },
    {
      name: "Mia Alvarez",
      phone: "(305) 555-0129",
      email: "mia.alvarez.guest@sevora-demo.local",
      address: "8550 NW 53rd St, Doral, FL 33166",
    },
    {
      name: "Noah Peterson",
      phone: "(954) 555-0164",
      email: "noah.peterson.guest@sevora-demo.local",
      address: "401 E Las Olas Blvd, Fort Lauderdale, FL 33301",
    },
    {
      name: "Olivia Carter",
      phone: "(407) 555-0191",
      email: "olivia.carter.guest@sevora-demo.local",
      address: "8001 S Orange Blossom Trail, Orlando, FL 32809",
    },
  ] as const;

  const { data: existingCustomers, error: existingCustomersErr } = await supabase
    .from("customers")
    .select("id, email")
    .eq("company_id", companyId);
  if (existingCustomersErr) throw new Error(existingCustomersErr.message);

  const existingCustomerByEmail = new Map(
    (existingCustomers ?? []).map((c: any) => [String(c.email).trim().toLowerCase(), String(c.id)])
  );

  let createdCustomers = 0;
  const customerIds: string[] = [];
  for (const c of demoCustomers) {
    const key = c.email.trim().toLowerCase();
    const existingId = existingCustomerByEmail.get(key);
    if (existingId) {
      customerIds.push(existingId);
      continue;
    }
    const { data: inserted, error } = await supabase
      .from("customers")
      .insert({
        company_id: companyId,
        name: c.name,
        phone: c.phone,
        email: c.email,
        address: c.address,
        notes: "",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    createdCustomers++;
    customerIds.push(String((inserted as any).id));
  }

  // --- Technicians (Florida) ---
  const demoTechnicians = [
    { name: "Carlos Ramirez", phone: "(305) 555-0110", email: "carlos.ramirez@sevora-demo.local", specialty: "HVAC" },
    { name: "Mike Johnson", phone: "(813) 555-0133", email: "mike.johnson@sevora-demo.local", specialty: "HVAC" },
    { name: "Luis Perez", phone: "(561) 555-0155", email: "luis.perez@sevora-demo.local", specialty: "HVAC" },
  ] as const;

  const { data: existingTechs, error: existingTechsErr } = await supabase
    .from("technicians")
    .select("id, email")
    .eq("company_id", companyId);
  if (existingTechsErr) throw new Error(existingTechsErr.message);

  const existingTechByEmail = new Map(
    (existingTechs ?? []).map((t: any) => [String(t.email).trim().toLowerCase(), String(t.id)])
  );

  let createdTechnicians = 0;
  const techIds: string[] = [];
  for (const t of demoTechnicians) {
    const key = t.email.trim().toLowerCase();
    const existingId = existingTechByEmail.get(key);
    if (existingId) {
      techIds.push(existingId);
      continue;
    }
    const { data: inserted, error } = await supabase
      .from("technicians")
      .insert({
        company_id: companyId,
        name: t.name,
        phone: t.phone,
        email: t.email,
        active: true,
        specialty: t.specialty,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    createdTechnicians++;
    techIds.push(String((inserted as any).id));
  }

  const now = new Date();
  const start = toLocalYmd(now);
  const end = toLocalYmd(addDays(now, 13));

  // Avoid duplicating aggressively: if there are already jobs in the demo window, do not seed more.
  const { count: existingJobsCount, error: existingJobsErr } = await supabase
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .gte("scheduled_date", start)
    .lte("scheduled_date", end);
  if (existingJobsErr) throw new Error(existingJobsErr.message);

  if ((existingJobsCount ?? 0) > 0) {
    return { createdCustomers, createdTechnicians, createdJobs: 0, dateStart: start, dateEnd: end };
  }

  const slotTimes = ["08:00", "10:00", "13:00", "15:00"];
  const jobTypes = ["Service call", "Maintenance", "Install", "Diagnostic", "Estimate"];

  let createdJobs = 0;
  for (let day = 0; day < 14; day++) {
    const date = addDays(now, day);
    const ymd = toLocalYmd(date);
    const rng = mulberry32(hashStr(`${companyId}:${ymd}`));

    // Some days busier than others: 1–3 jobs per tech, but leave open slots.
    for (let techIdx = 0; techIdx < techIds.length; techIdx++) {
      const jobsTodayForTech = rng() < 0.25 ? 0 : rng() < 0.7 ? 1 : 2; // 0,1,2
      if (jobsTodayForTech === 0) continue;

      const usedSlots = new Set<number>();
      for (let j = 0; j < jobsTodayForTech; j++) {
        // Pick a random slot index that isn't used yet (leave at least one open most days).
        let slotIndex = Math.floor(rng() * slotTimes.length);
        let guard = 0;
        while (usedSlots.has(slotIndex) && guard < 10) {
          slotIndex = (slotIndex + 1) % slotTimes.length;
          guard++;
        }
        usedSlots.add(slotIndex);

        const customerIndex = Math.floor(rng() * customerIds.length);
        const typeIndex = Math.floor(rng() * jobTypes.length);
        const title = jobTypes[typeIndex];

        const { error } = await supabase.from("jobs").insert({
          company_id: companyId,
          customer_id: customerIds[customerIndex],
          technician_id: techIds[techIdx],
          title,
          description: "",
          scheduled_date: ymd,
          scheduled_time: slotTimes[slotIndex],
          status: "scheduled",
          price: 0,
        });
        if (error) throw new Error(error.message);
        createdJobs++;
      }
    }
  }

  return { createdCustomers, createdTechnicians, createdJobs, dateStart: start, dateEnd: end };
}

