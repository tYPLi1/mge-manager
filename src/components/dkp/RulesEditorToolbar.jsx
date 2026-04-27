import React, { useRef, useEffect, useState } from "react";
import { Bold, Italic, Underline, Palette, Eraser } from "lucide-react";

const COLORS = [
  { name: "Amber", value: "#f59e0b" },
  { name: "Red", value: "#ef4444" },
  { name: "Green", value: "#10b981" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Purple", value: "#a855f7" },
  { name: "Pink", value: "#ec4899" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "White", value: "#ffffff" },
];

/**
 * Toolbar for the rules textarea. Wraps the current selection (or inserts a
 * placeholder) with Markdown / HTML markup. The Rules page renders Markdown
 * with rehype-raw, so inline HTML like <u> and <span style="color:..."> works.
 */
export default function RulesEditorToolbar({ textareaRef, value, onChange }) {
  const colorMenuRef = useRef(null);
  const [colorOpen, setColorOpen] = useState(false);

  useEffect(() => {
    const onClick = (e) => {
      if (colorMenuRef.current && !colorMenuRef.current.contains(e.target)) {
        setColorOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const wrap = (before, after, placeholder = "text") => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.substring(start, end) || placeholder;
    const next = value.substring(0, start) + before + selected + after + value.substring(end);
    onChange(next);
    // Restore selection inside the wrapped content
    requestAnimationFrame(() => {
      ta.focus();
      const cursorStart = start + before.length;
      const cursorEnd = cursorStart + selected.length;
      ta.setSelectionRange(cursorStart, cursorEnd);
    });
  };

  const applyColor = (hex) => {
    wrap(`<span style="color:${hex}">`, `</span>`, "text");
    setColorOpen(false);
  };

  const clearFormatting = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    if (start === end) return;
    const selected = value.substring(start, end);
    const cleaned = selected
      .replace(/<\/?(?:span|u|b|i|strong|em)[^>]*>/gi, "")
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\*(.+?)\*/g, "$1")
      .replace(/__(.+?)__/g, "$1")
      .replace(/_(.+?)_/g, "$1");
    const next = value.substring(0, start) + cleaned + value.substring(end);
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start, start + cleaned.length);
    });
  };

  const Btn = ({ onClick, title, children }) => (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      className="p-1.5 rounded-md text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
    >
      {children}
    </button>
  );

  return (
    <div className="flex flex-wrap items-center gap-1 mb-2 p-1.5 bg-white/5 border border-white/10 rounded-lg">
      <Btn onClick={() => wrap("**", "**", "bold")} title="Bold (Markdown)">
        <Bold className="w-4 h-4" />
      </Btn>
      <Btn onClick={() => wrap("*", "*", "italic")} title="Italic (Markdown)">
        <Italic className="w-4 h-4" />
      </Btn>
      <Btn onClick={() => wrap("<u>", "</u>", "underlined")} title="Underline (HTML)">
        <Underline className="w-4 h-4" />
      </Btn>

      <div className="w-px h-5 bg-white/10 mx-1" />

      <div className="relative" ref={colorMenuRef}>
        <Btn onClick={() => setColorOpen((o) => !o)} title="Text color">
          <Palette className="w-4 h-4" />
        </Btn>
        {colorOpen && (
          <div className="absolute top-full left-0 mt-1 z-20 bg-[#111827] border border-white/10 rounded-lg p-2 shadow-xl">
            <div className="grid grid-cols-4 gap-1.5">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyColor(c.value)}
                  title={c.name}
                  className="w-7 h-7 rounded border border-white/20 hover:scale-110 transition-transform"
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <Btn onClick={clearFormatting} title="Clear formatting on selection">
        <Eraser className="w-4 h-4" />
      </Btn>

      <span className="ml-auto text-[10px] text-gray-500 px-2">
        Markdown + HTML supported
      </span>
    </div>
  );
}