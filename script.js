/* Progressive enhancement only; navigation and contacts work without JavaScript. */
const supportsMotion = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (supportsMotion) {
  const core = document.querySelector(".core img");
  const hero = document.querySelector(".hero");
  if (core && hero && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      core.classList.add("core-ready");
      observer.disconnect();
    }, { threshold: 0.1 });
    observer.observe(hero);
  }
}
