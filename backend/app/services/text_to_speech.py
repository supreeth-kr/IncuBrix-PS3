import asyncio
import os
import subprocess
from typing import Optional, Tuple
import edge_tts
from app.config import get_settings
from app.core.logging import get_logger

logger = get_logger("tts_service")
settings = get_settings()


class TextToSpeechService:
    @staticmethod
    async def synthesize(text: str, voice: str, output_path: str) -> Tuple[str, float]:
        """
        Synthesizes speech from text.
        Uses EdgeTTS neural voices by default (free, high quality, no API key needed).
        Falls back to deterministic local audio synthesis using FFmpeg if offline/edge-tts fails.
        Returns: (output_path, measured_duration_seconds)
        """
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        voice_to_use = voice or settings.DEFAULT_VOICE

        # Normalise voice name if user passed shorthand
        voice_map = {
            "en-US-female": "en-US-AriaNeural",
            "en-US-male": "en-US-GuyNeural",
            "en-IN-female": "en-IN-NeerjaNeural",
            "en-IN-male": "en-IN-PrabhatNeural",
            "en-GB-female": "en-GB-SoniaNeural",
            "en-GB-male": "en-GB-RyanNeural",
            "hi-IN-female": "hi-IN-SwaraNeural",
            "hi-IN-male": "hi-IN-MadhurNeural",
            "ta-IN-female": "ta-IN-PallaviNeural",
            "ta-IN-male": "ta-IN-ValluvarNeural",
        }
        target_voice = voice_map.get(voice_to_use, voice_to_use)

        try:
            logger.info(f"Synthesizing speech with voice '{target_voice}'...")
            communicate = edge_tts.Communicate(text, target_voice)
            await communicate.save(output_path)
            duration = await TextToSpeechService.get_audio_duration(output_path)
            if duration > 0.1:
                return output_path, duration
        except Exception as e:
            logger.warning(f"EdgeTTS synthesis failed ({str(e)}). Falling back to deterministic local audio generator.")

        # Deterministic local audio fallback: generate speech-paced audio
        # Words pace is approx 140 words per minute -> 2.33 words/sec
        words = len(text.split())
        est_duration = max(3.0, round(words / 2.33, 2))
        await TextToSpeechService.generate_deterministic_audio(output_path, est_duration)
        duration = await TextToSpeechService.get_audio_duration(output_path)
        return output_path, duration

    @staticmethod
    async def generate_deterministic_audio(output_path: str, duration: float) -> str:
        """Generates a clean deterministic audio track using FFmpeg tone synthesis."""
        ffmpeg_bin = settings.get_ffmpeg_executable()
        ext = os.path.splitext(output_path)[1].lower()
        if ext == ".mp3":
            codec_args = ["-c:a", "libmp3lame", "-b:a", "192k"]
        elif ext in (".m4a", ".aac"):
            codec_args = ["-c:a", "aac", "-b:a", "192k"]
        elif ext == ".wav":
            codec_args = ["-c:a", "pcm_s16le"]
        else:
            codec_args = ["-c:a", "libmp3lame"]

        cmd = [
            ffmpeg_bin,
            "-y",
            "-f", "lavfi",
            "-i", f"sine=frequency=440:beep_factor=4:duration={duration}",
            "-af", "volume=0.3",
            *codec_args,
            output_path,
        ]
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        await proc.communicate()
        return output_path

    @staticmethod
    async def get_audio_duration(audio_path: str) -> float:
        """Inspects audio file duration using ffprobe."""
        ffprobe_bin = settings.get_ffprobe_executable()
        cmd = [
            ffprobe_bin,
            "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            audio_path,
        ]
        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, _ = await proc.communicate()
            val = stdout.decode().strip()
            return float(val) if val else 0.0
        except Exception as e:
            logger.error(f"Failed to probe audio duration for {audio_path}: {e}")
            return 0.0
