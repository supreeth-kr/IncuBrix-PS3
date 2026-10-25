import React from "react";
import { Film, PlusCircle, LayoutDashboard, Sliders } from "lucide-react";

interface NavbarProps {
  currentScreen: "dashboard" | "new" | "editor" | "processing" | "results";
  onNavigate: (screen: any) => void;
  activeJobId: string | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentScreen,
  onNavigate,
  activeJobId,
}) => {
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
                <span className="font-bold text-lg tracking-tight text-white">BrollIQ</span>
                <span className="text-[10px] font-mono tracking-wider uppercase px-2 py-0.5 rounded bg-surface-800 text-accent-lime border border-accent-lime/20 font-semibold">
                  AI Video Engine
                </span>
              </div>
              <p className="text-xs text-slate-400">Intelligent Script to Finished B-Roll</p>
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
          </nav>

          {/* Right Action */}
          <div className="flex items-center space-x-3">
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
