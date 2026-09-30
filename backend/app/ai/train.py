"""
Training pipeline for the NanoMed AI planner regression models.

Model 1 — Thickness Prediction        (RandomForestRegressor)
Model 2 — Absorption Prediction       (RandomForestRegressor)
Model 3 — Detector Count Prediction   (XGBRegressor)

Model 4 (Material Recommendation Engine) and Model 5 (AI Scientist /
explanation generator) do not need their own trained regressor — they
compose Models 1-3 across the material catalogue (see app/ai/inference.py).

Models are trained lazily on first use and cached to .joblib files under
app/ai/artifacts/, so a fresh clone works with zero manual "run this script"
step, but re-training is instant (`python -m app.ai.train`) whenever the
dataset generator or feature set changes.
"""

from __future__ import annotations

from pathlib import Path

import joblib
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split
from xgboost import XGBRegressor

from app.ai.dataset_gen import load_combined_dataset

ARTIFACTS_DIR = Path(__file__).resolve().parent / "artifacts"
ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

FEATURES_COMMON = ["atomic_number", "atomic_mass", "density", "energy_kev"]


def _split(df, feature_cols, target_col):
    X = df[feature_cols]
    y = df[target_col]
    return train_test_split(X, y, test_size=0.2, random_state=42)


def train_thickness_model(df):
    """Model 1: given material props + energy + *target* absorption -> thickness."""
    feature_cols = FEATURES_COMMON + ["absorption_percent"]
    X_train, X_test, y_train, y_test = _split(df, feature_cols, "thickness_cm")

    model = RandomForestRegressor(n_estimators=250, max_depth=14, random_state=42, n_jobs=-1)
    model.fit(X_train, y_train)
    metrics = {
        "mae_cm": float(mean_absolute_error(y_test, model.predict(X_test))),
        "r2": float(r2_score(y_test, model.predict(X_test))),
    }
    joblib.dump({"model": model, "features": feature_cols}, ARTIFACTS_DIR / "thickness_model.joblib")
    return metrics


def train_absorption_model(df):
    """Model 2: given material props + thickness + energy -> absorption %."""
    feature_cols = FEATURES_COMMON + ["thickness_cm"]
    X_train, X_test, y_train, y_test = _split(df, feature_cols, "absorption_percent")

    model = RandomForestRegressor(n_estimators=250, max_depth=14, random_state=42, n_jobs=-1)
    model.fit(X_train, y_train)
    metrics = {
        "mae_percent": float(mean_absolute_error(y_test, model.predict(X_test))),
        "r2": float(r2_score(y_test, model.predict(X_test))),
    }
    joblib.dump({"model": model, "features": feature_cols}, ARTIFACTS_DIR / "absorption_model.joblib")
    return metrics


def train_counts_model(df):
    """Model 3: given material props + thickness + detector efficiency + energy
    + initial counts -> expected final detector counts."""
    feature_cols = FEATURES_COMMON + ["thickness_cm", "detector_efficiency", "initial_counts"]
    X_train, X_test, y_train, y_test = _split(df, feature_cols, "final_counts")

    model = XGBRegressor(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.08,
        subsample=0.9,
        colsample_bytree=0.9,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)
    metrics = {
        "mae_counts": float(mean_absolute_error(y_test, model.predict(X_test))),
        "r2": float(r2_score(y_test, model.predict(X_test))),
    }
    joblib.dump({"model": model, "features": feature_cols}, ARTIFACTS_DIR / "counts_model.joblib")
    return metrics


def train_all(repo_experiments=None) -> dict:
    df = load_combined_dataset(repo_experiments)
    metrics = {
        "thickness_model": train_thickness_model(df),
        "absorption_model": train_absorption_model(df),
        "counts_model": train_counts_model(df),
        "training_rows": len(df),
    }
    joblib.dump(metrics, ARTIFACTS_DIR / "metrics.joblib")
    return metrics


if __name__ == "__main__":
    result = train_all()
    print("Training complete:")
    for k, v in result.items():
        print(f"  {k}: {v}")
