import os
import tempfile
from app.services.caption_generator import CaptionGenerator


def test_caption_generator_timestamp_formatting():
    assert CaptionGenerator.format_srt_timestamp(0.0) == "00:00:00,000"
    assert CaptionGenerator.format_srt_timestamp(65.25) == "00:01:05,250"
    assert CaptionGenerator.format_srt_timestamp(3661.123) == "01:01:01,123"


def test_caption_generator_srt_syntax_and_validation():
    scenes = [
        {"start_time": 0.0, "end_time": 3.5, "duration": 3.5, "narration_text": "First scene narration."},
        {"start_time": 3.5, "end_time": 7.2, "duration": 3.7, "narration_text": "Second scene narration."},
    ]

    with tempfile.NamedTemporaryFile(suffix=".srt", delete=False) as tf:
        srt_path = tf.name

    try:
        CaptionGenerator.generate_srt(scenes, srt_path)
        assert os.path.exists(srt_path)
        assert os.path.getsize(srt_path) > 0

        # Validate syntax
        is_valid = CaptionGenerator.validate_srt_file(srt_path)
        assert is_valid is True

        with open(srt_path, "r", encoding="utf-8") as f:
            content = f.read()

        assert "1\n00:00:00,000 --> 00:00:03,500\nFirst scene narration." in content
        assert "2\n00:00:03,500 --> 00:00:07,200\nSecond scene narration." in content
    finally:
        if os.path.exists(srt_path):
            os.remove(srt_path)
