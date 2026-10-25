import os
import tempfile
import pytest
from app.providers.fallback_provider import FallbackProvider
from app.services.video_renderer import VideoRenderer


@pytest.mark.asyncio
async def test_aspect_ratio_rendering_and_probing():
    """Validates rendering for 16:9, 9:16, and 1:1 aspect ratios."""
    fallback = FallbackProvider()
    with tempfile.TemporaryDirectory() as temp_dir:
        # Create audio dummy track
        from app.services.text_to_speech import TextToSpeechService
        audio_path = os.path.join(temp_dir, "test_audio.mp3")
        await TextToSpeechService.generate_deterministic_audio(audio_path, duration=3.0)

        # Create scene clip
        scenes_meta = await fallback.search(
            query="Technology growth",
            visual_hint="analytics dashboard",
            aspect_ratio="16:9",
            avoid=[],
            min_duration=3.0,
        )
        clip_path = os.path.join(temp_dir, "clip_0.mp4")
        await fallback.download_asset(scenes_meta[0], clip_path)

        scene_dict = {
            "source_asset_path": clip_path,
            "duration": 3.0,
            "narration_text": "Technology growth metrics.",
            "start_time": 0.0,
            "end_time": 3.0,
        }

        # Test 16:9
        out_16x9 = os.path.join(temp_dir, "video_16x9.mp4")
        meta_16x9 = await VideoRenderer.render_aspect_ratio(
            aspect_ratio="16:9",
            scenes=[scene_dict],
            audio_path=audio_path,
            srt_path=None,
            burn_in_captions=False,
            output_path=out_16x9,
            work_dir=temp_dir,
        )
        assert meta_16x9["width"] == 1920
        assert meta_16x9["height"] == 1080
        assert meta_16x9["duration_seconds"] > 0
        assert meta_16x9["codec_video"] == "h264"

        # Test 9:16 (Portrait)
        out_9x16 = os.path.join(temp_dir, "video_9x16.mp4")
        meta_9x16 = await VideoRenderer.render_aspect_ratio(
            aspect_ratio="9:16",
            scenes=[scene_dict],
            audio_path=audio_path,
            srt_path=None,
            burn_in_captions=False,
            output_path=out_9x16,
            work_dir=temp_dir,
        )
        assert meta_9x16["width"] == 1080
        assert meta_9x16["height"] == 1920

        # Test 1:1 (Square)
        out_1x1 = os.path.join(temp_dir, "video_1x1.mp4")
        meta_1x1 = await VideoRenderer.render_aspect_ratio(
            aspect_ratio="1:1",
            scenes=[scene_dict],
            audio_path=audio_path,
            srt_path=None,
            burn_in_captions=False,
            output_path=out_1x1,
            work_dir=temp_dir,
        )
        assert meta_1x1["width"] == 1080
        assert meta_1x1["height"] == 1080
