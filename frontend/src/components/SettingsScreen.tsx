import React, { useEffect, useState } from "react";
import {
  Settings,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  Cpu,
  Sparkles,
  Key,
  Eye,
  EyeOff,
  Save,
  Zap,
  Film,
  ExternalLink,
} from "lucide-react";
import { AppSettings, SystemStatus } from "../types/api";
import { fetchSettings, updateSettings } from "../api/client";

interface SettingsScreenProps {
  systemStatus: SystemStatus | null;
  onRefreshStatus: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  systemStatus,
  onRefreshStatus,
}) => {
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [geminiKeyInput, setGeminiKeyInput] = useState("");
  const [openaiKeyInput, setOpenaiKeyInput] = useState("");
  const [selectedEngine, setSelectedEngine] = useState("auto");
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await fetchSettings();
      setAppSettings(data);
      setSelectedEngine(data.ai_image_engine || "auto");
    } catch (e) {
      console.error("Failed to load settings:", e);
    }
  };

  const handleSaveAISettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSaveSuccess(null);
    try {
      const payload: any = {
        ai_image_engine: selectedEngine,
      };
      if (geminiKeyInput.trim()) {
        payload.gemini_api_key = geminiKeyInput.trim();
      }
      if (openaiKeyInput.trim()) {
        payload.openai_api_key = openaiKeyInput.trim();
      }

      const updated = await updateSettings(payload);
      setAppSettings(updated);
      setGeminiKeyInput("");
      setOpenaiKeyInput("");
      setSaveSuccess("AI Visual Engine settings saved and activated successfully!");
      onRefreshStatus();
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err: any) {
      alert("Failed to save settings: " + (err.message || "Unknown error"));
    } finally {
      setSavingSettings(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const isDbOk = systemStatus?.checks?.database?.status === "ok";
  const isFfmpegOk = systemStatus?.checks?.ffmpeg?.status === "ok";
  const isGeminiActive = appSettings?.gemini_configured || false;

  return (
    <div className="max-w-4xl mx-auto py-4 space-y-8 animate-fadeIn">
      {/* Header */}
      <div>
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-surface-800 border border-surface-700 text-xs font-medium text-slate-300 mb-2">
          <Sparkles className="w-3.5 h-3.5 text-accent-lime" />
          <span>BrollIQ Engine Configuration</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white mb-1">
          Settings, AI Visual Models & System Health
        </h1>
        <p className="text-sm text-slate-400">
          Configure Google Gemini Pro / Imagen 3 credentials, visual generation engines, and monitor local rendering infrastructure.
        </p>
      </div>

      {/* AI Visual Synthesis & Gemini Pro Configuration Card */}
      <div className="p-6 rounded-2xl bg-surface-900 border border-surface-800 shadow-card space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-surface-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-accent-lime/20 to-accent-cyan/20 border border-accent-lime/30 flex items-center justify-center text-accent-lime">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-base text-white">Google Gemini Pro & AI Visual Engines</h2>
              <p className="text-xs text-slate-400">
                Synthesize photorealistic scene imagery strictly matching your script narration
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span
              className={`text-xs font-mono px-2.5 py-1 rounded-full border ${
                isGeminiActive
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-surface-800 text-slate-300 border-surface-700"
              }`}
            >
              {isGeminiActive ? "Gemini Pro (Imagen 3) Active" : "Flux.1 Diffusion Active"}
            </span>
          </div>
        </div>

        {saveSuccess && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center space-x-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{saveSuccess}</span>
          </div>
        )}

        <form onSubmit={handleSaveAISettings} className="space-y-5">
          {/* Engine Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Preferred AI Visual Generation Engine
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: "auto",
                  title: "Auto / Best Available",
                  desc: "Prioritizes Gemini Pro (Imagen 3) when key is set, with fallback to Flux.1 diffusion.",
                  badge: "Recommended",
                },
                {
                  id: "gemini",
                  title: "Google Gemini (Imagen 3)",
                  desc: "State-of-the-art cinematic image synthesis powered by Gemini Pro & Imagen 3.",
                  badge: isGeminiActive ? "Key Ready" : "Requires Key",
                },
                {
                  id: "flux",
                  title: "Pollinations Flux.1 Diffusion",
                  desc: "Free, zero-config photorealistic 8K diffusion model that works globally without keys.",
                  badge: "Zero-Config",
                },
              ].map((engine) => (
                <div
                  key={engine.id}
                  onClick={() => setSelectedEngine(engine.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition ${
                    selectedEngine === engine.id
                      ? "bg-surface-850 border-accent-lime text-white shadow-glow"
                      : "bg-surface-950 border-surface-800 text-slate-400 hover:border-surface-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-xs text-white">{engine.title}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-800 text-slate-300 font-mono">
                      {engine.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{engine.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Gemini API Key Input */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Google Gemini API Key (Gemini Pro / Imagen 3)
              </label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-accent-lime hover:underline flex items-center space-x-1"
              >
                <span>Get Gemini Key from Google AI Studio</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                <Key className="w-4 h-4" />
              </div>
              <input
                type={showGeminiKey ? "text" : "password"}
                value={geminiKeyInput}
                onChange={(e) => setGeminiKeyInput(e.target.value)}
                placeholder={
                  appSettings?.gemini_configured
                    ? `Configured (${appSettings.gemini_masked_key}) — Paste new key to update`
                    : "Paste your Google Gemini API key (AIzaSy...)"
                }
                className="w-full pl-10 pr-12 py-2.5 bg-surface-950 border border-surface-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:border-accent-lime transition"
              />
              <button
                type="button"
                onClick={() => setShowGeminiKey(!showGeminiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
              >
                {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              When configured, BrollIQ harnesses your Gemini Pro version to generate bespoke, ultra-detailed 8K B-roll visuals strictly aligned to each scene narration.
            </p>
          </div>

          {/* Submit Save Button */}
          <div className="flex items-center justify-end pt-2">
            <button
              type="submit"
              disabled={savingSettings}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-accent-lime hover:bg-accent-limeHover text-surface-950 font-bold text-xs transition shadow-glow disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{savingSettings ? "Saving Settings..." : "Save & Activate AI Engine"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* System Readiness Overview Card */}
      <div className="p-6 rounded-2xl bg-surface-900 border border-surface-800 shadow-card space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-surface-800">
          <div className="flex items-center space-x-2">
            <Cpu className="w-5 h-5 text-accent-lime" />
            <h2 className="font-bold text-base text-white">BrollIQ Engine Core Services</h2>
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
            <div
              className={`p-2 rounded-lg ${
                isFfmpegOk ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
              }`}
            >
              {isFfmpegOk ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-white">FFmpeg & FFprobe</span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                    isFfmpegOk
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-rose-500/10 text-rose-400"
                  }`}
                >
                  {isFfmpegOk ? "Ready" : "Missing"}
                </span>
              </div>
              <p
                className="text-xs text-slate-400 mt-1 truncate"
                title={systemStatus?.checks?.ffmpeg?.binary}
              >
                {systemStatus?.checks?.ffmpeg?.binary || "Checking binary in PATH..."}
              </p>
            </div>
          </div>

          {/* Database Service */}
          <div className="p-4 rounded-xl bg-surface-950 border border-surface-800 flex items-start space-x-3.5">
            <div
              className={`p-2 rounded-lg ${
                isDbOk ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
              }`}
            >
              {isDbOk ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-white">Async Database</span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                    isDbOk ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                  }`}
                >
                  {isDbOk ? "Connected" : "Error"}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Async SQLAlchemy repository layer with persistent 30-day trash vault.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footage Providers Status */}
      <div className="p-6 rounded-2xl bg-surface-900 border border-surface-800 shadow-card space-y-4">
        <div>
          <h2 className="font-bold text-base text-white">Visual & Audio Engines Overview</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configured AI synthesis models, stock footage APIs, and speech engines
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Gemini AI Status */}
          <div className="p-4 rounded-xl bg-surface-950 border border-surface-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-white">Google Gemini (Imagen 3)</span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                  isGeminiActive
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-surface-800 text-slate-400 border-surface-700"
                }`}
              >
                {isGeminiActive ? "Active" : "Unconfigured"}
              </span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Synthesizes high-resolution photorealistic images according to scene narration using Google Imagen 3.
            </p>
          </div>

          {/* Pollinations Flux Status */}
          <div className="p-4 rounded-xl bg-surface-950 border border-surface-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-white">Pollinations Flux.1 Diffusion</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-accent-lime/10 text-accent-lime border border-accent-lime/20">
                100% Active (Zero-Key)
              </span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Flagship Flux.1 diffusion model providing instant photorealistic visuals for all script scenes out-of-the-box.
            </p>
          </div>

          {/* EdgeTTS Neural Voices */}
          <div className="p-4 rounded-xl bg-surface-950 border border-surface-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-white">EdgeTTS Neural Voices</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Active (Multi-lingual)
              </span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Neural voiceover synthesis with natural sentence boundaries and pause modeling.
            </p>
          </div>

          {/* Procedural Fallback Engine */}
          <div className="p-4 rounded-xl bg-surface-950 border border-surface-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-white">BrollIQ Procedural Fallback</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-800 text-slate-300 border border-surface-700">
                Deterministic Safety Net
              </span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Renders animated motion graphics and typography if the system ever operates offline.
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
              Copy these settings to your <code className="text-accent-lime">.env</code> file
            </p>
          </div>
          <button
            onClick={() =>
              handleCopy(
                `APP_NAME="BrollIQ - Script & Voiceover to B-Roll Video Engine"\nAPP_VERSION=1.0.0\nDEBUG=false\nDATABASE_URL=sqlite+aiosqlite:///./data/incubrix.db\nLOCAL_STORAGE_DIR=./storage\nFFMPEG_PATH=ffmpeg\nFFPROBE_PATH=ffprobe\nGEMINI_API_KEY=\nOPENAI_API_KEY=\nAI_IMAGE_ENGINE=auto\nAI_IMAGE_TIMEOUT_SECONDS=45\nPEXELS_API_KEY=\nPIXABAY_API_KEY=\nWEBHOOK_SECRET=brolliq-signature-secret-key-2026`,
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
{`# BrollIQ Core Settings
APP_NAME="BrollIQ - Script & Voiceover to B-Roll Video Engine"
APP_VERSION=1.0.0
DEBUG=false
DATABASE_URL=sqlite+aiosqlite:///./data/incubrix.db
LOCAL_STORAGE_DIR=./storage

# AI Visual Synthesis Keys (Gemini Pro / Imagen 3 & DALL-E)
GEMINI_API_KEY=
OPENAI_API_KEY=
AI_IMAGE_ENGINE=auto
AI_IMAGE_TIMEOUT_SECONDS=45

# Optional Footage Providers
PEXELS_API_KEY=
PIXABAY_API_KEY=

# Security & Webhook Callbacks
WEBHOOK_SECRET=brolliq-signature-secret-key-2026`}
        </pre>
      </div>
    </div>
  );
};
