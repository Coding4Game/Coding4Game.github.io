import { byId, element, formatCount, formatScore, get } from "/common.js";

const sourceLabels = {
  cli: "Agent transcript",
  timeline: "Run timeline",
  episodes: "Episode results",
  journal: "Game journal",
};
const eventLabels = {
  message: "Messages", tool: "Tools", game: "Gameplay", submission: "Submissions",
  error: "Errors", session: "Session events", output: "Program output",
};

function displayTime(value) {
  if (!value) return "";
  const date = new Date(typeof value === "number" && value < 5_000_000_000 ? value * 1000 : value);
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(11, 19) + " UTC" : "";
}

function disclosure(label, fill) {
  const details = element("details", "trace-disclosure");
  const body = element("div", "trace-disclosure-body");
  details.append(element("summary", "", label), body);
  let loaded = false;
  details.addEventListener("toggle", async () => {
    if (!details.open || loaded) return;
    loaded = true;
    try {
      await fill(body);
    } catch {
      body.replaceChildren(element("p", "trace-placeholder", "Could not read this record. Close and reopen to retry."));
      loaded = false;
    }
  });
  return details;
}

function payload(text, prose = false) {
  const body = element(prose ? "p" : "pre", prose ? "trace-message" : "event-detail", text);
  if (!prose) body.tabIndex = 0;
  return body;
}

function diagnostic(event) {
  const info = event.diagnostic;
  const block = element("div", "trace-evidence");
  if (!info) return block;
  const stats = element("div", "trace-diagnostic");
  stats.append(element("strong", "", info.label));
  if (Number.isFinite(info.score)) stats.append(element("span", "", `Score ${formatScore.format(info.score)}`));
  if (Number.isFinite(info.tics)) stats.append(element("span", "", `${formatCount.format(info.tics)} game tics`));
  if (Number.isInteger(info.exitCode)) {
    stats.append(element("span", info.exitCode ? "diagnostic-error" : "", `Exit ${info.exitCode}`));
  }
  if (info.reason) stats.append(element("span", "", info.reason));
  block.append(stats);
  for (const stream of ["stderr", "stdout"]) {
    if (info[stream]) block.append(disclosure(`${stream} tail`, (body) => body.append(payload(info[stream]))));
  }
  return block;
}

export function tracePlayer(run, params, onViewChange) {
  const attempts = run.logAttempts;
  if (!attempts.length) {
    byId("trace-empty").hidden = false;
    const reasons = {
      "Report only": "The report records a score. The original execution log and frozen script are unavailable.",
      "Multiple candidates": "The source run for this reported score is still under review.",
    };
    byId("trace-empty-reason").textContent = reasons[run.evidence] ?? "The available archive has no verified execution log for this result.";
    return { activate() {}, pause() {}, route: () => ({}), isPrimaryDevelopment: () => false };
  }

  const attempt = byId("log-attempt");
  const source = byId("log-source");
  const filter = byId("log-kind");
  const search = byId("log-query");
  const scroll = byId("log-scroll");
  const list = byId("log-list");
  const status = byId("log-status");
  const feedback = byId("log-feedback");
  const earlier = byId("log-load-earlier");
  const more = byId("log-load-next");
  const fullText = byId("log-full-text");
  const seek = byId("log-seek");
  const play = byId("log-play");
  const previous = byId("log-prev");
  const next = byId("log-next");
  const frameDialog = byId("frame-dialog");
  const frameImage = byId("frame-image");
  const frameCaption = byId("frame-caption");
  const items = new Map();
  let view;
  let firstPage = 0;
  let lastPage = 0;
  let step = 1;
  let active;
  let request;
  let failedRequest;
  let searchTimer;
  let scrubTimer;
  let playback;
  let frameTrigger;

  function development() {
    return attempts[Number(attempt.value) - 1]?.kind === "development";
  }

  function url(operation, extra = {}) {
    const query = new URLSearchParams({ attempt: attempt.value, source: source.value, ...extra });
    if (operation === "transcript") {
      query.set("run", run.id);
      return `/transcript.html?${query}`;
    }
    return `/api/runs/${run.id}/${operation}?${query}`;
  }

  function screenshotGallery(event) {
    const gallery = element("div", "trace-gallery");
    for (const [index, label] of event.screenshots.entries()) {
      const imageUrl = event.screenshotUrls[index];
      const figure = element("figure", "trace-frame");
      const button = element("button", "frame-open");
      button.type = "button";
      button.setAttribute("aria-label", `Enlarge screenshot: ${label}`);
      const image = element("img");
      image.alt = `${run.game} — ${label}`;
      image.decoding = "async";
      image.src = imageUrl;
      const caption = element("figcaption", "", label);
      image.addEventListener("error", () => {
        button.disabled = true;
        caption.textContent = "Recorded frame unavailable";
      });
      button.addEventListener("click", () => {
        pause();
        frameTrigger = button;
        frameImage.src = imageUrl;
        frameImage.alt = image.alt;
        frameCaption.textContent = `${run.game} · ${label}`;
        frameDialog.showModal();
      });
      button.append(image);
      figure.append(button, caption);
      gallery.append(figure);
    }
    return gallery;
  }

  function showPayload(event, parent) {
    if (!event.detail) return;
    const prose = event.kind === "message";
    const lines = event.detail.split("\n");
    const preview = lines.slice(0, prose ? 14 : 8).join("\n").slice(0, prose ? 1800 : 1000);
    if (!event.detailLimited && preview === event.detail) {
      parent.append(payload(event.detail, prose));
      return;
    }
    const block = element("div", "trace-payload");
    const short = payload(preview.trimEnd() + "…", prose);
    short.classList.add("trace-preview");
    const label = prose ? "Full message" : event.phase === "start" ? "Full input" : "Full output";
    block.append(short, disclosure(label, async (body) => {
      const text = event.detailLimited ? await get(url("entry", { entry: event.entry }), "text") : event.detail;
      body.replaceChildren(payload(text, prose));
    }));
    parent.append(block);
  }

  function entryItem(event, position) {
    const item = element("li", `trace-entry ${event.kind}`);
    item.value = position;
    item.dataset.step = position;
    items.set(position, item);
    const header = element("div", "trace-entry-head");
    const title = element("button", "trace-entry-title", event.title);
    title.type = "button";
    title.addEventListener("click", () => { pause(); select(position); });
    const time = displayTime(event.time);
    const address = element("span", "trace-entry-address", time ? `${time} · Line ${event.line}` : `Line ${event.line}`);
    header.append(element("span", "trace-step-number", `#${position}`), title, address);
    item.append(header);
    if (event.summary) item.append(element("p", "trace-summary", event.summary));
    if (event.diagnostic) item.append(diagnostic(event));
    showPayload(event, item);
    const actions = element("div", "trace-entry-actions");
    if (event.pairedRecord) {
      const paired = element("button", "trace-related", event.phase === "start" ? "View result →" : "← View call");
      paired.type = "button";
      paired.addEventListener("click", () => jumpToPair(event));
      actions.append(paired);
    } else if (event.phase === "start") {
      actions.append(element("span", "trace-no-result", "No recorded result"));
      if (event.hostFinish) {
        const button = element("button", "trace-related", "Submission frozen in run timeline →");
        button.type = "button";
        button.addEventListener("click", () => {
          source.value = "timeline";
          changeSource(event.hostFinish.step);
        });
        actions.append(button);
      }
    }
    if (event.outputSource) {
      const button = element("button", "trace-related", "Program output →");
      button.type = "button";
      button.addEventListener("click", () => {
        source.value = event.outputSource;
        changeSource();
      });
      actions.append(button);
    }
    if (event.screenshots?.length) {
      const label = event.screenshots.length === 1 ? "Screenshot" : `${event.screenshots.length} screenshots`;
      actions.append(disclosure(label, (body) => body.append(screenshotGallery(event))));
    }
    actions.append(disclosure("Archived record", async (body) => {
      const eventData = await get(url("event", { line: event.line }));
      body.replaceChildren(payload(JSON.stringify(eventData, null, 2)));
    }));
    item.append(actions);
    return item;
  }

  function pageItems(data) {
    const fragment = document.createDocumentFragment();
    let group;
    for (const [index, event] of data.entries.entries()) {
      const position = data.start + index + 1;
      const item = entryItem(event, position);
      if (!event.routine || filter.value || search.value.trim()) {
        group = undefined;
        fragment.append(item);
        continue;
      }
      if (!group) {
        const wrapper = element("li", "trace-runtime");
        const details = element("details");
        group = { details, summary: element("summary"), rows: element("ol", "trace-list"), first: event.line };
        details.append(group.summary, group.rows);
        wrapper.append(details);
        fragment.append(wrapper);
      }
      group.rows.append(item);
      group.details.dataset.last = position;
      const count = group.rows.childElementCount;
      const lineRange = count > 1 ? `Lines ${group.first}–${event.line}` : `Line ${event.line}`;
      group.summary.textContent = `${count} runtime ${count === 1 ? "update" : "updates"} · ${lineRange}`;
    }
    return fragment;
  }

  function syncControls() {
    const total = view?.total ?? 0;
    previous.disabled = !total || step === 1;
    next.disabled = !total || step === total;
    play.disabled = total < 2;
    seek.disabled = total < 2;
    seek.max = String(Math.max(1, total));
    seek.value = String(step);
    seek.style.setProperty("--trace-fill", `${total > 1 ? (step - 1) / (total - 1) * 100 : 0}%`);
    seek.setAttribute("aria-valuetext", total ? `Event ${step} of ${total}` : "No events");
    byId("trace-position").textContent = total ? `${formatCount.format(step)} / ${formatCount.format(total)}` : "—";
  }

  function select(position, reveal = true) {
    const item = items.get(position);
    if (!item) return;
    active?.removeAttribute("aria-current");
    active = item;
    item.setAttribute("aria-current", "step");
    step = position;
    syncControls();
    if (!reveal) return;
    const group = item.closest(".trace-runtime > details");
    if (group) group.open = true;
    scroll.scrollTop += item.getBoundingClientRect().top - scroll.getBoundingClientRect().top - 8;
  }

  function setFilters(kinds = [], counts = {}) {
    const current = filter.value;
    const options = [new Option("All events", "")];
    if (source.value === "cli") options.push(new Option("Agent activity", "activity"));
    for (const kind of kinds) options.push(new Option(eventLabels[kind] ?? kind, kind));
    if (development()) {
      for (const [kind, label] of [["diagnostics", "Diagnostics"], ["screenshots", "Screenshots"]]) {
        if (counts[kind] !== 0 || current === kind) options.push(new Option(label, kind));
      }
    }
    filter.replaceChildren(...options);
    filter.value = options.some((option) => option.value === current) ? current : "";
  }

  function feedbackText(message) {
    feedback.textContent = message;
    feedback.hidden = !message;
  }

  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !request && !failedRequest) loadMore();
  }, { root: scroll, rootMargin: "0px 0px 140px 0px" });

  function syncPages() {
    earlier.hidden = firstPage <= 1;
    earlier.disabled = Boolean(request);
    more.hidden = !(failedRequest || (view && lastPage < view.pages));
    more.disabled = Boolean(request);
    more.textContent = failedRequest ? "Retry loading events" : "Load more events ↓";
    observer.unobserve(more);
    if (!more.hidden && !request && !failedRequest) observer.observe(more);
  }

  async function load({ page = 1, position, placement = "replace" } = {}) {
    if (placement !== "replace" && request) return;
    request?.abort();
    const controller = new AbortController();
    request = controller;
    failedRequest = undefined;
    const { signal } = controller;
    const query = { kind: filter.value, q: search.value, page };
    if (position !== undefined) query.step = position;
    list.setAttribute("aria-busy", "true");
    syncPages();
    if (!view) feedbackText("Loading transcript…");
    try {
      const data = await get(url("log", query), "json", signal);
      if (signal.aborted) return;
      const height = scroll.scrollHeight;
      const scrollTop = scroll.scrollTop;
      if (placement === "replace") {
        items.clear();
        active = undefined;
      }
      const fragment = pageItems(data);
      view = data;
      if (placement === "before") {
        firstPage = data.page;
        list.prepend(fragment);
      } else if (placement === "after") {
        lastPage = data.page;
        list.append(fragment);
      } else {
        firstPage = data.page;
        lastPage = data.page;
        list.replaceChildren(fragment);
        scroll.scrollTop = 0;
      }
      setFilters(data.kinds, data.focus);
      status.textContent = data.total === data.unfiltered
        ? `${formatCount.format(data.total)} events`
        : `${formatCount.format(data.total)} of ${formatCount.format(data.unfiltered)} events`;
      feedbackText(data.total ? (lastPage === data.pages ? "End of transcript" : "") : "No matching events.");
      if (placement === "before") scroll.scrollTop = scrollTop + scroll.scrollHeight - height;
      if (placement === "replace" && data.total) select(Math.min(position ?? 1, data.total), position !== undefined);
      else syncControls();
    } catch {
      if (!signal.aborted) {
        pause();
        failedRequest = { page, position, placement };
        feedbackText("Could not read this part of the transcript.");
      }
    } finally {
      if (request === controller) {
        request = undefined;
        list.setAttribute("aria-busy", "false");
        syncPages();
      }
    }
  }

  function loadMore() {
    if (failedRequest) return load(failedRequest);
    if (!view) return load();
    if (lastPage < view.pages) return load({ page: lastPage + 1, placement: "after" });
  }

  async function moveTo(position) {
    if (!view?.total) return;
    const target = Math.max(1, Math.min(position, view.total));
    if (items.has(target)) select(target);
    else await load({ position: target });
  }

  async function jumpToPair(event) {
    pause();
    if (event.pairedStep) {
      await moveTo(event.pairedStep);
    } else {
      filter.value = "";
      search.value = "";
      await reset(event.pairedRecord);
      onViewChange();
    }
    active?.querySelector(".trace-entry-title")?.focus({ preventScroll: true });
  }

  function pause() {
    clearInterval(playback);
    playback = undefined;
    clearTimeout(scrubTimer);
    play.firstElementChild.textContent = "▶";
    play.lastElementChild.textContent = "Play";
    play.classList.remove("is-playing");
  }

  function replay() {
    if (playback) {
      pause();
      return;
    }
    if (step === view.total) moveTo(1);
    play.firstElementChild.textContent = "Ⅱ";
    play.lastElementChild.textContent = "Pause";
    play.classList.add("is-playing");
    playback = setInterval(() => {
      if (request) return;
      const folded = items.get(step + 1)?.closest(".trace-runtime > details:not([open])");
      const nextStep = folded ? Number(folded.dataset.last) + 1 : step + 1;
      if (nextStep <= view.total) moveTo(nextStep);
      else pause();
    }, 850);
  }

  function reset(position) {
    pause();
    clearTimeout(searchTimer);
    request?.abort();
    view = undefined;
    firstPage = 0;
    lastPage = 0;
    step = 1;
    items.clear();
    list.replaceChildren();
    status.textContent = "";
    syncControls();
    return load({ position });
  }

  function chooseSources(preferred) {
    const choices = attempts[Number(attempt.value) - 1].sources;
    const modes = choices.toSorted((a, b) => Number(b === "cli") - Number(a === "cli"));
    source.replaceChildren(...modes.map((mode) => new Option(
      sourceLabels[mode] ?? `Program output ${mode.split("-")[1]}`, mode,
    )));
    source.value = modes.includes(preferred) ? preferred : modes[0];
  }

  function changeSource(position) {
    filter.value = "";
    search.value = "";
    setFilters();
    fullText.href = url("transcript");
    reset(position);
    onViewChange();
  }

  attempt.replaceChildren(...attempts.map((item, index) => new Option(item.label, index + 1)));
  const requested = Number(params.get("attempt"));
  attempt.value = String(Number.isInteger(requested) && requested >= 1 && requested <= attempts.length ? requested : 1);
  chooseSources(params.get("source"));
  setFilters(Object.keys(eventLabels));
  const initialFilter = params.get("events");
  if ([...filter.options].some((option) => option.value === initialFilter)) filter.value = initialFilter;
  fullText.href = url("transcript");
  byId("trace-view").hidden = false;

  attempt.addEventListener("change", () => { chooseSources(source.value); changeSource(); });
  source.addEventListener("change", () => changeSource());
  filter.addEventListener("change", () => { reset(); onViewChange(); });
  search.addEventListener("input", () => {
    clearTimeout(searchTimer);
    pause();
    searchTimer = setTimeout(reset, 170);
  });
  earlier.addEventListener("click", () => load({ page: firstPage - 1, placement: "before" }));
  more.addEventListener("click", loadMore);
  previous.addEventListener("click", () => { pause(); moveTo(step - 1); });
  next.addEventListener("click", () => { pause(); moveTo(step + 1); });
  play.addEventListener("click", replay);
  seek.addEventListener("input", () => {
    pause();
    const value = Number(seek.value);
    scrubTimer = setTimeout(() => moveTo(value), 90);
  });
  seek.addEventListener("change", () => {
    clearTimeout(scrubTimer);
    moveTo(Number(seek.value));
  });
  byId("frame-close").addEventListener("click", () => frameDialog.close());
  frameDialog.addEventListener("click", (event) => { if (event.target === frameDialog) frameDialog.close(); });
  frameDialog.addEventListener("close", () => {
    frameImage.removeAttribute("src");
    frameTrigger?.focus({ preventScroll: true });
  });

  return {
    activate: () => { if (!view && !request) load(); },
    pause,
    route: () => ({ attempt: attempt.value, source: source.value, events: filter.value || "all" }),
    isPrimaryDevelopment: () => development() && attempt.value === "1",
  };
}
