import React, { useState } from "react";
import { Download, Film, FileText, CheckCircle2, Sliders } from "lucide-react";
import { Job, Scene } from "../types/api";

interface ResultsScreenProps {
  job: Job;
  scenes: Scene[];
  onNavigateToEditor: () => void;
  onNavigateToDashboard: () => void;
}

export const ResultsScreen: React.FC<ResultsScreenProps> = ({
  job,
  scenes,
  onNavigateToEditor,
  onNavigateToDashboard,
}) => {
  const [activeAspect, setActiveAspect] = useState<string>(job.aspect_ratios[0] || "16:9");

  const videoFileName = activeAspect === "9:16" ? "video_9x16.mp4" : (activeAspect === "1:1" ? "video_1x1.mp4" : "video_16x9.mp4");
  const videoSrc = `/api/v1/jobs/${job.job_id}/downloads/${videoFileName}`;

  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl mx-auto py-2">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-surface-800">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Rendering Succeeded &bull; Verified 30fps H.264</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {job.project_name}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Job ID: <span className="font-mono text-slate-300">{job.job_id}</span> &bull; Completed {job.completed_at ? new Date(job.completed_at).toLocaleTimeString() : "Just now"}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onNavigateToEditor}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-surface-850 hover:bg-surface-800 border border-surface-700 text-slate-200 text-xs font-medium transition"
          >
            <Sliders className="w-4 h-4 text-accent-cyan" />
            <span>Scene Editor</span>
          </button>

          <button
            onClick={onNavigateToDashboard}
            className="px-4 py-2.5 rounded-xl bg-surface-800 hover:bg-surface-700 border border-surface-700 text-slate-300 text-xs font-medium transition"
          >
            Dashboard
          </button>
        </div>
      </div>

      {/* Main Showcase: Left Player, Right Downloads & Formats */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Player & Aspect Switcher */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Interactive Video Preview
            </span>
            <div className="flex p-1 bg-surface-900 border border-surface-800 rounded-lg text-xs font-medium">
              {job.aspect_ratios.map((ratio) => (
                <button
                  key={ratio}
                  onClick={() => setActiveAspect(ratio)}
                  className={`px-3 py-1 rounded transition ${
                    activeAspect === ratio
                      ? "bg-surface-800 text-white font-semibold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {ratio}
                </button>
              ))}
            </div>
          </div>

          {/* Video Player */}
          <div className="rounded-2xl overflow-hidden bg-black border border-surface-800 shadow-2xl flex items-center justify-center aspect-video">
            <video
              key={videoSrc}
              controls
              playsInline
              className="w-full h-full object-contain"
            >
              <source src={videoSrc} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>

          <p className="text-xs text-slate-400 text-center">
            Broadcasting in 1080p-class dimensions with normalized audio sync and burned-in subtitles.
          </p>
        </div>

        {/* Right Column: Download Deliverables */}
        <div className="lg:col-span-5 space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Export Deliverables & Manifests
          </h3>

          <div className="p-5 rounded-2xl bg-surface-900 border border-surface-800 shadow-card space-y-4">
            {/* Video File Downloads */}
            <div className="space-y-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500">
                Rendered MP4 Videos
              </span>
              {job.aspect_ratios.map((ratio) => {
                const fname = ratio === "9:16" ? "video_9x16.mp4" : (ratio === "1:1" ? "video_1x1.mp4" : "video_16x9.mp4");
                const dlUrl = `/api/v1/jobs/${job.job_id}/downloads/${fname}`;
                return (
                  <a
                    key={ratio}
                    href={dlUrl}
                    download={fname}
                    className="flex items-center justify-between p-3 rounded-xl bg-surface-950 border border-surface-800 hover:border-accent-lime text-xs transition group"
                  >
                    <div className="flex items-center space-x-2.5">
                      <Film className="w-4 h-4 text-accent-lime" />
                      <div>
                        <p className="font-semibold text-white group-hover:text-accent-lime transition">{fname}</p>
                        <p className="text-[10px] text-slate-400 font-mono">Format: {ratio} &bull; 30 fps H.264</p>
                      </div>
                    </div>
                    <Download className="w-4 h-4 text-slate-400 group-hover:text-accent-lime transition" />
                  </a>
                );
              })}
            </div>

            {/* Captions and Data Exports */}
            <div className="space-y-2 pt-2 border-t border-surface-800">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500">
                Data & Subtitles
              </span>

              <a
                href={`/api/v1/jobs/${job.job_id}/captions`}
                download="captions.srt"
                className="flex items-center justify-between p-3 rounded-xl bg-surface-950 border border-surface-800 hover:border-accent-cyan text-xs transition group"
              >
                <div className="flex items-center space-x-2.5">
                  <FileText className="w-4 h-4 text-accent-cyan" />
                  <div>
                    <p className="font-semibold text-white group-hover:text-accent-cyan transition">captions.srt</p>
                    <p className="text-[10px] text-slate-400 font-mono">SubRip sequential subtitle format</p>
                  </div>
                </div>
                <Download className="w-4 h-4 text-slate-400 group-hover:text-accent-cyan transition" />
              </a>

              <a
                href={`/api/v1/jobs/${job.job_id}/timeline`}
                download="timeline.json"
                className="flex items-center justify-between p-3 rounded-xl bg-surface-950 border border-surface-800 hover:border-accent-coral text-xs transition group"
              >
                <div className="flex items-center space-x-2.5">
                  <FileText className="w-4 h-4 text-accent-coral" />
                  <div>
                    <p className="font-semibold text-white group-hover:text-accent-coral transition">timeline.json</p>
                    <p className="text-[10px] text-slate-400 font-mono">Detailed per-scene timings and footage metadata</p>
                  </div>
                </div>
                <Download className="w-4 h-4 text-slate-400 group-hover:text-accent-coral transition" />
              </a>

              <a
                href={`/api/v1/jobs/${job.job_id}/manifest`}
                download="manifest.json"
                className="flex items-center justify-between p-3 rounded-xl bg-surface-950 border border-surface-800 hover:border-accent-lime text-xs transition group"
              >
                <div className="flex items-center space-x-2.5">
                  <FileText className="w-4 h-4 text-accent-lime" />
                  <div>
                    <p className="font-semibold text-white group-hover:text-accent-lime transition">manifest.json</p>
                    <p className="text-[10px] text-slate-400 font-mono">Audit manifest, models, timings, cost & licenses</p>
                  </div>
                </div>
                <Download className="w-4 h-4 text-slate-400 group-hover:text-accent-lime transition" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
