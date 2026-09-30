"""
Shared tool/function schema for the chatbot's action layer.

This single definition drives two things:
1. The Gemini function-calling `Tool` declaration (when GEMINI_API_KEY is
   set) — used to turn free-form natural language into a structured call.
2. The fallback slot-filling parser in `fallback_parser.py` (used when no
   API key is configured, or if the LLM call fails) — which knows which
   fields each action needs so it can ask the user for anything missing.

Keeping this in one place means the LLM path and the no-LLM path can never
drift apart on what a "create_material" call actually requires.
"""

TOOLS = [
    {
        "name": "create_material",
        "description": (
            "Create/register a new custom nanomaterial in the NanoMed AI materials "
            "catalogue. Use this when the user asks to add, create, or register a "
            "material with its physical properties."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Material name, e.g. 'Silver Nanoparticles'"},
                "formula": {"type": "string", "description": "Chemical formula, e.g. 'Ag'"},
                "density": {"type": "number", "description": "Density in g/cm^3"},
                "atomic_number": {"type": "number", "description": "Effective atomic number Z"},
                "atomic_mass": {"type": "number", "description": "Atomic/molar mass in g/mol"},
                "particle_size_nm": {"type": "number", "description": "Optional particle size in nanometers"},
                "crystal_structure": {"type": "string", "description": "Optional crystal structure"},
                "manufacturer": {"type": "string", "description": "Optional manufacturer/source"},
                "research_notes": {"type": "string", "description": "Optional free-text notes"},
            },
            "required": ["name", "formula", "density", "atomic_number", "atomic_mass"],
        },
    },
    {
        "name": "list_materials",
        "description": "List the nanomaterials available in the catalogue (built-in + custom).",
        "parameters": {"type": "object", "properties": {}},
    },
    {
        "name": "delete_material",
        "description": "Delete a custom material the user previously created (built-in reference materials can't be deleted).",
        "parameters": {
            "type": "object",
            "properties": {"name": {"type": "string", "description": "Name (or partial name) of the material to delete"}},
            "required": ["name"],
        },
    },
    {
        "name": "create_experiment",
        "description": (
            "Log/create a new gamma-ray attenuation experiment (assign work / add a "
            "record to the system). Runs the physics engine automatically."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "experiment_name": {"type": "string"},
                "material": {"type": "string", "description": "Material name to run the experiment on"},
                "detector": {"type": "string"},
                "gamma_source": {"type": "string"},
                "energy_kev": {"type": "number"},
                "thickness_cm": {"type": "number"},
                "initial_counts": {"type": "number", "description": "Defaults to 10000 if not given"},
                "temperature_c": {"type": "number"},
                "pressure_kpa": {"type": "number"},
                "notes": {"type": "string"},
            },
            "required": ["material", "detector", "gamma_source", "energy_kev", "thickness_cm"],
        },
    },
    {
        "name": "list_experiments",
        "description": "List recently logged experiments.",
        "parameters": {"type": "object", "properties": {}},
    },
    {
        "name": "run_simulation",
        "description": (
            "Run the NanoMed AI gamma-ray simulation for a material using the physics engine. "
            "Use this when the user asks to run, simulate, calculate shielding, attenuation, "
            "absorption, transmission, or final detector counts for a material at a given energy "
            "and thickness."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "material": {"type": "string", "description": "Material name or formula"},
                "detector": {"type": "string"},
                "gamma_source": {"type": "string"},
                "energy_kev": {"type": "number"},
                "thickness_cm": {"type": "number"},
                "target_absorption_percent": {"type": "number"},
                "initial_counts": {"type": "number"},
            },
            "required": ["material", "detector", "gamma_source", "energy_kev", "thickness_cm"],
        },
    },
    {
        "name": "recommend_material",
        "description": (
            "Run the AI Experiment Planner to recommend which nanomaterial + thickness "
            "achieves a target absorption percentage at a given gamma energy. Use this "
            "when the user asks what material to use / what would achieve X% absorption."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "target_absorption_percent": {"type": "number"},
                "energy_kev": {"type": "number"},
                "detector": {"type": "string", "description": "Optional, defaults to the first available detector"},
            },
            "required": ["target_absorption_percent", "energy_kev"],
        },
    },
]

TOOL_NAMES = {t["name"] for t in TOOLS}
REQUIRED_ARGS = {t["name"]: t["parameters"].get("required", []) for t in TOOLS}
