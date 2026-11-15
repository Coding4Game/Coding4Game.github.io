import {
  browseUrl, byId, element, executionLogLabel, experimentUrl, formatCompact, formatMean, formatScore, gameMedia, get,
  policyScriptLabel, showGameplayPreview, testRuns, testVideoUrl,
} from "/common.js?v=recovered-evidence";
import { gameScoring } from "/game-scoring.js";
import { formatRankScore, recordedScore, summarizeResults } from "/ranking.js";
import { steamStoreUrl, taskBriefs } from "/task-briefs.js?v=steam";
import { playableUrl } from "/arcade/playable.js?v=duel";

const paperFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 });
let view;

function axis(values, normalized) {
  if (normalized) return { ticks: [0, 25, 50, 75, 100], position: (value) => 3 + value * .94 };
  const minimum = Math.min(0, ...values);
  const maximum = Math.max(0, ...values);
  const target = (maximum - minimum || 1) / 4;
  const magnitude = 10 ** Math.floor(Math.log10(target));
  const factor = [1, 2, 2.5, 5, 10].find((candidate) => candidate >= target / magnitude);
  const step = factor * magnitude;
  const first = Math.floor(minimum / step);
  const last = Math.max(first + 1, Math.ceil(maximum / step));
  const low = first * step;
  const high = last * step;
  const ticks = Array.from({ length: last - first + 1 }, (_, index) => (first + index) * step);
  return { ticks, position: (value) => 3 + (value - low) / (high - low) * 94 };
}

function position(node, value) {
  node.style.left = `${value}%`;
  return node;
}

function buildPlot(values, axisLabel, normalized) {
  const scale = axis(values, normalized);
  const plot = element("div", "plot");
  const grid = element("div", "plot-grid");
  const labels = element("div", "plot-ticks");
  for (const tick of scale.ticks) {
    const marker = element("span", tick === 0 ? "grid-line zero-line" : "grid-line");
    grid.append(position(marker, scale.position(tick)));
    const formatted = Math.abs(tick) >= 1000 ? formatCompact.format(tick) : formatScore.format(tick);
    labels.append(position(element("span", "", formatted), scale.position(tick)));
  }

  const scaleRow = element("div", "plot-scale");
  scaleRow.append(element("span", "axis-title", axisLabel), labels);
  plot.append(scaleRow);
  return { scale, plot, grid };
}

function scoreBar(track, scale, value) {
  const zero = scale.position(0);
  const end = scale.position(value);
  const bar = position(element("span", "result-bar"), Math.min(zero, end));
  bar.style.width = `${Math.abs(zero - end)}%`;
  if (value < 0) bar.classList.add("negative");
  track.append(bar);
}

function shownScore(run) {
  if (run.batch !== "paper") return formatMean(run.mean);
  return run.score === null ? "—" : paperFormat.format(run.score);
}

function counterpart(run) {
  return view.scope === "game"
    ? { name: run.modelName, href: browseUrl("model", run.model) }
    : { name: run.game, href: browseUrl("game", run.gameId) };
}

function rankedScore(run) {
  const score = view.scaled.get(run.id);
  return score === undefined ? "—" : formatRankScore.format(score);
}

function primaryEvidence(run) {
  if (run.videoCount) return { tab: "tests", test: 1 };
  if (run.files?.length) return { tab: "script" };
  return { tab: "log" };
}

function showChart() {
  const selected = view.runs;
  const normalized = view.scope === "model";
  const metricValue = (run) => normalized ? view.scaled.get(run.id) : recordedScore(run);
  const values = selected.map(metricValue).filter(Number.isFinite);
  const { scale, plot, grid } = buildPlot(values, normalized ? "Score (0–100)" : "Recorded score", normalized);
  let hasPending = false;
  for (const [index, run] of selected.entries()) {
    const value = metricValue(run);
    const pending = run.matched === false;
    const row = element("div", pending ? "plot-row under-review" : "plot-row");
    row.style.setProperty("--plot-delay", `${index * 24}ms`);
    hasPending ||= pending;
    const other = counterpart(run);
    const label = element("a", "plot-label", other.name);
    label.href = other.href;
    const track = element("a", "plot-track");
    track.href = experimentUrl(run, primaryEvidence(run));
    track.setAttribute("aria-label", `Inspect run: ${run.game} × ${run.modelName}`);
    track.title = run.videoCount ? "Watch test videos" : "Open run details";
    track.append(grid.cloneNode(true));
    if (Number.isFinite(value)) {
      scoreBar(track, scale, value);
      track.append(position(element("span", "result-point"), scale.position(value)));
    }
    const displayValue = normalized ? rankedScore(run) : shownScore(run);
    const total = element("strong", "plot-value", displayValue);
    if (pending) total.title = run.evidence;
    row.append(label, track, total);
    plot.append(row);
  }
  byId("chart").replaceChildren(plot);
  byId("chart-legend").hidden = !hasPending;
}

function trialScores(run) {
  const cell = element("td", "test-scores");
  if (!run.tests.length) {
    cell.textContent = "—";
    return cell;
  }
  const paper = run.batch === "paper";
  const marks = run.tests.map((test, index) => {
    const score = test.score === null ? "—" : formatScore.format(test.score);
    const mark = element(run.videoCount > index ? "a" : "span", "test-score", score);
    if (run.videoCount > index) {
      mark.href = experimentUrl(run, { tab: "tests", test: index + 1 });
      mark.title = `Test ${index + 1} video`;
    } else if (test.counted !== test.score) {
      mark.title = `Original score unavailable. The reported result counted ${test.counted}.`;
    }
    return mark;
  });
  if (paper && marks.length > 3) {
    const details = element("details", "trial-list");
    const values = element("div", "trial-values");
    values.append(...marks);
    details.append(element("summary", "", `${marks.length} scores`), values);
    cell.append(details);
  } else {
    cell.append(...marks);
  }
  return cell;
}

function resultRow(run) {
  const row = element("tr");
  const entityCell = element("th", "game-cell");
  entityCell.scope = "row";
  const other = counterpart(run);
  const entityLink = element("a", "", other.name);
  entityLink.href = other.href;
  entityCell.append(entityLink);
  const meanCell = element("td", "numeric mean-cell", shownScore(run));
  const scaledCell = element("td", "numeric", rankedScore(run));
  const evidenceCell = element("td", "evidence-cell");
  const actions = element("div", "run-actions");
  const addLink = (label, tab, classes = "", options = {}) => {
    const link = element("a", `run-link ${classes}`, label);
    link.href = experimentUrl(run, { tab, ...options });
    link.setAttribute("aria-label", `${label} · ${run.game} × ${run.modelName}`);
    actions.append(link);
  };
  if (run.videoCount) addLink("Test videos", "tests", "run-watch", { test: 1 });
  if (run.files?.length) addLink(policyScriptLabel(run), "script", "run-policy");
  if (run.logAttempts.length) addLink(executionLogLabel(run), "log");
  if (!actions.childElementCount) addLink(executionLogLabel(run), "log", "no-log");
  evidenceCell.append(actions);
  row.append(entityCell, trialScores(run), meanCell, scaledCell, evidenceCell);
  return row;
}

function mountGameRecordings(runs) {
  const [first] = runs;
  const section = byId("test-videos");
  if (!first) return;
  const video = byId("game-test-video");
  const error = byId("game-test-error");
  const models = byId("game-test-models");
  const trials = byId("game-test-trials");
  const log = byId("game-test-log");
  const policy = byId("game-test-policy");

  function selectTest(run, number) {
    video.pause();
    error.hidden = true;
    video.poster = `/assets/games/${encodeURIComponent(run.gameId)}-art.jpg`;
    video.src = testVideoUrl(run, number);
    video.setAttribute("aria-label", `${run.modelName} · Independent test ${number}`);
    for (const button of trials.children) {
      button.setAttribute("aria-pressed", String(Number(button.dataset.test) === number));
    }
  }

  function selectModel(run) {
    for (const button of models.children) {
      button.setAttribute("aria-pressed", String(button.dataset.run === run.id));
    }
    log.hidden = !run.logAttempts.length;
    log.href = experimentUrl(run, { tab: "log" });
    policy.hidden = !run.files?.length;
    policy.href = experimentUrl(run, { tab: "script" });
    const buttons = run.tests.slice(0, run.videoCount).map((test, index) => {
      const number = index + 1;
      const button = element("button", "test-option");
      button.type = "button";
      button.dataset.test = number;
      button.append(element("span", "", `Test ${number}`), element("strong", "", test.score === null ? "—" : formatScore.format(test.score)));
      button.addEventListener("click", () => {
        selectTest(run, number);
        video.play().catch(() => {});
      });
      return button;
    });
    trials.replaceChildren(...buttons);
    selectTest(run, 1);
  }

  models.replaceChildren(...runs.map((run) => {
    const button = element("button", "button subtle", run.modelName);
    button.type = "button";
    button.dataset.run = run.id;
    button.addEventListener("click", () => selectModel(run));
    return button;
  }));
  video.addEventListener("error", () => { error.hidden = false; });
  selectModel(first);
  section.hidden = false;
}

function showTable() {
  const search = byId("query").value.trim().toLocaleLowerCase();
  const visible = view.runs.filter((run) => {
    const terms = view.scope === "game" ? `${run.modelName} ${run.model}` : `${run.game} ${run.alias}`;
    return terms.toLocaleLowerCase().includes(search);
  });
  byId("table-count").textContent = `${visible.length} ${visible.length === 1 ? "result" : "results"}`;
  const body = byId("result-rows");
  if (visible.length) {
    body.replaceChildren(...visible.map(resultRow));
  } else {
    const row = element("tr");
    const cell = element("td", "table-empty", "No experiments match these filters.");
    cell.colSpan = 5;
    row.append(cell);
    body.replaceChildren(row);
  }
}

function showScoring(gameId) {
  const [formula, ...steps] = gameScoring[gameId];
  byId("game-scoring-formula").textContent = formula;
  byId("game-scoring-steps").replaceChildren(...steps.map(([label, explanation]) => {
    const row = element("div");
    row.append(element("dt", "", label), element("dd", "", explanation));
    return row;
  }));
  byId("scoring").hidden = false;
}

async function initialize() {
  const { runs } = await get("/api/results");
  const { games, scaled, standings } = summarizeResults(runs);
  const params = new URLSearchParams(location.search);
  const scope = params.has("game") ? "game" : "model";
  const choices = scope === "game" ? games : standings;
  const chosen = choices.find((item) => item.id === params.get(scope));
  if (!chosen) {
    byId("page-status").textContent = "Choose a model or game from the leaderboard.";
    return;
  }
  const key = scope === "game" ? "gameId" : "model";
  const name = scope === "game" ? "modelName" : "game";
  const scopedRuns = runs.filter((run) => run[key] === chosen.id).sort((first, second) =>
    first[name].localeCompare(second[name]),
  );
  view = { scope, runs: scopedRuns, scaled };
  document.title = `${chosen.name} | Coding4Games`;
  byId("page-title").textContent = chosen.name;
  if (scope === "game") {
    const switcher = byId("result-switch");
    switcher.replaceChildren(...games.map((game) => new Option(game.name, game.id)));
    switcher.value = chosen.id;
    switcher.addEventListener("change", () => { location.href = browseUrl("game", switcher.value); });
    byId("game-picker").hidden = false;
    const recordings = testRuns(scopedRuns);
    const [first] = recordings;
    const art = byId("game-visual");
    const media = gameMedia(chosen.id);
    if (first) {
      const watch = element("a", "brief-video");
      watch.href = "#test-videos";
      watch.setAttribute("aria-label", `Test videos · ${chosen.name}`);
      watch.append(media);
      const label = element("span", "brief-video-label", "▶  Test videos");
      label.setAttribute("aria-hidden", "true");
      watch.append(label);
      art.replaceChildren(watch);
      showGameplayPreview(watch, testVideoUrl(first), `Test 1 · ${first.modelName}`);
      mountGameRecordings(recordings);
    } else {
      art.replaceChildren(media);
    }
    const [, intro, task] = taskBriefs[chosen.id];
    byId("game-intro").textContent = intro;
    byId("game-task").textContent = task;
    const demoUrl = playableUrl(chosen.id);
    if (demoUrl) {
      byId("brief-play-link").href = demoUrl;
      byId("brief-play-link").hidden = false;
    }
    const steamUrl = steamStoreUrl(chosen.id);
    if (steamUrl) {
      byId("game-steam-link").href = steamUrl;
      byId("game-steam-link").hidden = false;
    }
    byId("game-brief").hidden = false;
    showScoring(chosen.id);
  } else if (chosen.rank !== null) {
    byId("model-rank").textContent = `#${chosen.rank}`;
    byId("model-mean-score").textContent = formatRankScore.format(chosen.mean);
    byId("model-summary").hidden = false;
  }
  byId("chart-title").textContent = scope === "game" ? "Recorded scores" : "Scaled scores";
  byId("entity-heading").textContent = scope === "game" ? "Model" : "Game";
  const searchLabel = scope === "game" ? "Search models" : "Search games";
  byId("query-label").textContent = searchLabel;
  byId("query").placeholder = searchLabel;
  byId("query").addEventListener("input", showTable);

  showChart();
  showTable();
  byId("page-status").hidden = true;
  byId("page-content").hidden = false;
  if (location.hash === "#experiments") byId("experiments").scrollIntoView();
  if (location.hash === "#test-videos" && !byId("test-videos").hidden) byId("test-videos").scrollIntoView();
  if (scope === "game" && location.hash === "#scoring") {
    byId("scoring").open = true;
    byId("scoring").scrollIntoView();
  }
}

initialize().catch(() => {
  byId("page-status").textContent = "Results could not load. Reload to try again.";
});
