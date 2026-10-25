import React, { useState } from "react";
import { Settings, ShieldCheck, CheckCircle2, AlertCircle, Copy, Check, Terminal, ExternalLink, RefreshCw, Cpu, Database, HardDrive, Key } from "lucide-react";
import { SystemStatus } from "../types/api";

interface SettingsScreenProps {
  systemStatus: SystemStatus | null;
  onRefreshStatus: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  systemStatus,
  onRefreshStatus,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const isDbOk = systemStatus?.checks?.database?.status === "ok";
  const isFfmpegOk = systemStatus?.checks?.ffmpeg?.status === "ok";

  return (
    <div className="max-w-4xl mx-auto py-4 space-y-8 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white mb-1">
          Settings, Providers & Engine Health
        </h1>
        <p className="text-sm text-slate-400">
          Monitor your local rendering infrastructure, provider credentials, and environment configuration.
        </p>
      </div>

      {/* System Readiness Overview Card */}
      <div className="p-6 rounded-2xl bg-surface-900 border border-surface-800 shadow-card space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-surface-800">
          <div className="flex items-center space-x-2">
            <Cpu className="w-5 h-5 text-accent-lime" />
            <h2 className="font-bold text-base text-white">Engine Core Services</h2>
          </div>
          <button
            onClick={onRefreshStatus}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 text-xs text-slate-300 font-medium transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Re-check Engine</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* FFmpeg Service */}
          <div className="p-4 rounded-xl bg-surface-950 border border-surface-800 flex items-start space-x-3.5">
            <div className={`p-2 rounded-lg ${isFfmpegOk ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
              {isFfmpegOk ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-white">FFmpeg & FFprobe</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${isFfmpegOk ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                  {isFfmpegOk ? "Ready" : "Missing"}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 truncate" title={systemStatus?.checks?.ffmpeg?.binary}>
                {systemStatus?.checks?.ffmpeg?.binary || "Checking binary in PATH..."}
              </p>
            </div>
          </div>

          {/* Database Service */}
          <div className="p-4 rounded-xl bg-surface-950 border border-surface-800 flex items-start space-x-3.5">
            <div className={`p-2 rounded-lg ${isDbOk ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
              {isDbOk ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-white">SQLite Database</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${isDbOk ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                  {isDbOk ? "Connected" : "Error"}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Async SQLAlchemy repository layer with persistent job queues.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footage Providers Status */}
      <div className="p-6 rounded-2xl bg-surface-900 border border-surface-800 shadow-card space-y-4">
        <div>
          <h2 className="font-bold text-base text-white">Footage & Audio Providers</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configured external API services and local deterministic fallbacks
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Pexels API */}
          <div className="p-4 rounded-xl bg-surface-950 border border-surface-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-white">Pexels Stock API</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-800 text-slate-400 border border-surface-700">
                {systemStatus?.checks?.providers?.pexels || "Unconfigured (Optional)"}
              </span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Provides real licensed HD footage clips via free Pexels developer key. Set <code className="text-accent-lime">PEXELS_API_KEY</code> in <code className="text-slate-200">.env</code>.
            </p>
          </div>

          {/* Pixabay API */}
          <div className="p-4 rounded-xl bg-surface-950 border border-surface-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-white">Pixabay Stock API</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-800 text-slate-400 border border-surface-700">
                {systemStatus?.checks?.providers?.pixabay || "Unconfigured (Optional)"}
              </span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Secondary footage source for high-quality video assets. Set <code className="text-accent-lime">PIXABAY_API_KEY</code> in <code className="text-slate-200">.env</code>.
            </p>
          </div>

          {/* EdgeTTS Neural Voices */}
          <div className="p-4 rounded-xl bg-surface-950 border border-surface-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-white">EdgeTTS Neural Voices</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Active (Free Tier)
              </span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Real high-fidelity neural speech synthesis without API keys. Supports English, Hindi, Tamil, and UK/US accents.
            </p>
          </div>

          {/* Local Procedural Fallback Engine */}
          <div className="p-4 rounded-xl bg-surface-950 border border-surface-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-white">Local Fallback Engine</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-accent-lime/10 text-accent-lime border border-accent-lime/20">
                100% Deterministic
              </span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Generates animated motion cards with typography and badges when external providers are offline or unconfigured.
            </p>
          </div>
        </div>
      </div>

      {/* Environment Config Guidance */}
      <div className="p-6 rounded-2xl bg-surface-900 border border-surface-800 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-base text-white">Environment Configuration (.env.example)</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Copy these default settings to your <code className="text-accent-lime">.env</code> file
            </p>
          </div>
          <button
            onClick={() =>
              handleCopy(
                `APP_NAME="IncuBrix Script & Voiceover to B-Roll Engine"\nAPP_VERSION=1.0.0\nDEBUG=false\nDATABASE_URL=sqlite+aiosqlite:///./data/incubrix.db\nLOCAL_STORAGE_DIR=./storage\nFFMPEG_PATH=ffmpeg\nFFPROBE_PATH=ffprobe\nPEXELS_API_KEY=\nPIXABAY_API_KEY=\nWEBHOOK_SECRET=incubrix-signature-secret-key-2026`,
                "env"
              )
            }
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 text-xs text-slate-200 transition"
          >
            {copiedKey === "env" ? <Check className="w-3.5 h-3.5 text-accent-lime" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedKey === "env" ? "Copied" : "Copy Template"}</span>
          </button>
        </div>

        <pre className="p-4 rounded-xl bg-surface-950 border border-surface-800 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">
{`# Server & Core Settings
APP_NAME="IncuBrix Script & Voiceover to B-Roll Engine"
APP_VERSION=1.0.0
DEBUG=false
DATABASE_URL=sqlite+aiosqlite:///./data/incubrix.db
LOCAL_STORAGE_DIR=./storage

# Optional Footage Providers (Free developer API keys)
PEXELS_API_KEY=
PIXABAY_API_KEY=

# Security & Webhook Callbacks
WEBHOOK_SECRET=incubrix-signature-secret-key-2026`}
        </pre>
      </div>
    </div>
  );
};
