# Multi-Material + Multi-Energy Simulation

The Sim Lab now supports:

- Up to **8 user-defined elements** per material composition.
- User-entered **weight fraction (%)** for every element; fractions must total 100%.
- Up to **200 energy levels** in MeV.
- Material density and thickness inputs.
- Offline database or NIST XCOM data source selection.
- Results for MAC, LAC, HVL, MFP, Zeff, Zeq and RSE when the selected data source supports them.
- Energy-response line chart and CSV export.

## Example composition

Au 25%, Gd 15%, Hf 15%, Bi 10%, Ag 10%, Ti 10%, Zn 10%, Si 5%.

## API

`POST /api/calculators/advanced/multi-material-sweep`

```json
{
  "elements": [
    {"element": "Au", "weight_fraction": 25},
    {"element": "Gd", "weight_fraction": 15}
  ],
  "density_g_cm3": 10,
  "thickness_cm": 1,
  "energies_MeV": [0.05, 0.1, 0.5, 1, 2, 5, 10],
  "data_source": "offline"
}
```
