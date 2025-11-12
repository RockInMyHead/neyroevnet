// Performance monitoring
(function() {
  const perfData = {
    startTime: performance.now(),
    domContentLoaded: 0,
    loadComplete: 0,
    firstPaint: 0,
    firstContentfulPaint: 0,
    largestContentfulPaint: 0,
    resources: []
  };

  // Monitor DOM Content Loaded
  document.addEventListener('DOMContentLoaded', function() {
    perfData.domContentLoaded = performance.now();
    console.log('🚀 DOM Content Loaded:', (perfData.domContentLoaded - perfData.startTime).toFixed(2) + 'ms');
  });

  // Monitor Load Complete
  window.addEventListener('load', function() {
    perfData.loadComplete = performance.now();
    console.log('✅ Page Fully Loaded:', (perfData.loadComplete - perfData.startTime).toFixed(2) + 'ms');

    // Show performance summary
    setTimeout(() => {
      showPerformanceReport();
    }, 1000);
  });

  // Monitor Paint events
  if ('PerformanceObserver' in window) {
    try {
      // First Paint
      const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-paint') {
            perfData.firstPaint = entry.startTime;
            console.log('🎨 First Paint:', entry.startTime.toFixed(2) + 'ms');
          } else if (entry.name === 'first-contentful-paint') {
            perfData.firstContentfulPaint = entry.startTime;
            console.log('📝 First Contentful Paint:', entry.startTime.toFixed(2) + 'ms');
          }
        }
      });
      paintObserver.observe({ entryTypes: ['paint'] });

      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        perfData.largestContentfulPaint = lastEntry.startTime;
        console.log('🖼️ Largest Contentful Paint:', lastEntry.startTime.toFixed(2) + 'ms');
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

    } catch (e) {
      console.log('Performance monitoring not fully supported');
    }
  }

  // Show performance report
  function showPerformanceReport() {
    const totalLoadTime = perfData.loadComplete - perfData.startTime;
    const domLoadTime = perfData.domContentLoaded - perfData.startTime;

    console.log(`
📊 === PERFORMANCE REPORT ===
⏱️ Total Load Time: ${totalLoadTime.toFixed(2)}ms
🏗️ DOM Content Loaded: ${domLoadTime.toFixed(2)}ms
🎨 First Paint: ${perfData.firstPaint.toFixed(2)}ms
📝 First Contentful Paint: ${perfData.firstContentfulPaint.toFixed(2)}ms
🖼️ Largest Contentful Paint: ${perfData.largestContentfulPaint.toFixed(2)}ms

💡 Recommendations:
${totalLoadTime > 3000 ? '⚠️ Total load time > 3s - consider further optimization' : '✅ Load time acceptable'}
${domLoadTime > 1500 ? '⚠️ DOM load > 1.5s - optimize JavaScript/CSS' : '✅ DOM load time good'}
${perfData.firstContentfulPaint > 2000 ? '⚠️ FCP > 2s - optimize critical resources' : '✅ FCP good'}
    `);

    // Show loading status
    const loadingImages = document.querySelectorAll('.loading-placeholder');
    const loadedImages = document.querySelectorAll('.loaded');
    const totalImages = document.querySelectorAll('img').length;

    console.log(`
🖼️ === IMAGES STATUS ===
📊 Total Images: ${totalImages}
✅ Loaded Images: ${loadedImages.length}
⏳ Loading Images: ${loadingImages.length}
📈 Completion: ${((loadedImages.length / totalImages) * 100).toFixed(1)}%
    `);
  }

  // Expose performance data globally for debugging
  window.perfData = perfData;

})();
