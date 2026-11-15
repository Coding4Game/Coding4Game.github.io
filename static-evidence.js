const pageSize = 30;
const detailLimit = 9000;
const activity = new Set(["tool", "message", "game", "submission", "error", "output"]);
const traces = new Map();

async function readJson(path, signal) {
  const response = await fetch(path, { signal });
  if (!response.ok) throw new Error("The archived evidence is unavailable.");
  if (!path.endsWith(".gz")) return response.json();

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) return JSON.parse(new TextDecoder().decode(bytes));
  const decoded = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Response(decoded).json();
}

function tracePath(run, attempt, mode) {
  if (!/^[a-z0-9.-]+$/.test(run) || !/^[1-9]\d*$/.test(attempt) || !/^[a-z0-9-]+$/.test(mode)) {
    throw new Error("Unknown archive selection.");
  }
  return `/data/evidence/${run}/${attempt}-${mode}`;
}

export function loadTrace(run, attempt, mode) {
  const path = `${tracePath(run, attempt, mode)}.json.gz`;
  if (traces.has(path)) return traces.get(path);
  if (traces.size >= 3) traces.delete(traces.keys().next().value);
  const result = readJson(path).catch((error) => {
    if (traces.get(path) === result) traces.delete(path);
    throw error;
  });
  traces.set(path, result);
  return result;
}

function matchesKind(row, kind) {
  if (!kind || kind === row.kind) return true;
  if (kind === "activity") return activity.has(row.kind);
  if (kind === "highlights") return row.highlight === true;
  if (kind === "screenshots") return Boolean(row.screenshots?.length);
  if (kind === "diagnostics") return Boolean(row.diagnostic);
  return false;
}

function logPage(entries, params) {
  const kind = params.get("kind");
  const query = (params.get("q") ?? "").trim().toLowerCase();
  const matches = [];
  const positions = new Map();
  const kinds = new Set();
  const focus = { highlights: 0, screenshots: 0, diagnostics: 0 };
  for (const [index, row] of entries.entries()) {
    kinds.add(row.kind);
    if (row.highlight) focus.highlights++;
    if (row.screenshots?.length) focus.screenshots++;
    if (row.diagnostic) focus.diagnostics++;
    const contains = !query || [row.title, row.summary, row.detail, row.toolName]
      .some((value) => value?.toLowerCase().includes(query));
    if (!contains || !matchesKind(row, kind)) continue;
    matches.push(index);
    if (row.related !== undefined) positions.set(index, matches.length);
  }

  const pages = Math.max(1, Math.ceil(matches.length / pageSize));
  const wanted = Number(params.get("page")) || 1;
  const step = Math.min(Math.max(1, Number(params.get("step")) || 1), Math.max(1, matches.length));
  const selected = params.has("step") ? Math.ceil(step / pageSize) : wanted;
  const page = Math.min(pages, Math.max(1, Math.trunc(selected)));
  const start = (page - 1) * pageSize;
  const visible = matches.slice(start, start + pageSize).map((index) => {
    const { related, highlight, detail, ...record } = entries[index];
    return {
      ...record,
      entry: index,
      detail: detail.slice(0, detailLimit),
      detailLimited: detail.length > detailLimit,
      pairedStep: positions.get(related) ?? null,
      pairedRecord: related === undefined ? null : related + 1,
    };
  });
  return { total: matches.length, unfiltered: entries.length, kinds: [...kinds].sort(), focus, page, pages, start, entries: visible };
}

export async function requestEvidence(url, signal) {
  const { pathname, searchParams } = new URL(url, location.origin);
  if (pathname === "/api/results") return readJson("/data/results.json", signal);

  const route = /^\/api\/runs\/([a-z0-9.-]+)\/(log|entry|event)$/.exec(pathname);
  if (!route) throw new Error("Unknown evidence request.");
  const [, run, operation] = route;
  const attempt = searchParams.get("attempt");
  const mode = searchParams.get("source");
  const entries = await loadTrace(run, attempt, mode);
  signal?.throwIfAborted();
  if (operation === "event") {
    const line = Number(searchParams.get("line"));
    return { line, records: entries.filter((row) => row.line === line) };
  }
  if (operation === "entry") return entries[Number(searchParams.get("entry"))].detail;
  return logPage(entries, searchParams);
}
