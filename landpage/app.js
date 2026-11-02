/**
 * Levia AI — Interactive Creative Engine
 * Provides 3D mouse parallax on translucent circles and waves, cursor spotlight tracking,
 * and interactive carousel indicator state management.
 */

document.addEventListener('DOMContentLoaded', () => {
  initCarouselIndicators();
  initMouseParallax();
  initCursorSpotlight();
  initScrollReveals();
  initWorkspaceTabs();
  initPricingToggle();
  initAudioPreview();
  initSmoothScrollDown();
});

/* ==========================================================================
   1. CAROUSEL INDICATOR STATE & CONTENT SWITCHER
   ========================================================================== */
function initCarouselIndicators() {
  const dots = document.querySelectorAll('.carousel-dot');
  const introLabel = document.querySelector('.hero-intro-label');
  const mainHeading = document.querySelector('.hero-main-heading');
  const description = document.querySelector('.hero-description');

  // Slide content data mapped directly to Levia AI's 4 core workspaces
  const slides = [
    {
      intro: "YOUR CREATIVE WORLD, REIMAGINED",
      headingLine1: "Your ideas deserve",
      headingLine2: "an entire operating system.",
      desc: "Create, plan, grow, and manage everything behind your creative journey. Levia AI brings your tools, workflows, and personalized AI into one workspace built around the way you work."
    },
    {
      intro: "COMMERCE & PRODUCT INTELLIGENCE",
      headingLine1: "Turn product knowledge",
      headingLine2: "into opportunities.",
      desc: "Use Beluga to organize product intelligence, explore potential customers, discover relevant companies, and prioritize promising opportunities."
    },
    {
      intro: "INDEPENDENT BUSINESS OPERATIONS",
      headingLine1: "Bring your projects",
      headingLine2: "and business together.",
      desc: "Organize client work, manage project progress, keep track of deliverables, and maintain visibility into your business activities."
    },
    {
      intro: "EDUCATION & TEACHING WORKFLOWS",
      headingLine1: "Build a more organized",
      headingLine2: "teaching workflow.",
      desc: "Structure educational content, organize learning resources, plan courses, and manage the work behind delivering valuable learning experiences."
    }
  ];

  let activeIndex = 0;

  function switchSlide(index) {
    if (index === activeIndex) return;
    activeIndex = index;

    // Update active dot
    dots.forEach((dot, idx) => {
      if (idx === index) {
        dot.classList.add('active');
        dot.setAttribute('aria-selected', 'true');
      } else {
        dot.classList.remove('active');
        dot.setAttribute('aria-selected', 'false');
      }
    });

    // Smooth subtle content fade
    const slide = slides[index];
    if (introLabel && mainHeading && description) {
      introLabel.style.opacity = '0';
      mainHeading.style.opacity = '0';
      description.style.opacity = '0';

      setTimeout(() => {
        introLabel.innerText = slide.intro;
        mainHeading.innerHTML = `<span>${slide.headingLine1}</span><span>${slide.headingLine2}</span>`;
        description.innerText = slide.desc;

        introLabel.style.transition = 'opacity 0.35s ease';
        mainHeading.style.transition = 'opacity 0.35s ease';
        description.style.transition = 'opacity 0.35s ease';

        introLabel.style.opacity = '1';
        mainHeading.style.opacity = '1';
        description.style.opacity = '1';
      }, 180);
    }
  }

  dots.forEach((dot) => {
    dot.addEventListener('click', () => {
      const targetIndex = parseInt(dot.getAttribute('data-index'), 10);
      switchSlide(targetIndex);
    });
  });

  // Keyboard navigation (ArrowLeft / ArrowRight)
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') {
      const nextIndex = (activeIndex + 1) % dots.length;
      switchSlide(nextIndex);
    } else if (e.key === 'ArrowLeft') {
      const prevIndex = (activeIndex - 1 + dots.length) % dots.length;
      switchSlide(prevIndex);
    }
  });
}

/* ==========================================================================
   2. 3D MOUSE PARALLAX ON TRANSLUCENT CIRCLES, FLUID WAVES & NETWORK NODES
   ========================================================================== */
function initMouseParallax() {
  const circleLarge = document.getElementById('circle-large');
  const circleLower = document.getElementById('circle-lower');
  const pearl1 = document.getElementById('circle-pearl-1');
  const pearl2 = document.getElementById('circle-pearl-2');
  const waveSvg = document.querySelector('.fluid-wave-svg');

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let targetX = mouseX;
  let targetY = mouseY;

  window.addEventListener('mousemove', (e) => {
    targetX = e.clientX;
    targetY = e.clientY;
  });

  let time = 0;

  function renderParallax() {
    time += 0.016;

    // Smooth inertia lerp
    mouseX += (targetX - mouseX) * 0.06;
    mouseY += (targetY - mouseY) * 0.06;

    const normX = (mouseX / window.innerWidth - 0.5) * 2; // -1 to 1
    const normY = (mouseY / window.innerHeight - 0.5) * 2; // -1 to 1

    // 1. Large Translucent Circle (Gentle floating + depth reaction)
    if (circleLarge) {
      const floatY = Math.sin(time * 0.85) * 10;
      const floatX = Math.cos(time * 0.65) * 6;
      const posX = -normX * 24 + floatX;
      const posY = -normY * 22 + floatY;
      circleLarge.style.transform = `translate3d(${posX}px, ${posY}px, 0)`;
    }

    // 2. Medium Lower-Left Translucent Circle
    if (circleLower) {
      const floatY = Math.sin(time * 1.05 + 1.2) * 8;
      const posX = normX * 20;
      const posY = normY * 20 + floatY;
      circleLower.style.transform = `translate3d(${posX}px, ${posY}px, 0)`;
    }

    // 3. Small Translucent Pearl Circles
    if (pearl1) {
      const posX = -normX * 16;
      const posY = -normY * 14 + Math.sin(time * 1.2) * 5;
      pearl1.style.transform = `translate3d(${posX}px, ${posY}px, 0)`;
    }

    if (pearl2) {
      const posX = -normX * 18;
      const posY = -normY * 16 + Math.cos(time * 1.1) * 6;
      pearl2.style.transform = `translate3d(${posX}px, ${posY}px, 0)`;
    }

    // 4. Subtle Wave SVG Parallax Shift
    if (waveSvg) {
      const waveShiftX = normX * 10;
      const waveShiftY = normY * 8;
      waveSvg.style.transform = `translate3d(${waveShiftX}px, ${waveShiftY}px, 0)`;
    }

    requestAnimationFrame(renderParallax);
  }

  requestAnimationFrame(renderParallax);
}

/* ==========================================================================
   3. CURSOR SPOTLIGHT TRACKER
   ========================================================================== */
function initCursorSpotlight() {
  const spotlight = document.getElementById('cursor-spotlight');
  if (!spotlight) return;

  let currentX = window.innerWidth / 2;
  let currentY = window.innerHeight / 2;
  let targetX = currentX;
  let targetY = currentY;

  window.addEventListener('mousemove', (e) => {
    targetX = e.clientX;
    targetY = e.clientY;
  });

  function updateSpotlight() {
    currentX += (targetX - currentX) * 0.12;
    currentY += (targetY - currentY) * 0.12;

    spotlight.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
    requestAnimationFrame(updateSpotlight);
  }
  updateSpotlight();
}

/* ==========================================================================
   4. SCROLL REVEAL (FLUID INTERSECTION OBSERVER ENTRY)
   ========================================================================== */
function initScrollReveals() {
  const elements = document.querySelectorAll('.reveal-on-scroll');
  if (!elements.length) return;

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          obs.unobserve(entry.target);
        }
      });
    }, {
      root: null,
      rootMargin: '0px 0px -60px 0px',
      threshold: 0.12
    });

    elements.forEach((el) => observer.observe(el));
  } else {
    elements.forEach((el) => el.classList.add('revealed'));
  }
}

/* ==========================================================================
   5. WORKSPACE INTERACTIVE TABS SYSTEM
   ========================================================================== */
function initWorkspaceTabs() {
  const tabButtons = document.querySelectorAll('.ws-tab-btn');
  const panels = document.querySelectorAll('.ws-panel');
  if (!tabButtons.length || !panels.length) return;

  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tabTarget = btn.getAttribute('data-tab');

      // Update button active state
      tabButtons.forEach((b) => {
        const isActive = b === btn;
        b.classList.toggle('active', isActive);
        b.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });

      // Update panel visibility
      panels.forEach((panel) => {
        const matches = panel.id === `tab-${tabTarget}`;
        panel.classList.toggle('active', matches);
      });
    });
  });
}

/* ==========================================================================
   6. PRICING PERIOD TOGGLE SWITCH (MONTHLY / ANNUAL)
   ========================================================================== */
function initPricingToggle() {
  const toggleBtn = document.getElementById('pricingToggle');
  const monthlyLabel = document.getElementById('monthlyLabel');
  const annualLabel = document.getElementById('annualLabel');
  const priceAmounts = document.querySelectorAll('.tier-amount');
  if (!toggleBtn || !priceAmounts.length) return;

  let isAnnual = true; // default annual with 20% discount

  function updatePricing() {
    if (isAnnual) {
      toggleBtn.classList.remove('monthly');
      toggleBtn.querySelector('.toggle-thumb').style.left = '22px';
      toggleBtn.setAttribute('aria-checked', 'true');
      if (monthlyLabel) monthlyLabel.classList.remove('active');
      if (annualLabel) annualLabel.classList.add('active');

      priceAmounts.forEach((el) => {
        const annualVal = el.getAttribute('data-annual');
        if (annualVal) el.textContent = annualVal;
      });
    } else {
      toggleBtn.classList.add('monthly');
      toggleBtn.querySelector('.toggle-thumb').style.left = '2px';
      toggleBtn.setAttribute('aria-checked', 'false');
      if (monthlyLabel) monthlyLabel.classList.add('active');
      if (annualLabel) annualLabel.classList.remove('active');

      priceAmounts.forEach((el) => {
        const monthlyVal = el.getAttribute('data-monthly');
        if (monthlyVal) el.textContent = monthlyVal;
      });
    }
  }

  toggleBtn.addEventListener('click', () => {
    isAnnual = !isAnnual;
    updatePricing();
  });
}

/* ==========================================================================
   7. INTERACTIVE AUDIO PREVIEW WAVEFORM
   ========================================================================== */
function initAudioPreview() {
  const playBtn = document.getElementById('audioPreviewBtn');
  const waveformBars = document.querySelectorAll('.audio-waveform-bars span');
  if (!playBtn || !waveformBars.length) return;

  let isPlaying = false;
  let waveInterval = null;

  playBtn.addEventListener('click', () => {
    isPlaying = !isPlaying;

    if (isPlaying) {
      playBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16"></rect>
          <rect x="14" y="4" width="4" height="16"></rect>
        </svg>
      `;
      playBtn.style.boxShadow = '0 0 24px rgba(166, 106, 255, 0.9)';

      // Dynamic waveform bounce animation
      waveInterval = setInterval(() => {
        waveformBars.forEach((bar) => {
          const randHeight = Math.floor(Math.random() * 70) + 25;
          bar.style.height = `${randHeight}%`;
        });
      }, 120);
    } else {
      playBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
      `;
      playBtn.style.boxShadow = '0 0 16px rgba(132, 59, 255, 0.5)';
      clearInterval(waveInterval);
    }
  });
}

/* ==========================================================================
   8. CINEMATIC SLIDE-DOWN SMOOTH SCROLLING
   ========================================================================== */
function initSmoothScrollDown() {
  const scrollTriggers = document.querySelectorAll('a[href^="#"]');

  scrollTriggers.forEach((trigger) => {
    trigger.addEventListener('click', (e) => {
      const href = trigger.getAttribute('href');
      if (!href || href === '#' || href === '#start' || href === '#signup') return;

      const targetEl = document.querySelector(href);
      if (targetEl) {
        e.preventDefault();
        targetEl.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
}
