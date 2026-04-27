import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const TARGETS = [
  { code: 'de', name: 'German' },
  { code: 'tr', name: 'Turkish' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'zh', name: 'Chinese (Simplified)' },
  { code: 'ko', name: 'Korean' },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Load current rules: prefer rules_text_en, fall back to legacy rules_text
    const all = await base44.asServiceRole.entities.AppSettings.list('-created_date', 500);
    const byKey = {};
    all.forEach(s => { byKey[s.key] = s; });

    const sourceText =
      (byKey['rules_text_en']?.value) ||
      (byKey['rules_text']?.value) ||
      '';

    if (!sourceText.trim()) {
      return Response.json({ error: 'No source rules text found.' }, { status: 400 });
    }

    const results = {};
    const errors = {};

    // Translate sequentially to avoid LLM rate limits
    for (const target of TARGETS) {
      try {
        const prompt = `Translate the following Markdown text from English to ${target.name}.
Rules:
- Preserve ALL Markdown formatting (headings, tables, lists, bold, italic, links, code blocks).
- Preserve table structure exactly (same number of columns and rows).
- Do NOT translate proper nouns, acronyms, or game-specific terms: DKP, MGE, MEE, GEE, DDE, Top 10, Top 20, UTC, Imperial Buff, Wonder Contest, Battle of Dawn, Rally Leader, Hero Need, Friendly Zone.
- Translate descriptive text, headings, and table headers normally.
- Output ONLY the translated Markdown — no explanations, no wrapping code fences.

Source text:
---
${sourceText}
---`;

        const result = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt });
        const translated = typeof result === 'string' ? result : (result?.text || result?.content || '');
        if (!translated || !translated.trim()) {
          errors[target.code] = 'Empty translation';
          continue;
        }

        const key = `rules_text_${target.code}`;
        const existing = byKey[key];
        if (existing) {
          await base44.asServiceRole.entities.AppSettings.update(existing.id, { value: translated });
        } else {
          await base44.asServiceRole.entities.AppSettings.create({ key, value: translated });
        }
        results[target.code] = { ok: true, length: translated.length };
      } catch (err) {
        errors[target.code] = err.message || String(err);
      }
    }

    // Also ensure rules_text_en is stored explicitly
    if (!byKey['rules_text_en']) {
      await base44.asServiceRole.entities.AppSettings.create({ key: 'rules_text_en', value: sourceText });
    }

    return Response.json({ ok: true, results, errors });
  } catch (error) {
    console.error('translateRules error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});