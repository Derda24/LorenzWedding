/**
 * LORENZWED Photo & Film - Contact Form
 * Form validation and submission handling
 */

(function () {
  'use strict';

  const form = document.getElementById('inquiry-form');
  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    // Basic validation
    const name = form.querySelector('#name');
    const email = form.querySelector('#email');
    const phone = form.querySelector('#phone');

    let valid = true;

    [name, email, phone].forEach(function (field) {
      if (!field.value.trim()) {
        field.setAttribute('aria-invalid', 'true');
        valid = false;
      } else {
        field.removeAttribute('aria-invalid');
      }
    });

    if (!valid) {
      form.reportValidity();
      return;
    }

    // Simulate submission (replace with actual backend/API)
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Gönderiliyor...';

    setTimeout(function () {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Mesajınız alındı!';
      form.reset();
      submitBtn.textContent = originalText;
    }, 1500);
  });
})();
