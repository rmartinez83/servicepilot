-- ServicePilot Phase 1 seed: customers, technicians, jobs
-- Run AFTER schema.sql and phase1-multitenant.sql in Supabase SQL Editor.
-- Uses fixed UUIDs and default company_id for multi-tenant Phase 1.

-- Customers (8 rows) – IDs: 10000000-0000-4000-8000-000000000001 … 00000008
insert into public.customers (id, company_id, name, phone, email, address, notes, created_at) values
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'Mitchell Residence', '(555) 234-5678', 'j.mitchell@email.com', '142 Oak Street, Riverside, CA 92501', 'Prefers morning appointments. Dog in backyard.', '2023-01-15'),
  ('10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', 'Riverside Dental Associates', '(555) 345-6789', 'office@riversidedental.com', '890 Commerce Blvd, Suite 200, Riverside, CA 92507', 'Commercial account. After-hours service preferred.', '2023-02-20'),
  ('10000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001', 'Greenfield Apartments', '(555) 456-7890', 'mgmt@greenfieldapts.com', '2100 Greenfield Lane, Riverside, CA 92503', 'Property management. 48 units. Maintenance contract.', '2023-03-10'),
  ('10000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000001', 'Summit Office Park', '(555) 567-8901', 'facilities@summitoffice.com', '500 Summit Drive, Riverside, CA 92506', 'Multi-tenant office building. HVAC quarterly maintenance.', '2023-04-05'),
  ('10000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000001', 'Lakeview Condos HOA', '(555) 678-9012', 'board@lakeviewhoa.com', '1200 Lakeshore Blvd, Riverside, CA 92508', 'HOA account. Pool and common area maintenance.', '2023-05-12'),
  ('10000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000001', 'Maria Santos', '(555) 789-0123', 'maria.santos@email.com', '85 Maple Ave, Apt 4B, Riverside, CA 92501', 'New customer. Replaced water heater in 2024.', '2024-08-22'),
  ('10000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-000000000001', 'Downtown Fitness Center', '(555) 890-1234', 'maintenance@downtownfit.com', '301 Main Street, Riverside, CA 92501', 'High-usage HVAC in gym areas. Monthly filter changes.', '2023-06-18'),
  ('10000000-0000-4000-8000-000000000008', '00000000-0000-4000-8000-000000000001', 'Thompson Family', '(555) 901-2345', 'david.thompson@email.com', '77 Elm Drive, Riverside, CA 92504', 'Residential. Electrical panel upgrade completed.', '2023-09-05')
on conflict (id) do nothing;

-- Technicians (5 rows) – IDs: 20000000-0000-4000-8000-000000000001 … 00000005
insert into public.technicians (id, company_id, name, phone, email, active, specialty) values
  ('20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'Mike Torres', '(555) 111-2222', 'mike.torres@servicepilot.com', true, 'HVAC'),
  ('20000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', 'Sarah Chen', '(555) 222-3333', 'sarah.chen@servicepilot.com', true, 'Plumbing'),
  ('20000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001', 'James Wilson', '(555) 333-4444', 'james.wilson@servicepilot.com', true, 'Electrical'),
  ('20000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000001', 'David Park', '(555) 444-5555', 'david.park@servicepilot.com', true, 'Electrical'),
  ('20000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000001', 'Emily Rodriguez', '(555) 555-6666', 'emily.rodriguez@servicepilot.com', false, 'HVAC')
on conflict (id) do nothing;

-- Jobs (10 rows) – references customer_id and technician_id above
insert into public.jobs (id, company_id, customer_id, technician_id, title, description, scheduled_date, status, price) values
  ('30000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'AC Unit Not Cooling', 'Central air conditioner blowing warm air. Check refrigerant and compressor.', '2025-03-09', 'in_progress', 425),
  ('30000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'Bathroom Sink Leak', 'Leak under staff bathroom sink. Possibly drain or supply line.', '2025-03-09', 'scheduled', 185),
  ('30000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000003', 'Unit 12 Electrical Panel', 'Tenant reporting flickering lights. Inspect and repair panel.', '2025-03-08', 'completed', 320),
  ('30000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000001', 'Quarterly HVAC Maintenance', 'Routine maintenance: filters, coils, thermostat check.', '2025-03-08', 'completed', 285),
  ('30000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000005', null, 'Pool Pump Motor Repair', 'Pool pump not starting. Suspected motor failure.', '2025-03-07', 'cancelled', 650),
  ('30000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000004', 'Outlet Not Working', 'Living room outlet dead. Check breaker and wiring.', '2025-03-07', 'completed', 145),
  ('30000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000007', '20000000-0000-4000-8000-000000000001', 'Gym HVAC Repair', 'Main gym unit cycling on/off. Possible capacitor or compressor issue.', '2025-03-06', 'completed', 890),
  ('30000000-0000-4000-8000-000000000008', '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'Water Heater Inspection', 'Annual inspection. Check anode rod and temperature settings.', '2025-03-10', 'scheduled', 95),
  ('30000000-0000-4000-8000-000000000009', '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000003', 'Common Area Lighting', 'Replace faulty ballasts in hallway fluorescent fixtures.', '2025-03-11', 'scheduled', 420),
  ('30000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Thermostat Upgrade', 'Install programmable smart thermostat.', '2025-03-12', 'scheduled', 275)
on conflict (id) do nothing;
