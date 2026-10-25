import os
import re
from typing import Dict, List


class CaptionGenerator:
    @staticmethod
    def format_srt_timestamp(seconds: float) -> str:
        """Formats seconds into SRT format HH:MM:SS,mmm."""
        total_ms = int(round(seconds * 1000))
        hrs = total_ms // 3600000
        mins = (total_ms % 3600000) // 60000
        secs = (total_ms % 60000) // 1000
        ms = total_ms % 1000
        return f"{hrs:02d}:{mins:02d}:{secs:02d},{ms:03d}"

    @classmethod
    def generate_srt(cls, scenes: List[Dict[str, any]], output_srt_path: str) -> str:
        """
        Builds a valid SubRip (.srt) caption file.
        Scenes are sorted by start_time, indexed sequentially starting from 1.
        """
        os.makedirs(os.path.dirname(os.path.abspath(output_srt_path)), exist_ok=True)
        entries: List[str] = []

        sorted_scenes = sorted(scenes, key=lambda s: s.get("start_time", 0.0))

        for idx, scene in enumerate(sorted_scenes, start=1):
            st = scene.get("start_time", 0.0)
            et = scene.get("end_time", st + scene.get("duration", 4.0))
            text = scene.get("narration_text", "").strip()

            start_str = cls.format_srt_timestamp(st)
            end_str = cls.format_srt_timestamp(et)

            entry = f"{idx}\n{start_str} --> {end_str}\n{text}\n"
            entries.append(entry)

        srt_content = "\n".join(entries) + "\n"
        with open(output_srt_path, "w", encoding="utf-8") as f:
            f.write(srt_content)

        return output_srt_path

    @classmethod
    def validate_srt_file(cls, srt_path: str) -> bool:
        """Validates that the generated SRT file has proper sequential indices and timestamp syntax."""
        if not os.path.exists(srt_path) or os.path.getsize(srt_path) == 0:
            return False

        with open(srt_path, "r", encoding="utf-8") as f:
            content = f.read().strip()

        pattern = re.compile(
            r"(\d+)\n(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})\n(.+?)(?=\n\n|\Z)",
            re.DOTALL,
        )
        matches = pattern.findall(content)
        if not matches:
            return False

        # Validate sequence
        for idx, match in enumerate(matches, start=1):
            num, st, et, text = match
            if int(num) != idx:
                return False
        return True
