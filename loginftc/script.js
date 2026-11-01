/**
 * Cosmic Night Login Page - Interactive Logic & Canvas Animation
 * Features:
 * - Single-star sequential blinking (1 at a time: brightens up with lens flare, then dims back)
 * - Dynamic astrology symbol constellations connecting stars via Math.random()
 * - Floating astronaut companion with zero-g physics and speech interactions
 * - Form validation, password visibility toggle, mode switching, and toast notifications
 */

document.addEventListener('DOMContentLoaded', () => {
  // -------------------------------------------------------------
  // 1. DYNAMIC STARFIELD CANVAS ENGINE
  // -------------------------------------------------------------
  const canvas = document.getElementById('starfield');
  const ctx = canvas.getContext('2d');

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);
  let dpr = window.devicePixelRatio || 1;

  // Star collection & Shooting star system
  const STAR_COUNT = Math.max(140, Math.floor((width * height) / 4200));
  const stars = [];
  const shootingStars = [];

  // Star color palette (astronomical white, icy blue, celestial gold)
  const starColors = [
    'rgba(255, 255, 255, ',
    'rgba(224, 238, 255, ',
    'rgba(195, 222, 255, ',
    'rgba(255, 246, 228, '
  ];

  class Star {
    constructor() {
      this.reset();
    }

    reset() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.size = (Math.random() * 1.4 + 0.5) * (dpr > 1 ? 0.95 : 1);
      // Soft, calm baseline alpha (stays tranquil until chosen to blink)
      this.baseAlpha = Math.random() * 0.25 + 0.25;
      this.alpha = this.baseAlpha;
      this.color = starColors[Math.floor(Math.random() * starColors.length)];
      this.layer = Math.random() * 0.5 + 0.5; // Depth factor for 3D parallax
      this.drawX = this.x;
      this.drawY = this.y;
    }

    update(mouseOffsetX, mouseOffsetY) {
      // Parallax position offset
      this.drawX = this.x + mouseOffsetX * this.layer;
      this.drawY = this.y + mouseOffsetY * this.layer;
    }

    draw(customAlpha = null) {
      const renderAlpha = customAlpha !== null ? customAlpha : this.alpha;
      ctx.beginPath();
      ctx.arc(this.drawX, this.drawY, this.size, 0, Math.PI * 2);
      ctx.fillStyle = this.color + renderAlpha + ')';
      ctx.fill();

      // Ambient soft glow for medium stars
      if (this.size > 1.2 && renderAlpha > 0.4) {
        ctx.beginPath();
        ctx.arc(this.drawX, this.drawY, this.size * 2, 0, Math.PI * 2);
        ctx.fillStyle = this.color + (renderAlpha * 0.15) + ')';
        ctx.fill();
      }
    }
  }

  // Populate background starfield
  for (let i = 0; i < STAR_COUNT; i++) {
    stars.push(new Star());
  }

  // -------------------------------------------------------------
  // 2. SOLO STAR BLINK SYSTEM (1 at a time: brightens & dims back)
  // -------------------------------------------------------------
  let currentBlinkingStar = null;
  let blinkPhase = 'idle'; // 'brightening', 'holding', 'dimming', 'idle'
  let blinkProgress = 0;   // 0.0 to 1.0
  let blinkDelay = 20;     // Pause between consecutive blinks

  function updateSoloStarBlink() {
    if (blinkPhase === 'idle') {
      if (blinkDelay > 0) {
        blinkDelay--;
      } else if (stars.length > 0) {
        // Pick ONE star at a time at random using Math.random()
        currentBlinkingStar = stars[Math.floor(Math.random() * stars.length)];
        blinkPhase = 'brightening';
        blinkProgress = 0;
      }
      return;
    }

    if (blinkPhase === 'brightening') {
      blinkProgress += 0.038; // Smooth ramp up
      if (blinkProgress >= 1) {
        blinkProgress = 1;
        blinkPhase = 'holding';
        blinkHoldTimer = 8; // Brief peak hold (8 frames)
      }
    } else if (blinkPhase === 'holding') {
      blinkHoldTimer--;
      if (blinkHoldTimer <= 0) {
        blinkPhase = 'dimming';
      }
    } else if (blinkPhase === 'dimming') {
      blinkProgress -= 0.032; // Smooth ramp down
      if (blinkProgress <= 0) {
        blinkProgress = 0;
        blinkPhase = 'idle';
        currentBlinkingStar = null;
        // Natural pause before the next star starts blinking (10 to 30 frames)
        blinkDelay = Math.floor(Math.random() * 20 + 10);
      }
    }
  }

  let blinkHoldTimer = 0;

  function drawSoloBlinkingStar() {
    if (!currentBlinkingStar || blinkProgress <= 0) return;

    const star = currentBlinkingStar;
    // Calculate flared brightness from base up to pure 1.0
    const flareAlpha = star.baseAlpha + blinkProgress * (1.0 - star.baseAlpha);
    const flareSize = star.size * (1 + blinkProgress * 1.8);

    // 1. Draw glowing outer halo
    const glowRadius = Math.max(8, flareSize * 5 * blinkProgress);
    const haloGrad = ctx.createRadialGradient(star.drawX, star.drawY, 0, star.drawX, star.drawY, glowRadius);
    haloGrad.addColorStop(0, `rgba(255, 255, 255, ${0.9 * blinkProgress})`);
    haloGrad.addColorStop(0.3, `rgba(186, 230, 253, ${0.6 * blinkProgress})`);
    haloGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');

    ctx.beginPath();
    ctx.arc(star.drawX, star.drawY, glowRadius, 0, Math.PI * 2);
    ctx.fillStyle = haloGrad;
    ctx.fill();

    // 2. Draw brilliant 4-point cross diffraction spikes (star flare)
    const spikeLength = (16 + star.size * 10) * blinkProgress;
    ctx.save();
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.85 * blinkProgress})`;
    ctx.lineWidth = 1.2;

    // Horizontal spike
    ctx.beginPath();
    ctx.moveTo(star.drawX - spikeLength, star.drawY);
    ctx.lineTo(star.drawX + spikeLength, star.drawY);
    // Vertical spike
    ctx.moveTo(star.drawX, star.drawY - spikeLength);
    ctx.lineTo(star.drawX, star.drawY + spikeLength);
    ctx.stroke();

    // Secondary subtle diagonal sparkle
    if (blinkProgress > 0.6) {
      const diagLength = spikeLength * 0.45;
      ctx.strokeStyle = `rgba(224, 238, 255, ${0.5 * blinkProgress})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(star.drawX - diagLength, star.drawY - diagLength);
      ctx.lineTo(star.drawX + diagLength, star.drawY + diagLength);
      ctx.moveTo(star.drawX - diagLength, star.drawY + diagLength);
      ctx.lineTo(star.drawX + diagLength, star.drawY - diagLength);
      ctx.stroke();
    }
    ctx.restore();

    // 3. Central bright core
    ctx.beginPath();
    ctx.arc(star.drawX, star.drawY, flareSize, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }

  // -------------------------------------------------------------
  // 3. ASTROLOGY SYMBOL CONSTELLATION GENERATOR (via Math.random)
  // -------------------------------------------------------------
  const ASTROLOGY_SYMBOLS = [
    { glyph: '♈', name: 'Aries', subtitle: 'The Ram' },
    { glyph: '♉', name: 'Taurus', subtitle: 'The Bull' },
    { glyph: '♊', name: 'Gemini', subtitle: 'The Celestial Twins' },
    { glyph: '♋', name: 'Cancer', subtitle: 'The Crab' },
    { glyph: '♌', name: 'Leo', subtitle: 'The Golden Lion' },
    { glyph: '♍', name: 'Virgo', subtitle: 'The Maiden' },
    { glyph: '♎', name: 'Libra', subtitle: 'The Scales' },
    { glyph: '♏', name: 'Scorpio', subtitle: 'The Scorpion' },
    { glyph: '♐', name: 'Sagittarius', subtitle: 'The Archer' },
    { glyph: '♑', name: 'Capricorn', subtitle: 'The Sea-Goat' },
    { glyph: '♒', name: 'Aquarius', subtitle: 'The Water-Bearer' },
    { glyph: '♓', name: 'Pisces', subtitle: 'The Two Fishes' },
    { glyph: '✨', name: 'Orion', subtitle: 'The Cosmic Hunter' },
    { glyph: '👑', name: 'Cassiopeia', subtitle: 'The Starlight Crown' },
    { glyph: '🦢', name: 'Cygnus', subtitle: 'The Northern Cross' },
    { glyph: '🦅', name: 'Aquila', subtitle: 'The Stellar Eagle' }
  ];

  class AstrologyConstellation {
    constructor() {
      this.init();
    }

    init() {
      // Pick random astrology symbol using Math.random()
      this.symbol = ASTROLOGY_SYMBOLS[Math.floor(Math.random() * ASTROLOGY_SYMBOLS.length)];

      // Pick anchor star using Math.random()
      // Prefer stars in comfortable view (not too extreme edge)
      const validStars = stars.filter(s => s.x > 80 && s.x < width - 80 && s.y > 60 && s.y < height - 60);
      const centerStar = validStars.length > 0
        ? validStars[Math.floor(Math.random() * validStars.length)]
        : stars[Math.floor(Math.random() * stars.length)];

      if (!centerStar) return;

      // Find 5 to 8 nearby stars within 120px - 340px
      const radius = Math.min(width, height) * 0.28;
      const neighbors = stars
        .filter(s => s !== centerStar)
        .map(s => ({ star: s, dist: Math.hypot(s.x - centerStar.x, s.y - centerStar.y) }))
        .filter(item => item.dist < radius && item.dist > 35)
        .sort((a, b) => a.dist - b.dist);

      // Select 4 to 6 connected nodes via Math.random()
      const nodeCount = Math.floor(Math.random() * 3) + 4; // 4 to 6 nodes
      this.nodes = [centerStar];

      for (let i = 0; i < Math.min(nodeCount - 1, neighbors.length); i++) {
        this.nodes.push(neighbors[i].star);
      }

      // If we don't have enough neighbors, fallback to random picks
      while (this.nodes.length < 4 && stars.length >= 4) {
        const randStar = stars[Math.floor(Math.random() * stars.length)];
        if (!this.nodes.includes(randStar)) {
          this.nodes.push(randStar);
        }
      }

      // Connect stars like an astrological constellation asterism
      // Using Math.random() for branching and path connections
      this.edges = [];
      for (let i = 0; i < this.nodes.length - 1; i++) {
        this.edges.push([i, i + 1]); // Main spinal path
      }
      // Add a couple of random cross connections (branches)
      if (this.nodes.length > 3 && Math.random() > 0.3) {
        const a = Math.floor(Math.random() * (this.nodes.length - 2));
        const b = a + 2;
        if (b < this.nodes.length) this.edges.push([a, b]);
      }
      if (this.nodes.length > 4 && Math.random() > 0.4) {
        this.edges.push([0, Math.floor(Math.random() * 2) + 2]);
      }

      this.opacity = 0;
      this.state = 'fadeIn'; // 'fadeIn', 'display', 'fadeOut', 'idle'
      this.displayTimer = 220; // Stays active for ~3.5-4 seconds
      this.pulsePhase = 0;
    }

    update() {
      this.pulsePhase += 0.04;

      if (this.state === 'fadeIn') {
        this.opacity += 0.022;
        if (this.opacity >= 0.75) {
          this.opacity = 0.75;
          this.state = 'display';
        }
      } else if (this.state === 'display') {
        this.displayTimer--;
        if (this.displayTimer <= 0) {
          this.state = 'fadeOut';
        }
      } else if (this.state === 'fadeOut') {
        this.opacity -= 0.018;
        if (this.opacity <= 0) {
          this.opacity = 0;
          this.state = 'idle';
          this.idleTimer = Math.floor(Math.random() * 60 + 50); // Pause before next constellation
        }
      } else if (this.state === 'idle') {
        this.idleTimer--;
        if (this.idleTimer <= 0) {
          this.init(); // Form a new astrology constellation in a new area
        }
      }
    }

    draw() {
      if (this.opacity <= 0 || !this.nodes || this.nodes.length < 2) return;

      ctx.save();

      // 1. Draw glowing astrology constellation lines
      ctx.beginPath();
      for (let i = 0; i < this.edges.length; i++) {
        const [idxA, idxB] = this.edges[i];
        const starA = this.nodes[idxA];
        const starB = this.nodes[idxB];
        if (starA && starB) {
          ctx.moveTo(starA.drawX, starA.drawY);
          ctx.lineTo(starB.drawX, starB.drawY);
        }
      }

      // Outer ethereal line glow
      ctx.strokeStyle = `rgba(125, 211, 252, ${this.opacity * 0.45})`;
      ctx.lineWidth = 2.4;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 8;
      ctx.stroke();

      // Inner crisp starlight thread
      ctx.strokeStyle = `rgba(255, 255, 255, ${this.opacity * 0.85})`;
      ctx.lineWidth = 1.0;
      ctx.stroke();
      ctx.shadowBlur = 0; // Reset

      // 2. Draw astrological node rings around each star
      for (let i = 0; i < this.nodes.length; i++) {
        const node = this.nodes[i];
        const pulse = Math.sin(this.pulsePhase + i) * 1.5;
        const ringRadius = 5.5 + pulse;

        // Astrological ring
        ctx.beginPath();
        ctx.arc(node.drawX, node.drawY, ringRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(186, 230, 253, ${this.opacity * 0.7})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // 4 tiny celestial ticks (astrology coordinate markers)
        ctx.beginPath();
        ctx.moveTo(node.drawX - ringRadius - 2, node.drawY);
        ctx.lineTo(node.drawX - ringRadius + 1, node.drawY);
        ctx.moveTo(node.drawX + ringRadius - 1, node.drawY);
        ctx.lineTo(node.drawX + ringRadius + 2, node.drawY);
        ctx.moveTo(node.drawX, node.drawY - ringRadius - 2);
        ctx.lineTo(node.drawX, node.drawY - ringRadius + 1);
        ctx.moveTo(node.drawX, node.drawY + ringRadius - 1);
        ctx.lineTo(node.drawX, node.drawY + ringRadius + 2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${this.opacity * 0.6})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      // 3. Render elegant Astrology Symbol name & glyph
      let avgX = 0;
      let avgY = 0;
      for (let i = 0; i < this.nodes.length; i++) {
        avgX += this.nodes[i].drawX;
        avgY += this.nodes[i].drawY;
      }
      avgX /= this.nodes.length;
      avgY /= this.nodes.length;

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Astrological Glyph & Name label
      ctx.font = '600 13px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity * 0.9})`;
      ctx.shadowColor = 'rgba(56, 189, 248, 0.7)';
      ctx.shadowBlur = 6;
      ctx.fillText(`${this.symbol.glyph} ${this.symbol.name}`, avgX, avgY - 14);

      // Subtitle
      ctx.font = '400 10.5px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = `rgba(186, 230, 253, ${this.opacity * 0.75})`;
      ctx.shadowBlur = 0;
      ctx.fillText(this.symbol.subtitle, avgX, avgY + 3);

      ctx.restore();
    }
  }

  const activeConstellation = new AstrologyConstellation();

  // -------------------------------------------------------------
  // 4. METEORS / SHOOTING STARS
  // -------------------------------------------------------------
  class ShootingStar {
    constructor() {
      this.init();
    }

    init() {
      this.x = Math.random() * width * 0.9 + width * 0.1;
      this.y = Math.random() * (height * 0.4);
      this.length = Math.random() * 85 + 55;
      this.speed = Math.random() * 7 + 8;
      this.angle = Math.PI / 4 + (Math.random() * 0.2 - 0.1);
      this.opacity = 1;
      this.decay = Math.random() * 0.015 + 0.012;
      this.active = true;
    }

    update() {
      this.x += Math.cos(this.angle) * this.speed;
      this.y += Math.sin(this.angle) * this.speed;
      this.opacity -= this.decay;
      if (this.opacity <= 0) {
        this.active = false;
      }
    }

    draw() {
      if (!this.active) return;
      const tailX = this.x - Math.cos(this.angle) * this.length;
      const tailY = this.y - Math.sin(this.angle) * this.length;

      const gradient = ctx.createLinearGradient(this.x, this.y, tailX, tailY);
      gradient.addColorStop(0, `rgba(255, 255, 255, ${this.opacity})`);
      gradient.addColorStop(0.3, `rgba(180, 215, 255, ${this.opacity * 0.6})`);
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(tailX, tailY);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 1.8;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  // Parallax tracking
  let mouseX = 0;
  let mouseY = 0;
  let targetMouseX = 0;
  let targetMouseY = 0;

  window.addEventListener('mousemove', (e) => {
    targetMouseX = (e.clientX - width / 2) * 0.035;
    targetMouseY = (e.clientY - height / 2) * 0.035;
  });

  // Handle Resize
  function resizeCanvas() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    stars.length = 0;
    const count = Math.max(140, Math.floor((width * height) / 4200));
    for (let i = 0; i < count; i++) {
      stars.push(new Star());
    }
    activeConstellation.init();
  }

  window.addEventListener('resize', debounce(resizeCanvas, 150));

  // -------------------------------------------------------------
  // 5. MAIN ANIMATION LOOP
  // -------------------------------------------------------------
  let meteorTimer = 0;

  function animate() {
    ctx.clearRect(0, 0, width, height);

    // Smooth mouse lerp
    mouseX += (targetMouseX - mouseX) * 0.05;
    mouseY += (targetMouseY - mouseY) * 0.05;

    // 1. Update all stars
    for (let i = 0; i < stars.length; i++) {
      stars[i].update(mouseX, mouseY);
      stars[i].draw();
    }

    // 2. Update and draw astrology symbol constellation (connected lines)
    activeConstellation.update();
    activeConstellation.draw();

    // 3. Update single star blink (1 at a time: brightens and dims back)
    updateSoloStarBlink();
    drawSoloBlinkingStar();

    // 4. Periodically spawn shooting stars
    meteorTimer++;
    if (meteorTimer > 240 && Math.random() < 0.015) {
      shootingStars.push(new ShootingStar());
      meteorTimer = 0;
    }

    for (let i = shootingStars.length - 1; i >= 0; i--) {
      const meteor = shootingStars[i];
      meteor.update();
      meteor.draw();
      if (!meteor.active) {
        shootingStars.splice(i, 1);
      }
    }

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);

  // -------------------------------------------------------------
  // 6. ASTRONAUT COMPANION INTERACTION
  // -------------------------------------------------------------
  const astronautCompanion = document.getElementById('astronautCompanion');
  const astronautSpeech = document.getElementById('astronautSpeech');

  const astronautQuotes = [
    'Floating in zero-G! 🛸',
    'Look, an astrology constellation! ✨',
    'All flight systems nominal! 🚀',
    'Scanning celestial quadrant... 🛰️',
    'Star brightness calibrated! 🌟',
    'Welcome aboard, space voyager! 🌌',
    'Sign in to enter mission control! ⭐'
  ];

  let quoteIndex = 0;
  let speechTimeout = null;

  function triggerAstronautSpeech(customText = null) {
    if (speechTimeout) clearTimeout(speechTimeout);

    const message = customText || astronautQuotes[quoteIndex % astronautQuotes.length];
    quoteIndex++;
    astronautSpeech.textContent = message;
    astronautCompanion.classList.add('show-speech');

    speechTimeout = setTimeout(() => {
      astronautCompanion.classList.remove('show-speech');
    }, 3400);
  }

  if (astronautCompanion) {
    astronautCompanion.addEventListener('click', () => {
      triggerAstronautSpeech();
    });

    astronautCompanion.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        triggerAstronautSpeech();
      }
    });
  }

  // -------------------------------------------------------------
  // 7. PASSWORD VISIBILITY TOGGLE
  // -------------------------------------------------------------
  const passwordInput = document.getElementById('password');
  const passwordToggle = document.getElementById('passwordToggle');
  const eyeOpenIcon = passwordToggle.querySelector('.eye-open');
  const eyeClosedIcon = passwordToggle.querySelector('.eye-closed');

  passwordToggle.addEventListener('click', () => {
    const isPassword = passwordInput.getAttribute('type') === 'password';
    passwordInput.setAttribute('type', isPassword ? 'text' : 'password');

    if (isPassword) {
      eyeOpenIcon.style.display = 'none';
      eyeClosedIcon.style.display = 'block';
      passwordToggle.setAttribute('aria-label', 'Hide password');
    } else {
      eyeOpenIcon.style.display = 'block';
      eyeClosedIcon.style.display = 'none';
      passwordToggle.setAttribute('aria-label', 'Show password');
    }
  });

  // -------------------------------------------------------------
  // 8. FORM VALIDATION & SUBMISSION
  // -------------------------------------------------------------
  const authForm = document.getElementById('authForm');
  const emailInput = document.getElementById('email');
  const emailError = document.getElementById('emailError');
  const passwordError = document.getElementById('passwordError');
  const submitBtn = document.getElementById('submitBtn');
  const formTitle = document.getElementById('formTitle');
  const toggleAuthMode = document.getElementById('toggleAuthMode');
  const forgotPasswordLink = document.getElementById('forgotPasswordLink');

  let isSignUpMode = false;

  function clearErrors() {
    emailInput.classList.remove('has-error');
    passwordInput.classList.remove('has-error');
    emailError.textContent = '';
    emailError.classList.remove('visible');
    passwordError.textContent = '';
    passwordError.classList.remove('visible');
  }

  function validateEmail(val) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(val);
  }

  emailInput.addEventListener('input', () => {
    if (emailInput.classList.contains('has-error')) {
      clearErrors();
    }
  });

  passwordInput.addEventListener('input', () => {
    if (passwordInput.classList.contains('has-error')) {
      clearErrors();
    }
  });

  authForm.addEventListener('submit', (e) => {
    e.preventDefault();
    clearErrors();

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    let hasError = false;

    if (!email) {
      emailInput.classList.add('has-error');
      emailError.textContent = 'Please enter your email address.';
      emailError.classList.add('visible');
      hasError = true;
    } else if (!validateEmail(email)) {
      emailInput.classList.add('has-error');
      emailError.textContent = 'Please enter a valid email format (e.g. name@example.com).';
      emailError.classList.add('visible');
      hasError = true;
    }

    if (!password) {
      passwordInput.classList.add('has-error');
      passwordError.textContent = 'Please enter your password.';
      passwordError.classList.add('visible');
      hasError = true;
    } else if (password.length < 6) {
      passwordInput.classList.add('has-error');
      passwordError.textContent = 'Password must be at least 6 characters.';
      passwordError.classList.add('visible');
      hasError = true;
    }

    if (hasError) return;

    // Simulate authentic authentication request
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;

    setTimeout(() => {
      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;

      const remember = document.getElementById('rememberMe').checked;
      const actionText = isSignUpMode ? 'Account created successfully!' : 'Signed in successfully!';
      const username = email.split('@')[0];
      showToast(`${actionText} Welcome, ${username}! ${remember ? '(Session saved)' : ''}`);
      triggerAstronautSpeech(`Welcome aboard, ${username}! 🚀`);
    }, 1200);
  });

  // -------------------------------------------------------------
  // 9. SIGN IN / SIGN UP MODE TOGGLE
  // -------------------------------------------------------------
  toggleAuthMode.addEventListener('click', (e) => {
    e.preventDefault();
    isSignUpMode = !isSignUpMode;
    clearErrors();

    const promptText = toggleAuthMode.parentElement;
    const btnText = submitBtn.querySelector('.btn-text');

    if (isSignUpMode) {
      formTitle.textContent = 'Sign Up';
      document.title = 'Sign Up - Cosmic Night';
      btnText.textContent = 'Create Account';
      promptText.childNodes[0].nodeValue = 'Already Have an Account ? ';
      toggleAuthMode.textContent = 'Sign In';
      forgotPasswordLink.style.visibility = 'hidden';
      triggerAstronautSpeech('Joining the cosmic crew? Welcome! ⭐');
    } else {
      formTitle.textContent = 'Sign In';
      document.title = 'Sign In - Cosmic Night';
      btnText.textContent = 'Sign In';
      promptText.childNodes[0].nodeValue = 'Don’t Have an Account ? ';
      toggleAuthMode.textContent = 'Sign Up';
      forgotPasswordLink.style.visibility = 'visible';
    }
  });

  // -------------------------------------------------------------
  // 10. FORGOT PASSWORD ACTION
  // -------------------------------------------------------------
  forgotPasswordLink.addEventListener('click', (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    if (email && validateEmail(email)) {
      showToast(`Password reset link dispatched to ${email}`);
      triggerAstronautSpeech('Reset coordinates sent to your inbox! 📬');
    } else {
      showToast('Please type your email above, then click Forget Password.');
      emailInput.focus();
    }
  });

  // -------------------------------------------------------------
  // 11. SOCIAL BUTTON INTERACTIONS
  // -------------------------------------------------------------
  const socialButtons = document.querySelectorAll('.social-btn');
  socialButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const provider = btn.getAttribute('title') || 'Provider';
      showToast(`Initiating ${provider} authentication...`);
      triggerAstronautSpeech(`Connecting via ${provider} satellite... 🛰️`);
    });
  });

  // -------------------------------------------------------------
  // 12. TOAST NOTIFICATION HELPER
  // -------------------------------------------------------------
  const toast = document.getElementById('toastNotification');
  let toastTimeout = null;

  function showToast(message) {
    if (toastTimeout) clearTimeout(toastTimeout);
    toast.textContent = message;
    toast.classList.add('show');

    toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 3200);
  }

  // Debounce utility
  function debounce(fn, ms) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), ms);
    };
  }
});
