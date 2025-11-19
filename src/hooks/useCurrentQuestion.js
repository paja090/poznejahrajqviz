// utils/teamUtils.js

// jednoduchý shuffle
export function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Vytvoří náhodné týmy z hráčů
 * @param {Array} players - [{id, name, color, ...}]
 * @param {number} teamSize - preferovaná velikost týmu (např. 4)
 * @returns {{teams: Array, playerTeamMap: Object}}
 */
export function createRandomTeams(players, teamSize = 4) {
  if (!players || players.length === 0) {
    return { teams: [], playerTeamMap: {} };
  }

  const shuffled = shuffleArray(players);
  const totalPlayers = shuffled.length;

  // spočítáme počet týmů – aby měly cca teamSize hráčů
  const teamCount = Math.max(2, Math.round(totalPlayers / teamSize));
  const baseTeamSize = Math.floor(totalPlayers / teamCount);
  let remainder = totalPlayers % teamCount;

  const colors = [
    "#f97316",
    "#22c55e",
    "#3b82f6",
    "#e11d48",
    "#eab308",
    "#a855f7",
  ];

  const teams = [];
  const playerTeamMap = {};

  let index = 0;

  for (let t = 0; t < teamCount; t++) {
    const size = baseTeamSize + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder--;

    const slice = shuffled.slice(index, index + size);
    index += size;

    const teamId = `team_${t + 1}`;
    const team = {
      id: teamId,
      name: `Tým ${t + 1}`,
      color: colors[t % colors.length],
      players: slice.map((p) => p.id),
      score: 0,
      createdAt: Date.now(),
    };

    slice.forEach((p) => {
      playerTeamMap[p.id] = teamId;
    });

    teams.push(team);
  }

  return { teams, playerTeamMap };
}
