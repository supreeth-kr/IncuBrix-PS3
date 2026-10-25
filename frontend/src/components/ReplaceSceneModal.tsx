import React, { useState } from "react";
import { X, Sparkles, RefreshCw, AlertTriangle, ShieldCheck } from "lucide-react";
import { Scene } from "../types/api";

interface ReplaceSceneModalProps {
  scene: Scene;
  isOpen: boolean;
  onClose: () => void;
  onConfirmReplace: (payload: {
    query?: string;
    visual_hint?: string;
    provider?: string;
    rerender: boolean;
  }) => Promise<void>;
}

export const ReplaceSceneModal: React.FC<ReplaceSceneModalProps> = ({
  scene,
  isOpen,
  onClose,
  onConfirmReplace,
}) => {
  const [visualQuery, setVisualQuery] = useState(scene.visual_hint || "");
  const [provider, setProvider] = useState<string>("auto");
  const [rerender, setRerender] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirmReplace({
        query: visualQuery.trim(),
        visual_hint: visualQuery.trim(),
        provider: provider === "auto" ? undefined : provider,
        rerender,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to replace scene footage.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-surface-900 border border-surface-800 rounded-2xl shadow-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-surface-800">
          <div>
            <h3 className="font-bold text-lg text-white">Replace Scene #{scene.scene_index + 1} Footage</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Source alternative visual footage and optionally trigger partial video rerendering
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-surface-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Narration Reference */}
          <div className="p-3.5 bg-surface-950 border border-surface-800 rounded-xl space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
              Current Scene Narration ({scene.duration.toFixed(1)}s)
            </span>
            <p className="text-xs text-slate-200 italic line-clamp-3">"{scene.narration_text}"</p>
          </div>

          {/* New Search Query */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              New Visual Search Hint / Keywords
            </label>
            <input
              type="text"
              required
              value={visualQuery}
              onChange={(e) => setVisualQuery(e.target.value)}
              placeholder="e.g. software engineer in glass modern high-rise office"
              className="w-full px-3.5 py-2.5 bg-surface-950 border border-surface-800 rounded-xl text-sm text-white focus:border-accent-lime transition"
            />
          </div>

          {/* Footage Provider Choice */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Footage Provider
            </label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-surface-950 border border-surface-800 rounded-xl text-xs text-slate-200 focus:border-accent-lime transition"
            >
              <option value="auto">Auto-Select (Pexels &rarr; Pixabay &rarr; Fallback)</option>
              <option value="pexels">Pexels Stock API</option>
              <option value="pixabay">Pixabay Stock API</option>
              <option value="local_fallback">IncuBrix Procedural Fallback Engine</option>
            </select>
          </div>

          {/* Rerender Toggle */}
          <div className="flex items-center justify-between p-3 bg-surface-950 border border-surface-800 rounded-xl">
            <div>
              <p className="font-medium text-xs text-white">Rerender Video Output</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Applies partial rerender for this clip while preserving all other scenes and audio
              </p>
            </div>
            <input
              type="checkbox"
              checked={rerender}
              onChange={(e) => setRerender(e.target.checked)}
              className="rounded bg-surface-900 border-surface-700 text-accent-lime w-4 h-4"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-surface-800 hover:bg-surface-700 text-slate-300 text-xs font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-accent-lime hover:bg-accent-limeHover text-surface-950 text-xs font-bold transition shadow-glow disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Rerendering Scene...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Replace & Update</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
