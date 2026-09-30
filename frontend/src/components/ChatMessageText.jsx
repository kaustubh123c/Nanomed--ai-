/**
 * Chatbot replies use light markdown (**bold**, "- " bullet lines) for
 * emphasis — e.g. "Created material **Zirconia**". The chat bubbles render
 * with plain whitespace-pre-wrap, so without this the asterisks would show
 * up literally. This renders just enough markdown to look right: **bold**
 * spans and "- " bullets get a small indent + dot, everything else passes
 * through untouched. Intentionally not a full markdown parser — the
 * chatbot's own output vocabulary is small and fixed.
 */
export default function ChatMessageText({ text }) {
  if (!text) return null;

  const renderInline = (line, keyPrefix) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
        return (
          <strong key={`${keyPrefix}-${i}`} className="font-semibold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return <span key={`${keyPrefix}-${i}`}>{part}</span>;
    });
  };

  const lines = text.split("\n");

  return (
    <>
      {lines.map((line, i) => {
        const bullet = /^\s*[-•]\s+/.test(line);
        const content = bullet ? line.replace(/^\s*[-•]\s+/, "") : line;
        return (
          <div key={i} className={bullet ? "flex gap-2 pl-0.5" : undefined}>
            {bullet && <span className="opacity-50">•</span>}
            <span>{renderInline(content, i)}</span>
          </div>
        );
      })}
    </>
  );
}
