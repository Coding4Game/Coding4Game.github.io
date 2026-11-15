import { requestEvidence } from "/static-evidence.js";

export const byId = (id) => document.getElementById(id);
export const formatScore = new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 });
export const formatCount = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const largeMean = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
export const formatCompact = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatMean(value) {
  return (Math.abs(value) >= 10 ? largeMean : formatScore).format(value);
}

export function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

let resultsRequest;

export function get(url, type = "json", signal) {
  const request = async () => {
    if (url.startsWith("/api/")) return requestEvidence(url, signal);
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error("The local evidence is unavailable.");
    return type === "text" ? response.text() : response.json();
  };
  if (url !== "/api/results" || type !== "json" || signal) return request();
  return resultsRequest ??= request().catch((error) => {
    resultsRequest = undefined;
    throw error;
  });
}

export function experimentUrl(run, options = {}) {
  return "/experiment.html?" + new URLSearchParams({ run: run.id, ...options });
}

export function testVideoUrl(run, number = 1) {
  return run.recordings[number - 1];
}

export function policyFileUrl(run, file) {
  return `/data/evidence/${encodeURIComponent(run.id)}/script-${run.files.indexOf(file) + 1}.txt`;
}

export function policyScriptLabel(run) {
  if (run.evidence === "Multiple candidates") return "Shared source";
  return run.archiveNote ? "Archived script" : "Policy script";
}

export function executionLogLabel(run) {
  if (!run.logAttempts.length) return run.evidence === "Report only" ? "Report only" : "Evidence status";
  if (run.archiveNote) return "Archived log";
  return run.logAttempts.some((attempt) => attempt.kind === "development") ? "Execution log" : "Test logs";
}

export function testRuns(runs) {
  return runs.filter((run) => run.videoCount > 0).sort((first, second) =>
    (first.version === "rerun") - (second.version === "rerun") ||
    (second.mean ?? -Infinity) - (first.mean ?? -Infinity) ||
    first.modelName.localeCompare(second.modelName),
  );
}

export function showGameplayPreview(link, source, label) {
  if (!matchMedia("(hover: hover) and (prefers-reduced-motion: no-preference)").matches) return;
  const panel = link.querySelector(".panel-media");
  let preview;
  let caption;
  let startTimer;
  let hovered = false;
  let focused = false;

  function reveal() {
    if (hovered || focused) panel.setAttribute("data-preview-playing", "");
  }

  function show() {
    if (!preview) {
      preview = element("video", "panel-preview");
      preview.muted = true;
      preview.playsInline = true;
      preview.loop = true;
      preview.setAttribute("aria-hidden", "true");
      caption = element("span", "panel-preview-label", label);
      caption.setAttribute("aria-hidden", "true");
      panel.append(preview, caption);
      preview.addEventListener("playing", reveal);
      preview.src = source;
    }
    preview.play().catch(() => {});
  }

  function hide() {
    if (hovered || focused) return;
    window.clearTimeout(startTimer);
    panel.removeAttribute("data-preview-playing");
    if (!preview) return;
    preview.pause();
    preview.removeAttribute("src");
    preview.load();
    preview.remove();
    caption.remove();
    preview = undefined;
  }

  link.addEventListener("pointerenter", (event) => {
    if (event.pointerType === "touch") return;
    hovered = true;
    startTimer = window.setTimeout(show, 180);
  });
  link.addEventListener("pointerleave", () => {
    hovered = false;
    hide();
  });
  link.addEventListener("focus", () => {
    if (!link.matches(":focus-visible")) return;
    focused = true;
    window.clearTimeout(startTimer);
    show();
  });
  link.addEventListener("blur", () => {
    focused = false;
    hide();
  });
  window.addEventListener("pagehide", () => {
    hovered = focused = false;
    hide();
  });
}

export function browseUrl(scope, id) {
  return "/results.html?" + new URLSearchParams({ [scope]: id });
}

export function gameMedia(gameId, lazy = false) {
  const media = element("div", "panel-media");
  media.dataset.game = gameId;
  const prefix = `/assets/games/${encodeURIComponent(gameId)}`;
  const art = element("img", "panel-art");
  const logo = element("img", "panel-logo");
  for (const image of [art, logo]) {
    image.alt = "";
    image.decoding = "async";
    if (lazy) image.loading = "lazy";
  }
  art.src = `${prefix}-art.jpg`;
  logo.src = `${prefix}-logo.png`;
  media.append(art, logo);
  return media;
}
