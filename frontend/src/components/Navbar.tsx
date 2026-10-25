import React from "react";
import { Film, PlusCircle, LayoutDashboard, Sliders, Settings, CheckCircle2, AlertCircle } from "lucide-react";
import { SystemStatus } from "../types/api";

interface NavbarProps {
  currentScreen: "dashboard" | "new" | "editor" | "processing" | "results" | "settings";
  onNavigate: (screen: any) => void;
  systemStatus: SystemStatus | null;
  activeJobId: string | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentScreen,
  onNavigate,
  systemStatus,
  activeJobId,
}) => {
  const isReady = systemStatus?.status === "ready";

  return (
    <header className="sticky top-0 z-50 bg-surface-900/90 backdrop-blur-md border-b border-surface-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onNavigate("dashboard")}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-surface-800 to-surface-700 border border-surface-600 flex items-center justify-center text-accent-lime shadow-glow">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-white">IncuBrix</span>
                <span className="text-[10px] font-mono tracking-wider uppercase px-2 py-0.5 rounded bg-surface-800 text-accent-lime border border-accent-lime/20 font-semibold">
                  B-Roll Engine
                </span>
              </div>
              <p className="text-xs text-slate-400">Script & Voiceover to Finished Video</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            <button
              onClick={() => onNavigate("dashboard")}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentScreen === "dashboard"
                  ? "bg-surface-800 text-white border border-surface-700"
                  : "text-slate-400 hover:text-white hover:bg-surface-850"
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-slate-400" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => onNavigate("new")}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentScreen === "new"
                  ? "bg-surface-800 text-white border border-surface-700"
                  : "text-slate-400 hover:text-white hover:bg-surface-850"
              }`}
            >
              <PlusCircle className="w-4 h-4 text-accent-lime" />
              <span>New Video</span>
            </button>

            {activeJobId && (
              <>
                <button
                  onClick={() => onNavigate("editor")}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentScreen === "editor"
                      ? "bg-surface-800 text-white border border-surface-700"
                      : "text-slate-400 hover:text-white hover:bg-surface-850"
                  }`}
                >
                  <Sliders className="w-4 h-4 text-accent-cyan" />
                  <span>Scene Editor</span>
                </button>

                <button
                  onClick={() => onNavigate("results")}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentScreen === "results"
                      ? "bg-surface-800 text-white border border-surface-700"
                      : "text-slate-400 hover:text-white hover:bg-surface-850"
                  }`}
                >
                  <Film className="w-4 h-4 text-accent-coral" />
                  <span>Exports & Player</span>
                </button>
              </>
            )}

            <button
              onClick={() => onNavigate("settings")}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentScreen === "settings"
                  ? "bg-surface-800 text-white border border-surface-700"
                  : "text-slate-400 hover:text-white hover:bg-surface-850"
              }`}
            >
              <Settings className="w-4 h-4 text-slate-400" />
              <span>Settings & Status</span>
            </button>
          </nav>

          {/* Right Status Indicator & Action */}
          <div className="flex items-center space-x-3">
            <div
              onClick={() => onNavigate("settings")}
              className="hidden sm:flex items-center space-x-2 px-2.5 py-1 rounded-full bg-surface-950 border border-surface-800 text-xs font-mono cursor-pointer hover:border-surface-700 transition"
              title="Click to view engine health details"
            >
              <span className={`w-2 h-2 rounded-full ${isReady ? "bg-accent-lime animate-pulse" : "bg-accent-amber"}`} />
              <span className="text-slate-300">{isReady ? "Engine Ready" : "Initializing"}</span>
            </div>

            <button
              onClick={() => onNavigate("new")}
              className="flex items-center space-x-2 px-3.5 py-1.5 rounded-lg bg-accent-lime hover:bg-accent-limeHover text-surface-950 font-semibold text-xs tracking-wide transition shadow-glow"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Create Video</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
