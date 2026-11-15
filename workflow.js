const workflow = document.getElementById("workflow");
const replay = document.getElementById("workflow-replay");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
let frame;

function playWorkflow() {
  workflow.removeAttribute("data-playing");
  cancelAnimationFrame(frame);
  if (reducedMotion.matches) return;
  frame = requestAnimationFrame(() => {
    frame = requestAnimationFrame(() => workflow.setAttribute("data-playing", ""));
  });
}

function updateMotionPreference() {
  replay.hidden = reducedMotion.matches;
  if (reducedMotion.matches) {
    cancelAnimationFrame(frame);
    workflow.removeAttribute("data-playing");
  }
}

updateMotionPreference();
reducedMotion.addEventListener("change", updateMotionPreference);
replay.addEventListener("click", playWorkflow);

const observer = new IntersectionObserver((entries) => {
  if (!entries.some((entry) => entry.isIntersecting)) return;
  observer.disconnect();
  playWorkflow();
}, { threshold: 0.35 });
observer.observe(workflow.querySelector(".workflow-steps"));
