/**
 * Lorenz Wedding Photo & Film - Gallery Filter
 * Filter gallery items by category
 */

(function () {
  'use strict';

  const filters = document.querySelectorAll('.filter-btn');
  const galleryItems = document.querySelectorAll('.gallery-item');

  if (!filters.length || !galleryItems.length) return;

  filters.forEach(function (btn) {
    btn.addEventListener('click', function () {
      const filter = btn.dataset.filter;

      // Update active state
      filters.forEach(function (f) { f.classList.remove('active'); });
      btn.classList.add('active');

      // Filter items
      galleryItems.forEach(function (item) {
        const category = item.dataset.category;
        const match = filter === 'all' || category === filter;
        item.style.display = match ? '' : 'none';
      });
    });
  });

  // Apply filter from URL on load
  const urlParams = new URLSearchParams(window.location.search);
  const filterParam = urlParams.get('filter');
  if (filterParam) {
    const matchingBtn = document.querySelector('.filter-btn[data-filter="' + filterParam + '"]');
    if (matchingBtn) {
      matchingBtn.click();
    }
  }
})();
