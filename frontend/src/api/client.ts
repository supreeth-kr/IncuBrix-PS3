import { CreateJobPayload, Job, ReplaceScenePayload, Scene, SystemStatus } from "../types/api";

const BASE_URL = "/api/v1";

export async function fetchJobs(statusFilter?: string): Promise<Job[]> {
  const url = statusFilter ? `${BASE_URL}/jobs?status_filter=${statusFilter}` : `${BASE_URL}/jobs`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load jobs");
  return res.json();
}

export async function fetchJob(jobId: string): Promise<Job> {
  const res = await fetch(`${BASE_URL}/jobs/${jobId}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || "Job not found");
  }
  return res.json();
}

export async function createJob(payload: CreateJobPayload, idempotencyKey?: string): Promise<Job> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }

  const res = await fetch(`${BASE_URL}/broll/jobs`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || "Failed to create video job");
  }
  return data;
}

export async function uploadAudioJob(formData: FormData, idempotencyKey?: string): Promise<Job> {
  const headers: Record<string, string> = {};
  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }

  const res = await fetch(`${BASE_URL}/broll/jobs/upload`, {
    method: "POST",
    headers,
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || "Failed to upload audio job");
  }
  return data;
}

export async function fetchScenes(jobId: string): Promise<Scene[]> {
  const res = await fetch(`${BASE_URL}/jobs/${jobId}/scenes`);
  if (!res.ok) throw new Error("Failed to load scenes");
  return res.json();
}

export async function replaceScene(
  jobId: string,
  sceneId: string,
  payload: ReplaceScenePayload
): Promise<Scene> {
  const res = await fetch(`${BASE_URL}/jobs/${jobId}/scenes/${sceneId}/replace`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || "Failed to replace scene");
  }
  return data;
}

export async function fetchReadiness(): Promise<SystemStatus> {
  const res = await fetch("/ready");
  return res.json();
}

export async function deleteJob(jobId: string): Promise<{ message: string; job_id: string; days_remaining: number }> {
  const res = await fetch(`${BASE_URL}/jobs/${jobId}`, {
    method: "DELETE",
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || "Failed to move project to trash");
  }
  return data;
}

export async function restoreJob(jobId: string): Promise<Job> {
  const res = await fetch(`${BASE_URL}/jobs/${jobId}/restore`, {
    method: "POST",
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || "Failed to restore project");
  }
  return data;
}

export async function permanentDeleteJob(jobId: string): Promise<{ message: string; job_id: string }> {
  const res = await fetch(`${BASE_URL}/jobs/${jobId}/permanent`, {
    method: "DELETE",
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || "Failed to permanently delete project");
  }
  return data;
}

export async function fetchTrash(): Promise<Job[]> {
  const res = await fetch(`${BASE_URL}/trash`);
  if (!res.ok) throw new Error("Failed to load trash projects");
  return res.json();
}

export async function emptyTrash(): Promise<{ message: string; purged_count: number }> {
  const res = await fetch(`${BASE_URL}/trash/empty`, {
    method: "POST",
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || "Failed to empty trash");
  }
  return data;
}
