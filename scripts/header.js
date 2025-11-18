const header = document.querySelector(".site-header");

if (header) {
  const HIDE_THRESHOLD = 10;
  let lastScrollY = window.scrollY;
  let ticking = false;

  const updateHeaderState = () => {
    const currentY = window.scrollY;
    const delta = currentY - lastScrollY;
    const scrollingDown = delta > HIDE_THRESHOLD;
    const scrollingUp = delta < -HIDE_THRESHOLD;
    const nearTop = currentY < 20;

    if (scrollingDown && currentY > header.offsetHeight * 1.5) {
      header.classList.add("is-hidden");
    } else if (scrollingUp || nearTop) {
      header.classList.remove("is-hidden");
    }

    if (nearTop) {
      header.classList.remove("is-floating");
    } else {
      header.classList.add("is-floating");
    }

    lastScrollY = currentY;
    ticking = false;
  };

  const handleScroll = () => {
    if (!ticking) {
      window.requestAnimationFrame(updateHeaderState);
      ticking = true;
    }
  };

  window.addEventListener("scroll", handleScroll, { passive: true });
  updateHeaderState();
}
