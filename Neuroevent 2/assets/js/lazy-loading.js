// Оптимизированный Lazy Loading для изображений с приоритетами
(function() {
  'use strict';

  if (!('IntersectionObserver' in window)) {
    return; // Fallback для старых браузеров
  }

  // Создаем более эффективный Intersection Observer
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        loadImage(img);
        observer.unobserve(img);
      }
    });
  }, {
    rootMargin: '100px 50px', // Загружаем за 100px вертикально и 50px горизонтально
    threshold: 0.1 // 10% видимости достаточно
  });

  // Очередь загрузки изображений
  let loadingQueue = [];
  let isLoading = false;
  const maxConcurrentLoads = 3; // Максимум 3 одновременных загрузки

  function loadImage(img) {
    if (!img || !img.dataset.src) return;
    loadingQueue.push(img);
    processQueue();
  }

  function processQueue() {
    if (isLoading || loadingQueue.length === 0) return;

    isLoading = true;
    const toLoad = loadingQueue.splice(0, maxConcurrentLoads);

    toLoad.forEach(img => {
      const src = img.dataset.src;
      if (!src) return;

      const newImg = new Image();
      newImg.onload = function() {
        img.src = src;
        img.classList.remove('loading-placeholder');
        img.classList.add('loaded');
        delete img.dataset.src;
        isLoading = false;
        processQueue();
      };

      newImg.onerror = function() {
        img.classList.remove('loading-placeholder');
        img.classList.add('error');
        delete img.dataset.src;
        isLoading = false;
        processQueue();
      };

      newImg.src = src;
    });
  }

  function processImages() {
    const images = document.querySelectorAll('img:not(.lazy-processed):not(.no-lazy)');

    images.forEach(img => {
      img.classList.add('lazy-processed');

      if (img.complete && img.naturalHeight > 0) return;

      const rect = img.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      // Критические изображения (в viewport или близко) загружаем сразу
      if (rect.top < viewportHeight + 200 &&
          rect.left < viewportWidth + 200 &&
          rect.bottom > -200 &&
          rect.right > -200) {

        if (img.dataset.src) {
          img.src = img.dataset.src;
          delete img.dataset.src;
          img.classList.add('loaded');
        }
        return;
      }

      // Остальные через lazy loading
      if (!img.dataset.src) {
        img.dataset.src = img.src;
        img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PC9zdmc+';
        img.classList.add('loading-placeholder');
      }

      imageObserver.observe(img);
    });
  }

  // Инициализация
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(processImages, 100));
  } else {
    setTimeout(processImages, 100);
  }

  // Обработка скролла и resize с throttle
  let scrollTimeout, resizeTimeout;

  window.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(processImages, 200);
  }, { passive: true });

  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(processImages, 300);
  }, { passive: true });

})();
