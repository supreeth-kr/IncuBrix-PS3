import argparse
import asyncio
import json
import os
import sys
from pathlib import Path
from typing import List

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.logging import setup_logging
from app.core.storage import get_storage
from app.core.worker import JobWorker
from app.database import AsyncSessionLocal, init_db
from app.models.job import Job
from app.services.video_renderer import ASPECT_RATIO_CONFIGS


async def process_single_input(
    input_path: str,
    output_dir: str,
    voice: str,
    aspect_ratios: List[str],
    style: str,
) -> bool:
    print(f"\n[CLI] Processing input: {input_path}")
    path = Path(input_path)

    script_text = ""
    audio_path = None
    project_name = path.stem

    if path.suffix.lower() == ".json":
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
            script_text = data.get("script", "")
            voice = data.get("voice", voice)
            aspect_ratios = data.get("aspect_ratios", aspect_ratios)
            style = data.get("style", style)
            project_name = data.get("project_name", path.stem)
    elif path.suffix.lower() in {".mp3", ".wav", ".m4a"}:
        audio_path = str(path.resolve())
    else:
        with open(path, "r", encoding="utf-8") as f:
            script_text = f.read().strip()

    async with AsyncSessionLocal() as session:
        job = Job(
            project_name=project_name,
            status="queued",
            script=script_text or None,
            audio_path=audio_path,
            voice=voice,
            aspect_ratios=aspect_ratios,
            style=style,
            captions_config={"burn_in": True, "srt": True},
        )
        session.add(job)
        await session.commit()
        await session.refresh(job)
        job_id = job.id

    print(f"[CLI] Created Job ID: {job_id}. Running processing pipeline...")
    await JobWorker.process_job(job_id)

    # Check result
    storage = get_storage()
    job_dir = storage.get_job_dir(job_id)

    target_job_output = os.path.join(output_dir, project_name)
    os.makedirs(target_job_output, exist_ok=True)

    # Copy output files to target_job_output
    for fname in os.listdir(job_dir):
        src_file = os.path.join(job_dir, fname)
        if os.path.isfile(src_file):
            import shutil
            shutil.copy2(src_file, os.path.join(target_job_output, fname))

    print(f"[CLI] Successfully saved outputs for '{project_name}' to: {target_job_output}")
    return True


async def main_async():
    parser = argparse.ArgumentParser(description="IncuBrix B-Roll Batch CLI Runner")
    parser.add_argument("--input", "-i", required=True, help="Path to input text, json, audio file, or directory")
    parser.add_argument("--output-dir", "-o", default="./cli_outputs", help="Directory to save generated outputs")
    parser.add_argument("--voice", "-v", default="en-US-AriaNeural", help="TTS Voice identifier")
    parser.add_argument("--aspect-ratio", "-ar", action="append", default=None, help="Target aspect ratios (16:9, 9:16, 1:1)")
    parser.add_argument("--style", "-s", default="bright, modern, real-world footage", help="Visual style guideline")

    args = parser.parse_args()
    ratios = args.aspect_ratio or ["16:9"]

    setup_logging(level="INFO")
    await init_db()

    input_path = Path(args.input)
    if not input_path.exists():
        print(f"Error: Input path '{args.input}' does not exist.")
        sys.exit(1)

    targets = []
    if input_path.is_dir():
        for ext in ("*.json", "*.txt", "*.mp3", "*.wav"):
            targets.extend(input_path.glob(ext))
    else:
        targets = [input_path]

    if not targets:
        print(f"No valid input files found in '{args.input}'.")
        sys.exit(1)

    print(f"Found {len(targets)} input(s) to process.")
    for target in targets:
        await process_single_input(
            input_path=str(target),
            output_dir=args.output_dir,
            voice=args.voice,
            aspect_ratios=ratios,
            style=args.style,
        )

    print("\n[CLI] Batch processing completed successfully.")


def main():
    asyncio.run(main_async())


if __name__ == "__main__":
    main()
