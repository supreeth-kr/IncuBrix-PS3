import React, { useState } from "react";
import { PlusCircle, Search, Film, Clock, Layers, Sparkles, AlertCircle, CheckCircle2, Play } from "lucide-react";
import { Job } from "../types/api";

interface DashboardScreenProps {
  jobs: Job[];
  loading: boolean;
  onSelectJob: (job: Job, targetScreen?: "editor" | "results") => void;
  onCreateNew: () => void;
  onRefresh: () => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  jobs,
  loading,
  onSelectJob,
  onCreateNew,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "name">("newest");

  // Filtering & Search
  const filteredJobs = jobs
    .filter((j) => {
      const matchesSearch =
        j.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        j.job_id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || j.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === "name") {
        return a.project_name.localeCompare(b.project_name);
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "succeeded":
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            <span>Ready</span>
          </span>
        );
      case "running":
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            <span>Processing</span>
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertCircle className="w-3 h-3" />
            <span>Failed</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3" />
            <span>Queued</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner / Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-surface-900 via-surface-850 to-surface-900 border border-surface-800 p-6 sm:p-8">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-surface-800 border border-surface-700 text-xs font-medium text-slate-300 mb-4">
            <Sparkles className="w-3.5 h-3.5 text-accent-lime" />
            <span>Commercial Creative Video Suite</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
            Transform Narration & Scripts Into Polished B-Roll Videos
          </h1>
          <p className="text-sm text-slate-400 mb-6 leading-relaxed">
            Neural speech synthesis, sentence timing segmentation, licensed footage discovery, and multi-format MP4 video rendering with captions.
          </p>
          <div className="flex items-center space-x-3">
            <button
              onClick={onCreateNew}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-accent-lime hover:bg-accent-limeHover text-surface-950 font-semibold text-sm transition shadow-glow"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create New Video</span>
            </button>
            <button
              onClick={onRefresh}
              className="px-4 py-2.5 rounded-xl bg-surface-800 hover:bg-surface-700 border border-surface-700 text-slate-200 text-sm font-medium transition"
            >
              Refresh Library
            </button>
          </div>
        </div>
        {/* Subtle decorative glow */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-96 h-96 bg-accent-lime/5 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Toolbar & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-surface-900/60 p-4 rounded-xl border border-surface-800">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search projects by title or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-surface-950 border border-surface-800 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:border-accent-lime transition"
          />
        </div>

        <div className="flex items-center space-x-2">
          {/* Status filter tabs */}
          <div className="flex p-1 bg-surface-950 border border-surface-800 rounded-lg text-xs font-medium text-slate-400">
            {["all", "succeeded", "running", "failed"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 rounded-md capitalize transition ${
                  statusFilter === status
                    ? "bg-surface-800 text-white font-semibold"
                    : "hover:text-slate-200"
                }`}
              >
                {status === "succeeded" ? "Ready" : status}
              </button>
            ))}
          </div>

          {/* Sort dropdown */}
          <select
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value)}
            className="px-3 py-1.5 bg-surface-950 border border-surface-800 rounded-lg text-xs font-medium text-slate-300 focus:border-accent-lime transition"
          >
            <option value="newest">Sort: Newest First</option>
            <option value="name">Sort: Project Title</option>
          </select>
        </div>
      </div>

      {/* Project Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 rounded-xl bg-surface-900/50 border border-surface-800 animate-pulse p-5" />
          ))}
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-2xl bg-surface-900/40 border border-dashed border-surface-800">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-surface-850 flex items-center justify-center text-slate-500">
            <Film className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">No video projects found</h3>
          <p className="text-sm text-slate-400 max-w-sm mx-auto mb-6">
            {searchQuery
              ? "No projects matched your search criteria. Try a different query."
              : "Create your first AI-generated B-roll video project from a script or voiceover."}
          </p>
          <button
            onClick={onCreateNew}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-accent-lime text-surface-950 font-semibold text-sm transition hover:bg-accent-limeHover shadow-glow"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create First Video</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredJobs.map((job) => (
            <div
              key={job.job_id}
              onClick={() => onSelectJob(job, job.status === "succeeded" ? "results" : "editor")}
              className="group relative flex flex-col justify-between bg-surface-900 hover:bg-surface-850 border border-surface-800 hover:border-surface-700 rounded-2xl p-5 transition-all duration-200 cursor-pointer shadow-card hover:shadow-xl"
            >
              <div>
                {/* Header: Status and ID */}
                <div className="flex items-center justify-between mb-3">
                  {getStatusBadge(job.status)}
                  <span className="text-[11px] font-mono text-slate-500">
                    {new Date(job.created_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                {/* Title */}
                <h3 className="font-semibold text-base text-white group-hover:text-accent-lime transition line-clamp-1 mb-2">
                  {job.project_name}
                </h3>

                {/* Progress bar if running */}
                {job.status === "running" && (
                  <div className="space-y-1.5 my-3">
                    <div className="flex justify-between text-xs font-mono text-slate-400">
                      <span className="capitalize">{job.stage.replace(/_/g, " ")}</span>
                      <span>{job.progress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-surface-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent-lime transition-all duration-500 rounded-full"
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Metadata badges */}
                <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-surface-800/80 text-xs text-slate-400">
                  <div className="flex items-center space-x-1 bg-surface-950 px-2.5 py-1 rounded-md border border-surface-800">
                    <Layers className="w-3.5 h-3.5 text-accent-cyan" />
                    <span>{job.scene_count || 1} scenes</span>
                  </div>

                  <div className="flex items-center space-x-1 bg-surface-950 px-2.5 py-1 rounded-md border border-surface-800">
                    <Film className="w-3.5 h-3.5 text-accent-lime" />
                    <span>{job.aspect_ratios.join(", ")}</span>
                  </div>
                </div>
              </div>

              {/* Action Footer */}
              <div className="mt-5 flex items-center justify-between text-xs font-medium text-slate-400 group-hover:text-white transition">
                <span>View project & assets</span>
                <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
