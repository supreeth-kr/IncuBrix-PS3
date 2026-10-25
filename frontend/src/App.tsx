import React, { useEffect, useState, useRef } from "react";
import { Navbar } from "./components/Navbar";
import { DashboardScreen } from "./components/DashboardScreen";
import { NewProjectScreen } from "./components/NewProjectScreen";
import { SceneEditorScreen } from "./components/SceneEditorScreen";
import { ProcessingScreen } from "./components/ProcessingScreen";
import { ResultsScreen } from "./components/ResultsScreen";
import { SettingsScreen } from "./components/SettingsScreen";
import { CreateJobPayload, Job, Scene, SystemStatus } from "./types/api";
import { createJob, fetchJob, fetchJobs, fetchReadiness, fetchScenes, replaceScene, uploadAudioJob } from "./api/client";

type Screen = "dashboard" | "new" | "editor" | "processing" | "results" | "settings";

export const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>("dashboard");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState<boolean>(true);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [activeScenes, setActiveScenes] = useState<Scene[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const pollingRef = useRef<any>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Initial Load: Jobs and Engine Readiness
  const loadInitialData = async () => {
    try {
      const [jobsData, readyData] = await Promise.allSettled([
        fetchJobs(),
        fetchReadiness(),
      ]);
      if (jobsData.status === "fulfilled") {
        setJobs(jobsData.value);
      }
      if (readyData.status === "fulfilled") {
        setSystemStatus(readyData.value);
      }
    } catch (e) {
      console.error("Error loading initial data", e);
    } finally {
      setLoadingJobs(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // 2. Job Polling Loop
  useEffect(() => {
    if (activeJob && (activeJob.status === "queued" || activeJob.status === "running")) {
      pollingRef.current = setInterval(async () => {
        try {
          const updated = await fetchJob(activeJob.job_id);
          setActiveJob(updated);

          // Update in jobs list
          setJobs((prev) =>
            prev.map((j) => (j.job_id === updated.job_id ? updated : j))
          );

          if (updated.status === "succeeded") {
            if (pollingRef.current) clearInterval(pollingRef.current);
            // Fetch scenes for results/editor
            const sc = await fetchScenes(updated.job_id);
            setActiveScenes(sc);
            showToast("Video rendered and validated successfully!");
          } else if (updated.status === "failed") {
            if (pollingRef.current) clearInterval(pollingRef.current);
            showToast("Video rendering failed: " + (updated.error?.message || "Unknown error"));
          }
        } catch (e) {
          console.error("Polling error", e);
        }
      }, 1500);
    }

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [activeJob?.job_id, activeJob?.status]);

  // Actions
  const handleCreateScriptJob = async (payload: CreateJobPayload) => {
    const job = await createJob(payload);
    setActiveJob(job);
    setJobs((prev) => [job, ...prev]);
    setCurrentScreen("processing");
    showToast("Video job queued for generation.");
  };

  const handleCreateAudioJob = async (formData: FormData) => {
    const job = await uploadAudioJob(formData);
    setActiveJob(job);
    setJobs((prev) => [job, ...prev]);
    setCurrentScreen("processing");
    showToast("Audio uploaded. Starting scene alignment and video generation.");
  };

  const handleSelectJob = async (job: Job, targetScreen: "editor" | "results" = "editor") => {
    setActiveJob(job);
    try {
      const sc = await fetchScenes(job.job_id);
      setActiveScenes(sc);
    } catch (e) {
      setActiveScenes([]);
    }
    setCurrentScreen(targetScreen);
  };

  const handleReplaceScene = async (sceneId: string, payload: any) => {
    if (!activeJob) return;
    showToast("Updating scene and rendering partial update...");
    const updated = await replaceScene(activeJob.job_id, sceneId, payload);
    // Reload scenes
    const sc = await fetchScenes(activeJob.job_id);
    setActiveScenes(sc);
    showToast(`Scene #${updated.scene_index + 1} updated successfully!`);
  };

  return (
    <div className="min-h-screen bg-surface-950 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl bg-surface-850 border border-accent-lime text-slate-100 text-xs font-medium shadow-glow animate-fadeIn">
          {toastMessage}
        </div>
      )}

      {/* Main Navigation */}
      <Navbar
        currentScreen={currentScreen}
        onNavigate={(screen) => setCurrentScreen(screen)}
        systemStatus={systemStatus}
        activeJobId={activeJob?.job_id || null}
      />

      {/* Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentScreen === "dashboard" && (
          <DashboardScreen
            jobs={jobs}
            loading={loadingJobs}
            onSelectJob={handleSelectJob}
            onCreateNew={() => setCurrentScreen("new")}
            onRefresh={loadInitialData}
          />
        )}

        {currentScreen === "new" && (
          <NewProjectScreen
            onSubmitScript={handleCreateScriptJob}
            onSubmitAudio={handleCreateAudioJob}
            onCancel={() => setCurrentScreen("dashboard")}
          />
        )}

        {currentScreen === "processing" && activeJob && (
          <ProcessingScreen
            job={activeJob}
            onRefresh={async () => {
              const u = await fetchJob(activeJob.job_id);
              setActiveJob(u);
            }}
            onComplete={() => setCurrentScreen("results")}
            onCancel={() => setCurrentScreen("dashboard")}
          />
        )}

        {currentScreen === "editor" && activeJob && (
          <SceneEditorScreen
            job={activeJob}
            scenes={activeScenes}
            onReplaceScene={handleReplaceScene}
            onNavigateToResults={() => setCurrentScreen("results")}
          />
        )}

        {currentScreen === "results" && activeJob && (
          <ResultsScreen
            job={activeJob}
            scenes={activeScenes}
            onNavigateToEditor={() => setCurrentScreen("editor")}
            onNavigateToDashboard={() => setCurrentScreen("dashboard")}
          />
        )}

        {currentScreen === "settings" && (
          <SettingsScreen
            systemStatus={systemStatus}
            onRefreshStatus={async () => {
              const s = await fetchReadiness();
              setSystemStatus(s);
              showToast("System readiness refreshed.");
            }}
          />
        )}
      </main>

      {/* Global Footer */}
      <footer className="border-t border-surface-900 bg-surface-950 py-6 text-center text-xs text-slate-500">
        IncuBrix AI B-Roll Video Engine &bull; Engineering Assessment 3 &bull; Broadcast H.264 / AAC 30fps
      </footer>
    </div>
  );
};
