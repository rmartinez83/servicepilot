"use client";

import type { Job, JobStatus } from "@/lib/models";
import type { JobUpdateInput } from "@/lib/db";
import { getJobs, addJob as insertJob, updateJob as updateJobInDb } from "@/lib/data";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type NewJobInput = Omit<Job, "id">;

interface JobsContextValue {
  jobs: Job[];
  loading: boolean;
  error: string | null;
  addJob: (input: NewJobInput) => Promise<Job>;
  updateJob: (id: string, input: JobUpdateInput) => Promise<Job>;
  refetch: () => Promise<void>;
}

const JobsContext = createContext<JobsContextValue | null>(null);

export function JobsProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await getJobs();
      setJobs(Array.isArray(list) ? list : []);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : typeof e === "string" ? e : "Failed to load jobs";
      setError(message);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const addJob = useCallback(
    async (input: NewJobInput): Promise<Job> => {
      const job = await insertJob(input);
      await refetch();
      return job;
    },
    [refetch]
  );

  const updateJob = useCallback(
    async (id: string, input: JobUpdateInput): Promise<Job> => {
      const job = await updateJobInDb(id, input);
      await refetch();
      return job;
    },
    [refetch]
  );

  const value = useMemo<JobsContextValue>(
    () => ({ jobs, loading, error, addJob, updateJob, refetch }),
    [jobs, loading, error, addJob, updateJob, refetch]
  );

  return <JobsContext.Provider value={value}>{children}</JobsContext.Provider>;
}

export function useJobs() {
  const ctx = useContext(JobsContext);
  if (!ctx) {
    throw new Error("useJobs must be used within JobsProvider");
  }
  return ctx;
}

export const JOB_STATUS_OPTIONS: { value: JobStatus; label: string }[] = [
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];
