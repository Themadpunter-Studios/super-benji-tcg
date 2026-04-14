(() => {
  const root = document.getElementById("tutorial-slideshow");
  if (!root) {
    return;
  }

  const slides = Array.from(root.querySelectorAll("[data-slide]"));
  const prevButton = document.getElementById("tutorial-prev");
  const nextButton = document.getElementById("tutorial-next");
  const dotsContainer = document.getElementById("tutorial-dots");
  const counter = document.getElementById("tutorial-counter");
  const progressBar = document.getElementById("tutorial-progress-bar");

  if (
    slides.length === 0 ||
    !prevButton ||
    !nextButton ||
    !dotsContainer ||
    !counter ||
    !progressBar
  ) {
    return;
  }

  let activeIndex = 0;

  const dots = slides.map((_, index) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "tutorial__dot";
    dot.setAttribute("role", "tab");
    dot.setAttribute("aria-label", `Go to slide ${index + 1}`);
    dot.addEventListener("click", () => {
      activeIndex = index;
      render();
    });
    dotsContainer.appendChild(dot);
    return dot;
  });

  function render() {
    slides.forEach((slide, index) => {
      const isActive = index === activeIndex;
      slide.hidden = !isActive;
      slide.classList.toggle("is-active", isActive);
    });

    dots.forEach((dot, index) => {
      const isActive = index === activeIndex;
      dot.classList.toggle("is-active", isActive);
      dot.setAttribute("aria-selected", String(isActive));
    });

    counter.textContent = `Slide ${activeIndex + 1} of ${slides.length}`;
    progressBar.style.width = `${((activeIndex + 1) / slides.length) * 100}%`;
  }

  prevButton.addEventListener("click", () => {
    activeIndex = (activeIndex - 1 + slides.length) % slides.length;
    render();
  });

  nextButton.addEventListener("click", () => {
    activeIndex = (activeIndex + 1) % slides.length;
    render();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      activeIndex = (activeIndex - 1 + slides.length) % slides.length;
      render();
    }
    if (event.key === "ArrowRight") {
      activeIndex = (activeIndex + 1) % slides.length;
      render();
    }
  });

  render();
})();