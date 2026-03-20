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
  useRef,
  type ReactNode,
} from "react";
import { getCurrentCompanyId } from "@/lib/db";

const DEBUG = typeof process !== "undefined" && process.env.NODE_ENV === "development";

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
  const refetchSeq = useRef(0);

  const refetch = useCallback(async () => {
    const seq = ++refetchSeq.current;
    setLoading(true);
    setError(null);
    try {
      if (DEBUG) {
        console.log("[JobsProvider] refetch start", {
          seq,
          currentCompanyId: getCurrentCompanyId(),
        });
      }
      const list = await getJobs();
      if (seq === refetchSeq.current) {
        setJobs(Array.isArray(list) ? list : []);
      }
    } catch (e) {
      const message =
        e instanceof Error ? e.message : typeof e === "string" ? e : "Failed to load jobs";
      if (seq === refetchSeq.current) {
        setError(message);
        setJobs([]);
      }
    } finally {
      if (seq === refetchSeq.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const addJob = useCallback(
    async (input: NewJobInput): Promise<Job> => {
      const job = await insertJob(input);
      if (DEBUG) {
        // Helps confirm the inserted row and tenant company_id we wrote to.
        console.log("[JobsProvider] insertJob ok", {
          currentCompanyId: getCurrentCompanyId(),
          input,
          createdJob: job,
        });
      }
      // Optimistic insert so the list updates immediately even if refetch races.
      setJobs((prev) => {
        const idx = prev.findIndex((j) => j.id === job.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = job;
          return next;
        }
        return [job, ...prev];
      });
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
