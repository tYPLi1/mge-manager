// Shared utility for building Discord embeds for event uploads / resends / corrections.
// Goals:
//  - Group players by alliance and show alliance name
//  - When no ranking exists, sort players A-Z by name within each alliance,
//    and sort alliances A-Z
//  - When ranking exists (Top 20 / Outside / All ranked), keep ranking order
//  - Never split lines: each chunk is built by accumulating whole player rows.
//    A group header (e.g. "**🛡 ERA1**") is always kept together with at least
//    one of its rows in the same chunk.
//  - Discord field limit: 1024 chars per field, ~5500 chars per embed.

const MAX_FIELD_LENGTH = 1000; // safety margin under Discord's 1024
const MAX_EMBED_LENGTH = 5500;

function formatDkp(n) {
  return n > 0 ? `+${n}` : `${n}`;
}

function buildRowLine(row) {
  const rank = row.groupRank
    ? `\`#${row.groupRank}\``
    : row.group === "Present"
      ? "✅"
      : row.group === "Absent"
        ? "❌"
        : "•";
  let line = `${rank} **${row.playerName}** — \`${formatDkp(row.dkp)} DKP\``;
  if (row.originalDkp !== undefined && row.originalDkp !== row.dkp) {
    line += ` ⚠ *(capped from ${formatDkp(row.originalDkp)})*`;
  }
  if (row.overrideApplied) line += " ⚡ *Override*";
  if (row.note && row.note.trim()) line += ` — _${row.note}_`;
  return line;
}

/**
 * Build groups of lines. Each group = { header: string, lines: string[] }
 * Rows have: { playerName, alliance, dkp, group, groupRank, note, overrideApplied }
 * If `useAllianceGrouping` is true (no ranking), groups are sorted A-Z by alliance name,
 * and rows within each alliance are sorted A-Z by playerName.
 * Otherwise groups follow the ranking buckets (Top 20 / Outside / Present / Absent / All).
 */
function buildGroups(rows) {
  if (!rows || rows.length === 0) return [];

  const hasRanking = rows.some(r => r.groupRank);
  const hasYn = rows.some(r => r.group === "Present" || r.group === "Absent");

  // YN events: keep Present / Absent grouping (no alliance split)
  if (hasYn) {
    const present = rows.filter(r => r.group === "Present").sort((a, b) => a.playerName.localeCompare(b.playerName));
    const absent = rows.filter(r => r.group === "Absent").sort((a, b) => a.playerName.localeCompare(b.playerName));
    const groups = [];
    if (present.length) groups.push({ header: "✅ **Present**", lines: present.map(buildRowLine) });
    if (absent.length) groups.push({ header: "❌ **Absent**", lines: absent.map(buildRowLine) });
    return groups;
  }

  // Ranked events: keep ranking-bucket grouping
  if (hasRanking) {
    const sortByRank = (a, b) => (a.groupRank || 999) - (b.groupRank || 999);
    const top20 = rows.filter(r => r.group === "Top 20").sort(sortByRank);
    const outside = rows.filter(r => r.group === "Outside").sort(sortByRank);
    const allRanked = rows.filter(r => r.group === "All" || (!r.group && r.groupRank)).sort(sortByRank);
    const groups = [];
    if (allRanked.length) groups.push({ header: "📋 **Results**", lines: allRanked.map(buildRowLine) });
    if (top20.length) groups.push({ header: "🏆 **Top 20**", lines: top20.map(buildRowLine) });
    if (outside.length) groups.push({ header: "🌐 **Outside**", lines: outside.map(buildRowLine) });
    return groups;
  }

  // No ranking: group by alliance, sort A-Z (alliances and players)
  const byAlliance = new Map();
  for (const r of rows) {
    const allianceKey = (r.alliance && r.alliance.trim()) || "—";
    if (!byAlliance.has(allianceKey)) byAlliance.set(allianceKey, []);
    byAlliance.get(allianceKey).push(r);
  }
  // Sort alliances A-Z (with "—" / no alliance pushed to end)
  const allianceNames = Array.from(byAlliance.keys()).sort((a, b) => {
    if (a === "—" && b !== "—") return 1;
    if (b === "—" && a !== "—") return -1;
    return a.localeCompare(b);
  });
  return allianceNames.map(name => {
    const sorted = byAlliance.get(name).sort((a, b) => a.playerName.localeCompare(b.playerName));
    const label = name === "—" ? "No Alliance" : name;
    return { header: `🛡 **${label}**`, lines: sorted.map(buildRowLine) };
  });
}

/**
 * Chunk groups into Discord-safe field values.
 * Returns an array of field strings. A group header is always followed by at
 * least one of its lines within the same field — never split mid-group leaving
 * an orphan header at the end.
 */
function chunkGroupsIntoFields(groups) {
  const chunks = [];
  let current = "";

  const flush = () => {
    if (current.trim()) chunks.push(current.trim());
    current = "";
  };

  const appendLine = (line) => {
    const next = current ? current + "\n" + line : line;
    if (next.length > MAX_FIELD_LENGTH && current) {
      flush();
      current = line;
    } else {
      current = next;
    }
  };

  for (const group of groups) {
    if (!group.lines.length) continue;
    // Try to fit header + first line together. If current chunk has no room
    // for both, start a new chunk.
    const headerAndFirst = group.header + "\n" + group.lines[0];
    if (current) {
      const tentative = current + "\n\n" + headerAndFirst;
      if (tentative.length > MAX_FIELD_LENGTH) {
        flush();
        current = headerAndFirst;
      } else {
        current = tentative;
      }
    } else {
      current = headerAndFirst;
    }
    // Append remaining lines normally
    for (let i = 1; i < group.lines.length; i++) {
      appendLine(group.lines[i]);
    }
  }
  flush();
  return chunks;
}

/**
 * Build embeds array for an event upload / resend / correction.
 *
 * @param {Object} opts
 * @param {string} opts.title - Embed title
 * @param {string} opts.description - Embed description (event name + date)
 * @param {Array} opts.rows - Player rows (see buildRowLine)
 * @param {number} opts.totalDkp
 * @param {number} opts.playersUpdated
 * @param {string} opts.leaderboardUrl
 * @param {number} [opts.color=0x8b5cf6]
 * @param {string} [opts.linkLabel="View Leaderboard"]
 * @param {Array} [opts.extraFields] - additional fields prepended on the FIRST embed (after the standard counters)
 */
export function buildEventEmbeds({
  title,
  description,
  rows,
  totalDkp,
  playersUpdated,
  leaderboardUrl,
  color = 0x8b5cf6,
  linkLabel = "View Leaderboard",
  extraFields = [],
}) {
  const groups = buildGroups(rows);
  const fieldChunks = chunkGroupsIntoFields(groups);

  const counterFields = [
    { name: "Players Updated", value: String(playersUpdated ?? rows.length), inline: true },
    { name: "Total DKP Distributed", value: String(totalDkp), inline: true },
    ...extraFields,
  ];

  const embeds = [];
  let currentFields = [...counterFields];
  let currentLength = counterFields.reduce((s, f) => s + f.name.length + f.value.length, 0) + 100;

  for (let i = 0; i < fieldChunks.length; i++) {
    const fieldName = i === 0 ? "📋 Results" : "📋 Results (cont.)";
    const fieldLength = fieldName.length + fieldChunks[i].length;
    if (currentLength + fieldLength > MAX_EMBED_LENGTH || currentFields.length >= 24) {
      embeds.push({ color, fields: currentFields });
      currentFields = [];
      currentLength = 100;
    }
    currentFields.push({ name: fieldName, value: fieldChunks[i], inline: false });
    currentLength += fieldLength;
  }
  if (currentFields.length > 0) embeds.push({ color, fields: currentFields });

  if (embeds.length > 0) {
    embeds[0].title = title;
    embeds[0].description = description;
    embeds[0].url = leaderboardUrl;
    const last = embeds[embeds.length - 1];
    last.fields = last.fields || [];
    last.fields.push({ name: "🔗 Link", value: `[${linkLabel}](${leaderboardUrl})`, inline: false });
    last.footer = { text: "DKP System" };
  }

  return embeds;
}