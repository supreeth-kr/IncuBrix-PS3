import React, { useState } from "react";
import { Play, Pause, RefreshCw, Sparkles, ShieldCheck, ShieldAlert, ExternalLink, Clock, Layers, Film, ArrowRight } from "lucide-react";
import { Job, Scene } from "../types/api";
import { ReplaceSceneModal } from "./ReplaceSceneModal";

interface SceneEditorScreenProps {
  job: Job;
  scenes: Scene[];
  onReplaceScene: (sceneId: string, payload: any) => Promise<void>;
  onNavigateToResults: () => void;
}

export const SceneEditorScreen: React.FC<SceneEditorScreenProps> = ({
  job,
  scenes,
  onReplaceScene,
  onNavigateToResults,
}) => {
  const [selectedScene, setSelectedScene] = useState<Scene | null>(scenes[0] || null);
  const [replacingScene, setReplacingScene] = useState<Scene | null>(null);
  const [activeAspect, setActiveAspect] = useState<string>(job.aspect_ratios[0] || "16:9");

  // Video URL helper
  const videoFileName = activeAspect === "9:16" ? "video_9x16.mp4" : (activeAspect === "1:1" ? "video_1x1.mp4" : "video_16x9.mp4");
  const videoSrc = `/api/v1/jobs/${job.job_id}/downloads/${videoFileName}`;

  const currentScene = selectedScene || scenes[0];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono uppercase tracking-wider text-accent-lime">Scene Editor</span>
            <span className="text-slate-600">&bull;</span>
            <span className="text-xs font-mono text-slate-400">{job.job_id.slice(0, 8)}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-0.5">
            {job.project_name}
          </h1>
        </div>

        <div className="flex items-center space-x-3">
          {/* Aspect Ratio Switcher */}
          <div className="flex p-1 bg-surface-900 border border-surface-800 rounded-lg text-xs font-medium">
            {job.aspect_ratios.map((ratio) => (
              <button
                key={ratio}
                onClick={() => setActiveAspect(ratio)}
                className={`px-2.5 py-1 rounded transition ${
                  activeAspect === ratio
                    ? "bg-surface-800 text-white font-semibold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {ratio}
              </button>
            ))}
          </div>

          <button
            onClick={onNavigateToResults}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-accent-lime hover:bg-accent-limeHover text-surface-950 font-semibold text-xs tracking-wide transition shadow-glow"
          >
            <span>View Final Exports</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Studio Workspace: Left Video Preview & Metadata, Right Scene Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Central Video Preview & Active Scene Inspector */}
        <div className="lg:col-span-7 space-y-5">
          {/* Central Video Preview Player */}
          <div className="relative rounded-2xl overflow-hidden bg-black border border-surface-800 shadow-2xl flex items-center justify-center aspect-video">
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

          {/* Active Scene Detailed Card */}
          {currentScene && (
            <div className="p-5 rounded-2xl bg-surface-900 border border-surface-800 shadow-card space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-surface-800">
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-lg bg-surface-800 border border-surface-700 flex items-center justify-center text-xs font-bold text-white font-mono">
                    #{currentScene.scene_index + 1}
                  </span>
                  <h3 className="font-semibold text-sm text-white">Scene Inspector</h3>
                </div>

                <button
                  onClick={() => setReplacingScene(currentScene)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-surface-800 hover:bg-surface-750 border border-surface-750 text-accent-lime text-xs font-medium transition shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Replace Footage</span>
                </button>
              </div>

              {/* Narration Script */}
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                  Narration Transcript
                </span>
                <p className="text-sm text-slate-100 font-medium leading-relaxed bg-surface-950 p-3 rounded-xl border border-surface-800/80">
                  "{currentScene.narration_text}"
                </p>
              </div>

              {/* Grid Metadata */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-2.5 rounded-xl bg-surface-950 border border-surface-800">
                  <span className="text-[10px] text-slate-500 block mb-0.5">Timeline</span>
                  <span className="font-mono font-medium text-slate-200">
                    {currentScene.start_time.toFixed(1)}s &rarr; {currentScene.end_time.toFixed(1)}s
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-surface-950 border border-surface-800">
                  <span className="text-[10px] text-slate-500 block mb-0.5">Duration</span>
                  <span className="font-mono font-medium text-slate-200">
                    {currentScene.duration.toFixed(1)} seconds
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-surface-950 border border-surface-800">
                  <span className="text-[10px] text-slate-500 block mb-0.5">Source Provider</span>
                  <span className="font-medium text-slate-200 capitalize">
                    {currentScene.source_provider.replace("_", " ")}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-surface-950 border border-surface-800">
                  <span className="text-[10px] text-slate-500 block mb-0.5">Relevance Score</span>
                  <span className="font-mono font-bold text-accent-lime">
                    {currentScene.relevance_score ? `${Math.round(currentScene.relevance_score * 100)}%` : "N/A"}
                  </span>
                </div>
              </div>

              {/* Licensing & Rights Verification */}
              <div className="p-3.5 rounded-xl bg-surface-950 border border-surface-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    Rights & Licensing Verification
                  </span>
                  {currentScene.rights_verified ? (
                    <span className="inline-flex items-center space-x-1 text-[11px] text-emerald-400 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Verified License</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 text-[11px] text-amber-400 font-medium">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Unverified Rights</span>
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-300 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">License:</span>
                    <span className="font-medium text-white">{currentScene.license_name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Attribution:</span>
                    <span className="text-slate-300 text-right truncate max-w-[260px]">{currentScene.attribution || "None Required"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Commercial Use:</span>
                    <span className="font-mono uppercase text-slate-300">{currentScene.commercial_use_status}</span>
                  </div>
                </div>

                {/* Selection reason explanation */}
                <div className="pt-2 border-t border-surface-800 text-[11px] text-slate-400">
                  <span className="text-slate-500 font-mono">Selection Logic: </span>
                  {currentScene.selection_reason}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Scene Timeline List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-semibold text-sm text-white">Scene Timeline ({scenes.length})</h3>
            <span className="text-xs text-slate-400 font-mono">Click card to inspect</span>
          </div>

          <div className="space-y-3 max-h-[820px] overflow-y-auto pr-1">
            {scenes.map((scene) => {
              const isSelected = selectedScene?.id === scene.id;
              return (
                <div
                  key={scene.id}
                  onClick={() => setSelectedScene(scene)}
                  className={`group relative flex items-start space-x-3.5 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? "bg-surface-850 border-accent-lime shadow-glow"
                      : "bg-surface-900 border-surface-800 hover:border-surface-700"
                  }`}
                >
                  {/* Thumbnail / Badge */}
                  <div className="w-20 h-14 rounded-xl bg-surface-950 border border-surface-800 overflow-hidden flex-shrink-0 relative flex items-center justify-center">
                    {scene.thumbnail_url ? (
                      <img
                        src={scene.thumbnail_url}
                        alt={`Scene ${scene.scene_index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as any).style.display = "none";
                        }}
                      />
                    ) : (
                      <Film className="w-5 h-5 text-slate-600" />
                    )}
                    <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[10px] font-mono text-white">
                      #{scene.scene_index + 1}
                    </div>
                  </div>

                  {/* Scene Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                      <span className="font-mono">
                        {scene.start_time.toFixed(1)}s &bull; {scene.duration.toFixed(1)}s
                      </span>
                      <span className="capitalize text-[11px] px-2 py-0.5 rounded bg-surface-950 text-slate-300 border border-surface-800">
                        {scene.source_provider.replace("_", " ")}
                      </span>
                    </div>

                    <p className="text-xs text-slate-200 line-clamp-2 leading-relaxed">
                      {scene.narration_text}
                    </p>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-surface-800/60 text-[11px]">
                      <span className="text-slate-400 truncate max-w-[150px]">
                        {scene.visual_hint || "General visual"}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setReplacingScene(scene);
                        }}
                        className="text-accent-lime hover:underline font-medium"
                      >
                        Replace
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Replace Scene Modal */}
      {replacingScene && (
        <ReplaceSceneModal
          scene={replacingScene}
          isOpen={Boolean(replacingScene)}
          onClose={() => setReplacingScene(null)}
          onConfirmReplace={async (payload) => {
            await onReplaceScene(replacingScene.id, payload);
          }}
        />
      )}
    </div>
  );
};
