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
        """
        Derives high-fidelity semantic visual context and b-roll prompt from narration text.
        Identifies specific subjects, environments, actions, and atmosphere so AI image engines
        generate imagery strictly reflecting the scene narration.
        """
        lower = text.lower().strip()

        # Remove conversational speech filler
        clean_text = re.sub(
            r"\b(in this video|welcome back|as you can see|let's look at|now let's|in addition|furthermore|first of all|to begin with|so basically|in fact|you see|for instance|for example)\b",
            "",
            lower,
            flags=re.IGNORECASE,
        ).strip()

        # 1. Finance / Metrics / Data / Growth
        if re.search(r"\b(\d+%|\d+\s*(billion|million|k|thousand)|statistics|data|metric|growth|revenue|stocks?|market|economy|forecast)\b", clean_text):
            return "high-tech financial analytics command center glowing data visualization stock charts modern economics"

        # 2. AI / Software / Coding / Cyber / Robotics
        if any(w in clean_text for w in ["code", "software", "developer", "algorithm", "ai", "artificial intelligence", "neural", "technology", "computer", "digital", "system", "cloud", "server", "robot"]):
            return "software engineer typing code modern dual monitor workstation glowing futuristic dark mode interface"

        # 3. Nature / Mountains / Oceans / Wildlife / Astronomy / Earth
        if any(w in clean_text for w in ["nature", "mountain", "ocean", "sea", "forest", "tree", "river", "sky", "earth", "planet", "wildlife", "animal", "sunset", "sunrise", "weather", "space", "galaxy", "stars"]):
            return "breathtaking cinematic aerial drone shot majestic natural landscape golden hour sunlight 8k documentary"

        # 4. Food / Cooking / Culinary / Coffee / Dining
        if any(w in clean_text for w in ["food", "cook", "chef", "kitchen", "recipe", "dish", "coffee", "baker", "baking", "restaurant", "meal", "taste", "flavor", "artisan"]):
            return "close-up cinematic culinary preparation fresh artisan ingredients natural warm ambient kitchen lighting shallow depth of field"

        # 5. Architecture / Cities / Urban / Travel / Real Estate
        if any(w in clean_text for w in ["city", "street", "building", "architecture", "urban", "skyline", "traffic", "tokyo", "new york", "travel", "flight", "airport", "hotel", "house", "home"]):
            return "sweeping cinematic wide shot modern metropolitan skyline architectural glass reflections golden hour"

        # 6. Healthcare / Medicine / Science / Biology
        if any(w in clean_text for w in ["health", "medical", "doctor", "hospital", "patient", "cure", "science", "laboratory", "microscope", "research", "vaccine", "dna"]):
            return "clean high-tech modern medical laboratory scientist researching clinical equipment bright pristine environment"

        # 7. Business / Teamwork / Leadership / Collaboration
        if any(w in clean_text for w in ["team", "meeting", "collaborate", "office", "business", "company", "strategy", "vision", "startup", "partner", "leader"]):
            return "diverse professional team collaborating modern creative architectural boardroom sunlight brainstorming"

        # 8. Education / Learning / Books / History
        if any(w in clean_text for w in ["learn", "study", "student", "school", "university", "book", "read", "library", "history", "knowledge"]):
            return "warm sunlit academic library students studying open books intellectual focused atmosphere cinematic"

        # 9. Wellness / Fitness / Sports / Lifestyle
        if any(w in clean_text for w in ["fitness", "workout", "gym", "run", "sport", "athlete", "exercise", "wellness", "meditation", "yoga", "balance"]):
            return "energetic athletic training dynamic motion natural sunlight outdoor athletic b-roll inspirational"

        # Heuristic Content Extraction: Extract salient nouns, verbs, adjectives
        meaningful_words = [
            w for w in re.findall(r"\b[a-zA-Z]{3,}\b", clean_text)
            if w not in {
                "this", "that", "with", "from", "have", "been", "were", "what", "when", "where",
                "which", "there", "their", "about", "could", "would", "should", "these", "those",
                "into", "over", "after", "before", "while", "during", "then", "just", "also", "very"
            }
        ]

        if len(meaningful_words) >= 2:
            subject_phrase = " ".join(meaningful_words[:6])
            return f"{subject_phrase} cinematic photorealistic film shot 8k"

        return "modern dynamic cinematic film b-roll visual crisp lighting"


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
