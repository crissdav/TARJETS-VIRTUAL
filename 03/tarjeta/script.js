(function () {
  'use strict';

  const CONFIG = {
    EVENT_DATE: new Date('2026-11-27T19:00:00'),
    PHONE: '917845115',
    MASK_EMOJIS: ['🎭', '🎪', '🎨', '🎀', '✨', '👑', '💀', '🦋', '🌸', '🪩']
  };

  const $ = (s, p) => (p || document).querySelector(s);
  const $$ = (s, p) => [...(p || document).querySelectorAll(s)];

  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || 'ontouchstart' in window;

  /* ───────── B) GOLD DUST PARTICLES ───────── */
  function createGoldDust() {
    const container = $('#goldDust');
    if (!container) return;
    for (let i = 0; i < 35; i++) {
      const dot = document.createElement('div');
      dot.className = 'gold-particle';
      const size = 2 + Math.random() * 3;
      dot.style.width = size + 'px';
      dot.style.height = size + 'px';
      dot.style.left = Math.random() * 100 + '%';
      dot.style.animationDelay = Math.random() * 6 + 's';
      dot.style.animationDuration = 4 + Math.random() * 4 + 's';
      container.appendChild(dot);
    }
  }

  /* ───────── C) MASK CONFETTI ───────── */
  function createMaskConfetti() {
    const container = $('#maskConfetti');
    if (!container) return;
    for (let i = 0; i < 20; i++) {
      const el = document.createElement('div');
      el.className = 'confetti-mask';
      el.textContent = CONFIG.MASK_EMOJIS[Math.floor(Math.random() * CONFIG.MASK_EMOJIS.length)];
      el.style.left = Math.random() * 100 + '%';
      el.style.animationDelay = Math.random() * 8 + 's';
      el.style.animationDuration = 6 + Math.random() * 6 + 's';
      el.style.fontSize = 14 + Math.random() * 8 + 'px';
      container.appendChild(el);
    }
  }

  /* ───────── D) TWINKLE STARS ───────── */
  function createTwinkleStars() {
    const container = $('#twinkleLayer');
    if (!container) return;
    for (let i = 0; i < 50; i++) {
      const star = document.createElement('div');
      star.className = 'twinkle-star';
      const size = 1 + Math.random() * 2;
      star.style.width = size + 'px';
      star.style.height = size + 'px';
      star.style.left = Math.random() * 100 + '%';
      star.style.top = Math.random() * 100 + '%';
      star.style.animationDelay = Math.random() * 5 + 's';
      star.style.animationDuration = 2 + Math.random() * 3 + 's';
      container.appendChild(star);
    }
  }

  /* ───────── E) SPLASH STARS ───────── */
  function createSplashStars() {
    const container = $('#splashStars');
    if (!container) return;
    for (let i = 0; i < 60; i++) {
      const star = document.createElement('div');
      star.className = 'splash-star';
      const size = 1 + Math.random() * 3;
      star.style.width = size + 'px';
      star.style.height = size + 'px';
      star.style.left = Math.random() * 100 + '%';
      star.style.top = Math.random() * 100 + '%';
      star.style.animationDelay = Math.random() * 4 + 's';
      star.style.animationDuration = 2 + Math.random() * 3 + 's';
      star.style.backgroundColor = Math.random() > 0.5 ? '#D4AF37' : '#8B0000';
      container.appendChild(star);
    }
  }

  /* ───────── F) SPLIT LETTERS ───────── */
  function splitLetters() {
    $$('[data-letters]').forEach(el => {
      const text = el.getAttribute('data-letters') || el.textContent;
      el.textContent = '';
      [...text].forEach((ch, i) => {
        const span = document.createElement('span');
        span.className = 'char';
        span.textContent = ch;
        span.style.animationDelay = (i * 0.04) + 's';
        el.appendChild(span);
      });
    });
  }

  /* ───────── G) SPLASH → ENVELOPE → MAIN ───────── */
  function openSplash() {
    const splash = $('#splash');
    if (!splash) return;
    splash.classList.add('hiding');
    setTimeout(() => {
      splash.classList.add('hidden');
    }, 900);
  }

  function openSeal() {
    const seal = $('.envelope-seal');
    const envelope = $('#envelopeWrapper');
    if (!seal) return;

    seal.classList.add('breaking');
    setTimeout(() => {
      seal.style.display = 'none';
      const doorL = $('.door-left', envelope);
      const doorR = $('.door-right', envelope);
      if (doorL) doorL.classList.add('open-left');
      if (doorR) doorR.classList.add('open-right');

      setTimeout(() => {
        if (envelope) {
          envelope.classList.add('hiding');
          setTimeout(() => {
            envelope.classList.add('hidden');
            document.body.style.overflow = '';
            initScrollReveal();
          }, 800);
        }
      }, 1200);
    }, 500);
  }

  /* ───────── I) COUNTDOWN ───────── */
  function pad(n) { return String(n).padStart(2, '0'); }

  function animateNumber(el, val) {
    if (!el) return;
    const formatted = pad(val);
    if (el.textContent !== formatted) {
      el.classList.add('flip');
      setTimeout(() => {
        el.textContent = formatted;
        el.classList.remove('flip');
      }, 300);
    }
  }

  function updateCountdown() {
    const now = new Date();
    let diff = CONFIG.EVENT_DATE - now;
    if (diff < 0) diff = 0;

    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    animateNumber($('#cdDays'), days);
    animateNumber($('#cdHours'), hours);
    animateNumber($('#cdMins'), minutes);
    animateNumber($('#cdSecs'), seconds);
  }

  /* ───────── J) TILT EFFECT ───────── */
  function initTilt() {
    if (isMobile) return;
    $$('[data-tilt]').forEach(el => {
      el.addEventListener('mousemove', e => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const rotateX = ((y - cy) / cy) * -10;
        const rotateY = ((x - cx) / cx) * 10;
        el.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg)';
      });
    });
  }

  /* ───────── M) SCROLL REVEAL ───────── */
  function initScrollReveal() {
    const targets = $$('.reveal, .reveal-scale');
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const delay = entry.target.getAttribute('data-delay');
          if (delay) {
            setTimeout(() => entry.target.classList.add('visible'), parseInt(delay));
          } else {
            entry.target.classList.add('visible');
          }
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    targets.forEach(t => observer.observe(t));
  }

  /* ───────── M.2) MÚSICA DE FONDO ───────── */
  let musicOn = false;

  function updateMusicBtn() {
    const btn = document.getElementById('musicBtn');
    if (!btn) return;
    btn.classList.toggle('playing', musicOn);
    btn.textContent = musicOn ? '⏸' : '♪';
  }

  function startMusic() {
    const audio = document.getElementById('bgMusic');
    if (!audio) { musicOn = false; updateMusicBtn(); return; }
    audio.volume = 0.85;
    musicOn = true;
    try {
      const p = audio.play();
      if (p && p.catch) p.catch(() => { musicOn = false; updateMusicBtn(); });
    } catch (e) { musicOn = false; }
    updateMusicBtn();
  }

  function stopMusic() {
    const audio = document.getElementById('bgMusic');
    musicOn = false;
    try {
      if (audio) audio.pause();
    } catch (e) { /* ignorar */ }
    updateMusicBtn();
  }

  function playPauseMusic() {
    if (musicOn) stopMusic();
    else startMusic();
  }

  /* ───────── N) RSVP FORM ───────── */
  function initRSVP() {
    const waBtn = $('#btnWhatsapp');
    const nameInput = $('#guestName');
    const companionInput = $('#guestCompanion');
    const qrSection = $('#rsvpQr');
    if (!nameInput || !qrSection) return;

    function buildMessage() {
      const name = nameInput.value.trim();
      const companion = (companionInput || {}).value || '';
      let msg = `🎭 *Confirmación de Asistencia — XV Años de Grecia*\n\n` +
        `👤 *Nombre:* ${name}\n` +
        (companion.trim() ? `👥 *Acompañante:* ${companion.trim()}\n` : '') +
        `📅 *Fecha:* 27 de Noviembre, 2026\n` +
        `📍 *Lugar:* Por confirmar\n\n` +
        `¡Nos vemos en la Noche de Máscaras! 🎭✨`;
      return msg;
    }

    function compactMessage() {
      const name = nameInput.value.trim();
      const companion = (companionInput || {}).value || '';
      let msg = `Confirmo asistencia - Nombre: ${name}`;
      if (companion.trim()) msg += ` - Acompanante: ${companion.trim()}`;
      return msg;
    }

    const waBase = `https://wa.me/${CONFIG.PHONE}`;

    function updateLive() {
      const name = nameInput.value.trim();
      if (!name) {
        qrSection.hidden = true;
        waBtn.disabled = true;
        return;
      }
      const urlQr = `${waBase}?text=${encodeURIComponent(compactMessage())}`;
      generateQR(name, urlQr);
      qrSection.hidden = false;
      waBtn.disabled = true;
    }

    nameInput.addEventListener('input', updateLive);
    if (companionInput) companionInput.addEventListener('input', updateLive);

    waBtn.addEventListener('click', () => {
      const name = nameInput.value.trim();
      if (!name || waBtn.disabled) return;
      window.open(`${waBase}?text=${encodeURIComponent(buildMessage())}`, '_blank');
    });
  }

  /* ───────── O) QR CODE ───────── */
  function generateQR(name, qrData) {
    if (typeof qrcode === 'undefined') return;

    qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
    const qr = qrcode(0, 'M');
    qr.addData(qrData);
    qr.make();

    const canvas = $('#rsvpQrCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const modules = qr.getModuleCount();
    const pad = 20;
    const size = 240;
    canvas.width = size;
    canvas.height = size;
    const cell = (size - pad * 2) / modules;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#1a1a2e';

    for (let r = 0; r < modules; r++) {
      for (let c = 0; c < modules; c++) {
        if (qr.isDark(r, c)) {
          ctx.fillRect(pad + c * cell, pad + r * cell, Math.ceil(cell), Math.ceil(cell));
        }
      }
    }

    const link = $('#rsvpQrDownload');
    if (link) {
      link.onclick = (e) => {
        e.preventDefault();
        const a = document.createElement('a');
        a.download = `qr-grecia-${name}.png`;
        a.href = canvas.toDataURL('image/png');
        a.click();
        const wbtn = document.getElementById('btnWhatsapp');
        if (wbtn) wbtn.disabled = false;
        showToast('¡QR descargado! Ahora puedes confirmar por WhatsApp 🎭');
      };
    }
  }

  /* ───────── P) TOAST ───────── */
  function showToast(msg) {
    const toast = $('#toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3500);
  }

  /* ───────── Q) SWIPE ───────── */
  function initSwipe() {
    const wrapper = $('#envelopeWrapper');
    if (!wrapper) return;
    let startY = 0;

    wrapper.addEventListener('touchstart', e => {
      startY = e.touches[0].clientY;
    }, { passive: true });

    wrapper.addEventListener('touchend', e => {
      const diff = startY - e.changedTouches[0].clientY;
      if (diff > 80) openSeal();
    }, { passive: true });
  }

  /* ───────── S) INIT ───────── */
  function init() {
    document.body.style.overflow = 'hidden';

    createGoldDust();
    createMaskConfetti();
    createTwinkleStars();
    createSplashStars();
    splitLetters();
    initRSVP();
    initSwipe();

    const btnOpen = $('#btnOpenSplash');
    if (btnOpen) btnOpen.addEventListener('click', () => {
      openSplash();
      startMusic();
    });

    const musicBtn = $('#musicBtn');
    if (musicBtn) musicBtn.addEventListener('click', playPauseMusic);

    const seal = $('.envelope-seal');
    if (seal) seal.addEventListener('click', openSeal);

    updateCountdown();
    setInterval(updateCountdown, 1000);

    initTilt();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
