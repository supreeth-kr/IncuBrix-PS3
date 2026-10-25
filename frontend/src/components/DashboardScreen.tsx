import React, { useState } from "react";
import {
  PlusCircle,
  Search,
  Film,
  Clock,
  Layers,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Trash2,
  RotateCcw,
  AlertTriangle,
  X,
  Palette,
  Archive,
} from "lucide-react";
import { Job } from "../types/api";

interface DashboardScreenProps {
  jobs: Job[];
  trashJobs: Job[];
  loading: boolean;
  onSelectJob: (job: Job, targetScreen?: "editor" | "results") => void;
  onCreateNew: () => void;
  onRefresh: () => void;
  onDeleteJob: (jobId: string) => Promise<void>;
  onRestoreJob: (jobId: string) => Promise<void>;
  onPermanentDeleteJob: (jobId: string) => Promise<void>;
  onEmptyTrash: () => Promise<void>;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  jobs,
  trashJobs,
  loading,
  onSelectJob,
  onCreateNew,
  onRefresh,
  onDeleteJob,
  onRestoreJob,
  onPermanentDeleteJob,
  onEmptyTrash,
}) => {
  const [activeTab, setActiveTab] = useState<"active" | "trash">("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "name">("newest");

  // Deletion Confirmation Modal States
  const [jobToDelete, setJobToDelete] = useState<Job | null>(null);
  const [jobToPermanentDelete, setJobToPermanentDelete] = useState<Job | null>(null);
  const [confirmEmptyTrash, setConfirmEmptyTrash] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const displayList = activeTab === "active" ? jobs : trashJobs;

  // Filtering & Search
  const filteredJobs = displayList
    .filter((j) => {
      const matchesSearch =
        j.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        j.job_id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        activeTab === "trash" || statusFilter === "all" || j.status === statusFilter;
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

  const handleConfirmMoveToTrash = async () => {
    if (!jobToDelete) return;
    try {
      setActionLoading(true);
      await onDeleteJob(jobToDelete.job_id);
      setJobToDelete(null);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmPermanentDelete = async () => {
    if (!jobToPermanentDelete) return;
    try {
      setActionLoading(true);
      await onPermanentDeleteJob(jobToPermanentDelete.job_id);
      setJobToPermanentDelete(null);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmEmptyTrash = async () => {
    try {
      setActionLoading(true);
      await onEmptyTrash();
      setConfirmEmptyTrash(false);
    } finally {
      setActionLoading(false);
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
            Neural speech synthesis, AI-generated scene imagery, sentence timing alignment, and multi-format MP4 video rendering with SubRip captions.
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

      {/* Main Tabs: Active Projects vs 30-Day Trash */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-surface-800 pb-3">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setActiveTab("active")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
              activeTab === "active"
                ? "bg-surface-850 text-white border border-surface-700 shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-surface-900"
            }`}
          >
            <Film className="w-4 h-4 text-accent-lime" />
            <span>Active Projects</span>
            <span className="ml-1.5 px-2 py-0.5 rounded-full text-xs bg-surface-800 text-slate-300 font-mono">
              {jobs.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("trash")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
              activeTab === "trash"
                ? "bg-rose-500/10 text-rose-300 border border-rose-500/20 shadow-sm"
                : "text-slate-400 hover:text-rose-400 hover:bg-surface-900"
            }`}
          >
            <Trash2 className="w-4 h-4" />
            <span>Trash (30 Days)</span>
            {trashJobs.length > 0 && (
              <span className="ml-1.5 px-2 py-0.5 rounded-full text-xs bg-rose-500/20 text-rose-300 font-mono">
                {trashJobs.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === "trash" && trashJobs.length > 0 && (
          <button
            onClick={() => setConfirmEmptyTrash(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Empty Trash ({trashJobs.length})</span>
          </button>
        )}
      </div>

      {/* Trash 30-Day Info Banner */}
      {activeTab === "trash" && (
        <div className="p-4 rounded-xl bg-surface-900/90 border border-surface-800 flex items-start space-x-3 text-xs text-slate-300">
          <Archive className="w-5 h-5 text-accent-coral flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-white block">
              Trash Vault &bull; 30-Day Retention Policy
            </span>
            <p className="text-slate-400 leading-relaxed">
              Projects moved to the trash are preserved for 30 days. You can restore them to your active dashboard with full media assets, or permanently delete them at any time.
            </p>
          </div>
        </div>
      )}

      {/* Toolbar & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-surface-900/60 p-4 rounded-xl border border-surface-800">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={
              activeTab === "active"
                ? "Search active projects by title or ID..."
                : "Search deleted projects in trash..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-surface-950 border border-surface-800 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:border-accent-lime transition"
          />
        </div>

        <div className="flex items-center space-x-2">
          {/* Status filter tabs (only on active tab) */}
          {activeTab === "active" && (
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
          )}

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
            <div
              key={i}
              className="h-64 rounded-xl bg-surface-900/50 border border-surface-800 animate-pulse p-5"
            />
          ))}
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-2xl bg-surface-900/40 border border-dashed border-surface-800">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-surface-850 flex items-center justify-center text-slate-500">
            {activeTab === "active" ? <Film className="w-8 h-8" /> : <Trash2 className="w-8 h-8" />}
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">
            {activeTab === "active" ? "No active video projects found" : "Trash is currently empty"}
          </h3>
          <p className="text-sm text-slate-400 max-w-sm mx-auto mb-6">
            {activeTab === "active"
              ? searchQuery
                ? "No projects matched your search criteria. Try a different query."
                : "Create your first AI-generated B-roll video project from a script or voiceover."
              : "Deleted projects will appear here and be stored safely for 30 days before permanent deletion."}
          </p>
          {activeTab === "active" && (
            <button
              onClick={onCreateNew}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-accent-lime text-surface-950 font-semibold text-sm transition hover:bg-accent-limeHover shadow-glow"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create First Video</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredJobs.map((job) => (
            <div
              key={job.job_id}
              onClick={() => {
                if (activeTab === "active") {
                  onSelectJob(job, job.status === "succeeded" ? "results" : "editor");
                }
              }}
              className={`group relative flex flex-col justify-between bg-surface-900 border border-surface-800 rounded-2xl p-5 transition-all duration-200 shadow-card ${
                activeTab === "active"
                  ? "hover:bg-surface-850 hover:border-surface-700 cursor-pointer hover:shadow-xl"
                  : "border-rose-950/40"
              }`}
            >
              <div>
                {/* Header: Status, AI Visual badge, and Action Menu */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(job.status)}
                    {job.visual_source === "ai_images" && (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20">
                        <Sparkles className="w-3 h-3 text-purple-400" />
                        <span>AI Visuals</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] font-mono text-slate-500">
                      {new Date(job.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>

                    {/* Delete action button on active cards */}
                    {activeTab === "active" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setJobToDelete(job);
                        }}
                        title="Move project to trash (30-day retention)"
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Title */}
                <h3 className="font-semibold text-base text-white group-hover:text-accent-lime transition line-clamp-1 mb-2">
                  {job.project_name}
                </h3>

                {/* Progress bar if running */}
                {job.status === "running" && activeTab === "active" && (
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

                {/* Trash Countdown Retention Badge */}
                {activeTab === "trash" && (
                  <div className="my-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between text-xs text-rose-300">
                    <div className="flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5 text-rose-400" />
                      <span>Expires in {job.days_remaining ?? 30} days</span>
                    </div>
                    <span className="text-[11px] font-mono text-rose-400/80">
                      Auto-purge in 30d
                    </span>
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
              {activeTab === "active" ? (
                <div className="mt-5 flex items-center justify-between text-xs font-medium text-slate-400 group-hover:text-white transition">
                  <span>View project & assets</span>
                  <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
                </div>
              ) : (
                <div className="mt-5 pt-3 border-t border-surface-800/80 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onRestoreJob(job.job_id)}
                    className="flex-1 flex items-center justify-center space-x-1.5 py-1.5 px-3 rounded-lg bg-surface-800 hover:bg-surface-700 text-slate-200 text-xs font-semibold transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-accent-lime" />
                    <span>Restore</span>
                  </button>

                  <button
                    onClick={() => setJobToPermanentDelete(job)}
                    className="flex-1 flex items-center justify-center space-x-1.5 py-1.5 px-3 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold transition border border-rose-500/20"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Forever</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Modal: Move to Trash */}
      {jobToDelete && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-surface-900 border border-surface-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Move Project to Trash?</h3>
                  <p className="text-xs text-slate-400">30-day retention countdown</p>
                </div>
              </div>
              <button
                onClick={() => setJobToDelete(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-slate-300">
              Are you sure you want to move{" "}
              <strong className="text-white">"{jobToDelete.project_name}"</strong> to the trash?
            </p>

            <div className="p-3 rounded-xl bg-surface-950 border border-surface-800 text-xs text-slate-400 space-y-1">
              <div className="flex items-center space-x-1.5 text-accent-lime font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Safely stored for 30 days</span>
              </div>
              <p>
                You can restore this project anytime from the <strong>Trash (30 Days)</strong> tab. After 30 days, it will be automatically purged.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setJobToDelete(null)}
                className="px-4 py-2 rounded-xl bg-surface-800 hover:bg-surface-700 text-slate-300 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                disabled={actionLoading}
                onClick={handleConfirmMoveToTrash}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{actionLoading ? "Moving..." : "Move to Trash"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Permanent Delete */}
      {jobToPermanentDelete && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-surface-900 border border-surface-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Permanently Delete Project?</h3>
                  <p className="text-xs text-rose-400">This action cannot be undone</p>
                </div>
              </div>
              <button
                onClick={() => setJobToPermanentDelete(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-slate-300">
              Permanently delete{" "}
              <strong className="text-white">"{jobToPermanentDelete.project_name}"</strong> and all its rendered video clips, audio tracks, and timeline manifests?
            </p>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setJobToPermanentDelete(null)}
                className="px-4 py-2 rounded-xl bg-surface-800 hover:bg-surface-700 text-slate-300 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                disabled={actionLoading}
                onClick={handleConfirmPermanentDelete}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{actionLoading ? "Deleting..." : "Delete Forever"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Empty Entire Trash */}
      {confirmEmptyTrash && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-surface-900 border border-surface-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Empty Trash?</h3>
                  <p className="text-xs text-rose-400">Purges all {trashJobs.length} items</p>
                </div>
              </div>
              <button
                onClick={() => setConfirmEmptyTrash(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-slate-300">
              Are you sure you want to permanently delete all {trashJobs.length} projects in the trash? All storage directories and video assets will be erased permanently.
            </p>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setConfirmEmptyTrash(false)}
                className="px-4 py-2 rounded-xl bg-surface-800 hover:bg-surface-700 text-slate-300 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                disabled={actionLoading}
                onClick={handleConfirmEmptyTrash}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{actionLoading ? "Emptying..." : "Empty Trash Now"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
