const REPLAY_DELAY_MS = 5000;

const workflow = document.getElementById("workflow");
const steps = workflow.querySelector(".workflow-steps");
const score = steps.querySelector(".workflow-trial-score");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
let inView = false;
let replayTimer;
let restartFrame;

function updatePlayback() {
  if (inView && !document.hidden && !reducedMotion.matches) {
    workflow.setAttribute("data-playing", "");
    return;
  }
  clearTimeout(replayTimer);
  cancelAnimationFrame(restartFrame);
  workflow.removeAttribute("data-playing");
}

score.addEventListener("animationend", (event) => {
  if (event.target !== score || !workflow.hasAttribute("data-playing")) return;
  replayTimer = window.setTimeout(() => {
    workflow.removeAttribute("data-playing");
    restartFrame = requestAnimationFrame(() => {
      restartFrame = requestAnimationFrame(updatePlayback);
    });
  }, REPLAY_DELAY_MS);
});

reducedMotion.addEventListener("change", updatePlayback);
document.addEventListener("visibilitychange", updatePlayback);

const observer = new IntersectionObserver(([entry]) => {
  inView = entry.isIntersecting;
  updatePlayback();
});
observer.observe(steps);
