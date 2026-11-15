import { byId, experimentUrl, get, testRuns, testVideoUrl } from "/common.js?v=native-videos";
import { demos } from "/assets/demo-sources.js?v=native";
import { playableUrl } from "/arcade/playable.js?v=duel";

const VIDEO_START = 4;
const PREVIEW_SECONDS = 7;
const HOVER_HIGHLIGHT_MS = 200;
const PREVIEW_CLOSE_MS = 1000;
const PREVIEW_FADE_MS = 140;
const IDLE_ART_DELAY_MS = 800;
const previewSources = {
  "black-myth": "/assets/demos/black-myth-highlight-10b72986b5a1.mp4",
  overcooked: "/assets/demos/overcooked-highlight-5dce6a40f9bc.mp4",
  "riders-republic": "/assets/demos/riders-republic-highlight-8ad69a3d3b14.mp4",
  sekiro: "/assets/demos/sekiro-highlight-345fb51ecad6.mp4",
};
const videoArtwork = new Set(["forza", "trackmania"]);
const artFolders = {
  forza: "scene-speed",
  "nba-2k25": "scene-wheels-court",
  trackmania: "scene-start-flame",
  overcooked: "scene-effects",
  sekiro: "scene-drawn-motion",
  "black-myth": "scene-corner",
  "slay-the-spire": "scene-stable",
};

function artPath(game, variant, extension = "webp") {
  const folder = artFolders[game] ?? "scene-actions";
  return `/assets/game-cover/${folder}/${variant}/${game}.${extension}`;
}

function prepareClip(clip, path) {
  clip.muted = true;
  clip.loop = true;
  clip.playsInline = true;
  clip.disablePictureInPicture = true;
  clip.src = path;
  return clip.play();
}

function closeUp(game, side, board, nativeWidth, nativeHeight, portrait) {
  if (portrait) {
    const scale = Math.min(1, board.width * .9 / nativeWidth, board.height * .68 / nativeHeight);
    const width = nativeWidth * scale;
    const height = nativeHeight * scale;
    return { width, height, left: (board.width - width) / 2, top: board.height * .88 - height };
  }
  const landscape = nativeWidth / nativeHeight > 1.36;
  const widthLimit = game === "forza" ? .65 : game === "trackmania" ? .55 : landscape ? .49 : .40;
  const heightLimit = game === "kingdom-rush" ? .88 : .93;
  const scale = Math.min(1, board.width * widthLimit / nativeWidth, board.height * heightLimit / nativeHeight);
  const width = nativeWidth * scale;
  const height = nativeHeight * scale;
  const atLeft = side === "left";
  const edge = board.width * (game === "forza" ? -.032 : -.014);
  const floor = board.height * (game === "forza" ? 1.032 : 1.01);
  return { width, height, left: atLeft ? edge : board.width - width - edge, top: floor - height };
}

function ramp(start, end, value) {
  const t = Math.max(0, Math.min(1, (value - start) / (end - start)));
  return t * t * (3 - 2 * t);
}

function initializePanelScroll(pan, board, overlay, motion, onFrame) {
  const wrap = pan.closest(".teaser-wrap");
  const picture = byId("cover-window");
  const frame = wrap.querySelector(".cover-frame");
  const teaser = byId("teaser");
  const header = byId("home-header");
  const leaderboard = byId("results");
  const brand = overlay.querySelector(".cover-brand");
  const next = overlay.querySelector(".cover-scroll");
  let scene;
  let request = 0;
  let lastFrame = 0;
  let visualScroll;
  let lastScroll = -1;
  let visible = false;

  const render = (time) => {
    request = 0;
    const scroll = Math.max(0, window.scrollY);
    const target = Math.min(scene.travel, scroll);
    const elapsed = Math.min(32, time - lastFrame);
    lastFrame = time;
    if (visualScroll === undefined || scene.reduced || scroll > scene.travel) {
      visualScroll = target;
    } else {
      visualScroll += (target - visualScroll) * (1 - Math.exp(-elapsed / 36));
      if (Math.abs(target - visualScroll) < .35) visualScroll = target;
    }
    if (visualScroll !== target) queue();
    if (visualScroll === lastScroll) return;
    lastScroll = visualScroll;
    const progress = visualScroll / scene.travel;
    const settled = Number(progress >= 1);
    const contraction = scene.reduced ? settled : ramp(.105, .85, progress);
    const navigation = scene.reduced ? settled : ramp(.62, .96, progress);
    const panX = pan.scrollLeft;
    const navFocus = header.querySelector(":focus-visible") !== null;
    const headerProgress = navFocus ? 1 : navigation;
    const showHeader = headerProgress > 0;
    header.style.opacity = String(headerProgress);
    header.style.transform = `translate3d(0, ${-20 * (1 - headerProgress)}px, 0)`;
    header.inert = headerProgress < .64;
    if (visible !== showHeader) {
      visible = showHeader;
      header.toggleAttribute("data-visible", visible);
    }
    leaderboard.style.setProperty("--leaderboard-reveal", String(scene.reduced ? 1 : ramp(.85, 1, progress)));

    const left = scene.left * contraction;
    const top = scene.top * contraction;
    const bottom = scene.bottom * contraction;
    const width = scene.width - 2 * left;
    const height = scene.height - top - bottom;
    const xScale = width / scene.width;
    const yScale = height / scene.height;
    const scale = 1 + (scene.scale - 1) * contraction;
    const translation = `translate3d(${left}px, ${top}px, 0)`;
    picture.style.transform = `${translation} scale(${xScale}, ${yScale})`;
    // Counter the window scale to preserve the illustration's aspect ratio as the crop changes.
    const artX = panX * (1 - (1 - contraction) / xScale);
    const artY = scene.y * ((1 - contraction) / yScale - 1);
    board.style.transform = `translate3d(${artX}px, ${artY}px, 0) scale(${scale / xScale}, ${scale / yScale})`;
    frame.style.transform = `${translation} scale(${width / scene.panelWidth}, ${height / scene.panelHeight})`;
    frame.style.opacity = String(ramp(.52, .96, contraction));
    overlay.style.inset = `${top}px ${left}px ${bottom}px`;
    const brandOpacity = scene.compact ? 1 - ramp(.60, .94, contraction) : 1;
    brand.style.opacity = String(brandOpacity);
    brand.inert = brandOpacity < .18 && !brand.contains(document.activeElement);
    onFrame(contraction > 0, { width, height });
  };

  function queue(force = false) {
    if (force) lastScroll = -1;
    if (!request) request = requestAnimationFrame(render);
  }

  const measure = () => {
    const reduced = motion.matches;
    const width = pan.clientWidth;
    const height = pan.clientHeight;
    const compact = width < 720;
    const rail = compact ? 14 : 24;
    const headerHeight = header.offsetHeight;
    const top = headerHeight + (compact ? 14 : 19);
    const margin = compact ? 16 : 22;
    const panelWidth = Math.min(1440, width - rail * 2, Math.max(120, (height - top - margin) * 1672 / 941));
    const panelHeight = panelWidth * 941 / 1672;
    scene = {
      width,
      height,
      panelWidth,
      panelHeight,
      left: (width - panelWidth) / 2,
      top,
      end: top + panelHeight + margin,
      bottom: height - top - panelHeight,
      scale: panelWidth / board.offsetWidth,
      y: parseFloat(getComputedStyle(board).marginTop),
      travel: reduced ? 84 : Math.max(525, Math.min(740, Math.round(height * .78))),
      compact,
      reduced,
    };
    document.body.style.setProperty("--home-header-height", `${headerHeight}px`);
    teaser.style.setProperty("--cover-travel", `${scene.travel}px`);
    teaser.style.setProperty("--cover-end", `${scene.end}px`);
    frame.style.width = `${panelWidth}px`;
    frame.style.height = `${panelHeight}px`;
    visualScroll = undefined;
    queue(true);
  };

  next.addEventListener("click", (event) => {
    if (motion.matches || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (location.hash !== next.hash) {
      const oldURL = location.href;
      history.pushState(null, "", next.hash);
      window.dispatchEvent(new HashChangeEvent("hashchange", { oldURL, newURL: location.href }));
    }
    leaderboard.scrollIntoView({ behavior: "smooth" });
  });
  header.querySelector('a[href="#teaser"]').addEventListener("click", () => teaser.focus({ preventScroll: true }));
  brand.addEventListener("focusout", () => queue(true));
  header.addEventListener("focusout", () => queue(true));
  pan.addEventListener("scroll", () => queue(true), { passive: true });
  window.addEventListener("scroll", () => queue(), { passive: true });
  window.addEventListener("pageshow", measure);
  motion.addEventListener("change", measure);
  const layout = new ResizeObserver(measure);
  layout.observe(pan);
  layout.observe(header);
  measure();
}

function initializeCover() {
  const stage = byId("teaser-stage");
  const pan = byId("cover-pan");
  const overlay = byId("cover-overlay");
  const views = byId("cover-views");
  const gallery = stage.querySelector(".cover-gallery");
  const board = stage.querySelector(".cover-artboard");
  const plate = board.querySelector(".cover-plate");
  const artwork = byId("cover-feature-art");
  const artworkVideo = byId("cover-feature-video");
  const video = byId("cover-video");
  const preview = byId("cover-preview");
  const title = byId("cover-game-name");
  const source = byId("cover-preview-source");
  const results = byId("cover-results");
  const tests = byId("cover-tests");
  const policy = byId("cover-policy");
  const playDemo = byId("cover-play");
  const close = byId("cover-close");
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const portrait = matchMedia("(orientation: portrait)");
  const touch = matchMedia("(hover: none)");
  const figures = [...gallery.querySelectorAll(".cover-game")];
  for (const link of figures) {
    const url = playableUrl(link.dataset.game);
    if (url) link.dataset.playUrl = url;
  }

  let current = null;
  let highlighted = null;
  let hovered = null;
  let focused = null;
  let pinned = false;
  let visible = true;
  let restoringFocus = false;
  let highlightTimer = 0;
  let closeTimer = 0;
  let featureMotion = null;
  let activeArtwork = artwork;
  let featureRequest = 0;
  let idleRequest = 0;
  let idleTimer = 0;
  let loadingIdle = false;
  let usingDemo = false;
  let retireTimer = 0;
  const evidence = new Map();
  const firstMotion = new Set([...Object.keys(artFolders), "balatro"]);
  const idleFigures = [
    ...figures.filter((link) => firstMotion.has(link.dataset.game)),
    ...figures.filter((link) => !firstMotion.has(link.dataset.game)),
  ];

  async function loadIdleLayer(link, request) {
    const frame = link.querySelector(".cover-idle");
    const game = link.dataset.game;
    if (videoArtwork.has(game) && !(frame instanceof HTMLVideoElement)) {
      const clip = document.createElement("video");
      try {
        clip.className = frame.className;
        clip.setAttribute("aria-hidden", "true");
        frame.after(clip);
        clip.hidden = true;
        await prepareClip(clip, artPath(game, "idle", "webm"));
        if (request !== idleRequest) {
          clip.pause();
          clip.remove();
          return;
        }
        clip.hidden = false;
        frame.remove();
        return;
      } catch {
        clip.removeAttribute("src");
        clip.load();
        clip.remove();
      }
    }
    if (request !== idleRequest) return;
    const path = artPath(game, "idle");
    if (frame.getAttribute("src") === path) return;
    const animated = new Image();
    animated.fetchPriority = "low";
    animated.src = path;
    try {
      await animated.decode();
    } catch {
      return;
    }
    if (request !== idleRequest) return;
    animated.className = frame.className;
    animated.alt = "";
    frame.replaceWith(animated);
  }

  function scheduleIdleLayers() {
    window.clearTimeout(idleTimer);
    if (loadingIdle || current || highlighted || !stage.hasAttribute("data-animated")) return;
    const request = idleRequest;
    idleTimer = window.setTimeout(async () => {
      loadingIdle = true;
      try {
        for (const link of idleFigures) {
          if (request !== idleRequest || current || highlighted) return;
          if (link.querySelector(".cover-idle") instanceof HTMLImageElement) {
            await loadIdleLayer(link, request);
          }
        }
      } finally {
        loadingIdle = false;
        if (request !== idleRequest) scheduleIdleLayers();
      }
    }, IDLE_ART_DELAY_MS);
  }

  async function updateIdleMotion() {
    const request = ++idleRequest;
    const shouldPlay = visible && !document.hidden && !motion.matches;
    if (!shouldPlay) stage.removeAttribute("data-animated");
    const images = [plate];
    for (const link of figures) {
      const loop = link.querySelector(".cover-idle");
      if (shouldPlay) {
        if (loop instanceof HTMLVideoElement) loop.play().catch(() => {});
        if (loop instanceof HTMLImageElement) {
          if (!loop.hasAttribute("src")) loop.src = artPath(link.dataset.game, "still");
          images.push(loop);
        }
      } else {
        if (loop instanceof HTMLVideoElement) loop.pause();
        else loop.removeAttribute("src");
      }
    }
    if (!shouldPlay) return;
    try {
      await Promise.all(images.map((image) => image.decode()));
    } catch {
      return;
    }
    if (request !== idleRequest) return;
    stage.setAttribute("data-animated", "");
    scheduleIdleLayers();
  }

  function positionArtwork(link, animate, frame = overlay.getBoundingClientRect()) {
    const width = activeArtwork.videoWidth ?? activeArtwork.naturalWidth;
    const height = activeArtwork.videoHeight ?? activeArtwork.naturalHeight;
    const final = closeUp(link.dataset.game, link.dataset.side, frame, width, height, portrait.matches);
    for (const [key, value] of Object.entries(final)) activeArtwork.style.setProperty(`--feature-${key}`, `${value}px`);
    if (!animate || motion.matches) return;
    featureMotion?.cancel();
    const drift = Math.min(16, frame.width * .013) * (link.dataset.side === "left" ? -1 : 1);
    featureMotion = activeArtwork.animate([
      { transform: `translateX(${drift}px)`, opacity: 0 },
      { transform: "none", opacity: 1 },
    ], { duration: 670, easing: "cubic-bezier(.19,.61,.29,1)" });
  }

  async function loadArtwork(link) {
    const request = ++featureRequest;
    const kind = motion.matches ? "layers" : "motion";
    const game = link.dataset.game;
    activeArtwork = artwork;
    artwork.hidden = true;
    artworkVideo.hidden = true;
    if (artworkVideo.hasAttribute("src")) {
      artworkVideo.pause();
      artworkVideo.removeAttribute("src");
      artworkVideo.load();
    }
    if (kind === "motion" && videoArtwork.has(game)) {
      try {
        await prepareClip(artworkVideo, artPath(game, kind, "webm"));
        if (request !== featureRequest || current !== link) return;
        activeArtwork = artworkVideo;
      } catch {
        if (request !== featureRequest || current !== link) return;
      }
    }
    if (activeArtwork === artwork) {
      artwork.src = artPath(game, kind);
      try {
        await artwork.decode();
      } catch {
        return;
      }
    }
    if (request !== featureRequest || current !== link) return;
    positionArtwork(link, stage.hasAttribute("data-video-ready"));
    activeArtwork.hidden = false;
    stage.setAttribute("data-feature-ready", "");
  }

  function getLink(element) {
    const link = element instanceof Element ? element.closest(".cover-game") : null;
    return link && gallery.contains(link) ? link : null;
  }

  function updatePan() {
    const maxScroll = Math.max(0, pan.scrollWidth - pan.clientWidth);
    views.hidden = pan.hasAttribute("data-fit") || maxScroll <= 2;
    const leftEdge = pan.scrollLeft <= 1;
    const rightEdge = pan.scrollLeft >= maxScroll - 1;
    views.firstElementChild.toggleAttribute("data-edge", leftEdge);
    views.lastElementChild.toggleAttribute("data-edge", rightEdge);
    views.firstElementChild.setAttribute("aria-disabled", leftEdge);
    views.lastElementChild.setAttribute("aria-disabled", rightEdge);
  }

  function centerSceneOn(link) {
    if (pan.hasAttribute("data-fit")) return;
    const bounds = link.getBoundingClientRect();
    const viewport = pan.getBoundingClientRect();
    const center = bounds.left + bounds.width / 2;
    if (center < viewport.left || center > viewport.right) {
      pan.scrollLeft += center - (viewport.left + viewport.width / 2);
    }
  }

  function clipStart() {
    return !usingDemo && Number.isFinite(video.duration) && video.duration > VIDEO_START + PREVIEW_SECONDS ? VIDEO_START : 0;
  }

  function loadVideo(game, run) {
    usingDemo = !run;
    video.loop = usingDemo;
    source.textContent = run ? `Test 1 · ${run.modelName}` : "Gameplay recording";
    const demo = demos[game];
    video.src = run ? testVideoUrl(run)
      : previewSources[game] ?? `/assets/demos/${encodeURIComponent(game)}.mp4?v=${demo.revision}`;
    video.preload = "metadata";
    video.load();
    play();
  }

  function play() {
    if (!current || document.hidden || !visible || (motion.matches && !pinned)) return;
    video.play().catch(() => {});
  }

  function clearHighlight() {
    window.clearTimeout(highlightTimer);
    highlighted?.removeAttribute("data-highlighted");
    highlighted = null;
    if (!current) scheduleIdleLayers();
  }

  function cancelClose() {
    window.clearTimeout(closeTimer);
    closeTimer = 0;
  }

  function holdPreview() {
    cancelClose();
    clearHighlight();
  }

  function retirePreview() {
    if (!current) return;
    current.removeAttribute("aria-current");
    current = null;
    pinned = false;
    stage.removeAttribute("data-active-game");
    stage.removeAttribute("data-video-ready");
    stage.removeAttribute("data-feature-ready");
    preview.hidden = true;
    featureRequest++;
    featureMotion?.cancel();
    video.pause();
    artworkVideo.pause();
    // Keep the last frame in place while the preview fades away.
    const delay = motion.matches ? 0 : PREVIEW_FADE_MS;
    const releaseMedia = () => {
      stage.removeAttribute("data-preview-side");
      video.removeAttribute("src");
      video.load();
      artworkVideo.removeAttribute("src");
      artworkVideo.load();
      artwork.removeAttribute("src");
    };
    if (delay) retireTimer = window.setTimeout(releaseMedia, delay);
    else releaseMedia();
    scheduleIdleLayers();
  }

  function stop(restoreFocus = false) {
    cancelClose();
    const last = current ?? highlighted;
    clearHighlight();
    retirePreview();
    hovered = focused = null;
    if (restoreFocus && last) {
      restoringFocus = true;
      last.focus({ preventScroll: true });
      restoringFocus = false;
    }
  }

  function reveal() {
    if (!current || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || video.seeking) return;
    if (video.currentTime + .1 < clipStart()) return;
    if (stage.hasAttribute("data-video-ready")) return;
    if (stage.hasAttribute("data-feature-ready")) positionArtwork(current, true);
    stage.setAttribute("data-video-ready", "");
  }

  function updatePreviewLinks(link) {
    const run = evidence.get(link.dataset.game);
    results.href = link.href;
    tests.hidden = !run;
    policy.hidden = !run?.files?.length;
    playDemo.hidden = !link.dataset.playUrl;
    if (run) tests.href = link.href + "#test-videos";
    if (!policy.hidden) policy.href = experimentUrl(run, { tab: "script" });
    if (!playDemo.hidden) playDemo.href = link.dataset.playUrl;
  }

  function open(link, pin = false) {
    cancelClose();
    clearHighlight();
    window.clearTimeout(retireTimer);
    if (pinned && !pin) return;
    if (current === link) {
      if (pin) {
        pinned = true;
        play();
      }
      return;
    }

    current?.removeAttribute("aria-current");
    current = link;
    pinned = pin;
    stage.removeAttribute("data-video-ready");
    stage.removeAttribute("data-feature-ready");
    video.pause();
    current.setAttribute("aria-current", "true");
    stage.dataset.activeGame = link.dataset.game;
    stage.dataset.previewSide = link.dataset.side;
    title.textContent = link.getAttribute("aria-label");
    updatePreviewLinks(link);
    preview.hidden = false;
    const game = link.dataset.game;
    const hasDemo = Object.hasOwn(demos, game);
    const run = hasDemo ? undefined : evidence.get(game);
    if (hasDemo || run) loadVideo(game, run);
    else source.textContent = "Replay unavailable";
    loadArtwork(link);
  }

  function previewIsHeld() {
    return pinned || hovered === current || focused === current ||
      preview.matches(":hover") || preview.contains(document.activeElement);
  }

  function scheduleClose() {
    if (!current || previewIsHeld()) {
      cancelClose();
      return;
    }
    if (closeTimer) return;
    closeTimer = window.setTimeout(() => {
      closeTimer = 0;
      if (!current || previewIsHeld()) return;
      if (hovered) highlight(hovered);
      else stop();
    }, PREVIEW_CLOSE_MS);
  }

  function highlight(link) {
    if (pinned || current === link || highlighted === link) return;
    cancelClose();
    clearHighlight();
    highlighted = link;
    link.setAttribute("data-highlighted", "");
    highlightTimer = window.setTimeout(() => open(link), HOVER_HIGHLIGHT_MS);
  }

  gallery.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
    const link = getLink(event.target);
    if (!link || link === hovered) return;
    hovered = link;
    if (current && previewIsHeld()) holdPreview();
    else highlight(link);
  });
  gallery.addEventListener("pointerout", (event) => {
    const link = getLink(event.target);
    if (!link || link === getLink(event.relatedTarget)) return;
    if (hovered === link) hovered = null;
    if (highlighted === link && focused !== link) clearHighlight();
    scheduleClose();
  });
  stage.addEventListener("pointerleave", () => {
    hovered = null;
    if (highlighted !== focused) clearHighlight();
    scheduleClose();
  });
  preview.addEventListener("pointerenter", holdPreview);
  preview.addEventListener("pointerdown", holdPreview);
  preview.addEventListener("pointerleave", scheduleClose);
  preview.addEventListener("focusin", holdPreview);
  preview.addEventListener("focusout", scheduleClose);

  gallery.addEventListener("focusin", (event) => {
    const link = getLink(event.target);
    if (!link || restoringFocus || !link.matches(":focus-visible")) return;
    centerSceneOn(link);
    focused = link;
    highlight(link);
  });
  gallery.addEventListener("focusout", (event) => {
    const link = getLink(event.target);
    if (focused === link) focused = null;
    if (highlighted === link && hovered !== link) clearHighlight();
    scheduleClose();
  });
  gallery.addEventListener("click", (event) => {
    const link = getLink(event.target);
    if (!link || event.detail === 0 || !touch.matches ||
        event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    open(link, true);
    close.focus({ preventScroll: true });
  });
  close.addEventListener("click", () => stop(true));
  pan.addEventListener("scroll", updatePan, { passive: true });
  views.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-pan]");
    if (!button || button.hasAttribute("data-edge")) return;
    stop();
    pan.scrollBy({
      left: Number(button.dataset.pan) * pan.clientWidth * .82,
      behavior: motion.matches ? "instant" : "smooth",
    });
  });
  stage.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && (current || highlighted)) stop(true);
  });

  video.addEventListener("loadedmetadata", () => {
    if (!current) return;
    video.currentTime = clipStart();
    play();
  });
  video.addEventListener("loadeddata", reveal);
  video.addEventListener("seeked", reveal);
  video.addEventListener("playing", reveal);
  video.addEventListener("timeupdate", () => {
    if (current && !usingDemo && video.currentTime >= clipStart() + PREVIEW_SECONDS) video.currentTime = clipStart();
  });
  video.addEventListener("ended", () => {
    if (!current) return;
    video.currentTime = clipStart();
    play();
  });
  video.addEventListener("error", () => {
    if (!current) return;
    stage.removeAttribute("data-video-ready");
    const run = evidence.get(current.dataset.game);
    if (usingDemo && run) {
      loadVideo(current.dataset.game, run);
      return;
    }
    source.textContent = "Replay unavailable";
  });

  document.addEventListener("visibilitychange", () => {
    updateIdleMotion();
    if (document.hidden) video.pause();
    else play();
  });
  motion.addEventListener("change", () => {
    updateIdleMotion();
    if (current) loadArtwork(current);
    if (motion.matches && !pinned) video.pause();
    else play();
  });
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    updateIdleMotion();
    if (visible) play();
    else if (pinned) video.pause();
    else stop();
  }, { threshold: .1 }).observe(stage);
  pan.scrollLeft = Math.max(0, (pan.scrollWidth - pan.clientWidth) / 2);
  updatePan();
  get("/api/results").then(({ runs }) => {
    for (const run of testRuns(runs)) {
      if (!evidence.has(run.gameId)) evidence.set(run.gameId, run);
    }
    if (!current) return;
    updatePreviewLinks(current);
    const run = evidence.get(current.dataset.game);
    if (run && (!video.hasAttribute("src") || (usingDemo && video.error))) loadVideo(current.dataset.game, run);
  }).catch(() => {});
  initializePanelScroll(pan, board, overlay, motion, (fitted, frame) => {
    if (pan.hasAttribute("data-fit") !== fitted) {
      pan.toggleAttribute("data-fit", fitted);
      updatePan();
    }
    if (current && stage.hasAttribute("data-feature-ready")) positionArtwork(current, false, frame);
  });
}

initializeCover();
