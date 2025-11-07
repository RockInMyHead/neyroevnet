/**
 * Performance Manager - Улучшенная система детекции производительности устройств
 * Определяет уровень производительности устройства и предоставляет адаптивные настройки
 */

class PerformanceManager {
  constructor() {
    this.performanceTier = 'medium'; // По умолчанию средний уровень
    this.metrics = {
      cores: 4,
      memory: 4,
      connection: '4g',
      webgl: true,
      gpuTier: 1,
      batteryLevel: 1,
      systemLoad: 0
    };
    this.configs = {};
    this.initialized = false;
  }

  /**
   * Инициализация системы детекции производительности
   */
  async init() {
    if (this.initialized) return this.performanceTier;

    try {
      // Собираем метрики производительности
      await this.collectMetrics();

      // Определяем уровень производительности
      this.performanceTier = this.calculatePerformanceTier();

      // Создаем адаптивные конфигурации
      this.createAdaptiveConfigs();

      this.initialized = true;

      console.log('🚀 Performance Manager initialized:', {
        tier: this.performanceTier,
        metrics: this.metrics,
        config: this.configs[this.performanceTier]
      });

    } catch (error) {
      console.warn('⚠️ Performance detection failed, using defaults:', error);
      this.performanceTier = 'medium';
    }

    return this.performanceTier;
  }

  /**
   * Сбор метрик производительности устройства
   */
  async collectMetrics() {
    // CPU cores
    this.metrics.cores = navigator.hardwareConcurrency || 4;

    // Memory
    this.metrics.memory = navigator.deviceMemory || 4;

    // Network connection
    if (navigator.connection) {
      this.metrics.connection = navigator.connection.effectiveType || '4g';
      this.metrics.downlink = navigator.connection.downlink || 10;
    } else {
      // Fallback для браузеров без Network Information API
      this.metrics.connection = this.estimateConnectionSpeed();
    }

    // WebGL support and GPU tier detection
    this.metrics.webgl = this.detectWebGLSupport();
    this.metrics.gpuTier = await this.detectGPUTier();

    // Battery level (if available)
    if (navigator.getBattery) {
      try {
        const battery = await navigator.getBattery();
        this.metrics.batteryLevel = battery.level;
        this.metrics.batteryCharging = battery.charging;
      } catch (e) {
        this.metrics.batteryLevel = 1; // Assume full battery if API fails
      }
    }

    // System load estimation
    this.metrics.systemLoad = this.estimateSystemLoad();

    // Screen metrics
    this.metrics.screenWidth = window.innerWidth;
    this.metrics.screenHeight = window.innerHeight;
    this.metrics.pixelRatio = window.devicePixelRatio || 1;
    this.metrics.touchEnabled = 'ontouchstart' in window;

    // Browser capabilities
    this.metrics.webWorkers = typeof Worker !== 'undefined';
    this.metrics.serviceWorker = 'serviceWorker' in navigator;
    this.metrics.webGL2 = this.detectWebGL2Support();
    this.metrics.offscreenCanvas = typeof OffscreenCanvas !== 'undefined';
  }

  /**
   * Определение уровня производительности на основе метрик
   */
  calculatePerformanceTier() {
    let score = 0;

    // CPU score (0-30 points)
    if (this.metrics.cores >= 8) score += 30;
    else if (this.metrics.cores >= 6) score += 25;
    else if (this.metrics.cores >= 4) score += 20;
    else if (this.metrics.cores >= 2) score += 10;
    else score += 5;

    // Memory score (0-25 points)
    if (this.metrics.memory >= 16) score += 25;
    else if (this.metrics.memory >= 8) score += 20;
    else if (this.metrics.memory >= 4) score += 15;
    else if (this.metrics.memory >= 2) score += 10;
    else score += 5;

    // GPU score (0-20 points)
    if (this.metrics.gpuTier >= 3) score += 20;
    else if (this.metrics.gpuTier >= 2) score += 15;
    else if (this.metrics.gpuTier >= 1) score += 10;
    else score += 5;

    // Network score (0-10 points)
    if (this.metrics.connection === '4g' && this.metrics.downlink >= 10) score += 10;
    else if (this.metrics.connection === '4g' && this.metrics.downlink >= 5) score += 8;
    else if (this.metrics.connection === '3g') score += 5;
    else if (this.metrics.connection === '2g' || this.metrics.connection === 'slow-2g') score += 2;
    else score += 10; // Unknown connection, assume good

    // Battery score (0-10 points)
    if (this.metrics.batteryCharging) score += 10;
    else if (this.metrics.batteryLevel >= 0.8) score += 8;
    else if (this.metrics.batteryLevel >= 0.5) score += 5;
    else if (this.metrics.batteryLevel >= 0.2) score += 3;
    else score += 1;

    // Screen size penalty for mobile devices
    if (this.metrics.screenWidth < 768) score *= 0.8;
    if (this.metrics.touchEnabled && this.metrics.screenWidth < 1024) score *= 0.9;

    // Determine tier based on score
    if (score >= 80) return 'high';
    if (score >= 50) return 'medium';
    return 'low';
  }

  /**
   * Создание адаптивных конфигураций для разных уровней производительности
   */
  createAdaptiveConfigs() {
    this.configs = {
      high: {
        // GSAP настройки
        gsap: {
          scrub: 1,
          duration: 1,
          stagger: 0.05,
          ease: "power2.out",
          force3D: true
        },

        // Slick слайдеры
        slick: {
          autoplay: true,
          speed: 15000,
          autoplaySpeed: 0,
          draggable: false,
          pauseOnHover: true
        },

        // Particles.js
        particles: {
          enabled: true,
          number: { value: 40, density: { enable: true, value_area: 800 } },
          size: { value: 2 },
          move: { enable: true, speed: 2 },
          opacity: { value: 0.6 }
        },

        // VanillaTilt
        tilt: {
          enabled: true,
          max: 5,
          speed: 1500,
          scale: 1.05
        },

        // Custom cursor
        cursor: {
          enabled: true,
          throttle: 16 // ~60fps
        },

        // Image loading
        images: {
          lazyLoad: false, // Загружаем все сразу
          quality: 'high',
          format: 'webp'
        },

        // Animations
        animations: {
          parallax: true,
          scrollTrigger: true,
          fadeIn: true,
          splitText: true,
          preloaders: true
        }
      },

      medium: {
        gsap: {
          scrub: 0.8,
          duration: 1.2,
          stagger: 0.08,
          ease: "power2.out",
          force3D: true
        },

        slick: {
          autoplay: true,
          speed: 20000,
          autoplaySpeed: 0,
          draggable: true,
          pauseOnHover: true
        },

        particles: {
          enabled: true,
          number: { value: 20, density: { enable: true, value_area: 1200 } },
          size: { value: 1.5 },
          move: { enable: true, speed: 1.5 },
          opacity: { value: 0.4 }
        },

        tilt: {
          enabled: true,
          max: 3,
          speed: 2000,
          scale: 1.02
        },

        cursor: {
          enabled: true,
          throttle: 24 // ~40fps
        },

        images: {
          lazyLoad: true,
          quality: 'medium',
          format: 'webp'
        },

        animations: {
          parallax: false,
          scrollTrigger: true,
          fadeIn: true,
          splitText: true,
          preloaders: true
        }
      },

      low: {
        gsap: {
          scrub: false,
          duration: 1.8,
          stagger: 0.15,
          ease: "power1.out",
          force3D: false
        },

        slick: {
          autoplay: false,
          speed: 0,
          draggable: true,
          pauseOnHover: false
        },

        particles: {
          enabled: false
        },

        tilt: {
          enabled: false
        },

        cursor: {
          enabled: false
        },

        images: {
          lazyLoad: true,
          quality: 'low',
          format: 'jpg'
        },

        animations: {
          parallax: false,
          scrollTrigger: false,
          fadeIn: false,
          splitText: false,
          preloaders: false
        }
      }
    };
  }

  /**
   * Получение текущей конфигурации
   */
  getConfig() {
    return this.configs[this.performanceTier] || this.configs.medium;
  }

  /**
   * Получение конкретной настройки
   */
  getSetting(category, key) {
    const config = this.getConfig();
    return config[category]?.[key];
  }

  /**
   * Обновление уровня производительности (runtime)
   */
  updatePerformanceTier(newTier) {
    if (['low', 'medium', 'high'].includes(newTier)) {
      this.performanceTier = newTier;
      console.log('🔄 Performance tier updated to:', newTier);
      return true;
    }
    return false;
  }

  /**
   * Проверка поддержки WebGL
   */
  detectWebGLSupport() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return !!(gl && gl instanceof WebGLRenderingContext);
    } catch (e) {
      return false;
    }
  }

  /**
   * Проверка поддержки WebGL2
   */
  detectWebGL2Support() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2');
      return !!gl;
    } catch (e) {
      return false;
    }
  }

  /**
   * Определение уровня GPU
   */
  async detectGPUTier() {
    if (!this.metrics.webgl) return 0;

    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl');

      if (!gl) return 0;

      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (!debugInfo) return 1; // Basic WebGL support

      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);

      // Простая классификация GPU
      if (renderer.includes('RTX') || renderer.includes('GTX 16') || renderer.includes('GTX 20') ||
          renderer.includes('RX 6') || renderer.includes('RX 7') || renderer.includes('RX 5') ||
          renderer.includes('M1') || renderer.includes('M2')) {
        return 3; // High-end GPU
      } else if (renderer.includes('GTX') || renderer.includes('RX') ||
                 renderer.includes('Intel Iris') || renderer.includes('Radeon Pro')) {
        return 2; // Mid-range GPU
      } else {
        return 1; // Low-end GPU
      }
    } catch (e) {
      return 1; // Fallback
    }
  }

  /**
   * Оценка скорости соединения (fallback)
   */
  estimateConnectionSpeed() {
    // Простая оценка на основе времени загрузки страницы
    const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;

    if (loadTime < 1000) return '4g';
    if (loadTime < 3000) return '3g';
    return '2g';
  }

  /**
   * Оценка загрузки системы
   */
  estimateSystemLoad() {
    // Простая оценка на основе количества открытых вкладок и времени работы
    let load = 0;

    // Время работы страницы
    const uptime = performance.now() / 1000 / 60; // минуты
    if (uptime > 30) load += 0.2;

    // Количество открытых вкладок (примерная оценка)
    if (history.length > 10) load += 0.1;

    return Math.min(load, 1);
  }

  /**
   * Экспорт метрик для отладки
   */
  exportMetrics() {
    return {
      performanceTier: this.performanceTier,
      metrics: this.metrics,
      config: this.getConfig()
    };
  }
}

// Создаем глобальный экземпляр
window.PerformanceManager = new PerformanceManager();

// Экспортируем для использования в модулях
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PerformanceManager;
}
