/**
 * Smart Slider Manager - Умное управление слайдерами
 * Управляет слайдерами с помощью Intersection Observer для оптимизации производительности
 */

class SmartSliderManager {
  constructor() {
    this.sliders = new Map();
    this.observer = null;
    this.initialized = false;
    this.performanceConfig = null;

    // Настройки Intersection Observer
    this.observerOptions = {
      root: null,
      rootMargin: '50px', // Запас для плавного старта
      threshold: 0.1 // 10% видимости достаточно для запуска
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

    // Создаем Intersection Observer
    this.createObserver();

    // Глобальные обработчики для экстренных ситуаций
    this.setupGlobalHandlers();

    this.initialized = true;
    console.log('🎠 Smart Slider Manager initialized');
  }

  /**
   * Создание Intersection Observer
   */
  createObserver() {
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const sliderId = entry.target.dataset.sliderId;
        if (entry.isIntersecting) {
          this.startSlider(sliderId);
        } else {
          this.pauseSlider(sliderId);
        }
      });
    }, this.observerOptions);
  }

  /**
   * Регистрация слайдера в системе
   */
  registerSlider(id, $element, config = {}) {
    if (!this.initialized) {
      console.warn('SmartSliderManager not initialized yet');
      return;
    }

    // Проверяем, что слайдер еще не зарегистрирован
    if (this.sliders.has(id)) {
      console.warn(`Slider ${id} already registered`);
      return;
    }

    // Создаем конфигурацию слайдера
    const sliderConfig = {
      element: $element,
      config: { ...config },
      active: false,
      visible: false,
      lastInteraction: Date.now(),
      interactionCount: 0,
      performanceMode: this.getPerformanceMode()
    };

    // Добавляем data-атрибут для идентификации
    $element.attr('data-slider-id', id);

    // Регистрируем в системе
    this.sliders.set(id, sliderConfig);

    // Подключаем к наблюдению
    this.observer.observe($element[0]);

    // Настраиваем обработчики событий
    this.setupSliderEventHandlers(id, $element);

    console.log(`🎠 Slider ${id} registered:`, sliderConfig);
  }

  /**
   * Запуск слайдера
   */
  startSlider(id) {
    const slider = this.sliders.get(id);
    if (!slider) return;

    // Проверяем, разрешен ли автоплей для текущего уровня производительности
    if (!this.performanceConfig?.slick?.autoplay) {
      console.log(`🎠 Slider ${id}: Autoplay disabled for current performance tier`);
      return;
    }

    // Проверяем, не запущен ли уже слайдер
    if (slider.active) return;

    try {
      // Запускаем слайдер
      if (slider.element.hasClass('slick-initialized')) {
        slider.element.slick('slickPlay');
        slider.active = true;
        slider.visible = true;
        slider.lastInteraction = Date.now();

        console.log(`▶️ Slider ${id} started`);
      }
    } catch (error) {
      console.error(`❌ Error starting slider ${id}:`, error);
    }
  }

  /**
   * Остановка слайдера
   */
  pauseSlider(id) {
    const slider = this.sliders.get(id);
    if (!slider || !slider.active) return;

    try {
      // Ставим на паузу
      if (slider.element.hasClass('slick-initialized')) {
        slider.element.slick('slickPause');
        slider.active = false;
        slider.visible = false;

        console.log(`⏸️ Slider ${id} paused`);
      }
    } catch (error) {
      console.error(`❌ Error pausing slider ${id}:`, error);
    }
  }

  /**
   * Остановка всех слайдеров
   */
  pauseAllSliders() {
    this.sliders.forEach((slider, id) => {
      this.pauseSlider(id);
    });
    console.log('⏸️ All sliders paused');
  }

  /**
   * Запуск всех видимых слайдеров
   */
  startVisibleSliders() {
    this.sliders.forEach((slider, id) => {
      if (slider.visible) {
        this.startSlider(id);
      }
    });
  }

  /**
   * Настройка обработчиков событий для слайдера
   */
  setupSliderEventHandlers(id, $element) {
    const slider = this.sliders.get(id);

    // Обработчик взаимодействия пользователя
    $element.on('beforeChange.slick', () => {
      slider.lastInteraction = Date.now();
      slider.interactionCount++;
    });

    // Обработчик ошибки
    $element.on('error.slick', (event, slick, error) => {
      console.error(`❌ Slider ${id} error:`, error);
      this.handleSliderError(id, error);
    });

    // Обработчик инициализации
    $element.on('init.slick', () => {
      console.log(`✅ Slider ${id} initialized`);
    });
  }

  /**
   * Глобальные обработчики для экстренных ситуаций
   */
  setupGlobalHandlers() {
    // Остановка всех слайдеров при потере фокуса окна
    window.addEventListener('blur', () => {
      this.pauseAllSliders();
    });

    // Возобновление видимых слайдеров при фокусе
    window.addEventListener('focus', () => {
      setTimeout(() => this.startVisibleSliders(), 100);
    });

    // Остановка при низком заряде батареи
    if (navigator.getBattery) {
      navigator.getBattery().then(battery => {
        const checkBattery = () => {
          if (battery.level < 0.2 && !battery.charging) {
            console.log('🔋 Low battery detected, pausing all sliders');
            this.pauseAllSliders();
          }
        };

        battery.addEventListener('levelchange', checkBattery);
        battery.addEventListener('chargingchange', checkBattery);
      });
    }

    // Остановка при изменении размера окна (мобильные устройства)
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      this.pauseAllSliders();

      resizeTimeout = setTimeout(() => {
        this.startVisibleSliders();
      }, 500);
    });

    // Остановка при скролле (опционально, для экономии ресурсов)
    let scrollTimeout;
    window.addEventListener('scroll', () => {
      if (!this.performanceConfig?.slick?.pauseOnHover) return;

      clearTimeout(scrollTimeout);
      this.pauseAllSliders();

      scrollTimeout = setTimeout(() => {
        this.startVisibleSliders();
      }, 150);
    }, { passive: true });
  }

  /**
   * Обработка ошибок слайдера
   */
  handleSliderError(id, error) {
    const slider = this.sliders.get(id);
    if (!slider) return;

    // Пытаемся перезапустить слайдер через некоторое время
    setTimeout(() => {
      console.log(`🔄 Attempting to restart slider ${id}`);
      if (slider.element.hasClass('slick-initialized')) {
        slider.element.slick('unslick');
      }
      // Переинициализация будет выполнена через plugins.js
    }, 2000);
  }

  /**
   * Получение режима производительности для слайдера
   */
  getPerformanceMode() {
    if (!this.performanceConfig) return 'medium';

    const tier = window.PerformanceManager?.performanceTier || 'medium';
    return tier;
  }

  /**
   * Обновление настроек производительности
   */
  updatePerformanceMode() {
    const newMode = this.getPerformanceMode();

    this.sliders.forEach((slider, id) => {
      const oldMode = slider.performanceMode;
      slider.performanceMode = newMode;

      // Если режим изменился, перезапускаем слайдер
      if (oldMode !== newMode) {
        this.pauseSlider(id);
        setTimeout(() => {
          if (slider.visible) {
            this.startSlider(id);
          }
        }, 100);
      }
    });

    console.log(`🔄 Slider performance mode updated to: ${newMode}`);
  }

  /**
   * Статистика использования слайдеров
   */
  getStatistics() {
    const stats = {
      total: this.sliders.size,
      active: 0,
      visible: 0,
      totalInteractions: 0,
      performanceMode: this.getPerformanceMode()
    };

    this.sliders.forEach((slider) => {
      if (slider.active) stats.active++;
      if (slider.visible) stats.visible++;
      stats.totalInteractions += slider.interactionCount;
    });

    return stats;
  }

  /**
   * Очистка ресурсов
   */
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }

    this.sliders.forEach((slider, id) => {
      this.pauseSlider(id);
      slider.element.off('.slick');
    });

    this.sliders.clear();
    this.initialized = false;

    console.log('🗑️ Smart Slider Manager destroyed');
  }

  /**
   * Отладочная информация
   */
  debug() {
    const stats = this.getStatistics();
    console.table(this.sliders);
    console.log('📊 Slider Statistics:', stats);
    return { sliders: Array.from(this.sliders.entries()), stats };
  }
}

// Создаем глобальный экземпляр
window.SmartSliderManager = new SmartSliderManager();

// Экспортируем для использования в модулях
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SmartSliderManager;
}
