import os
import tempfile
import pytest
from app.schemas.error import AppException
from app.services.audio_transcription import AudioTranscriptionService


@pytest.mark.asyncio
async def test_validate_audio_unsupported_format():
    with tempfile.NamedTemporaryFile(suffix=".txt") as tf:
        tf.write(b"Not an audio file")
        tf.flush()
        with pytest.raises(AppException) as exc_info:
            await AudioTranscriptionService.validate_audio_file(tf.name)
        assert exc_info.value.code == "UNSUPPORTED_AUDIO_FORMAT"


@pytest.mark.asyncio
async def test_validate_audio_corrupt_file():
    with tempfile.NamedTemporaryFile(suffix=".mp3") as tf:
        tf.write(b"random garbage bytes that are not an mp3")
        tf.flush()
        with pytest.raises(AppException) as exc_info:
            await AudioTranscriptionService.validate_audio_file(tf.name)
        assert exc_info.value.code in ("INVALID_AUDIO_FILE", "CORRUPT_AUDIO")
