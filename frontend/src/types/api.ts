export type JobStatus = "queued" | "running" | "succeeded" | "failed";

export interface ErrorDetail {
  code: string;
  message: string;
  retryable: boolean;
  details?: Record<string, any>;
}

export interface Job {
  job_id: string;
  project_name: string;
  status: JobStatus;
  progress: number;
  stage: string;
  created_at: string;
  completed_at?: string | null;
  aspect_ratios: string[];
  scene_count: number;
  visual_source?: string;
  is_deleted?: boolean;
  deleted_at?: string | null;
  days_remaining?: number | null;
  result_urls: Record<string, string>;
  warnings: string[];
  error?: ErrorDetail | null;
}

export interface Scene {
  id: string;
  scene_index: number;
  narration_text: string;
  start_time: number;
  end_time: number;
  duration: number;
  clip_identifier: string;
  source_provider: string;
  source_url?: string | null;
  thumbnail_url?: string | null;
  license_name: string;
  license_url?: string | null;
  attribution: string;
  commercial_use_status: string;
  rights_verified: boolean;
  ai_generated: boolean;
  selection_reason: string;
  relevance_score?: number | null;
  scoring_method: string;
  visual_hint?: string | null;
  warnings: string[];
}

export interface CreateJobPayload {
  script?: string;
  audio_url?: string;
  voice: string;
  aspect_ratios: string[];
  style: string;
  avoid: string[];
  visual_source?: string;
  captions: {
    burn_in: boolean;
    srt: boolean;
  };
  project_name?: string;
  callback_url?: string;
}

export interface ReplaceScenePayload {
  query?: string;
  visual_hint?: string;
  ai_prompt?: string;
  provider?: string;
  custom_media_url?: string;
  rerender: boolean;
}

export interface SystemStatus {
  status: "ready" | "not_ready";
  checks: {
    database: { status: string; message?: string };
    ffmpeg: { status: string; binary?: string };
    providers: Record<string, string>;
  };
}

export interface AppSettings {
  app_name: string;
  app_version: string;
  ai_image_engine: string;
  gemini_configured: boolean;
  gemini_masked_key?: string | null;
  openai_configured: boolean;
  openai_masked_key?: string | null;
  pexels_configured: boolean;
  pixabay_configured: boolean;
  ffmpeg_binary: string;
}

export interface UpdateSettingsPayload {
  gemini_api_key?: string;
  openai_api_key?: string;
  pexels_api_key?: string;
  pixabay_api_key?: string;
  ai_image_engine?: string;
}
