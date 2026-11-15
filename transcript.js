import { byId, experimentUrl, get } from "/common.js";
import { loadTrace } from "/static-evidence.js";

async function showTranscript() {
  const params = new URLSearchParams(location.search);
  const runId = params.get("run");
  const attempt = Number(params.get("attempt"));
  const mode = params.get("source");
  const { runs } = await get("/api/results");
  const run = runs.find(({ id }) => id === runId);
  const log = run?.logAttempts[attempt - 1];
  if (!log?.sources.includes(mode)) throw new Error("This transcript is unavailable.");

  byId("transcript-title").textContent = `${run.game} × ${run.modelName}`;
  byId("transcript-back").href = experimentUrl(run, { tab: "log", attempt, source: mode });
  const rows = await loadTrace(runId, attempt, mode);
  const text = [];
  for (const [index, row] of rows.entries()) {
    const time = row.time ? ` | ${row.time}` : "";
    text.push(`#${index + 1} | Line ${row.line}${time} | ${row.title}`);
    if (row.summary) text.push(row.summary);
    if (row.detail) text.push(row.detail);
    if (row.phase === "start" && row.related === undefined) {
      text.push("[No recorded result]");
      if (row.hostFinish) text.push(`[Submission frozen in the run timeline at line ${row.hostFinish.line}]`);
    }
    text.push("");
  }
  byId("transcript-text").textContent = text.join("\n");
  byId("transcript-view").hidden = false;
  byId("transcript-status").textContent = log.label;
}

showTranscript().catch(() => {
  byId("transcript-status").textContent = "This transcript is unavailable.";
});
