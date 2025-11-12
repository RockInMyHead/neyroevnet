/**
 * GSAP Manager - Оптимизированный менеджер GSAP анимаций
 * Управляет GSAP анимациями с batch-обработкой и оптимизациями производительности
 */

class GSAPManager {
  constructor() {
    this.timelines = new Map();
    this.triggers = new Map();
    this.queuedAnimations = new Map();
    this.batchQueue = [];
    this.performanceConfig = null;
    this.initialized = false;

    // Настройки оптимизации
    this.settings = {
      batchSize: 10, // Максимум анимаций в одном батче
      batchDelay: 16, // ~60fps
      maxConcurrentAnimations: 50, // Максимум одновременных анимаций
      cleanupInterval: 30000, // Очистка каждые 30 секунд
      memoryThreshold: 50 * 1024 * 1024 // 50MB порог очистки
    };

    this.init();
  }

  /**
   * Инициализация менеджера
   */
  async init() {
    if (this.initialized) return;

    // Ждем инициализации PerformanceManager
    if (window.PerformanceManager) {
      this.performanceConfig = await window.PerformanceManager.init();
    }

    // Запускаем автоматическую очистку
    this.startCleanupTimer();

    // Настраиваем GSAP для оптимальной производительности
    this.configureGSAP();

    // Устанавливаем глобальные обработчики
    this.setupGlobalHandlers();

    this.initialized = true;
    console.log('🎭 GSAP Manager initialized');
  }

  /**
   * Настройка GSAP для оптимальной производительности
   */
  configureGSAP() {
    if (!window.gsap) {
      console.warn('GSAP not found, skipping configuration');
      return;
    }

    const config = this.performanceConfig?.gsap || {};

    gsap.config({
      nullTargetWarn: false,
      debug: false,
      force3D: config.force3D !== false,
      autoSleep: this.getAutoSleepValue(),
    });

    // Оптимизация ScrollTrigger
    if (window.ScrollTrigger) {
      ScrollTrigger.config({
        ignoreMobileResize: true,
        syncRefresh: config.force3D !== false, // Отключаем sync для слабых устройств
      });

      // Дополнительные оптимизации для слабых устройств
      if (window.PerformanceManager?.performanceTier === 'low') {
        ScrollTrigger.config({
          limitCallbacks: true, // Ограничиваем колбэки
          autoRefreshEvents: "visibilitychange,DOMContentLoaded,load", // Минимальный набор событий
        });
      }
    }
  }

  /**
   * Создание оптимизированного таймлайна
   */
  createOptimizedTimeline(trigger, config = {}) {
    if (!window.gsap) {
      console.warn('GSAP not available');
      return null;
    }

    const performanceConfig = this.performanceConfig?.gsap || {};
    const defaultConfig = {
      scrub: performanceConfig.scrub || false,
      markers: false,
      fastScrollEnd: true,
      preventOverlaps: true,
      onEnter: config.onEnter,
      onLeave: config.onLeave,
      once: window.PerformanceManager?.performanceTier === 'low'
    };

    const timelineConfig = {
      scrollTrigger: {
        trigger: trigger,
        start: config.start || "top 90%",
        end: config.end || "bottom 20%",
        ...defaultConfig
      }
    };

    const tl = gsap.timeline(timelineConfig);

    // Сохраняем ссылку для управления
    const id = `tl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.timelines.set(id, {
      timeline: tl,
      trigger: trigger,
      config: timelineConfig,
      created: Date.now(),
      active: true
    });

    return { timeline: tl, id };
  }

  /**
   * Создание простой анимации с оптимизациями
   */
  animate(target, properties, config = {}) {
    if (!window.gsap) return Promise.resolve();

    const performanceConfig = this.performanceConfig?.gsap || {};
    const defaultConfig = {
      duration: performanceConfig.duration || 1,
      ease: performanceConfig.ease || "power2.out",
      force3D: performanceConfig.force3D !== false,
      ...config
    };

    // Добавляем в очередь для потенциальной batch-обработки
    if (this.shouldBatch(config)) {
      return this.addToBatchQueue(target, properties, defaultConfig);
    }

    // Создаем анимацию сразу
    const animation = gsap.to(target, defaultConfig, properties);

    // Сохраняем для управления
    const id = `anim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.triggers.set(id, {
      animation: animation,
      target: target,
      properties: properties,
      config: defaultConfig,
      created: Date.now(),
      active: true
    });

    return animation;
  }

  /**
   * Добавление анимации в очередь batch-обработки
   */
  addToBatchQueue(target, properties, config) {
    return new Promise((resolve) => {
      this.batchQueue.push({
        target,
        properties,
        config,
        resolve
      });

      // Если очередь достаточно большая, выполняем batch
      if (this.batchQueue.length >= this.settings.batchSize) {
        this.processBatchQueue();
      } else {
        // Иначе планируем выполнение через небольшой интервал
        if (!this.batchTimer) {
          this.batchTimer = setTimeout(() => {
            this.processBatchQueue();
          }, this.settings.batchDelay);
        }
      }
    });
  }

  /**
   * Обработка очереди batch-анимаций
   */
  processBatchQueue() {
    if (this.batchQueue.length === 0) return;

    const batch = this.batchQueue.splice(0);
    clearTimeout(this.batchTimer);
    this.batchTimer = null;

    // Группируем анимации по типу для оптимизации
    const groupedAnimations = this.groupAnimationsByType(batch);

    // Выполняем анимации группами
    Object.entries(groupedAnimations).forEach(([type, animations]) => {
      this.executeBatchGroup(type, animations);
    });

    console.log(`🎭 Processed ${batch.length} animations in batch`);
  }

  /**
   * Группировка анимаций по типу
   */
  groupAnimationsByType(animations) {
    const groups = {
      fade: [],
      slide: [],
      scale: [],
      other: []
    };

    animations.forEach(item => {
      const props = Object.keys(item.properties);

      if (props.includes('opacity') || props.includes('autoAlpha')) {
        groups.fade.push(item);
      } else if (props.some(prop => prop.includes('x') || prop.includes('y'))) {
        groups.slide.push(item);
      } else if (props.includes('scale')) {
        groups.scale.push(item);
      } else {
        groups.other.push(item);
      }
    });

    return groups;
  }

  /**
   * Выполнение группы анимаций
   */
  executeBatchGroup(type, animations) {
    if (animations.length === 0) return;

    // Устанавливаем начальные значения
    gsap.set(animations.map(a => a.target), animations[0].properties);

    // Создаем общую анимацию для группы
    const targets = animations.map(a => a.target);
    const duration = animations[0].config.duration || 1;
    const stagger = this.performanceConfig?.gsap?.stagger || 0.1;

    gsap.to(targets, {
      ...animations[0].properties,
      duration: duration,
      stagger: stagger,
      ease: animations[0].config.ease,
      force3D: animations[0].config.force3D,
      onComplete: () => {
        // Разрешаем промисы
        animations.forEach(item => item.resolve && item.resolve());
      }
    });
  }

  /**
   * Проверка, стоит ли анимировать элемент
   */
  shouldAnimate(element) {
    if (!element) return false;

    // Проверяем видимость элемента
    const rect = element.getBoundingClientRect();
    const isVisible = rect.top < window.innerHeight + 100 && rect.bottom > -100;

    if (!isVisible) return false;

    // Проверяем, не слишком ли много активных анимаций
    const activeAnimations = Array.from(this.triggers.values()).filter(t => t.active);
    if (activeAnimations.length >= this.settings.maxConcurrentAnimations) {
      return false;
    }

    return true;
  }

  /**
   * Определение, стоит ли добавлять анимацию в batch
   */
  shouldBatch(config) {
    // Всегда batch для низкой производительности
    if (window.PerformanceManager?.performanceTier === 'low') {
      return true;
    }

    // Batch для простых анимаций
    return config.batch !== false && !config.immediate;
  }

  /**
   * Установка ScrollTrigger анимации
   */
  setScrollTrigger(element, animationConfig) {
    if (!window.ScrollTrigger || !this.shouldAnimate(element)) {
      return null;
    }

    const performanceConfig = this.performanceConfig?.gsap || {};
    const config = {
      trigger: element,
      start: animationConfig.start || "top 90%",
      end: animationConfig.end || "bottom 20%",
      scrub: performanceConfig.scrub || false,
      markers: false,
      fastScrollEnd: true,
      preventOverlaps: true,
      ...animationConfig
    };

    // Для низкой производительности упрощаем
    if (window.PerformanceManager?.performanceTier === 'low') {
      config.once = true;
      config.scrub = false;
    }

    const trigger = ScrollTrigger.create(config);

    // Сохраняем для управления
    const id = `st_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.triggers.set(id, {
      trigger: trigger,
      element: element,
      config: config,
      created: Date.now(),
      active: true
    });

    return { trigger, id };
  }

  /**
   * Глобальные обработчики для оптимизации
   */
  setupGlobalHandlers() {
    // Остановка анимаций при потере фокуса
    window.addEventListener('blur', () => {
      gsap.globalTimeline.pause();
    });

    // Возобновление при фокусе
    window.addEventListener('focus', () => {
      gsap.globalTimeline.resume();
    });

    // Очистка при низкой памяти
    if (performance.memory) {
      setInterval(() => {
        if (performance.memory.usedJSHeapSize > this.settings.memoryThreshold) {
          this.cleanup();
        }
      }, 10000);
    }
  }

  /**
   * Получение значения autoSleep для GSAP
   */
  getAutoSleepValue() {
    const tier = window.PerformanceManager?.performanceTier;

    switch (tier) {
      case 'low': return 30; // Более агрессивный сон
      case 'medium': return 45;
      case 'high': return 60;
      default: return 60;
    }
  }

  /**
   * Очистка неиспользуемых анимаций
   */
  cleanup() {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 минут

    // Очистка старых таймлайнов
    this.timelines.forEach((item, id) => {
      if (now - item.created > maxAge && !item.active) {
        if (item.timeline) {
          item.timeline.kill();
        }
        this.timelines.delete(id);
      }
    });

    // Очистка старых триггеров
    this.triggers.forEach((item, id) => {
      if (now - item.created > maxAge && !item.active) {
        if (item.trigger && typeof item.trigger.kill === 'function') {
          item.trigger.kill();
        }
        this.triggers.delete(id);
      }
    });

    console.log('🧹 GSAP Manager cleanup completed');
  }

  /**
   * Запуск таймера автоматической очистки
   */
  startCleanupTimer() {
    setInterval(() => {
      this.cleanup();
    }, this.settings.cleanupInterval);
  }

  /**
   * Обновление настроек производительности
   */
  updatePerformanceConfig() {
    if (window.PerformanceManager) {
      window.PerformanceManager.init().then(config => {
        this.performanceConfig = config;
        this.configureGSAP();
        console.log('🔄 GSAP Manager performance config updated');
      });
    }
  }

  /**
   * Статистика использования
   */
  getStatistics() {
    return {
      timelines: this.timelines.size,
      triggers: this.triggers.size,
      queuedAnimations: this.queuedAnimations.size,
      batchQueueSize: this.batchQueue.length,
      performanceTier: window.PerformanceManager?.performanceTier,
      memoryUsage: performance.memory ? performance.memory.usedJSHeapSize : 'N/A'
    };
  }

  /**
   * Очистка всех ресурсов
   */
  destroy() {
    // Останавливаем все таймлайны
    this.timelines.forEach((item) => {
      if (item.timeline) {
        item.timeline.kill();
      }
    });

    // Уничтожаем все триггеры
    this.triggers.forEach((item) => {
      if (item.trigger && typeof item.trigger.kill === 'function') {
        item.trigger.kill();
      }
    });

    // Очищаем очереди
    this.batchQueue = [];
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    // Останавливаем очистку
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.timelines.clear();
    this.triggers.clear();
    this.queuedAnimations.clear();

    console.log('🗑️ GSAP Manager destroyed');
  }

  /**
   * Отладочная информация
   */
  debug() {
    const stats = this.getStatistics();
    console.table(stats);
    console.log('🎭 GSAP Timelines:', Array.from(this.timelines.entries()));
    console.log('🎯 GSAP Triggers:', Array.from(this.triggers.entries()));
    return { stats, timelines: Array.from(this.timelines.entries()), triggers: Array.from(this.triggers.entries()) };
  }
}

// Создаем глобальный экземпляр
window.GSAPManager = new GSAPManager();

// Экспортируем для использования в модулях
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GSAPManager;
}
