from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.core.deps import get_current_user
from app.models.user import UserOut
from app.physics.engine import density_from_mass_volume, thickness_from_intensities

router = APIRouter(prefix="/api/calculators", tags=["Calculators"])


# --------------------------------------------------------------------
# Density Formula:  rho = mass / volume
# --------------------------------------------------------------------
class DensityRequest(BaseModel):
    mass_g: float = Field(..., gt=0, description="Sample mass in grams")
    volume_cm3: float = Field(..., gt=0, description="Sample volume in cm^3")


@router.post("/density")
async def calculate_density(
    payload: DensityRequest, current_user: UserOut = Depends(get_current_user)
):
    density = density_from_mass_volume(payload.mass_g, payload.volume_cm3)
    return {
        "mass_g": payload.mass_g,
        "volume_cm3": payload.volume_cm3,
        "density_g_cm3": round(density, 6),
    }


# --------------------------------------------------------------------
# Required Thickness Calculator:  x = -ln(I / I0) / mu
# --------------------------------------------------------------------
class ThicknessRequest(BaseModel):
    initial_intensity: float = Field(..., gt=0, description="Initial intensity (I0)")
    final_intensity: float = Field(..., gt=0, description="Desired final intensity (I)")
    mu: float = Field(..., gt=0, description="Linear attenuation coefficient (cm^-1)")


@router.post("/thickness")
async def calculate_thickness(
    payload: ThicknessRequest, current_user: UserOut = Depends(get_current_user)
):
    if payload.final_intensity >= payload.initial_intensity:
        raise HTTPException(
            status_code=400,
            detail="Desired final intensity must be less than initial intensity.",
        )

    thickness = thickness_from_intensities(
        payload.initial_intensity, payload.final_intensity, payload.mu
    )
    return {
        "initial_intensity": payload.initial_intensity,
        "final_intensity": payload.final_intensity,
        "mu": payload.mu,
        "required_thickness_cm": round(thickness, 6),
    }
