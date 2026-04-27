import React, { useState } from "react";
import { ChevronDown, ChevronRight, Copy, Check } from "lucide-react";

/**
 * Cheat sheet for the Rules editor — explains the Markdown + HTML syntax that
 * the Rules page renders, so users can author text externally and paste it in.
 */

const SECTIONS = [
  {
    title: "Headings",
    items: [
      { code: "# Heading 1", desc: "Largest title" },
      { code: "## Heading 2", desc: "Section title" },
      { code: "### Heading 3", desc: "Sub-section" },
    ],
  },
  {
    title: "Text formatting",
    items: [
      { code: "**bold**", desc: "Bold text" },
      { code: "*italic*", desc: "Italic text" },
      { code: "<u>underlined</u>", desc: "Underlined (HTML)" },
      { code: "~~strikethrough~~", desc: "Strikethrough" },
      { code: "`inline code`", desc: "Inline code" },
    ],
  },
  {
    title: "Colors (HTML)",
    items: [
      { code: '<span style="color:#f59e0b">amber text</span>', desc: "Amber" },
      { code: '<span style="color:#ef4444">red text</span>', desc: "Red" },
      { code: '<span style="color:#10b981">green text</span>', desc: "Green" },
      { code: '<span style="color:#3b82f6">blue text</span>', desc: "Blue" },
    ],
  },
  {
    title: "Lists",
    items: [
      { code: "- Item one\n- Item two\n- Item three", desc: "Bulleted list" },
      { code: "1. First\n2. Second\n3. Third", desc: "Numbered list" },
    ],
  },
  {
    title: "Tables",
    items: [
      {
        code: "| Column A | Column B |\n|----------|----------|\n| Cell 1   | Cell 2   |",
        desc: "Table with two columns",
      },
    ],
  },
  {
    title: "Other",
    items: [
      { code: "[Link text](https://example.com)", desc: "Hyperlink" },
      { code: "> Quoted block of text", desc: "Blockquote" },
      { code: "---", desc: "Horizontal divider" },
      { code: "<br/>", desc: "Line break" },
    ],
  },
];

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handle = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };
  return (
    <button
      type="button"
      onClick={handle}
      className="shrink-0 p-1 rounded text-gray-400 hover:text-amber-400 hover:bg-white/5 transition-colors"
      title="Copy"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export default function RulesSyntaxHelp() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-3 border border-white/10 rounded-lg bg-white/[0.02]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-medium text-gray-300 hover:text-white"
      >
        {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        <span>Formatting cheat sheet — write text externally and paste here</span>
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-3 border-t border-white/5 pt-3">
          <p className="text-xs text-gray-400 leading-relaxed">
            You can write your rules in any text editor (Notepad, Word, Google Docs as plain text, etc.)
            using the syntax below, and then paste them into the field above.
            The Rules page supports <span className="text-amber-400">Markdown</span> and basic{" "}
            <span className="text-amber-400">HTML</span> for colors and underline.
          </p>

          {SECTIONS.map((section) => (
            <div key={section.title}>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-400 mb-1.5">
                {section.title}
              </div>
              <div className="space-y-1.5">
                {section.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 bg-black/30 border border-white/5 rounded-md px-2.5 py-1.5"
                  >
                    <pre className="flex-1 text-[11px] font-mono text-gray-200 whitespace-pre-wrap break-all leading-relaxed">
                      {item.code}
                    </pre>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-gray-500 hidden sm:inline">{item.desc}</span>
                      <CopyButton text={item.code} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="text-[11px] text-gray-500 italic pt-1 border-t border-white/5">
            Tip: leave a blank line between paragraphs. Headings and tables also need a blank line above them.
          </div>
        </div>
      )}
    </div>
  );
}