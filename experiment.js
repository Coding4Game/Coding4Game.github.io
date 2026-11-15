import {
  browseUrl, byId, element, executionLogLabel, experimentUrl, formatCount, formatMean, formatScore, gameMedia, get,
  policyFileUrl, policyScriptLabel, testVideoUrl,
} from "/common.js?v=recovered-evidence";
import { tracePlayer } from "/trace-player.js?v=selected-results";

const params = new URLSearchParams(location.search);
const video = byId("test-video");
const posters = {
  "riders-republic-astra/3": "/assets/riders.jpg",
  "balatro-opus/1": "/assets/balatro.jpg",
};
let experiment;
let trace;
let tabs;
let selectedTab = "log";
let testNumber = 1;
let loadedVideo = "";
let source = "";
let scriptLoaded = false;
let fileRequest = 0;

function setUrl() {
  const showUsage = experiment.batch !== "paper" && selectedTab === "log" && trace.isPrimaryDevelopment();
  byId("tic-stat").hidden = !showUsage;
  byId("token-stat").hidden = !showUsage;
  byId("usage-fact").hidden = !showUsage;
  byId("floor-note").hidden = !showUsage || experiment.floorReached !== false;
  const state = { tab: selectedTab };
  if (selectedTab === "log") Object.assign(state, trace.route());
  if (experiment.videoCount) state.test = testNumber;
  if (selectedTab === "script") state.file = byId("file-select").value;
  history.replaceState(null, "", experimentUrl(experiment, state));
}

function showVideo() {
  const test = experiment.tests[testNumber - 1];
  const url = testVideoUrl(experiment, testNumber);
  if (loadedVideo !== url) {
    byId("video-error").hidden = true;
    const poster = posters[`${experiment.id}/${testNumber}`];
    if (poster) video.poster = poster;
    else video.removeAttribute("poster");
    video.src = url;
    loadedVideo = url;
  }
  byId("video-link").href = url;
  const facts = [`Independent test ${testNumber}`, `Score ${test.score === null ? "—" : formatScore.format(test.score)}`];
  if (test.tics !== null) facts.push(`${formatCount.format(test.tics)} game tics`);
  byId("video-facts").textContent = facts.join(" · ");
  for (const button of byId("test-options").children) {
    button.setAttribute("aria-pressed", String(Number(button.dataset.test) === testNumber));
  }
}

function showTestOptions() {
  const options = experiment.tests.slice(0, experiment.videoCount).map((test, index) => {
    const button = element("button", "test-option");
    button.type = "button";
    button.dataset.test = index + 1;
    button.append(element("span", "", `Test ${index + 1}`), element("strong", "", test.score === null ? "—" : formatScore.format(test.score)));
    button.addEventListener("click", () => {
      testNumber = index + 1;
      showVideo();
      setUrl();
    });
    return button;
  });
  byId("test-options").replaceChildren(...options);
}

async function showFile() {
  const current = ++fileRequest;
  byId("file-status").textContent = "Loading source…";
  byId("copy-script").disabled = true;
  byId("open-script").hidden = true;
  byId("source-code").textContent = "";
  byId("line-numbers").textContent = "";
  const url = policyFileUrl(experiment, byId("file-select").value);
  try {
    const text = await get(url, "text");
    if (current !== fileRequest) return;
    source = text;
    scriptLoaded = true;
    const lines = text.replace(/\r\n/g, "\n").replace(/\n$/, "").split("\n").length;
    byId("source-code").textContent = text;
    byId("line-numbers").textContent = Array.from({ length: lines }, (_, index) => index + 1).join("\n");
    byId("file-status").textContent = `${formatCount.format(lines)} lines`;
    byId("source-view").scrollTo(0, 0);
    byId("open-script").href = url;
    byId("open-script").hidden = false;
    byId("copy-script").disabled = false;
  } catch {
    if (current === fileRequest) byId("file-status").textContent = "Could not read the selected file.";
  }
}

function openTab(tab) {
  selectedTab = tab;
  for (const button of tabs) {
    const selected = button.dataset.tab === tab;
    button.setAttribute("aria-selected", String(selected));
    button.tabIndex = selected ? 0 : -1;
    byId(button.getAttribute("aria-controls")).hidden = !selected;
  }
  if (tab === "tests") showVideo();
  else video.pause();
  if (tab === "log") trace.activate();
  else trace.pause();
  if (tab === "script" && !scriptLoaded) showFile();
  setUrl();
}

function mountTabs() {
  byId("tab-log").textContent = experiment.logAttempts.length ? executionLogLabel(experiment) : "Evidence status";
  if (experiment.archiveNote) byId("tab-script").textContent = policyScriptLabel(experiment);
  const enabled = { log: true, tests: experiment.videoCount > 0, script: experiment.files?.length > 0 };
  tabs = Array.from(document.querySelectorAll("[data-tab]")).filter((button) => {
    const available = enabled[button.dataset.tab];
    button.hidden = !available;
    byId(button.getAttribute("aria-controls")).hidden = true;
    return available;
  });
  for (const [index, button] of tabs.entries()) {
    button.addEventListener("click", () => openTab(button.dataset.tab));
    button.addEventListener("keydown", (event) => {
      const next = {
        ArrowLeft: (index + tabs.length - 1) % tabs.length,
        ArrowRight: (index + 1) % tabs.length,
        Home: 0,
        End: tabs.length - 1,
      }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      tabs[next].focus();
      openTab(tabs[next].dataset.tab);
    });
  }
  const requested = params.get("tab") ?? (params.has("attempt") || params.has("source") || params.has("events") ? "log" : undefined);
  openTab(tabs.some((button) => button.dataset.tab === requested) ? requested : tabs[0].dataset.tab);
}

function mountSwitcher(select, peers, label) {
  const sorted = peers.toSorted((first, second) => label(first).localeCompare(label(second)));
  select.replaceChildren(...sorted.map((run) => new Option(label(run), run.id)));
  select.value = experiment.id;
  select.addEventListener("change", () => {
    const next = sorted.find((run) => run.id === select.value);
    if (next) {
      const currentTabAvailable = selectedTab === "log" || (selectedTab === "tests" && next.videoCount) ||
        (selectedTab === "script" && next.files?.length);
      location.href = experimentUrl(next, { tab: currentTabAvailable ? selectedTab : "log" });
    }
  });
}

function setRunFacts() {
  const current = experiment.batch !== "paper";
  const score = current ? experiment.mean : experiment.score;
  byId("score-label").textContent = current ? "Mean test score" : "Recorded score";
  byId("mean-score").textContent = Number.isFinite(score) ? formatMean(score) : "—";
  if (current) {
    byId("dev-tics").textContent = formatCount.format(experiment.devTics);
    byId("dev-tokens").textContent = formatCount.format(experiment.tokens);
    byId("unknown-usage").textContent = formatCount.format(experiment.unknownUsage);
  }
  byId("program-fact").hidden = !experiment.programId;
  byId("program-label").textContent = experiment.archiveNote ? "Archived program ID" : "Frozen program ID";
  byId("program-id").textContent = experiment.programId ?? "";
  byId("test-fact").hidden = !experiment.tests.length;
  byId("recorded-tests").textContent = experiment.tests.map((test) =>
    test.score === null ? "—" : formatScore.format(test.score),
  ).join(" · ");
  byId("run-facts").hidden = !(experiment.programId || experiment.tests.length || current);
}

async function initialize() {
  const { runs } = await get("/api/results");
  experiment = runs.find((run) => run.id === params.get("run"));
  if (!experiment) {
    byId("page-status").textContent = "This experiment could not be found. Choose a result from the leaderboard.";
    return;
  }
  document.title = `${experiment.game} × ${experiment.modelName} | Coding4Games`;
  byId("game-title").textContent = experiment.game;
  byId("game-visual").replaceChildren(gameMedia(experiment.gameId));
  const modelLink = element("a", "entity-link", experiment.modelName);
  modelLink.href = browseUrl("model", experiment.model);
  const meta = [modelLink];
  if (experiment.agent) meta.push(` · ${experiment.agent}`);
  byId("experiment-meta").replaceChildren(...meta);
  byId("back-results").href = browseUrl("game", experiment.gameId) + "#experiments";
  byId("game-scoring-link").href = browseUrl("game", experiment.gameId) + "#scoring";
  byId("game-scoring-link").hidden = false;
  byId("back-model").href = browseUrl("model", experiment.model) + "#experiments";
  byId("back-model").hidden = false;
  mountSwitcher(byId("experiment-select"), runs.filter((run) => run.gameId === experiment.gameId), (run) => run.modelName);
  mountSwitcher(byId("game-select"), runs.filter((run) => run.model === experiment.model), (run) => run.game);
  setRunFacts();
  if (experiment.archiveNote) {
    const shared = experiment.evidence === "Multiple candidates";
    byId("artifact-note").textContent = experiment.archiveNote;
    byId("artifact-note").hidden = false;
    byId("submission-title").textContent = shared ? "Shared source file" : "Archived submission";
    byId("submission-context").textContent = shared ? "File contents match the archived bundles." : "Source files verified against the frozen program manifest.";
  } else if (experiment.evidence === "Exclusions unresolved" && experiment.files.length) {
    byId("artifact-note").textContent = "Frozen script verified. The logs include the confirmed tests while tied exclusions are under review.";
    byId("artifact-note").hidden = false;
  }
  const requestedTest = Number(params.get("test"));
  if (Number.isInteger(requestedTest) && requestedTest >= 1 && requestedTest <= experiment.videoCount) testNumber = requestedTest;
  showTestOptions();
  const files = experiment.files ?? [];
  const fileSelect = byId("file-select");
  for (const file of files) fileSelect.add(new Option(file, file));
  if (files.includes(params.get("file"))) fileSelect.value = params.get("file");
  fileSelect.addEventListener("change", () => {
    showFile();
    setUrl();
  });
  byId("copy-script").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(source);
      byId("file-status").textContent = "Code copied.";
    } catch {
      byId("file-status").textContent = "Clipboard unavailable. Select the code to copy it.";
    }
  });
  video.addEventListener("error", () => {
    byId("video-error").hidden = false;
    byId("video-error").textContent = "The recording could not play here. Use Open video to try it in its own tab.";
  });
  trace = tracePlayer(experiment, params, setUrl);
  document.addEventListener("visibilitychange", () => { if (document.hidden) trace.pause(); });
  byId("page-status").hidden = true;
  byId("experiment-content").hidden = false;
  mountTabs();
}

initialize().catch(() => {
  byId("page-status").hidden = false;
  byId("page-status").textContent = "Could not load this experiment. Reload the local preview to try again.";
});
