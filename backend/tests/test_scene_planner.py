import pytest
from app.schemas.job import SceneInput
from app.services.scene_planner import ScenePlanner


def test_scene_planner_coverage_and_order():
    script = (
        "Modern artificial intelligence is transforming how videos are created. "
        "With intelligent scene segmentation, narration timings align seamlessly. "
        "Over 85% of creative teams report higher engagement with dynamic B-roll."
    )
    total_duration = 18.0

    scenes = ScenePlanner.plan_scenes(script=script, total_audio_duration=total_duration)

    assert len(scenes) >= 3
    assert scenes[0].start_time == 0.0
    assert round(scenes[-1].end_time, 2) == round(total_duration, 2)

    # Monotonicity and zero gaps/overlaps
    for i in range(len(scenes) - 1):
        assert scenes[i].end_time == scenes[i + 1].start_time
        assert scenes[i].duration > 0
        assert scenes[i].start_time < scenes[i].end_time


def test_scene_planner_empty_script_raises_error():
    with pytest.raises(ValueError):
        ScenePlanner.plan_scenes(script="")

    with pytest.raises(ValueError):
        ScenePlanner.plan_scenes(script="   ")


def test_scene_planner_predefined_scenes():
    predefined = [
        SceneInput(text="Welcome to the future of video production.", visual_hint="futuristic city skyline"),
        SceneInput(text="Automated pipelines save hours of editing.", visual_hint="editing timeline speed"),
    ]
    total_duration = 10.0

    scenes = ScenePlanner.plan_scenes(predefined_scenes=predefined, total_audio_duration=total_duration)

    assert len(scenes) == 2
    assert scenes[0].start_time == 0.0
    assert scenes[1].end_time == total_duration
    assert scenes[0].visual_hint == "futuristic city skyline"


def test_scene_planner_abbreviations_and_numbers():
    script = "Dr. Smith presented 4.5 million data points to the board in the U.S. office."
    scenes = ScenePlanner.plan_scenes(script=script, total_audio_duration=8.0)

    # Should not break in the middle of Dr. or 4.5
    assert len(scenes) >= 1
    full_text = " ".join(s.narration_text for s in scenes)
    assert "Dr. Smith" in full_text
    assert "4.5 million" in full_text
