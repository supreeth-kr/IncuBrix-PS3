import React, { useEffect, useState } from "react";
import { Clock, RefreshCw, AlertCircle, CheckCircle2, Film, Mic, Sparkles, Layers } from "lucide-react";
import { Job } from "../types/api";

interface ProcessingScreenProps {
  job: Job;
  onRefresh: () => void;
  onComplete: () => void;
  onCancel: () => void;
}

const STAGE_LABELS: Record<string, { label: string; desc: string }> = {
  queued: { label: "Job Queued", desc: "Waiting for background worker slot..." },
  preparing_audio: { label: "Audio & Speech Synthesis", desc: "Synthesizing neural speech narration and measuring timing..." },
  segmenting_scenes: { label: "Semantic Scene Segmentation", desc: "Dividing narration at natural clause boundaries and calculating scene durations..." },
  sourcing_footage: { label: "Footage Discovery & Licensing", desc: "Searching licensed video clips and synthesizing motion graphic cards..." },
  generating_captions: { label: "Subtitle Synchronization", desc: "Generating and formatting SubRip (.srt) caption timeline..." },
  rendering_video: { label: "FFmpeg Video Rendering", desc: "Scaling, cropping, encoding H.264 video at 30fps and syncing AAC audio..." },
  building_manifest: { label: "Validating Manifest & Outputs", desc: "Inspecting completed MP4 streams with FFprobe and building audit manifest..." },
  completed: { label: "Render Complete", desc: "All video formats, captions, and licensing manifests are ready." },
  failed: { label: "Processing Failed", desc: "An error interrupted the video generation pipeline." },
};

export const ProcessingScreen: React.FC<ProcessingScreenProps> = ({
  job,
  onRefresh,
  onComplete,
  onCancel,
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (job.status === "succeeded") {
      onComplete();
    }
  }, [job.status, onComplete]);

  const stageInfo = STAGE_LABELS[job.stage] || {
    label: job.stage.replace(/_/g, " "),
    desc: "Engine is processing your video assets...",
  };

  const formatElapsed = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 animate-fadeIn">
      <div className="p-8 rounded-3xl bg-surface-900 border border-surface-800 shadow-2xl space-y-8 text-center">
        {/* Animated Status Icon */}
        <div className="relative w-20 h-20 mx-auto">
          {job.status === "failed" ? (
            <div className="w-20 h-20 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <AlertCircle className="w-10 h-10" />
            </div>
          ) : job.status === "succeeded" ? (
            <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-10 h-10" />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-surface-850 border border-surface-700 flex items-center justify-center text-accent-lime shadow-glow">
              <RefreshCw className="w-9 h-9 animate-spin" />
            </div>
          )}
        </div>

        {/* Title and Description */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {job.project_name}
          </h2>
          <p className="text-sm font-semibold text-accent-lime">
            {stageInfo.label}
          </p>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            {stageInfo.desc}
          </p>
        </div>

        {/* Real Progress Bar */}
        <div className="space-y-2 max-w-md mx-auto">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>Overall Progress</span>
            <span className="font-bold text-white">{job.progress}%</span>
          </div>
          <div className="w-full h-2.5 bg-surface-950 border border-surface-800 rounded-full overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${
                job.status === "failed" ? "bg-rose-500" : "bg-accent-lime shadow-glow"
              }`}
              style={{ width: `${Math.max(5, job.progress)}%` }}
            />
          </div>
        </div>

        {/* Pipeline Stages Mini Tracker */}
        <div className="grid grid-cols-4 gap-2 pt-4 border-t border-surface-800 text-[11px] font-mono text-slate-400">
          <div className={`p-2 rounded-xl border ${["preparing_audio", "segmenting_scenes", "sourcing_footage", "rendering_video", "building_manifest", "completed"].includes(job.stage) ? "bg-surface-850 border-accent-lime/40 text-slate-200" : "bg-surface-950 border-surface-800 text-slate-600"}`}>
            Audio & Speech
          </div>
          <div className={`p-2 rounded-xl border ${["segmenting_scenes", "sourcing_footage", "rendering_video", "building_manifest", "completed"].includes(job.stage) ? "bg-surface-850 border-accent-lime/40 text-slate-200" : "bg-surface-950 border-surface-800 text-slate-600"}`}>
            Scenes
          </div>
          <div className={`p-2 rounded-xl border ${["sourcing_footage", "rendering_video", "building_manifest", "completed"].includes(job.stage) ? "bg-surface-850 border-accent-lime/40 text-slate-200" : "bg-surface-950 border-surface-800 text-slate-600"}`}>
            Footage
          </div>
          <div className={`p-2 rounded-xl border ${["rendering_video", "building_manifest", "completed"].includes(job.stage) ? "bg-surface-850 border-accent-lime/40 text-slate-200" : "bg-surface-950 border-surface-800 text-slate-600"}`}>
            FFmpeg Render
          </div>
        </div>

        {/* Elapsed Timer & Job ID */}
        <div className="flex items-center justify-between text-xs font-mono text-slate-500 px-2">
          <span>Job ID: {job.job_id.slice(0, 12)}...</span>
          <span className="flex items-center space-x-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Elapsed: {formatElapsed(elapsedSeconds)}</span>
          </span>
        </div>

        {/* Error Card if failed */}
        {job.status === "failed" && job.error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-left space-y-1">
            <div className="flex items-center space-x-2 text-rose-400 font-semibold text-xs">
              <AlertCircle className="w-4 h-4" />
              <span>Error Code: {job.error.code}</span>
            </div>
            <p className="text-xs text-rose-300">{job.error.message}</p>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-center space-x-4 pt-2">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl bg-surface-850 hover:bg-surface-800 border border-surface-700 text-slate-300 text-xs font-medium transition"
          >
            Back to Dashboard
          </button>
          <button
            onClick={onRefresh}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-surface-800 hover:bg-surface-700 border border-surface-700 text-white text-xs font-medium transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Check Status</span>
          </button>
        </div>
      </div>
    </div>
  );
};
