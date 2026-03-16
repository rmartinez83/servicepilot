-- Add optional appointment/scheduled time to jobs (HVAC-style scheduling).
-- Run in Supabase Dashboard → SQL Editor if you see: Could not find the 'scheduled_time' column of 'jobs' in the schema cache
-- After running, restart your dev server so the schema cache refreshes.

ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS scheduled_time time;

COMMENT ON COLUMN public.jobs.scheduled_time IS 'Optional time of day for the appointment (e.g. 09:00 for 9:00 AM).';
