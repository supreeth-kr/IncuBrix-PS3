# IncuBrix Test Pack & Evaluation Suite

This test pack provides curated scripts, asset configurations, and expected benchmarks to thoroughly test the B-Roll Video Engine across diverse video dimensions, linguistic tones, numerical expressions, and sensitive scenarios.

---

## 1. Test Scenarios Included

| File | Primary Aspect Ratio | Focus / Challenge Tested |
| :--- | :--- | :--- |
| `sample_scripts/tech_innovation.json` | 16:9 Landscape (1920x1080) | Technology, distributed systems, high pace |
| `sample_scripts/abstract_statistics.json` | 16:9 Landscape (1920x1080) | Numerical statistics (78%), abstract finance |
| `sample_scripts/portrait_format.json` | 9:16 Portrait (1080x1920) | Mobile reels / vertical TikTok / Shorts format |
| `sample_scripts/sensitive_topics.json` | 16:9 Landscape (1920x1080) | Respectful healthcare visuals, avoid rules |
| `sample_scripts/square_social.json` | 1:1 Square (1080x1080) | Square social media feed, architecture |

---

## 2. Running Batch Tests via CLI

You can execute the entire test pack non-interactively using the batch runner:

```powershell
# From project root
.\backend\venv\Scripts\python.exe backend/cli.py --input test_pack/sample_scripts --output-dir test_pack/outputs
```

Outputs generated for each test project:
- Rendered MP4 video (`video_16x9.mp4`, `video_9x16.mp4`, `video_1x1.mp4`)
- Synchronized subtitles (`captions.srt`)
- Complete scene timeline (`timeline.json`)
- Comprehensive licensing and audit manifest (`manifest.json`)
