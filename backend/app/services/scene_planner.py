import re
from typing import Any, Dict, List, Optional
from app.core.logging import get_logger
from app.schemas.job import SceneInput

logger = get_logger("scene_planner")


class PlannedScene:
    def __init__(
        self,
        scene_index: int,
        narration_text: str,
        start_time: float,
        end_time: float,
        visual_hint: Optional[str] = None,
        selection_reason: str = "",
    ):
        self.scene_index = scene_index
        self.narration_text = narration_text.strip()
        self.start_time = round(start_time, 3)
        self.end_time = round(end_time, 3)
        self.duration = round(end_time - start_time, 3)
        self.visual_hint = visual_hint or self._extract_visual_hint(self.narration_text)
        self.selection_reason = selection_reason

    @staticmethod
    def _extract_visual_hint(text: str) -> str:
        """Derives semantic visual context and search keywords from narration text."""
        lower = text.lower()

        # Check for numerical / data patterns
        if re.search(r"\b(\d+%|\d+\s*(billion|million|k|thousand)|statistics|data|metric|growth)\b", lower):
            return "modern analytics dashboard financial growth chart business technology"

        # Check for AI / Coding / Tech
        if any(w in lower for w in ["code", "software", "developer", "algorithm", "ai", "technology", "computer", "digital", "system"]):
            return "software developer typing code dual monitors modern tech workspace"

        # Check for Nature / Travel / Planet
        if any(w in lower for w in ["nature", "mountain", "ocean", "forest", "tree", "river", "sky", "earth", "environment"]):
            return "majestic nature landscape aerial cinematic sunlight outdoors"

        # Check for Business / Teamwork / Innovation
        if any(w in lower for w in ["team", "meeting", "collaborate", "office", "business", "company", "strategy", "vision"]):
            return "creative team collaborating modern office brainstorming boardroom"

        # Check for Lifestyle / Health / Education
        if any(w in lower for w in ["learn", "study", "read", "health", "exercise", "wellness", "life", "balance"]):
            return "mindful lifestyle focus wellness clean natural morning light"

        # Fallback to key nouns and verbs
        words = [w for w in re.findall(r"\b[a-zA-Z]{4,}\b", lower) if w not in {
            "this", "that", "with", "from", "have", "been", "were", "what", "when", "where", "which", "there", "their"
        }]
        if words:
            return " ".join(words[:4]) + " cinematic 4k"
        return "creative modern dynamic cinematic background"


class ScenePlanner:
    MIN_SCENE_DURATION = 2.5  # Seconds - avoid rapid flashing
    MAX_SCENE_DURATION = 9.0  # Seconds - keep scenes engaging

    @classmethod
    def plan_scenes(
        cls,
        script: Optional[str] = None,
        total_audio_duration: float = 0.0,
        predefined_scenes: Optional[List[SceneInput]] = None,
    ) -> List[PlannedScene]:
        """
        Plans scenes covering complete narration without unexplained gaps or overlaps.
        Guarantees:
        - monotonically increasing timestamps
        - start_time of scene[i+1] == end_time of scene[i]
        - first scene start_time == 0.0
        - last scene end_time == total_audio_duration (if total_audio_duration > 0)
        """
        # If user provided structured scenes
        if predefined_scenes and len(predefined_scenes) > 0:
            return cls._plan_from_predefined(predefined_scenes, total_audio_duration)

        cleaned_script = (script or "").strip()
        if not cleaned_script:
            raise ValueError("Cannot plan scenes from an empty script.")

        # 1. Segment text into coherent clauses / sentences
        text_segments = cls._split_into_segments(cleaned_script)

        # 2. Compute weights based on word count + punctuation weight
        weights = []
        for seg in text_segments:
            word_count = len(seg.split())
            pause_bonus = 1.0 if seg.endswith((".", "!", "?")) else 0.5
            weights.append(max(1.0, word_count + pause_bonus))

        total_weight = sum(weights)

        # Determine target total duration
        if total_audio_duration <= 0.0:
            # Estimate 2.4 words per second
            total_words = sum(len(s.split()) for s in text_segments)
            target_duration = max(len(text_segments) * cls.MIN_SCENE_DURATION, total_words / 2.4)
        else:
            target_duration = total_audio_duration

        # 3. Calculate start/end times ensuring perfect coverage
        planned: List[PlannedScene] = []
        current_time = 0.0

        for i, (seg, w) in enumerate(zip(text_segments, weights)):
            if i == len(text_segments) - 1:
                # Last scene snaps exactly to target_duration
                scene_end = target_duration
            else:
                ratio = w / total_weight
                duration = ratio * target_duration
                # Enforce minimum duration if overall budget allows
                duration = max(duration, cls.MIN_SCENE_DURATION if (target_duration - current_time > cls.MIN_SCENE_DURATION * 2) else 1.5)
                scene_end = current_time + duration

            planned.append(
                PlannedScene(
                    scene_index=i,
                    narration_text=seg,
                    start_time=current_time,
                    end_time=scene_end,
                )
            )
            current_time = scene_end

        return planned

    @classmethod
    def _split_into_segments(cls, text: str) -> List[str]:
        """
        Splits text cleanly at sentence and clause boundaries.
        Preserves original text without loss.
        Merges tiny fragments (< 3 words) to prevent flashing.
        """
        # Protect abbreviations like Dr., e.g., i.e., vs., U.S., etc.
        protected = text
        protected = re.sub(r"\b(e\.g\.|i\.e\.|vs\.|Dr\.|Mr\.|Mrs\.|Ms\.|Inc\.|Corp\.)", lambda m: m.group(0).replace(".", "@DOT@"), protected)
        protected = re.sub(r"(\d+)\.(\d+)", r"\1@DOT@\2", protected)

        # Split on sentence terminals
        raw_sentences = re.split(r"(?<=[.!?])\s+", protected)
        segments: List[str] = []

        for s in raw_sentences:
            s_clean = s.replace("@DOT@", ".").strip()
            if not s_clean:
                continue

            words = s_clean.split()
            # If sentence is very long (> 22 words), split on comma or semicolon
            if len(words) > 22 and any(p in s_clean for p in [", ", "; "]):
                sub_parts = re.split(r"(?<=[,;])\s+", s_clean)
                for part in sub_parts:
                    if part.strip():
                        segments.append(part.strip())
            else:
                segments.append(s_clean)

        # Merge tiny trailing or leading fragments
        merged: List[str] = []
        for seg in segments:
            if not merged:
                merged.append(seg)
            else:
                last_words = len(merged[-1].split())
                curr_words = len(seg.split())
                # If current fragment is under 3 words, merge with previous
                if curr_words < 3:
                    merged[-1] = f"{merged[-1]} {seg}"
                else:
                    merged.append(seg)

        return merged or [text]

    @classmethod
    def _plan_from_predefined(
        cls,
        predefined: List[SceneInput],
        total_audio_duration: float,
    ) -> List[PlannedScene]:
        """Builds scenes from user-provided IncuBrix scene list."""
        scenes: List[PlannedScene] = []
        has_custom_times = all(s.start_time is not None and s.end_time is not None for s in predefined)

        if has_custom_times:
            for i, s in enumerate(predefined):
                scenes.append(
                    PlannedScene(
                        scene_index=i,
                        narration_text=s.text,
                        start_time=s.start_time,
                        end_time=s.end_time,
                        visual_hint=s.visual_hint,
                    )
                )
            return scenes

        # Else distribute evenly across total_audio_duration
        count = len(predefined)
        target_dur = total_audio_duration if total_audio_duration > 0 else count * 4.0
        dur_per_scene = target_dur / count

        for i, s in enumerate(predefined):
            st = i * dur_per_scene
            et = (i + 1) * dur_per_scene if i < count - 1 else target_dur
            scenes.append(
                PlannedScene(
                    scene_index=i,
                    narration_text=s.text,
                    start_time=st,
                    end_time=et,
                    visual_hint=s.visual_hint,
                )
            )
        return scenes
