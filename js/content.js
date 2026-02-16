/**
 * Lorenz Wedding – Dynamic content loader
 * Loads photos, videos, and featured content from JSON
 */
(function () {
  'use strict';

  const DATA_BASE = 'data/';

  /**
   * Fetch JSON with fallback
   */
  function fetchJSON(path) {
    return fetch(DATA_BASE + path)
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load ' + path);
        return res.json();
      })
      .catch(function (err) {
        console.warn('Content load error:', err);
        return null;
      });
  }

  /**
   * Render photo gallery
   */
  function renderGallery(containerId, galleryData) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!galleryData || !galleryData.items || !galleryData.items.length) {
      container.innerHTML = '<p style="color: var(--color-grey);">Henüz fotoğraf eklenmedi.</p>';
      return;
    }

    const html = galleryData.items
      .map(function (item) {
        return (
          '<article class="card gallery-item" data-category="' +
          escapeHtml(item.category || 'all') +
          '">' +
          '  <div class="card__image">' +
          '    <img src="' +
          escapeHtml(item.image) +
          '" alt="' +
          escapeHtml(item.title) +
          '" loading="lazy" width="600" height="450">' +
          '  </div>' +
          '  <div class="card__content">' +
          '    <h3>' +
          escapeHtml(item.title) +
          '</h3>' +
          '    <p>' +
          escapeHtml(item.subtitle || '') +
          '</p>' +
          '  </div>' +
          '</article>'
        );
      })
      .join('');

    container.innerHTML = html;

    // Re-init filter buttons after render
    initGalleryFilters(container.closest('.zara-section'));
  }

  /**
   * Render gallery filter buttons from categories
   */
  function renderGalleryFilters(containerSelector, galleryData) {
    const container = document.querySelector(containerSelector);
    if (!container || !galleryData || !galleryData.categories) return;

    const allBtn =
      '<button class="filter-btn active" data-filter="all">Tümü</button>';
    const categoryBtns = galleryData.categories
      .map(function (c) {
        return (
          '<button class="filter-btn" data-filter="' +
          escapeHtml(c.id) +
          '">' +
          escapeHtml(c.label) +
          '</button>'
        );
      })
      .join('');

    container.innerHTML = allBtn + categoryBtns;

    const section = container.closest('.zara-section');
    if (section) initGalleryFilters(section);
  }

  /**
   * Init filter behavior (after content loaded)
   */
  function initGalleryFilters(section) {
    if (!section) return;
    const filters = section.querySelectorAll('.filter-btn');
    const items = section.querySelectorAll('.gallery-item');

    filters.forEach(function (btn) {
      btn.addEventListener('click', function () {
        const filter = btn.dataset.filter;
        filters.forEach(function (f) {
          f.classList.remove('active');
        });
        btn.classList.add('active');
        items.forEach(function (item) {
          const category = item.dataset.category;
          const match = filter === 'all' || category === filter;
          item.style.display = match ? '' : 'none';
        });
      });
    });

    // Apply URL filter
    const urlParams = new URLSearchParams(window.location.search);
    const filterParam = urlParams.get('filter');
    if (filterParam) {
      const matchingBtn = section.querySelector(
        '.filter-btn[data-filter="' + filterParam + '"]'
      );
      if (matchingBtn) matchingBtn.click();
    }
  }

  /**
   * Render video grid
   */
  function renderVideos(containerId, videosData) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!videosData || !videosData.items || !videosData.items.length) {
      container.innerHTML = '<p style="color: var(--color-grey);">Henüz video eklenmedi.</p>';
      return;
    }

    const gridClass = videosData.items.length >= 3 ? 'grid grid--2' : 'grid grid--2';
    const html =
      '<div class="' +
      gridClass +
      '">' +
      videosData.items
        .map(function (item) {
          const embed = item.embedUrl || item.videoUrl || item.url || '';
          return (
            '<article class="video-card">' +
            '  <div class="video-card__wrapper">' +
            '    <iframe src="' +
            escapeHtml(embed) +
            '" title="' +
            escapeHtml(item.title) +
            '" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>' +
            '  </div>' +
            '  <div class="video-card__content">' +
            '    <h3>' +
            escapeHtml(item.title) +
            '</h3>' +
            '    <p>' +
            escapeHtml(item.subtitle || '') +
            '</p>' +
            '  </div>' +
            '</article>'
          );
        })
        .join('') +
      '</div>';

    container.innerHTML = html;
  }

  /**
   * Render homepage featured blocks
   */
  function renderFeatured(heroSelector, blocksSelector, featuredData) {
    if (!featuredData) return;

    if (featuredData.hero) {
      const hero = document.querySelector(heroSelector);
      if (hero) {
        const bg = hero.querySelector('.zara-hero__bg');
        if (bg && featuredData.hero.image) {
          bg.style.backgroundImage =
            "url('" + featuredData.hero.image + "')";
        }
        const title = hero.querySelector('.zara-hero__title');
        if (title && featuredData.hero.title) {
          title.textContent = featuredData.hero.title;
        }
      }
    }

    if (featuredData.imageBlocks && featuredData.imageBlocks.length) {
      const container = document.querySelector(blocksSelector);
      if (!container) return;

      const blocks = featuredData.imageBlocks
        .map(function (block) {
          const imgs = (block.images || [])
            .map(function (src) {
              return typeof src === 'string'
                ? '<img src="' + escapeHtml(src) + '" alt="">'
                : '';
            })
            .join('');
          return '<section class="zara-image-block">' + imgs + '</section>';
        })
        .join('');

      container.innerHTML = blocks;
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Render services page from JSON
   */
  function renderServices(containerId, data) {
    const container = document.getElementById(containerId);
    if (!container || !data) return;

    let html = '';

    if (data.pageTitle) {
      html += '<h1 class="zara-hero__title" style="color: var(--color-black); font-size: 1.5rem; margin-bottom: 2rem;">' + escapeHtml(data.pageTitle) + '</h1>';
    }

    if (data.fotograf && data.fotograf.cards && data.fotograf.cards.length) {
      html += '<div id="fotograf">';
      html += '<p class="zara-side-label" style="font-size: 0.7rem; margin-bottom: 1.5rem;">' + escapeHtml(data.fotograf.label || 'Fotoğrafçılık') + '</p>';
      html += '<div class="grid grid--3">';
      data.fotograf.cards.forEach(function (card) {
        const featClass = card.featured ? ' pricing-card pricing-card--featured' : '';
        const badge = card.badge ? '<div class="pricing-card__badge">' + escapeHtml(card.badge) + '</div>' : '';
        const btnClass = card.featured ? 'btn--accent' : 'btn--outline';
        const features = (card.features || []).map(function (f) { return '<li>' + escapeHtml(f) + '</li>'; }).join('');
        html += '<div class="pricing-card' + featClass + '">' + badge +
          '<div class="pricing-card__header"><h3>' + escapeHtml(card.title) + '</h3>' +
          '<p class="pricing-card__price">' + escapeHtml(card.price) + '<span>' + escapeHtml(card.priceUnit || '') + '</span></p></div>' +
          '<ul class="pricing-card__features">' + features + '</ul>' +
          '<a href="contact.html?package=' + escapeHtml(card.id || '') + '" class="btn ' + btnClass + '" style="width: 100%;">' + escapeHtml(card.buttonText || 'Teklif Al') + '</a></div>';
      });
      html += '</div></div>';
    }

    if (data.video && data.video.cards && data.video.cards.length) {
      html += '<div id="video" style="background: var(--color-sand); padding: 2rem; margin: 2rem -2rem; padding-left: 2rem; padding-right: 2rem;">';
      html += '<p class="zara-side-label" style="font-size: 0.7rem; margin-bottom: 1.5rem;">' + escapeHtml(data.video.label || 'Videografi') + '</p>';
      html += '<div class="grid grid--3">';
      data.video.cards.forEach(function (card) {
        const featClass = card.featured ? ' pricing-card pricing-card--featured' : '';
        const badge = card.badge ? '<div class="pricing-card__badge">' + escapeHtml(card.badge) + '</div>' : '';
        const btnClass = card.featured ? 'btn--accent' : 'btn--outline';
        const features = (card.features || []).map(function (f) { return '<li>' + escapeHtml(f) + '</li>'; }).join('');
        html += '<div class="pricing-card' + featClass + '">' + badge +
          '<div class="pricing-card__header"><h3>' + escapeHtml(card.title) + '</h3>' +
          '<p class="pricing-card__price">' + escapeHtml(card.price) + '<span>' + escapeHtml(card.priceUnit || '') + '</span></p></div>' +
          '<ul class="pricing-card__features">' + features + '</ul>' +
          '<a href="contact.html?package=' + escapeHtml(card.id || '') + '" class="btn ' + btnClass + '" style="width: 100%;">' + escapeHtml(card.buttonText || 'Teklif Al') + '</a></div>';
      });
      html += '</div></div>';
    }

    if (data.organizasyon && data.organizasyon.cards && data.organizasyon.cards.length) {
      html += '<div id="organizasyon">';
      html += '<p class="zara-side-label" style="font-size: 0.7rem; margin-bottom: 1.5rem; margin-top: 3rem;">' + escapeHtml(data.organizasyon.label || 'Organizasyon') + '</p>';
      html += '<div class="grid grid--2">';
      data.organizasyon.cards.forEach(function (card) {
        html += '<div class="card"><div class="card__content">' +
          '<h3>' + escapeHtml(card.title) + '</h3>' +
          '<p>' + escapeHtml(card.description || '') + '</p>' +
          '<a href="contact.html" class="btn btn--outline" style="margin-top: 1rem;">' + escapeHtml(card.buttonText || 'Detaylı Bilgi') + '</a></div></div>';
      });
      html += '</div></div>';
    }

    container.innerHTML = html;
  }

  /**
   * Page-specific init (based on DOM elements)
   */
  function init() {
    if (document.getElementById('gallery')) {
      fetchJSON('gallery.json').then(function (data) {
        if (data) {
          renderGalleryFilters('.gallery-filters', data);
          renderGallery('gallery', data);
        } else {
          var container = document.getElementById('gallery');
          var filters = document.querySelector('.gallery-filters');
          if (container) {
            container.innerHTML = '<p style="color: var(--color-grey); grid-column: 1/-1;">Galeri yüklenemedi. <strong>data/gallery.json</strong> dosyasının proje klasöründe olduğundan emin olun. Sayfayı dosyadan (file://) açıyorsanız, yerel sunucu kullanın (ör. VS Code Live Server).</p>';
          }
          if (filters) filters.innerHTML = '<button class="filter-btn active" data-filter="all">Tümü</button>';
        }
      });
    }

    if (document.getElementById('video-grid')) {
      fetchJSON('videos.json').then(function (data) {
        if (data) renderVideos('video-grid', data);
      });
    }

    if (document.getElementById('services-content')) {
      fetchJSON('services.json').then(function (data) {
        if (data) renderServices('services-content', data);
        else {
          var el = document.getElementById('services-content');
          if (el) el.innerHTML = '<p style="color: var(--color-grey);">Hizmetler yüklenemedi. data/services.json dosyasını kontrol edin.</p>';
        }
      });
    }

    if (document.querySelector('.zara-hero') && document.getElementById('featured-blocks')) {
      fetchJSON('featured.json').then(function (data) {
        if (data) renderFeatured('.zara-hero', '#featured-blocks', data);
      });
      fetchJSON('gallery.json').then(function (data) {
        if (data && data.items && data.items.length) {
          renderHomeGallery('home-gallery', data.items.slice(0, 6));
        }
      });
    }
  }

  function renderHomeGallery(containerId, items) {
    const container = document.getElementById(containerId);
    if (!container || !items || !items.length) return;
    const html = items
      .map(function (item) {
        return (
          '<a href="photos.html" class="card gallery-item" data-category="' +
          escapeHtml(item.category || 'all') +
          '" style="text-decoration: none; color: inherit;">' +
          '  <div class="card__image">' +
          '    <img src="' +
          escapeHtml(item.image) +
          '" alt="' +
          escapeHtml(item.title) +
          '" loading="lazy" width="600" height="450">' +
          '  </div>' +
          '  <div class="card__content">' +
          '    <h3>' +
          escapeHtml(item.title) +
          '</h3>' +
          '    <p>' +
          escapeHtml(item.subtitle || '') +
          '</p>' +
          '  </div>' +
          '</a>'
        );
      })
      .join('');
    container.innerHTML = html;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.LorenzContent = {
    fetchJSON: fetchJSON,
    renderGallery: renderGallery,
    renderVideos: renderVideos,
    renderFeatured: renderFeatured,
    renderServices: renderServices
  };
})();
