import { paperGameOrder, paperScores } from "/paper-results.js?v=gvc-paper";

export const formatRankScore = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function recordedScore(run) {
  return run.score ?? run.mean;
}

export function summarizeResults(runs) {
  const games = new Map();
  const models = new Map();
  const scaled = new Map();

  for (const run of runs) {
    if (run.version === "rerun") continue;
    if (!games.has(run.gameId)) games.set(run.gameId, { id: run.gameId, name: run.game, results: new Map() });
    if (!models.has(run.model)) models.set(run.model, { id: run.model, name: run.modelName, points: [] });
    const { results } = games.get(run.gameId);
    if (results.has(run.model)) throw new Error("Duplicate model result for a game.");
    results.set(run.model, run);
  }

  for (const game of games.values()) {
    const scored = [...game.results.values()].filter((run) => Number.isFinite(recordedScore(run)));
    if (!scored.length) continue;
    const values = scored.map(recordedScore);
    const low = Math.min(...values);
    const high = Math.max(...values);
    const paperGameIndex = paperGameOrder.indexOf(game.id);
    const usePaperScale = paperGameIndex >= 0 && scored.every((run) => {
      const formal = run.model === "astra" || run.model === "opus";
      const paperRunId = formal ? `${game.id}-${run.model}` : `${game.id}-${run.model}-paper`;
      return run.id === paperRunId && Object.hasOwn(paperScores, run.model)
        && (formal ? run.batch === "current" && run.version === "formal" : run.batch === "paper");
    });
    for (const run of scored) {
      const score = usePaperScale
        ? paperScores[run.model][paperGameIndex]
        : low === high ? 50 : 100 * (recordedScore(run) - low) / (high - low);
      scaled.set(run.id, score);
      models.get(run.model).points.push(score);
    }
  }

  const standings = [...models.values()].map(({ id, name, points }) => ({
    id,
    name,
    mean: points.length && points.length === games.size
      ? points.reduce((sum, score) => sum + score, 0) / games.size
      : null,
  })).sort((first, second) => {
    if (first.mean === null) return second.mean === null ? first.name.localeCompare(second.name) : 1;
    if (second.mean === null) return -1;
    return second.mean - first.mean || first.name.localeCompare(second.name);
  });

  let previous;
  for (const [index, model] of standings.entries()) {
    model.rank = model.mean === null ? null : previous?.mean === model.mean ? previous.rank : index + 1;
    previous = model;
  }

  return {
    standings,
    scaled,
    games: [...games.values()].sort((first, second) => first.name.localeCompare(second.name)),
  };
}
