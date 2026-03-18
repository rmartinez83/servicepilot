import { addCustomer, addJob, addTechnician, getCustomers, getJobs, getTechnicians } from "./data";

function toLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Dev/demo-only helper to ensure the schedule has meaningful demo data. */
export async function ensureDemoScheduleData(): Promise<void> {
  if (process.env.NODE_ENV !== "development") return;

  const [technicians, customers, jobs] = await Promise.all([
    getTechnicians(),
    getCustomers(),
    getJobs(),
  ]);

  // Never touch real companies that already have jobs.
  if (jobs.length > 0) return;

  let techs = technicians;
  if (techs.length === 0) {
    techs = [
      await addTechnician({
        name: "HVAC Tech 1",
        phone: "555-0101",
        email: "hvac-tech-1@demo.servicepilot.local",
        active: true,
        specialty: "HVAC",
      }),
      await addTechnician({
        name: "HVAC Tech 2",
        phone: "555-0102",
        email: "hvac-tech-2@demo.servicepilot.local",
        active: true,
        specialty: "HVAC",
      }),
      await addTechnician({
        name: "HVAC Tech 3",
        phone: "555-0103",
        email: "hvac-tech-3@demo.servicepilot.local",
        active: true,
        specialty: "HVAC",
      }),
    ];
  }

  let demoCustomers = customers;
  if (demoCustomers.length === 0) {
    demoCustomers = [
      await addCustomer({
        name: "Acme Manufacturing",
        phone: "555-1000",
        email: "office@acme-demo.local",
        address: "100 Industrial Way",
        notes: "",
      }),
      await addCustomer({
        name: "Sunrise Apartments",
        phone: "555-2000",
        email: "manager@sunrise-demo.local",
        address: "25 Sunrise Blvd",
        notes: "",
      }),
      await addCustomer({
        name: "Downtown Offices",
        phone: "555-3000",
        email: "building@downtown-demo.local",
        address: "300 Main St",
        notes: "",
      }),
    ];
  }

  const today = new Date();
  const todayYmd = toLocalYmd(today);

  // Simple spread: some morning, midday, afternoon jobs so that open slots and "Next Available" are visible.
  const times = ["08:00", "10:00", "13:00", "15:00"];

  const makeJob = async (techIndex: number, customerIndex: number, time: string, title: string) => {
    const tech = techs[techIndex % techs.length];
    const customer = demoCustomers[customerIndex % demoCustomers.length];
    await addJob({
      customerId: customer.id,
      technicianId: tech.id,
      title,
      description: "",
      scheduledDate: todayYmd,
      scheduledTime: time,
      status: "scheduled",
      price: 0,
    });
  };

  await Promise.all([
    makeJob(0, 0, times[0], "Spring maintenance"),
    makeJob(0, 1, times[2], "System diagnostic"),
    makeJob(1, 1, times[1], "Filter replacement"),
    makeJob(1, 2, times[3], "Thermostat check"),
    makeJob(2, 2, times[0], "Rooftop unit inspection"),
  ]);
}

