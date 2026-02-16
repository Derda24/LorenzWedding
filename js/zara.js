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
