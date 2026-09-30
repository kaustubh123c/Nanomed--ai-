"""
Synthetic training-data generator for the AI Experiment Planner models.

Why synthetic data grounded in physics: a brand-new lab has no historical
experiment log to train on yet. Rather than shipping untrained (useless)
models, we generate a large, physically consistent dataset by sampling the
Beer-Lambert physics engine across the realistic material / energy /
thickness space and adding measurement-realistic Gaussian noise (detector
counting statistics + thickness manufacturing tolerance). The AI models
(RandomForest / XGBoost) then learn the *shape* of the physics response
surface plus noise robustness — exactly what a data-driven planner needs to
generalize past hand-coded formulas and continues to improve for real once
`experiments` collected in the app are appended to this dataset (see
`load_combined_dataset`).
"""

from __future__ import annotations

import random
from typing import List

import numpy as np
import pandas as pd

from app.ai.materials_seed import DEFAULT_MATERIALS, DETECTORS
from app.physics.engine import run_beer_lambert, get_detector_efficiency

RNG_SEED = 42


def generate_training_data(n_samples: int = 4000, seed: int = RNG_SEED) -> pd.DataFrame:
    rng = random.Random(seed)
    np_rng = np.random.default_rng(seed)

    rows: List[dict] = []
    for _ in range(n_samples):
        material = rng.choice(DEFAULT_MATERIALS)
        detector = rng.choice(DETECTORS)
        energy_kev = rng.uniform(30, 1300)
        thickness_cm = rng.uniform(0.01, 5.0)
        initial_counts = rng.uniform(2000, 50000)

        eff = get_detector_efficiency(detector) * np_rng.normal(1.0, 0.03)
        eff = float(np.clip(eff, 0.05, 1.0))

        result = run_beer_lambert(
            atomic_number=material["atomic_number"],
            atomic_mass=material["atomic_mass"],
            density_g_cm3=material["density"],
            energy_kev=energy_kev,
            thickness_cm=thickness_cm,
            initial_counts=initial_counts,
            detector_efficiency=eff,
        )

        # Measurement noise: Poisson-like counting statistics + small thickness jitter
        noisy_counts = max(
            0.0, np_rng.normal(result.final_counts, max(1.0, result.final_counts ** 0.5))
        )
        noisy_absorption = float(
            np.clip(np_rng.normal(result.absorption_percent, 0.6), 0.01, 99.99)
        )

        rows.append(
            {
                "material_name": material["name"],
                "atomic_number": material["atomic_number"],
                "atomic_mass": material["atomic_mass"],
                "density": material["density"],
                "detector": detector,
                "detector_efficiency": eff,
                "energy_kev": energy_kev,
                "thickness_cm": thickness_cm,
                "initial_counts": initial_counts,
                "absorption_percent": noisy_absorption,
                "final_counts": noisy_counts,
                "linear_attenuation_coeff": result.linear_attenuation_coefficient,
                "mass_attenuation_coeff": result.mass_attenuation_coefficient,
            }
        )

    return pd.DataFrame(rows)


def load_combined_dataset(repo_experiments: List[dict] | None = None) -> pd.DataFrame:
    """Synthetic physics-grounded data, optionally augmented with real logged
    experiments once the lab has collected some (keeps the models improving
    over time without ever needing a manual retraining pipeline change)."""
    df = generate_training_data()
    if repo_experiments:
        real_rows = []
        for exp in repo_experiments:
            try:
                real_rows.append(
                    {
                        "material_name": exp["material_name"],
                        "atomic_number": exp["atomic_number"],
                        "atomic_mass": exp["atomic_mass"],
                        "density": exp["density"],
                        "detector": exp.get("detector", DETECTORS[0]),
                        "detector_efficiency": get_detector_efficiency(exp.get("detector")),
                        "energy_kev": exp["energy_kev"],
                        "thickness_cm": exp["thickness_cm"],
                        "initial_counts": exp["initial_counts"],
                        "absorption_percent": exp["absorption_percent"],
                        "final_counts": exp["final_counts"],
                        "linear_attenuation_coeff": exp.get("linear_attenuation_coeff", 0),
                        "mass_attenuation_coeff": exp.get("mass_attenuation_coeff", 0),
                    }
                )
            except KeyError:
                continue
        if real_rows:
            df = pd.concat([df, pd.DataFrame(real_rows)], ignore_index=True)
    return df
