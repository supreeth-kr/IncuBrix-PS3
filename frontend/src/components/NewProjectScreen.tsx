import React, { useState } from "react";
import { FileText, Mic, Upload, Sparkles, Check, AlertCircle, X, Shield, Film, Smartphone, Square } from "lucide-react";
import { CreateJobPayload } from "../types/api";

interface NewProjectScreenProps {
  onSubmitScript: (payload: CreateJobPayload) => Promise<void>;
  onSubmitAudio: (formData: FormData) => Promise<void>;
  onCancel: () => void;
}

const VOICE_OPTIONS = [
  { id: "en-US-AriaNeural", label: "English (US) — Aria (Female, Dynamic)" },
  { id: "en-US-GuyNeural", label: "English (US) — Guy (Male, Authoritative)" },
  { id: "en-IN-NeerjaNeural", label: "English (India) — Neerja (Female, Clear)" },
  { id: "en-IN-PrabhatNeural", label: "English (India) — Prabhat (Male, Professional)" },
  { id: "en-GB-SoniaNeural", label: "English (UK) — Sonia (Female, Refined)" },
  { id: "hi-IN-SwaraNeural", label: "Hindi (India) — Swara (Female, Natural)" },
  { id: "ta-IN-PallaviNeural", label: "Tamil (India) — Pallavi (Female, Fluent)" },
];

const ASPECT_RATIO_OPTIONS = [
  { id: "16:9", label: "16:9 Landscape", desc: "YouTube, Web, Desktop (1920x1080)", icon: Film },
  { id: "9:16", label: "9:16 Portrait", desc: "TikTok, Reels, Shorts (1080x1920)", icon: Smartphone },
  { id: "1:1", label: "1:1 Square", desc: "Instagram, LinkedIn feeds (1080x1080)", icon: Square },
];

export const NewProjectScreen: React.FC<NewProjectScreenProps> = ({
  onSubmitScript,
  onSubmitAudio,
  onCancel,
}) => {
  const [inputMode, setInputMode] = useState<"script" | "audio">("script");
  const [projectName, setProjectName] = useState("");
  const [scriptText, setScriptText] = useState("");
  const [selectedVoice, setSelectedVoice] = useState("en-US-AriaNeural");
  const [aspectRatios, setAspectRatios] = useState<string[]>(["16:9"]);
  const [stylePrompt, setStylePrompt] = useState("bright, modern, cinematic real-world footage");
  const [avoidTags, setAvoidTags] = useState<string[]>(["realistic generated faces", "blurry footage"]);
  const [tagInput, setTagInput] = useState("");
  const [burnInCaptions, setBurnInCaptions] = useState(true);
  const [exportSrt, setExportSrt] = useState(true);

  // Audio Upload State
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Metrics
  const wordCount = scriptText.trim() ? scriptText.trim().split(/\s+/).length : 0;
  const estimatedSeconds = Math.max(3, Math.round(wordCount / 2.3));

  const toggleAspectRatio = (ratio: string) => {
    if (aspectRatios.includes(ratio)) {
      if (aspectRatios.length === 1) return; // Keep at least one
      setAspectRatios(aspectRatios.filter((r) => r !== ratio));
    } else {
      setAspectRatios([...aspectRatios, ratio]);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !avoidTags.includes(tagInput.trim())) {
      setAvoidTags([...avoidTags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setAvoidTags(avoidTags.filter((t) => t !== tag));
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelected = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["mp3", "wav", "m4a"].includes(ext || "")) {
      setErrorMessage("Unsupported file format. Please upload an MP3, WAV, or M4A audio track.");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setErrorMessage("Audio file exceeds maximum 50MB upload limit.");
      return;
    }
    setErrorMessage(null);
    setAudioFile(file);
    if (projectName === "Modern Innovation B-Roll") {
      setProjectName(file.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      if (inputMode === "script") {
        if (!scriptText.trim()) {
          throw new Error("Please enter script narration text.");
        }
        await onSubmitScript({
          project_name: projectName.trim() || "Untitled Video Project",
          script: scriptText.trim(),
          voice: selectedVoice,
          aspect_ratios: aspectRatios,
          style: stylePrompt,
          avoid: avoidTags,
          captions: {
            burn_in: burnInCaptions,
            srt: exportSrt,
          },
        });
      } else {
        if (!audioFile) {
          throw new Error("Please select or drop an audio file.");
        }
        const formData = new FormData();
        formData.append("file", audioFile);
        formData.append("project_name", projectName.trim() || "Audio Voiceover Project");
        if (scriptText.trim()) {
          formData.append("script", scriptText.trim());
        }
        formData.append("aspect_ratios", JSON.stringify(aspectRatios));
        formData.append("style", stylePrompt);
        formData.append("avoid", JSON.stringify(avoidTags));
        formData.append("burn_in_captions", String(burnInCaptions));
        await onSubmitAudio(formData);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred while creating the project.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-4 animate-fadeIn">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Create New Video Project</h1>
        <p className="text-sm text-slate-400">
          Configure your narration source, voiceover settings, visual style, and target aspect ratios.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Project Name Card */}
        <div className="p-5 rounded-2xl bg-surface-900 border border-surface-800 shadow-card space-y-3">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Project Title
          </label>
          <input
            type="text"
            required
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="w-full px-4 py-2.5 bg-surface-950 border border-surface-800 rounded-xl text-sm text-white focus:border-accent-lime transition"
            placeholder="e.g. Next-Gen Tech Explainer"
          />
        </div>

        {/* Input Mode Toggle: Script vs Audio Upload */}
        <div className="p-5 rounded-2xl bg-surface-900 border border-surface-800 shadow-card space-y-4">
          <div className="flex p-1 bg-surface-950 border border-surface-800 rounded-xl max-w-md">
            <button
              type="button"
              onClick={() => setInputMode("script")}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg text-sm font-medium transition ${
                inputMode === "script"
                  ? "bg-surface-800 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <FileText className="w-4 h-4 text-accent-lime" />
              <span>Written Script (TTS)</span>
            </button>

            <button
              type="button"
              onClick={() => setInputMode("audio")}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg text-sm font-medium transition ${
                inputMode === "audio"
                  ? "bg-surface-800 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Mic className="w-4 h-4 text-accent-coral" />
              <span>Audio Voiceover Upload</span>
            </button>
          </div>

          {inputMode === "script" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Narration Script Text
                  </label>
                  <div className="flex items-center space-x-2 text-[11px]">
                    <span className="text-slate-500 hidden sm:inline">Templates:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setProjectName("NextGen AI & Cloud Infrastructure");
                        setScriptText(
                          "Artificial intelligence is transforming creative video production. " +
                          "Automated pipelines analyze spoken narration and curate matching cinematic visuals instantly. " +
                          "Over eighty percent of digital teams now leverage intelligent automation for high-impact storytelling."
                        );
                      }}
                      className="px-2.5 py-1 rounded bg-surface-850 hover:bg-surface-800 text-accent-lime border border-surface-750 transition"
                    >
                      Tech Sample
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProjectName("Market Analytics & Forecasting");
                        setScriptText(
                          "Over 78% of enterprise decision-makers prioritize data-driven forecasting. " +
                          "When markets fluctuate unpredictably, clarity emerges from disciplined observation. " +
                          "Resilient organizations adapt faster, turning analytical depth into measurable momentum."
                        );
                      }}
                      className="px-2.5 py-1 rounded bg-surface-850 hover:bg-surface-800 text-accent-cyan border border-surface-750 transition"
                    >
                      Data Sample
                    </button>
                    {scriptText && (
                      <button
                        type="button"
                        onClick={() => setScriptText("")}
                        className="px-2.5 py-1 rounded bg-surface-850 hover:bg-surface-800 text-slate-400 hover:text-rose-400 border border-surface-750 transition"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                <textarea
                  rows={6}
                  value={scriptText}
                  onChange={(e) => setScriptText(e.target.value)}
                  placeholder="Paste or write your video narration script here..."
                  className="w-full p-4 bg-surface-950 border border-surface-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:border-accent-lime transition leading-relaxed resize-y"
                />
                <div className="flex items-center justify-between mt-2 text-xs font-mono text-slate-400 px-1">
                  <span>{wordCount} words &bull; ~{estimatedSeconds}s estimated duration</span>
                  <span>Splits at natural sentence pauses</span>
                </div>
              </div>

              {/* Voice Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Neural Voice & Language
                </label>
                <select
                  value={selectedVoice}
                  onChange={(e) => setSelectedVoice(e.target.value)}
                  className="w-full px-4 py-2.5 bg-surface-950 border border-surface-800 rounded-xl text-sm text-slate-200 focus:border-accent-lime transition"
                >
                  {VOICE_OPTIONS.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Audio Upload Dropzone */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl transition ${
                  dragActive
                    ? "border-accent-lime bg-accent-lime/5"
                    : audioFile
                    ? "border-surface-700 bg-surface-950/60"
                    : "border-surface-800 bg-surface-950/40 hover:border-surface-700"
                }`}
              >
                <input
                  type="file"
                  accept=".mp3,.wav,.m4a"
                  onChange={(e) => e.target.files?.[0] && handleFileSelected(e.target.files[0])}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <Upload className="w-10 h-10 text-slate-400 mb-3" />
                {audioFile ? (
                  <div className="text-center">
                    <p className="font-semibold text-white text-sm">{audioFile.name}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {(audioFile.size / (1024 * 1024)).toFixed(2)} MB &bull; Ready for processing
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-sm font-medium text-slate-200">
                      Drag and drop your audio voiceover file here, or click to browse
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Supports MP3, WAV, and M4A up to 10 minutes (50MB max)
                    </p>
                  </div>
                )}
              </div>

              {/* Optional Script Transcript for uploaded audio */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Optional Transcript Script (Improves Alignment)
                </label>
                <textarea
                  rows={3}
                  value={scriptText}
                  onChange={(e) => setScriptText(e.target.value)}
                  placeholder="If you already have the written transcript for this audio, paste it here for exact sentence matching..."
                  className="w-full p-3 bg-surface-950 border border-surface-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:border-accent-lime transition"
                />
              </div>
            </div>
          )}
        </div>

        {/* Aspect Ratios Selection */}
        <div className="p-5 rounded-2xl bg-surface-900 border border-surface-800 shadow-card space-y-3">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Output Aspect Ratios (Select Multiple)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {ASPECT_RATIO_OPTIONS.map((opt) => {
              const selected = aspectRatios.includes(opt.id);
              const Icon = opt.icon;
              return (
                <div
                  key={opt.id}
                  onClick={() => toggleAspectRatio(opt.id)}
                  className={`flex flex-col justify-between p-4 rounded-xl border cursor-pointer transition ${
                    selected
                      ? "bg-surface-850 border-accent-lime text-white shadow-glow"
                      : "bg-surface-950 border-surface-800 text-slate-400 hover:border-surface-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Icon className={`w-5 h-5 ${selected ? "text-accent-lime" : "text-slate-400"}`} />
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        selected
                          ? "bg-accent-lime border-accent-lime text-surface-950"
                          : "border-surface-700"
                      }`}
                    >
                      {selected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-white">{opt.label}</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">{opt.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Visual Style & Avoid Rules */}
        <div className="p-5 rounded-2xl bg-surface-900 border border-surface-800 shadow-card space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Visual Aesthetic Guideline
            </label>
            <input
              type="text"
              value={stylePrompt}
              onChange={(e) => setStylePrompt(e.target.value)}
              placeholder="e.g. bright, modern, real-world footage, cinematic 4k"
              className="w-full px-4 py-2.5 bg-surface-950 border border-surface-800 rounded-xl text-sm text-white focus:border-accent-lime transition"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Avoid Content & Aesthetics
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {avoidTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-surface-800 border border-surface-700 text-xs text-slate-300"
                >
                  <span>{tag}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-rose-400 transition"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex space-x-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
                placeholder="Add avoided concept (e.g. realistic faces, logos)..."
                className="flex-1 px-4 py-2 bg-surface-950 border border-surface-800 rounded-xl text-xs text-white focus:border-accent-lime transition"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3.5 py-2 bg-surface-800 hover:bg-surface-700 border border-surface-700 rounded-xl text-xs font-medium text-white transition"
              >
                Add Rule
              </button>
            </div>
          </div>
        </div>

        {/* Captions Options */}
        <div className="p-5 rounded-2xl bg-surface-900 border border-surface-800 shadow-card flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-sm text-white">Subtitles & Captions</h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Burn styled subtitles directly into output video and export standalone .srt file
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={burnInCaptions}
                onChange={(e) => setBurnInCaptions(e.target.checked)}
                className="rounded bg-surface-950 border-surface-700 text-accent-lime focus:ring-0 w-4 h-4"
              />
              <span>Burn In Video</span>
            </label>
            <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={exportSrt}
                onChange={(e) => setExportSrt(e.target.checked)}
                className="rounded bg-surface-950 border-surface-700 text-accent-lime focus:ring-0 w-4 h-4"
              />
              <span>Export .SRT</span>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-4 pt-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl bg-surface-850 hover:bg-surface-800 border border-surface-700 text-slate-300 text-sm font-medium transition"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-accent-lime hover:bg-accent-limeHover text-surface-950 font-bold text-sm transition shadow-glow disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-surface-950 border-t-transparent rounded-full animate-spin" />
                <span>Launching Video Engine...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate B-Roll Video</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
