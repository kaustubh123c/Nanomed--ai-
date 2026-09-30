"""
Response Formatter
-------------------
The frontend chat widgets (ChatWidget.jsx, VirtualAssistant.jsx) already
render their own avatar, "NanoMed AI Assistant" header, and per-message
bubble styling — so replies are returned as plain text, not wrapped in a
decorative banner that would just repeat that chrome inside every bubble.
`title` is accepted for backward compatibility with callers but no longer
rendered; kept as a hook for future structured responses.
"""


def format_response(title: str, content: str) -> str:
    return content.strip()
