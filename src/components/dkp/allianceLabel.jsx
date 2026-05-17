// Build a "AllianceName (count)" label by counting members in the given players list.
export function countAllianceMembers(players, name) {
  if (!Array.isArray(players)) return 0;
  if (name === "__none__") return players.filter(p => !p.alliance).length;
  return players.filter(p => p.alliance === name).length;
}

export function allianceLabel(name, players) {
  return `${name} (${countAllianceMembers(players, name)})`;
}