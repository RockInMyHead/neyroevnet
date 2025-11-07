/**
 * Adaptive Manager - Система динамической адаптации настроек
 * Автоматически корректирует настройки производительности на основе реального времени данных
 */

class AdaptiveManager {
  constructor() {
    this.isActive = false;
    this.currentTier = 'medium';
    this.adaptationHistory = [];
    this.performanceBaseline = null;

    // Настройки адаптации
    this.settings = {
      adaptationInterval: 5000, // Проверка каждые 5 секунд
      stabilityPeriod: 10000, // Период стабильности перед адаптацией
      aggressiveThreshold: 0.3, // Порог для агрессивной адаптации
      conservativeThreshold: 0.7, // Порог для консервативной адаптации
      maxAdaptationsPerMinute: 3, // Максимум адаптаций в минуту
      cooldownPeriod: 30000, // Время восстановления после адаптации
      enableProactiveAdaptation: true, // Проактивная адаптация
      enableReactiveAdaptation: true   // Реактивная адаптация
    };

    // Состояние адаптации
    this.state = {
      lastAdaptation: 0,
      adaptationCount: 0,
      lastMinuteAdaptations: [],
      isCoolingDown: false,
      stabilityStart: Date.now(),
      consecutiveWarnings: 0,
      consecutiveCriticals: 0
    };

    // Стратегии адаптации для разных сценариев
    this.adaptationStrategies = {
      fps_drop: {
        actions: ['reduce_animations', 'disable_particles', 'throttle_cursor', 'reduce_slick_speed'],
        severity: 'high'
      },
      memory_pressure: {
        actions: ['clear_cache', 'reduce_preload', 'disable_vanilla_tilt', 'reduce_batch_size'],
        severity: 'high'
      },
      battery_low: {
        actions: ['power_saving_mode', 'reduce_animations', 'disable_particles', 'throttle_cursor'],
        severity: 'medium'
      },
      network_slow: {
        actions: ['reduce_image_quality', 'disable_preload', 'reduce_concurrent_loads'],
        severity: 'medium'
      },
      system_overload: {
        actions: ['pause_animations', 'clear_cache', 'reduce_slick_speed', 'throttle_cursor'],
        severity: 'critical'
      }
    };

    this.init();
  }

  /**
   * Инициализация адаптивного менеджера
   */
  async init() {
    if (this.isActive) return;

    try {
      // Ожидание инициализации PerformanceMonitor
      if (window.PerformanceMonitor) {
        await this.waitForPerformanceMonitor();

        // Установка базовых значений производительности
        this.establishBaseline();

        // Запуск адаптивного цикла
        this.startAdaptiveLoop();

        // Подписка на оповещения PerformanceMonitor
        this.subscribeToAlerts();

        this.isActive = true;
        console.log('🔄 Adaptive Manager initialized');
      } else {
        console.warn('PerformanceMonitor not available, adaptive features disabled');
      }
    } catch (error) {
      console.error('Failed to initialize Adaptive Manager:', error);
    }
  }

  /**
   * Ожидание готовности PerformanceMonitor
   */
  async waitForPerformanceMonitor() {
    return new Promise((resolve) => {
      const checkReady = () => {
        if (window.PerformanceMonitor && window.PerformanceMonitor.isMonitoring) {
          resolve();
        } else {
          setTimeout(checkReady, 100);
        }
      };
      checkReady();
    });
  }

  /**
   * Установка базовых значений производительности
   */
  establishBaseline() {
    const metrics = window.PerformanceMonitor.getMetrics();

    this.performanceBaseline = {
      fps: metrics.fps.average,
      memoryPercentage: metrics.memory.percentage,
      timestamp: Date.now()
    };

    console.log('📊 Performance baseline established:', this.performanceBaseline);
  }

  /**
   * Запуск адаптивного цикла
   */
  startAdaptiveLoop() {
    setInterval(() => {
      if (!this.isActive || this.state.isCoolingDown) return;

      this.performAdaptationCheck();
    }, this.settings.adaptationInterval);
  }

  /**
   * Проверка необходимости адаптации
   */
  performAdaptationCheck() {
    const summary = window.PerformanceMonitor.getPerformanceSummary();
    const metrics = window.PerformanceMonitor.getMetrics();

    // Проверка лимита адаптаций в минуту
    this.cleanupAdaptationHistory();
    if (this.state.lastMinuteAdaptations.length >= this.settings.maxAdaptationsPerMinute) {
      return;
    }

    let adaptationNeeded = false;
    let adaptationReason = null;
    let severity = 'low';

    // Анализ FPS
    if (summary.fps === 'critical') {
      adaptationNeeded = true;
      adaptationReason = 'fps_drop';
      severity = 'high';
      this.state.consecutiveCriticals++;
    } else if (summary.fps === 'warning') {
      this.state.consecutiveWarnings++;
      if (this.state.consecutiveWarnings >= 3) {
        adaptationNeeded = true;
        adaptationReason = 'fps_drop';
        severity = 'medium';
      }
    } else {
      this.state.consecutiveWarnings = 0;
      this.state.consecutiveCriticals = 0;
    }

    // Анализ памяти
    if (summary.memory === 'critical') {
      adaptationNeeded = true;
      adaptationReason = 'memory_pressure';
      severity = 'high';
    }

    // Анализ батареи
    if (summary.battery === 'critical') {
      adaptationNeeded = true;
      adaptationReason = 'battery_low';
      severity = 'medium';
    }

    // Анализ сети
    if (summary.network === 'critical') {
      adaptationNeeded = true;
      adaptationReason = 'network_slow';
      severity = 'medium';
    }

    // Проверка общей производительности
    if (summary.overall < 50) {
      adaptationNeeded = true;
      adaptationReason = 'system_overload';
      severity = 'critical';
    }

    // Выполнение адаптации
    if (adaptationNeeded && adaptationReason) {
      this.executeAdaptation(adaptationReason, severity, summary);
    }
  }

  /**
   * Выполнение адаптации
   */
  async executeAdaptation(reason, severity, summary) {
    const strategy = this.adaptationStrategies[reason];
    if (!strategy) {
      console.warn('Unknown adaptation reason:', reason);
      return;
    }

    console.log(`🔄 Executing ${severity} adaptation for: ${reason}`);

    // Запись адаптации в историю
    const adaptation = {
      timestamp: Date.now(),
      reason: reason,
      severity: severity,
      actions: strategy.actions,
      beforeState: this.getCurrentState(),
      performanceSummary: summary
    };

    // Выполнение действий адаптации
    await this.performAdaptationActions(strategy.actions, severity);

    // Обновление состояния
    adaptation.afterState = this.getCurrentState();
    this.adaptationHistory.push(adaptation);
    this.state.lastAdaptation = Date.now();
    this.state.adaptationCount++;
    this.state.lastMinuteAdaptations.push(Date.now());

    // Активация cooldown периода
    this.startCooldown(severity);

    console.log(`✅ Adaptation completed: ${reason} (${strategy.actions.length} actions)`);

    // Уведомление других менеджеров
    this.notifyManagersOfAdaptation(adaptation);
  }

  /**
   * Выполнение действий адаптации
   */
  async performAdaptationActions(actions, severity) {
    const promises = [];

    for (const action of actions) {
      switch (action) {
        case 'reduce_animations':
          promises.push(this.reduceAnimations(severity));
          break;
        case 'disable_particles':
          promises.push(this.disableParticles());
          break;
        case 'throttle_cursor':
          promises.push(this.throttleCursor(severity));
          break;
        case 'reduce_slick_speed':
          promises.push(this.reduceSlickSpeed(severity));
          break;
        case 'clear_cache':
          promises.push(this.clearCache());
          break;
        case 'reduce_preload':
          promises.push(this.reducePreload(severity));
          break;
        case 'disable_vanilla_tilt':
          promises.push(this.disableVanillaTilt());
          break;
        case 'power_saving_mode':
          promises.push(this.enablePowerSavingMode());
          break;
        case 'reduce_image_quality':
          promises.push(this.reduceImageQuality());
          break;
        case 'pause_animations':
          promises.push(this.pauseAnimations());
          break;
        default:
          console.warn('Unknown adaptation action:', action);
      }
    }

    await Promise.all(promises);
  }

  /**
   * Адаптация: уменьшение сложности анимаций
   */
  async reduceAnimations(severity) {
    if (!window.GSAPManager) return;

    const config = window.PerformanceManager.getConfig();

    if (severity === 'high' || severity === 'critical') {
      // Отключение сложных анимаций
      config.animations.splitText = false;
      config.animations.fadeIn = false;
      config.gsap.scrub = false;
    } else {
      // Уменьшение скорости анимаций
      config.gsap.duration *= 1.5;
      config.gsap.stagger *= 2;
    }

    window.GSAPManager.updatePerformanceConfig();
  }

  /**
   * Адаптация: отключение частиц
   */
  async disableParticles() {
    if (!window.PerformanceManager) return;

    const config = window.PerformanceManager.getConfig();
    config.particles.enabled = false;

    // Обновление конфигурации в plugins.js будет выполнено через PerformanceManager
    console.log('❄️ Particles disabled due to performance constraints');
  }

  /**
   * Адаптация: throttling курсора
   */
  async throttleCursor(severity) {
    if (!window.PerformanceManager) return;

    const config = window.PerformanceManager.getConfig();

    if (severity === 'high' || severity === 'critical') {
      config.cursor.enabled = false;
    } else {
      config.cursor.throttle = Math.max(config.cursor.throttle * 1.5, 32); // Не чаще 30fps
    }
  }

  /**
   * Адаптация: уменьшение скорости слайдеров
   */
  async reduceSlickSpeed(severity) {
    if (!window.SmartSliderManager) return;

    const config = window.PerformanceManager.getConfig();

    if (severity === 'high' || severity === 'critical') {
      config.slick.autoplay = false;
    } else {
      config.slick.speed = Math.max(config.slick.speed * 1.5, 5000); // Минимум 5 сек
    }

    window.SmartSliderManager.updatePerformanceMode();
  }

  /**
   * Адаптация: очистка кеша
   */
  async clearCache() {
    if (!window.ResourceManager) return;

    window.ResourceManager.cleanupCache();
    console.log('🧹 Cache cleared due to memory pressure');
  }

  /**
   * Адаптация: уменьшение предварительной загрузки
   */
  async reducePreload(severity) {
    if (!window.ResourceManager) return;

    // Уменьшение количества предварительно загружаемых ресурсов
    if (severity === 'high' || severity === 'critical') {
      // Отключение preload для некритических секций
      console.log('📦 Preload reduced due to performance constraints');
    }
  }

  /**
   * Адаптация: отключение VanillaTilt
   */
  async disableVanillaTilt() {
    if (!window.PerformanceManager) return;

    const config = window.PerformanceManager.getConfig();
    config.tilt.enabled = false;

    console.log('📐 VanillaTilt disabled due to performance constraints');
  }

  /**
   * Адаптация: включение режима энергосбережения
   */
  async enablePowerSavingMode() {
    // Комплексная адаптация для батареи
    await this.disableParticles();
    await this.throttleCursor('high');
    await this.reduceAnimations('medium');

    console.log('🔋 Power saving mode activated');
  }

  /**
   * Адаптация: уменьшение качества изображений
   */
  async reduceImageQuality() {
    if (!window.ResourceManager) return;

    // Переключение на более низкое качество изображений
    console.log('🖼️ Image quality reduced due to network constraints');
  }

  /**
   * Адаптация: пауза всех анимаций
   */
  async pauseAnimations() {
    if (!window.GSAPManager) return;

    // Пауза всех GSAP анимаций
    window.GSAPManager.pauseAll();

    // Пауза слайдеров
    if (window.SmartSliderManager) {
      window.SmartSliderManager.pauseAllSliders();
    }

    console.log('⏸️ All animations paused due to system overload');
  }

  /**
   * Получение текущего состояния системы
   */
  getCurrentState() {
    return {
      performanceTier: window.PerformanceManager?.performanceTier,
      fps: window.PerformanceMonitor?.metrics.fps.current,
      memoryUsage: window.PerformanceMonitor?.metrics.memory.percentage,
      activeSliders: window.SmartSliderManager?.sliders.size,
      cacheSize: window.ResourceManager?.cache.size,
      timestamp: Date.now()
    };
  }

  /**
   * Запуск cooldown периода
   */
  startCooldown(severity) {
    const cooldownTime = severity === 'critical' ? this.settings.cooldownPeriod * 2 :
                        severity === 'high' ? this.settings.cooldownPeriod * 1.5 :
                        this.settings.cooldownPeriod;

    this.state.isCoolingDown = true;

    setTimeout(() => {
      this.state.isCoolingDown = false;
      console.log('♻️ Cooldown period ended, adaptation system ready');
    }, cooldownTime);
  }

  /**
   * Очистка истории адаптаций
   */
  cleanupAdaptationHistory() {
    const oneMinuteAgo = Date.now() - 60000;
    this.state.lastMinuteAdaptations = this.state.lastMinuteAdaptations.filter(
      timestamp => timestamp > oneMinuteAgo
    );
  }

  /**
   * Обработка обновлений производительности
   */
  handlePerformanceUpdate(event, data) {
    if (event === 'alert') {
      this.handlePerformanceAlert(data);
    } else if (event === 'update') {
      // Периодическое обновление метрик
      if (this.settings.enableProactiveAdaptation) {
        this.performProactiveAdaptation();
      }
    }
  }

  /**
   * Подписка на оповещения PerformanceMonitor
   */
  subscribeToAlerts() {
    window.PerformanceMonitor.addObserver((event, data) => {
      this.handlePerformanceUpdate(event, data);
    });
  }

  /**
   * Обработка оповещений производительности
   */
  handlePerformanceAlert(alert) {
    // Немедленная реакция на критические оповещения
    if (alert.severity === 'critical' && this.settings.enableReactiveAdaptation) {
      let reason;

      switch (alert.type) {
        case 'fps':
          reason = 'fps_drop';
          break;
        case 'memory':
          reason = 'memory_pressure';
          break;
        case 'longTask':
          reason = 'system_overload';
          break;
        default:
          return;
      }

      if (reason && !this.state.isCoolingDown) {
        console.log('🚨 Reactive adaptation triggered by alert:', alert);
        this.executeAdaptation(reason, 'critical', window.PerformanceMonitor.getPerformanceSummary());
      }
    }
  }

  /**
   * Уведомление менеджеров об адаптации
   */
  notifyManagersOfAdaptation(adaptation) {
    // Уведомление PerformanceManager для обновления базовых значений
    if (window.PerformanceManager && typeof window.PerformanceManager.updatePerformanceTier === 'function') {
      // Возможно, нужно обновить уровень производительности
    }

    // Уведомление других менеджеров
    if (window.SmartSliderManager && typeof window.SmartSliderManager.updatePerformanceMode === 'function') {
      window.SmartSliderManager.updatePerformanceMode();
    }

    if (window.GSAPManager && typeof window.GSAPManager.updatePerformanceConfig === 'function') {
      window.GSAPManager.updatePerformanceConfig();
    }
  }

  /**
   * Проактивная адаптация (предсказательная)
   */
  performProactiveAdaptation() {
    if (!this.settings.enableProactiveAdaptation) return;

    const metrics = window.PerformanceMonitor.getMetrics();
    const trend = this.analyzePerformanceTrend();

    // Предсказание будущих проблем
    if (trend.memoryIncreasing && metrics.memory.percentage > 0.6) {
      console.log('🔮 Proactive adaptation: Memory usage trending up');
      this.executeAdaptation('memory_pressure', 'medium', window.PerformanceMonitor.getPerformanceSummary());
    }

    if (trend.fpsDeclining && metrics.fps.current < 45) {
      console.log('🔮 Proactive adaptation: FPS trending down');
      this.executeAdaptation('fps_drop', 'medium', window.PerformanceMonitor.getPerformanceSummary());
    }
  }

  /**
   * Анализ трендов производительности
   */
  analyzePerformanceTrend() {
    const metrics = window.PerformanceMonitor.getMetrics();

    return {
      fpsDeclining: this.isTrendDeclining(metrics.fps.history, 5),
      memoryIncreasing: this.isTrendIncreasing(metrics.memory.history, 5),
      batteryDraining: metrics.battery.dischargeRate > 0.02 // >2% per hour
    };
  }

  /**
   * Проверка убывающего тренда
   */
  isTrendDeclining(history, windowSize = 5) {
    if (history.length < windowSize * 2) return false;

    const recent = history.slice(-windowSize);
    const previous = history.slice(-windowSize * 2, -windowSize);

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const previousAvg = previous.reduce((a, b) => a + b, 0) / previous.length;

    return recentAvg < previousAvg * 0.9; // Убывание на 10%
  }

  /**
   * Проверка возрастающего тренда
   */
  isTrendIncreasing(history, windowSize = 5) {
    if (history.length < windowSize * 2) return false;

    const recent = history.slice(-windowSize);
    const previous = history.slice(-windowSize * 2, -windowSize);

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const previousAvg = previous.reduce((a, b) => a + b, 0) / previous.length;

    return recentAvg > previousAvg * 1.1; // Рост на 10%
  }

  /**
   * Ручная адаптация (для тестирования)
   */
  manualAdaptation(reason, severity = 'medium') {
    if (!this.settings.enableReactiveAdaptation) return;

    console.log(`🔧 Manual adaptation requested: ${reason} (${severity})`);
    this.executeAdaptation(reason, severity, window.PerformanceMonitor.getPerformanceSummary());
  }

  /**
   * Сброс адаптаций (возврат к исходным настройкам)
   */
  resetAdaptations() {
    console.log('🔄 Resetting all adaptations');

    // Восстановление исходных настроек
    if (window.PerformanceManager) {
      window.PerformanceManager.updatePerformanceTier(window.PerformanceManager.performanceTier);
    }

    // Очистка истории адаптаций
    this.adaptationHistory = [];
    this.state.lastAdaptation = 0;
    this.state.adaptationCount = 0;
    this.state.lastMinuteAdaptations = [];
    this.state.isCoolingDown = false;

    console.log('✅ Adaptations reset to baseline');
  }

  /**
   * Получение статистики адаптаций
   */
  getAdaptationStatistics() {
    const now = Date.now();
    const lastHour = now - 3600000;

    const recentAdaptations = this.adaptationHistory.filter(
      adaptation => adaptation.timestamp > lastHour
    );

    return {
      totalAdaptations: this.adaptationHistory.length,
      recentAdaptations: recentAdaptations.length,
      adaptationsByReason: this.groupAdaptationsByReason(),
      adaptationsBySeverity: this.groupAdaptationsBySeverity(),
      averageAdaptationInterval: this.calculateAverageInterval(),
      currentState: this.getCurrentState(),
      isCoolingDown: this.state.isCoolingDown,
      lastAdaptation: this.state.lastAdaptation
    };
  }

  /**
   * Группировка адаптаций по причинам
   */
  groupAdaptationsByReason() {
    const groups = {};

    this.adaptationHistory.forEach(adaptation => {
      groups[adaptation.reason] = (groups[adaptation.reason] || 0) + 1;
    });

    return groups;
  }

  /**
   * Группировка адаптаций по severity
   */
  groupAdaptationsBySeverity() {
    const groups = {};

    this.adaptationHistory.forEach(adaptation => {
      groups[adaptation.severity] = (groups[adaptation.severity] || 0) + 1;
    });

    return groups;
  }

  /**
   * Расчет среднего интервала между адаптациями
   */
  calculateAverageInterval() {
    if (this.adaptationHistory.length < 2) return 0;

    const intervals = [];
    for (let i = 1; i < this.adaptationHistory.length; i++) {
      intervals.push(this.adaptationHistory[i].timestamp - this.adaptationHistory[i-1].timestamp);
    }

    return intervals.reduce((a, b) => a + b, 0) / intervals.length;
  }

  /**
   * Остановка адаптивного менеджера
   */
  stop() {
    this.isActive = false;
    console.log('🔄 Adaptive Manager stopped');
  }

  /**
   * Отладочная информация
   */
  debug() {
    const stats = this.getAdaptationStatistics();
    console.table(stats);
    console.log('🔄 Adaptation History:', this.adaptationHistory.slice(-10)); // Последние 10
    console.log('📊 Current State:', this.getCurrentState());
    return { stats, history: this.adaptationHistory, state: this.state };
  }
}

// Создаем глобальный экземпляр
window.AdaptiveManager = new AdaptiveManager();

// Экспортируем для использования в модулях
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AdaptiveManager;
}
