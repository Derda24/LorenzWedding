/**
 * Zara-style overlay menu & scroll effects
 */
(function () {
  'use strict';

  const menuBtn = document.getElementById('zara-menu-btn');
  const overlay = document.getElementById('zara-overlay');
  const closeBtn = document.getElementById('zara-overlay-close');

  if (menuBtn && overlay) {
    menuBtn.addEventListener('click', function () {
      overlay.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    });
  }

  if (closeBtn && overlay) {
    closeBtn.addEventListener('click', function () {
      overlay.classList.remove('is-open');
      document.body.style.overflow = '';
    });
  }

  /* Sağ üst dropdown (mobil: İletişim, Yardım, Müşteri girişi) */
  var rightToggle = document.getElementById('zara-header-right-toggle');
  var rightBlock = document.getElementById('zara-header-right');
  if (rightToggle && rightBlock) {
    rightToggle.addEventListener('click', function (e) {
      e.stopPropagation();
      var isOpen = rightBlock.classList.toggle('is-open');
      rightToggle.setAttribute('aria-expanded', isOpen);
    });
    document.addEventListener('click', function () {
      rightBlock.classList.remove('is-open');
      rightToggle.setAttribute('aria-expanded', 'false');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        rightBlock.classList.remove('is-open');
        rightToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  if (overlay) {
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) {
        overlay.classList.remove('is-open');
        document.body.style.overflow = '';
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay.classList.contains('is-open')) {
        overlay.classList.remove('is-open');
        document.body.style.overflow = '';
      }
    });
  }

  /* Scroll reveal – add .is-visible when section enters view */
  if ('IntersectionObserver' in window) {
    const sections = document.querySelectorAll('.zara-section.reveal');
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        }
      });
    }, { rootMargin: '0px 0px -80px 0px', threshold: 0.1 });

    sections.forEach(function (section) {
      observer.observe(section);
    });
  }
})();
