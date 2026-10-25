import asyncio
import json
import os
import shutil
from typing import Dict, List, Optional, Tuple
from app.config import get_settings
from app.core.logging import get_logger
from app.schemas.error import AppException

logger = get_logger("video_renderer")
settings = get_settings()

ASPECT_RATIO_CONFIGS = {
    "16:9": {"width": 1920, "height": 1080, "filename": "video_16x9.mp4"},
    "9:16": {"width": 1080, "height": 1920, "filename": "video_9x16.mp4"},
    "1:1": {"width": 1080, "height": 1080, "filename": "video_1x1.mp4"},
}


class VideoRenderer:
    @classmethod
    async def render_aspect_ratio(
        cls,
        aspect_ratio: str,
        scenes: List[Dict[str, any]],
        audio_path: str,
        srt_path: Optional[str],
        burn_in_captions: bool,
        output_path: str,
        work_dir: str,
    ) -> Dict[str, any]:
        """
        Renders a finished MP4 for a specific aspect ratio:
        1. Normalises and trims each scene video to exact scene duration and target dimensions.
        2. Concatenates scene clips.
        3. Merges narration audio.
        4. Burns captions if requested.
        5. Validates with ffprobe.
        """
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        config = ASPECT_RATIO_CONFIGS.get(aspect_ratio, ASPECT_RATIO_CONFIGS["16:9"])
        target_w = config["width"]
        target_h = config["height"]
        ffmpeg_bin = settings.get_ffmpeg_executable()

        ratio_work_dir = os.path.join(work_dir, f"render_{aspect_ratio.replace(':', '_')}")
        os.makedirs(ratio_work_dir, exist_ok=True)

        prepared_clips: List[str] = []

        # Step 1: Normalise each scene clip
        for i, scene in enumerate(scenes):
            clip_src = scene.get("source_asset_path")
            dur = max(0.5, scene.get("duration", 3.0))
            norm_clip_path = os.path.join(ratio_work_dir, f"norm_scene_{i:02d}.mp4")

            # Scale and crop to target resolution with 30fps
            # scale=w:h:force_original_aspect_ratio=increase,crop=w:h
            vf = (
                f"scale={target_w}:{target_h}:force_original_aspect_ratio=increase,"
                f"crop={target_w}:{target_h},fps=30,format=yuv420p"
            )

            cmd_norm = [
                ffmpeg_bin,
                "-y",
                "-stream_loop", "-1",  # Loop if clip is shorter than scene
                "-i", clip_src,
                "-t", f"{dur:.3f}",
                "-vf", vf,
                "-c:v", "libx264",
                "-preset", "veryfast",
                "-crf", "22",
                "-an",
                norm_clip_path,
            ]

            proc = await asyncio.create_subprocess_exec(
                *cmd_norm,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            _, stderr = await proc.communicate()
            if proc.returncode != 0 or not os.path.exists(norm_clip_path):
                raise AppException(
                    status_code=500,
                    code="FFMPEG_CLIP_NORMALISATION_FAILED",
                    message=f"Failed to prepare scene {i} visual: {stderr.decode()[:300]}",
                )
            prepared_clips.append(norm_clip_path)

        # Step 2: Write concat list
        concat_list_file = os.path.join(ratio_work_dir, "concat_list.txt")
        with open(concat_list_file, "w", encoding="utf-8") as f:
            for p in prepared_clips:
                # Concat demuxer expects forward slashes or escaped backslashes
                escaped_path = p.replace("\\", "/")
                f.write(f"file '{escaped_path}'\n")

        raw_concat_video = os.path.join(ratio_work_dir, "concatenated_raw.mp4")
        cmd_concat = [
            ffmpeg_bin,
            "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", concat_list_file,
            "-c", "copy",
            raw_concat_video,
        ]

        proc = await asyncio.create_subprocess_exec(
            *cmd_concat,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        _, stderr = await proc.communicate()
        if proc.returncode != 0:
            raise AppException(
                status_code=500,
                code="FFMPEG_CONCAT_FAILED",
                message=f"Failed to concatenate scene clips: {stderr.decode()[:300]}",
            )

        # Step 3: Merge audio and burn captions if enabled
        cmd_final = [
            ffmpeg_bin,
            "-y",
            "-i", raw_concat_video,
            "-i", audio_path,
            "-c:a", "aac",
            "-b:a", "192k",
            "-shortest",  # Sync to end of speech
        ]

        # Subtitle burn-in filter
        can_burn = burn_in_captions and srt_path and os.path.exists(srt_path)
        if can_burn:
            # Escape path for FFmpeg filter on Windows
            srt_escaped = srt_path.replace("\\", "/").replace(":", "\\:")
            # Use subtitles filter with stylish typography style
            font_size = "22" if aspect_ratio == "16:9" else "26"
            sub_filter = (
                f"subtitles='{srt_escaped}':force_style='"
                f"FontName=Arial,FontSize={font_size},PrimaryColour=&H00FFFFFF,"
                f"OutlineColour=&H00000000,BorderStyle=3,Outline=2,Shadow=1,MarginV=35'"
            )
            cmd_final.extend([
                "-vf", sub_filter,
                "-c:v", "libx264",
                "-preset", "medium",
                "-crf", "20",
                "-pix_fmt", "yuv420p",
            ])
        else:
            cmd_final.extend([
                "-c:v", "libx264",
                "-preset", "veryfast",
                "-crf", "22",
                "-pix_fmt", "yuv420p",
            ])

        cmd_final.append(output_path)

        proc = await asyncio.create_subprocess_exec(
            *cmd_final,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        _, stderr = await proc.communicate()

        # If subtitle filter fails (e.g. fontconfig missing on some Windows builds), retry without subtitles
        if proc.returncode != 0 and can_burn:
            logger.warning(f"Burn-in subtitle failed: {stderr.decode()[:200]}. Retrying without burn-in.")
            cmd_retry = [
                ffmpeg_bin, "-y",
                "-i", raw_concat_video,
                "-i", audio_path,
                "-c:v", "libx264",
                "-preset", "veryfast",
                "-crf", "22",
                "-pix_fmt", "yuv420p",
                "-c:a", "aac",
                "-b:a", "192k",
                "-shortest",
                output_path,
            ]
            proc2 = await asyncio.create_subprocess_exec(
                *cmd_retry,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            _, err2 = await proc2.communicate()
            if proc2.returncode != 0:
                raise AppException(
                    status_code=500,
                    code="FFMPEG_FINAL_RENDER_FAILED",
                    message=f"Final render retry failed: {err2.decode()[:300]}",
                )
        elif proc.returncode != 0:
            err_text = stderr.decode()
            tail_err = err_text[-500:] if len(err_text) > 500 else err_text
            raise AppException(
                status_code=500,
                code="FFMPEG_FINAL_RENDER_FAILED",
                message=f"Final render failed: {tail_err.strip()}",
            )

        # Step 4: Validate generated video with ffprobe
        metadata = await cls.probe_video(output_path)
        return metadata

    @classmethod
    async def probe_video(cls, video_path: str) -> Dict[str, any]:
        """Probes video using ffprobe and verifies streams and integrity."""
        if not os.path.exists(video_path) or os.path.getsize(video_path) == 0:
            raise AppException(
                status_code=500,
                code="RENDER_OUTPUT_MISSING",
                message=f"Output video file {os.path.basename(video_path)} was not created.",
            )

        ffprobe_bin = settings.get_ffprobe_executable()
        cmd = [
            ffprobe_bin,
            "-v", "error",
            "-show_entries", "format=duration,size,bit_rate:stream=codec_name,codec_type,width,height,r_frame_rate",
            "-of", "json",
            video_path,
        ]

        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()

        if proc.returncode != 0:
            raise AppException(
                status_code=500,
                code="RENDER_VALIDATION_FAILED",
                message=f"FFprobe failed to inspect output video: {stderr.decode()[:200]}",
            )

        try:
            data = json.loads(stdout.decode())
            fmt = data.get("format", {})
            streams = data.get("streams", [])

            v_stream = next((s for s in streams if s.get("codec_type") == "video"), {})
            a_stream = next((s for s in streams if s.get("codec_type") == "audio"), {})

            dur = float(fmt.get("duration", 0.0))
            if dur <= 0.1:
                raise ValueError("Video duration is zero or negative.")

            # Calculate fps
            fps_str = v_stream.get("r_frame_rate", "30/1")
            fps = 30.0
            if "/" in fps_str:
                num, den = fps_str.split("/")
                fps = round(float(num) / float(den), 2)

            return {
                "file_path": video_path,
                "filename": os.path.basename(video_path),
                "file_size_bytes": int(fmt.get("size", os.path.getsize(video_path))),
                "duration_seconds": dur,
                "width": int(v_stream.get("width", 0)),
                "height": int(v_stream.get("height", 0)),
                "codec_video": v_stream.get("codec_name", "h264"),
                "codec_audio": a_stream.get("codec_name", "aac"),
                "fps": fps,
            }
        except Exception as e:
            raise AppException(
                status_code=500,
                code="CORRUPT_RENDER_OUTPUT",
                message=f"Validation failed for rendered video: {str(e)}",
            )
