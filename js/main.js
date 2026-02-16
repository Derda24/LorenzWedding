/**
 * Lorenz Wedding Photo & Film - Main JavaScript
 * Navigation, mobile menu, and core interactions
 */

(function () {
  'use strict';

  // Header scroll effect - transparent on hero, solid when scrolled (Zara-style)
  const header = document.getElementById('main-header');
  const hero = document.querySelector('.hero');
  if (header) {
    function updateHeader() {
      if (hero) {
        const heroBottom = hero.offsetTop + hero.offsetHeight;
        if (window.scrollY > 80) {
          header.classList.add('is-scrolled');
        } else {
          header.classList.remove('is-scrolled');
        }
      } else {
        header.classList.add('is-scrolled');
      }
    }
    updateHeader();
    window.addEventListener('scroll', updateHeader);
  }

  // Mobile navigation toggle
  const navToggle = document.querySelector('.nav__toggle');
  const nav = document.getElementById('main-nav');

  if (navToggle && nav) {
    navToggle.addEventListener('click', function () {
      const isOpen = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', !isOpen);
      nav.classList.toggle('is-open');
      document.body.style.overflow = isOpen ? '' : 'hidden';
    });

    // Close menu when clicking a link (for anchor links or same-page navigation)
    nav.querySelectorAll('.nav__link').forEach(function (link) {
      link.addEventListener('click', function () {
        navToggle.setAttribute('aria-expanded', 'false');
        nav.classList.remove('is-open');
        document.body.style.overflow = '';
      });
    });

    // Close menu on escape key
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        navToggle.setAttribute('aria-expanded', 'false');
        nav.classList.remove('is-open');
        document.body.style.overflow = '';
      }
    });
  }

  // Prefill contact form package from URL
  const urlParams = new URLSearchParams(window.location.search);
  const packageParam = urlParams.get('package');
  const packageSelect = document.getElementById('package');
  if (packageParam && packageSelect) {
    const option = packageSelect.querySelector('option[value="' + packageParam + '"]');
    if (option) {
      option.selected = true;
    }
  }
})();
