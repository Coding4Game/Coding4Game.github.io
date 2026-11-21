import {
  browseUrl, byId, element, experimentUrl, gameMedia, get, testRuns,
} from "/common.js?v=native-videos";
import { formatRankScore, summarizeResults } from "/ranking.js?v=gvc-paper";
import { paperReferenceScores } from "/paper-results.js?v=gvc-paper";
import { playableUrl } from "/arcade/playable.js?v=duel";

const modelIcons = new Map([
  ["astra", "openai"],
  ["gpt-5.6-sol", "openai"],
  ["gpt-5.6-terra", "openai"],
  ["opus", "claude"],
  ["claude-opus-5", "claude"],
  ["claude-sonnet-5", "claude"],
  ["gemini-3.8-flash", "gemini"],
  ["qwen3.8-flash", "qwen"],
  ["qwen3.8-27b", "qwen"],
  ["glm-5.3-flash", "zai"],
  ["deepseek-v4.1-flash", "deepseek"],
  ["kimi-k3", "kimi"],
]);

function openRankScoring() {
  if (location.hash === "#rank-scoring") byId("rank-scoring").open = true;
}

function syncHomeNavigation() {
  openRankScoring();
  const section = location.hash === "#rank-scoring" ? "#results" : location.hash || "#teaser";
  for (const link of document.querySelectorAll(".home-nav a")) {
    if (link.hash === section) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  }
}

syncHomeNavigation();
addEventListener("hashchange", syncHomeNavigation);

byId("leaderboard-references")?.replaceChildren(...paperReferenceScores.map(({ name, mean }) => {
  const reference = element("div");
  reference.append(element("dt", "", name), element("dd", "", formatRankScore.format(mean)));
  return reference;
}));

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      entry.target.toggleAttribute("data-cue", entry.intersectionRatio >= .65);
    }
  }, { threshold: .65 });
  document.querySelectorAll(".demo-cta").forEach((button) => observer.observe(button));
}

function rankRow(model) {
  const row = element("tr");
  const rank = element("td", "rank-number", model.rank ?? "—");
  const name = element("th", "rank-name");
  name.scope = "row";
  const link = element("a", "entity-link", model.name);
  link.href = browseUrl("model", model.id);
  const iconName = modelIcons.get(model.id);
  if (iconName) {
    const icon = element("img", "rank-model-icon");
    icon.alt = "";
    icon.width = 20;
    icon.height = 20;
    icon.src = `/assets/model-icons/${iconName}.png`;
    link.prepend(icon);
  }
  name.append(link);
  const score = element("td", "numeric");
  const meter = element("div", "rank-meter");
  const track = element("span", "rank-track");
  track.setAttribute("aria-hidden", "true");
  const fill = element("span", "rank-fill");
  fill.style.width = `${model.mean ?? 0}%`;
  track.append(fill);
  meter.append(track, element("strong", "rank-value", model.mean === null ? "—" : formatRankScore.format(model.mean)));
  score.append(meter);
  row.append(rank, name, score);
  return row;
}

function animateRankRows(rows) {
  if (!("IntersectionObserver" in window)) return;
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.intersectionRatio < .55) continue;
      entry.target.setAttribute("data-score-visible", "");
      observer.unobserve(entry.target);
    }
  }, { threshold: .55 });

  function arm() {
    observer.disconnect();
    observer.takeRecords();
    for (const row of rows.rows) {
      row.removeAttribute("data-score-visible");
      observer.observe(row);
    }
  }

  rows.setAttribute("data-animate-scores", "");
  arm();
  addEventListener("hashchange", () => {
    if (location.hash === "#results") arm();
  });
  document.addEventListener("click", (event) => {
    if (location.hash !== "#results" || event.button !== 0 || event.defaultPrevented ||
        event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    if (event.target instanceof Element && event.target.closest('a[href="#results"]')) arm();
  }, { capture: true });
}

function gameLink(game) {
  const item = element("li", "game-panel");
  const link = element("a", "game-card");
  link.href = browseUrl("game", game.id);
  const frame = element("div", "panel-frame");
  const caption = element("div", "panel-caption");
  const arrow = element("span", "panel-arrow", "↗");
  arrow.setAttribute("aria-hidden", "true");
  caption.append(element("span", "", game.name), arrow);
  frame.append(gameMedia(game.id, true), caption);
  link.append(frame);
  item.append(link);

  const [recorded] = testRuns([...game.results.values()]);
  const demo = playableUrl(game.id);
  const actions = element("div", "game-card-actions");
  const addLink = (label, href, classes = "") => {
    const action = element("a", classes, label);
    action.href = href;
    action.setAttribute("aria-label", `${label} · ${game.name}`);
    actions.append(action);
  };
  if (demo) addLink("Play demo", demo, "card-play");
  if (recorded) addLink("Test videos", link.href + "#test-videos", "card-watch");
  const policyRun = recorded?.files?.length ? recorded : [...game.results.values()].find((run) => run.files?.length);
  if (policyRun) addLink("Policy script", experimentUrl(policyRun, { tab: "script" }));
  if (actions.childElementCount) item.append(actions);
  return item;
}

function revealPanels(list) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("panel-enter");
        observer.unobserve(entry.target);
      }
    }
  }, { threshold: .2 });
  for (const [index, panel] of Array.from(list.children).entries()) {
    panel.style.setProperty("--panel-delay", `${(index % 3) * 45}ms`);
    observer.observe(panel);
  }
}

async function initialize() {
  const requested = new URLSearchParams(location.search).get("game");
  if (requested) {
    location.replace(browseUrl("game", requested) + location.hash);
    return;
  }
  const { runs } = await get("/api/results");
  const { standings, games } = summarizeResults(runs);
  byId("leaderboard-description").textContent = `Mean normalized score across ${games.length} games`;
  const rows = byId("leaderboard-rows");
  rows.replaceChildren(...standings.map(rankRow));
  animateRankRows(rows);
  const list = byId("game-list");
  list.replaceChildren(...games.map(gameLink));
  revealPanels(list);
  if (location.hash === "#games") byId("games").scrollIntoView();
}

initialize().catch(() => {
  byId("leaderboard-rows").rows[0].cells[0].textContent = "Leaderboard unavailable. Reload to try again.";
});
