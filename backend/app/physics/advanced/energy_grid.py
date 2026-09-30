"""
Selected photon energy grid for multi-energy shielding sweeps.

Ported from Physics-AI's `physics/energy_grid.py` (0.01-1.50 MeV). This is a
Physics-AI grid; it is not claimed to be an exact copy of the PHY-X grid.
"""

SELECTED_ENERGY_MIN_MEV = 0.01
SELECTED_ENERGY_MAX_MEV = 1.50

SELECTED_ENERGY_GRID_MEV = (
    0.010, 0.015, 0.020, 0.025, 0.030, 0.040, 0.050, 0.060, 0.080, 0.100,
    0.120, 0.150, 0.180, 0.200, 0.250, 0.300, 0.400, 0.500, 0.600, 0.700,
    0.800, 1.000, 1.100, 1.250, 1.500,
)


def get_selected_energy_grid():
    return list(SELECTED_ENERGY_GRID_MEV)
