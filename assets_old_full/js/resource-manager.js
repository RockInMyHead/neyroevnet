/**
 * Resource Manager - Система управления ресурсами
 * Управляет загрузкой, кешированием и оптимизацией ресурсов
 */

class ResourceManager {
  constructor() {
    this.cache = new Map();
    this.loading = new Set();
    this.failed = new Set();
    this.performanceConfig = null;
    this.initialized = false;

    // Настройки кеширования
    this.settings = {
      maxCacheSize: 50, // Максимум ресурсов в кеше
      maxConcurrentLoads: 3, // Максимум одновременных загрузок (уменьшено для стабильности)
      cleanupInterval: 60000, // Очистка каждые 60 секунд
      memoryThreshold: 100 * 1024 * 1024, // 100MB порог очистки
      preloadDelay: 100, // Задержка перед preload
      retryAttempts: 2, // Количество попыток перезагрузки
      retryDelay: 1000 // Задержка между попытками
    };

    // Очереди загрузки по приоритетам
    this.queues = {
      critical: [], // Критические ресурсы (блокирующие рендер)
      high: [], // Высокий приоритет
      medium: [], // Средний приоритет
      low: [] // Низкий приоритет
    };

    this.activeLoads = new Map();
    this.loadPromises = new Map();

    this.init();
  }

  /**
   * Инициализация менеджера
   */
  async init() {
    if (this.initialized) return;

    // Очищаем кеш неудачных загрузок при инициализации
    this.clearFailedCache();

    // Ждем инициализации PerformanceManager
    if (window.PerformanceManager) {
      this.performanceConfig = await window.PerformanceManager.init();
    }

    // Запускаем автоматическую очистку
    this.startCleanupTimer();

    // Устанавливаем глобальные обработчики
    this.setupGlobalHandlers();

    // Предварительная загрузка критических ресурсов (временно отключена для диагностики)
    // this.preloadCritical();

    this.initialized = true;
    console.log('📦 Resource Manager initialized');
  }

  /**
   * Предварительная загрузка критических ресурсов
   */
  preloadCritical() {
    const criticalResources = [
      // Логотипы и важные изображения
      'assets/images/logo.webp?v=1',
      'assets/images/banner/banner-one-bg.webp?v=1',
      'assets/images/craft-thumb.webp?v=1',
      'assets/images/gen-hero.webp?v=1',

      // Шрифты (если используются)
      // 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
    ];

    // Для низкой производительности загружаем только самые важные
    if (window.PerformanceManager?.performanceTier === 'low') {
      criticalResources.splice(2); // Оставляем только первые 2
    }

    criticalResources.forEach(src => {
      this.load(src, 'critical');
    });

    console.log('🚀 Preloading critical resources:', criticalResources.length);
  }

  /**
   * Загрузка ресурса с указанным приоритетом
   */
  load(src, priority = 'medium') {
    // Проверяем кеш
    if (this.cache.has(src)) {
      return Promise.resolve(this.cache.get(src));
    }

    // Проверяем, не загружается ли уже
    if (this.loading.has(src)) {
      return this.loadPromises.get(src);
    }

    // Проверяем, не провалилась ли загрузка ранее
    if (this.failed.has(src)) {
      return Promise.reject(new Error(`Resource failed to load: ${src}`));
    }

    // Создаем промис для загрузки
    const loadPromise = this.performLoad(src, priority);
    this.loadPromises.set(src, loadPromise);

    return loadPromise;
  }

  /**
   * Выполнение загрузки ресурса
   */
  async performLoad(src, priority) {
    // Определяем тип ресурса
    const resourceType = this.getResourceType(src);

    try {
      this.loading.add(src);

      let result;

      switch (resourceType) {
        case 'image':
          result = await this.loadImage(src, priority);
          break;
        case 'font':
          result = await this.loadFont(src);
          break;
        case 'script':
          result = await this.loadScript(src);
          break;
        default:
          throw new Error(`Unsupported resource type: ${resourceType}`);
      }

      // Добавляем в кеш
      this.addToCache(src, result);

      // Удаляем из множеств загрузки
      this.loading.delete(src);
      this.loadPromises.delete(src);

      console.log(`✅ Loaded ${resourceType}: ${src}`);
      return result;

    } catch (error) {
      console.error(`❌ Failed to load ${resourceType}: ${src}`, error);

      this.loading.delete(src);
      this.loadPromises.delete(src);

      // Добавляем в список неудачных загрузок
      this.failed.add(src);

      throw error;
    }
  }

  /**
   * Загрузка изображения с оптимизациями
   */
  loadImage(src, priority) {
    return new Promise((resolve, reject) => {
      const img = new Image();

      // Настройки для оптимизации загрузки
      img.decoding = 'async';
      img.loading = priority === 'critical' ? 'eager' : 'lazy';

      // Устанавливаем fetchPriority для современных браузеров
      if ('fetchPriority' in img) {
        img.fetchPriority = priority === 'critical' ? 'high' : 'low';
      }

      // Обработчики событий
      img.onload = () => {
        resolve({
          element: img,
          width: img.naturalWidth,
          height: img.naturalHeight,
          src: src,
          loaded: true
        });
      };

      img.onerror = () => {
        reject(new Error(`Failed to load image: ${src}`));
      };

      // Таймаут для загрузки (увеличен для стабильности)
      setTimeout(() => {
        if (!img.complete) {
          reject(new Error(`Image load timeout: ${src}`));
        }
      }, 15000);

      // Начинаем загрузку
      img.src = src;
    });
  }

  /**
   * Загрузка шрифта
   */
  loadFont(src) {
    return new Promise((resolve, reject) => {
      // Для веб-шрифтов используем FontFace API
      if ('FontFace' in window) {
        const fontFace = new FontFace('preload-font', `url(${src})`);

        fontFace.load().then(() => {
          document.fonts.add(fontFace);
          resolve({
            fontFace: fontFace,
            src: src,
            loaded: true
          });
        }).catch(reject);
      } else {
        // Fallback для старых браузеров
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = src;
        link.as = 'font';
        link.onload = () => resolve({ element: link, src, loaded: true });
        link.onerror = reject;

        document.head.appendChild(link);
      }
    });
  }

  /**
   * Загрузка скрипта
   */
  loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;

      script.onload = () => resolve({ element: script, src, loaded: true });
      script.onerror = reject;

      document.head.appendChild(script);
    });
  }

  /**
   * Очистка кеша неудачных загрузок для повторных попыток
   */
  clearFailedCache() {
    this.failed.clear();
    console.log('🧹 Cleared failed resource cache for retry');
  }

  /**
   * Определение типа ресурса по URL
   */
  getResourceType(src) {
    // Убираем query параметры перед определением расширения
    const cleanSrc = src.split('?')[0];
    const extension = cleanSrc.split('.').pop().toLowerCase();

    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) {
      return 'image';
    }

    if (['woff', 'woff2', 'ttf', 'otf'].includes(extension) || src.includes('font')) {
      return 'font';
    }

    if (extension === 'js' || src.includes('javascript')) {
      return 'script';
    }

    return 'unknown';
  }

  /**
   * Добавление ресурса в кеш
   */
  addToCache(src, resource) {
    // Проверяем размер кеша
    if (this.cache.size >= this.settings.maxCacheSize) {
      this.cleanupCache();
    }

    this.cache.set(src, {
      ...resource,
      cachedAt: Date.now(),
      accessCount: 0,
      lastAccessed: Date.now()
    });
  }

  /**
   * Получение ресурса из кеша
   */
  get(src) {
    const resource = this.cache.get(src);
    if (resource) {
      resource.accessCount++;
      resource.lastAccessed = Date.now();
      return resource;
    }
    return null;
  }

  /**
   * Очистка кеша (удаляет половину наименее используемых ресурсов)
   */
  cleanupCache() {
    const entries = Array.from(this.cache.entries());

    // Сортируем по частоте использования и времени последнего доступа
    entries.sort((a, b) => {
      const scoreA = a[1].accessCount + (Date.now() - a[1].lastAccessed) / 1000;
      const scoreB = b[1].accessCount + (Date.now() - b[1].lastAccessed) / 1000;
      return scoreA - scoreB; // Меньший score - менее используемый
    });

    // Удаляем половину
    const toDelete = entries.slice(0, Math.floor(entries.length / 2));
    toDelete.forEach(([key]) => {
      this.cache.delete(key);
    });

    console.log(`🧹 Cache cleanup: removed ${toDelete.length} resources`);
  }

  /**
   * Глобальные обработчики для оптимизации
   */
  setupGlobalHandlers() {
    // Очистка при низкой памяти
    if (performance.memory) {
      setInterval(() => {
        if (performance.memory.usedJSHeapSize > this.settings.memoryThreshold) {
          this.cleanupCache();
          console.log('🧠 Memory cleanup triggered');
        }
      }, 10000);
    }

    // Остановка загрузок при потере фокуса
    window.addEventListener('blur', () => {
      // Можно приостановить не-critical загрузки
      console.log('👁️ Window blurred, pausing non-critical loads');
    });

    // Возобновление при фокусе
    window.addEventListener('focus', () => {
      // Возобновить загрузки
      console.log('👁️ Window focused, resuming loads');
    });
  }

  /**
   * Запуск таймера автоматической очистки
   */
  startCleanupTimer() {
    setInterval(() => {
      this.cleanupCache();
    }, this.settings.cleanupInterval);
  }

  /**
   * Предварительная загрузка ресурсов для секции
   */
  preloadSection(sectionName, resources) {
    if (!resources || resources.length === 0) return;

    // Фильтруем ресурсы по уровню производительности
    const filtered = this.filterByPerformance(resources);

    console.log(`📦 Preloading ${filtered.length} resources for section: ${sectionName}`);

    filtered.forEach((src, index) => {
      setTimeout(() => {
        this.load(src, 'medium');
      }, index * 50); // Небольшая задержка между загрузками
    });
  }

  /**
   * Фильтрация ресурсов по уровню производительности
   */
  filterByPerformance(resources) {
    const tier = window.PerformanceManager?.performanceTier;

    switch (tier) {
      case 'low':
        // Только критические ресурсы
        return resources.filter((_, index) => index < Math.ceil(resources.length * 0.3));
      case 'medium':
        // 70% ресурсов
        return resources.filter((_, index) => index < Math.ceil(resources.length * 0.7));
      case 'high':
      default:
        // Все ресурсы
        return resources;
    }
  }

  /**
   * Статистика использования ресурсов
   */
  getStatistics() {
    return {
      cacheSize: this.cache.size,
      loadingCount: this.loading.size,
      failedCount: this.failed.size,
      activeLoads: this.activeLoads.size,
      performanceTier: window.PerformanceManager?.performanceTier,
      memoryUsage: performance.memory ? performance.memory.usedJSHeapSize : 'N/A'
    };
  }

  /**
   * Очистка всех ресурсов
   */
  destroy() {
    // Останавливаем таймеры
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    // Очищаем кеш
    this.cache.clear();
    this.loading.clear();
    this.failed.clear();
    this.activeLoads.clear();
    this.loadPromises.clear();

    // Очищаем очереди
    Object.keys(this.queues).forEach(key => {
      this.queues[key] = [];
    });

    console.log('🗑️ Resource Manager destroyed');
  }

  /**
   * Отладочная информация
   */
  debug() {
    const stats = this.getStatistics();
    console.table(stats);
    console.log('📦 Cache contents:', Array.from(this.cache.entries()));
    console.log('⏳ Loading resources:', Array.from(this.loading));
    console.log('❌ Failed resources:', Array.from(this.failed));
    return { stats, cache: Array.from(this.cache.entries()), loading: Array.from(this.loading), failed: Array.from(this.failed) };
  }
}

// Создаем глобальный экземпляр
window.ResourceManager = new ResourceManager();

// Экспортируем для использования в модулях
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ResourceManager;
}
