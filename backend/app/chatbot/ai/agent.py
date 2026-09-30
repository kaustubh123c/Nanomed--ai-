"""
Action Agent
------------
This is the piece that lets the chatbot actually perform tasks in NanoMed
AI ("create a material", "log an experiment", "recommend a material for
90% absorption at 140 keV") instead of only answering questions about them.

Flow for every incoming message:
1. If this user has a *pending* action awaiting more info (e.g. we already
   asked "what's the density?"), try to fill in the missing slot(s) from
   this message first.
2. Otherwise, try to detect a brand-new action request:
   a. If GEMINI_API_KEY is configured, ask Gemini to pick a function via
      native function-calling.
   b. Otherwise (or if that call fails/returns nothing), fall back to the
      deterministic pattern parser in `fallback_parser.py`.
3. If an action + all its required arguments are resolved, execute it
   through `actions.py` (never directly from LLM output — always through
   the same validated functions the REST API uses) and return a plain
   status message.
4. If an action was detected but is missing required arguments, remember
   the partial call for this user and ask a targeted follow-up question.
5. If nothing action-like was detected, return None so the caller falls
   through to normal chat/RAG handling.
"""
from __future__ import annotations

import re
from typing import Optional

from app.chatbot.ai import actions, fallback_parser, memory
from app.chatbot.ai.tools_schema import REQUIRED_ARGS, TOOL_NAMES, TOOLS
from app.models.user import UserOut

FRIENDLY_FIELD_NAMES = {
    "name": "material name",
    "formula": "chemical formula",
    "density": "density (g/cm³)",
    "atomic_number": "atomic number (Z)",
    "atomic_mass": "atomic/molar mass (g/mol)",
    "material": "material",
    "detector": "detector",
    "gamma_source": "gamma source",
    "energy_kev": "gamma energy (keV)",
    "thickness_cm": "thickness (cm)",
    "target_absorption_percent": "target absorption (%)",
    "experiment_name": "experiment name",
}


def _missing_required(tool: str, args: dict) -> list[str]:
    required = REQUIRED_ARGS.get(tool, [])
    return [f for f in required if args.get(f) in (None, "")]


def _ask_for_missing(tool: str, missing: list[str]) -> str:
    labels = [FRIENDLY_FIELD_NAMES.get(f, f) for f in missing]
    if len(labels) == 1:
        return f"Sure — what's the {labels[0]}?"
    return "Sure — I just need a couple more details: " + ", ".join(labels) + "."


def _try_gemini_tool_call(message: str) -> Optional[dict]:
    """Best-effort Gemini function-calling. Returns {"tool", "args"} or
    None if unavailable / the model chose not to call a function."""
    try:
        from google.genai import types

        from app.chatbot.ai.llm import _get_client
        from app.chatbot.config import MODEL_NAME
    except Exception:
        return None

    try:
        client = _get_client()
    except ValueError:
        return None  # no GEMINI_API_KEY configured

    tool = types.Tool(
        function_declarations=[
            types.FunctionDeclaration(name=t["name"], description=t["description"], parameters=t["parameters"])
            for t in TOOLS
        ]
    )
    config = types.GenerateContentConfig(
        tools=[tool],
        system_instruction=(
            "You are the action-routing layer for the NanoMed AI assistant. "
            "If the user's message clearly asks to create/list/delete a material, "
            "log an experiment, or get a material recommendation, call exactly one "
            "matching function with as many arguments as you can confidently extract "
            "from the message. Do not invent values you weren't given. If the message "
            "is a question, greeting, or general chat, do not call any function."
        ),
    )

    try:
        response = client.models.generate_content(model=MODEL_NAME, contents=message, config=config)
    except Exception:
        return None

    try:
        for part in response.candidates[0].content.parts:
            fc = getattr(part, "function_call", None)
            if fc is not None and fc.name in TOOL_NAMES:
                return {"tool": fc.name, "args": dict(fc.args or {})}
    except (AttributeError, IndexError, TypeError):
        return None
    return None


async def handle(message: str, user: Optional[UserOut], user_key: str) -> Optional[str]:
    """Returns a chat reply string if this message was handled as an
    action (new or continuing a pending one), else None."""

    pending = memory.get_pending(user_key)

    if pending is not None:
        if re.search(r"\b(cancel|nevermind|never mind|forget it|stop|start over)\b", message, re.IGNORECASE):
            memory.clear_pending(user_key)
            return "No problem, cancelled. What would you like to do instead?"

        missing = _missing_required(pending["tool"], pending["args"])
        filled = fallback_parser.extract_missing(missing, message)

        # If this reply didn't fill anything AND it looks like the start of
        # a brand-new command, don't trap the user in a stale pending action
        # forever — drop it and let the message be handled fresh below.
        if not filled:
            fresh = fallback_parser.parse_command(message)
            if fresh is not None and fresh["tool"] != pending["tool"]:
                memory.clear_pending(user_key)
                pending = None

        if pending is not None:
            pending["args"].update(filled)
            still_missing = _missing_required(pending["tool"], pending["args"])

            if still_missing:
                memory.set_pending(user_key, pending)
                return _ask_for_missing(pending["tool"], still_missing)

            memory.clear_pending(user_key)
            return await _execute(pending["tool"], pending["args"], user)

    # Do not let the function-calling model turn ordinary questions such as
    # "what is the density of MgCl2?" into a create-material action.  Only
    # enter the action router when the user clearly asks to perform something.
    action_cue = re.search(
        r"\b(create|add|register|delete|remove|list|show|view|log|record|save|run|start|perform|simulate|calculate|recommend|suggest|open|go to)\b",
        message,
        re.IGNORECASE,
    )
    if not action_cue:
        return None

    call = _try_gemini_tool_call(message) or fallback_parser.parse_command(message)
    if call is None:
        return None

    tool, args = call["tool"], call["args"]
    missing = _missing_required(tool, args)
    if missing:
        memory.set_pending(user_key, {"tool": tool, "args": args})
        return _ask_for_missing(tool, missing)

    return await _execute(tool, args, user)


async def _execute(tool: str, args: dict, user: Optional[UserOut]) -> str:
    if user is None and tool != "run_simulation":
        return (
            "I can do that, but you'll need to be logged in first — "
            "actions like creating materials or logging experiments are tied to your account."
        )

    fn = actions.ACTIONS.get(tool)
    if fn is None:
        return "I recognized that as an action, but I don't know how to perform it yet."

    result = await fn(user, args)
    return result.message
