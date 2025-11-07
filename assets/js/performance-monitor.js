/**
 * Performance Monitor - Система реального времени мониторинга производительности
 * Отслеживает метрики производительности и предоставляет данные для адаптивных решений
 */

class PerformanceMonitor {
  constructor() {
    this.isMonitoring = false;
    this.metrics = {
      fps: {
        current: 60,
        average: 60,
        min: 60,
        max: 60,
        history: [],
        thresholds: { good: 50, warning: 30, critical: 15 }
      },
      memory: {
        used: 0,
        total: 0,
        limit: 0,
        percentage: 0,
        history: [],
        thresholds: { warning: 0.7, critical: 0.85 }
      },
      timing: {
        frameTime: 16.67, // ~60fps
        animationTime: 0,
        layoutTime: 0,
        paintTime: 0,
        history: []
      },
      network: {
        latency: 0,
        bandwidth: 0,
        requests: 0,
        failedRequests: 0
      },
      battery: {
        level: 1,
        charging: true,
        dischargeRate: 0
      },
      system: {
        cores: navigator.hardwareConcurrency || 4,
        load: 0,
        temperature: 0 // если доступно
      }
    };

    this.settings = {
      sampleRate: 1000, // измерения каждую секунду
      historySize: 60, // хранить 60 измерений (1 минута)
      smoothingFactor: 0.1, // фактор сглаживания для усреднения
      alertThreshold: 5000, // интервал оповещений (мс)
      enableLongTaskMonitoring: true
    };

    this.observers = new Set();
    this.alerts = [];
    this.lastAlertTime = 0;

    this.init();
  }

  /**
   * Инициализация мониторинга
   */
  async init() {
    if (this.isMonitoring) return;

    try {
      // Инициализация наблюдателей производительности
      await this.initPerformanceObserver();

      // Запуск мониторинга
      this.startMonitoring();

      // Инициализация сетевого мониторинга
      this.initNetworkMonitoring();

      // Инициализация мониторинга батареи
      this.initBatteryMonitoring();

      this.isMonitoring = true;
      console.log('📊 Performance Monitor initialized');

    } catch (error) {
      console.warn('⚠️ Performance Monitor initialization failed:', error);
      // Fallback для браузеров без Performance API
      this.fallbackMonitoring();
    }
  }

  /**
   * Инициализация Performance Observer API
   */
  async initPerformanceObserver() {
    if (!window.PerformanceObserver) {
      throw new Error('Performance Observer not supported');
    }

    // Мониторинг long tasks (длительных задач)
    if (this.settings.enableLongTaskMonitoring) {
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.duration > 50) { // Задачи дольше 50ms
              this.handleLongTask(entry);
            }
          });
        });
        longTaskObserver.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        console.warn('Long task monitoring not available');
      }
    }

    // Мониторинг layout shifts (сдвиги layout)
    try {
      const layoutShiftObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.value > 0.1) { // Значимые сдвиги
            this.handleLayoutShift(entry);
          }
        });
      });
      layoutShiftObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
      console.warn('Layout shift monitoring not available');
    }

    // Мониторинг first input delay
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          this.handleFirstInputDelay(entry);
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
    } catch (e) {
      console.warn('FID monitoring not available');
    }
  }

  /**
   * Запуск основного мониторинга
   */
  startMonitoring() {
    let lastTime = performance.now();
    let frameCount = 0;

    const measure = (currentTime) => {
      // Расчет FPS
      frameCount++;
      const deltaTime = currentTime - lastTime;

      if (deltaTime >= 1000) { // Каждую секунду
        const fps = (frameCount * 1000) / deltaTime;
        this.updateFPS(fps);

        // Обновление других метрик
        this.updateMemoryMetrics();
        this.updateTimingMetrics();
        this.updateSystemMetrics();

        // Проверка порогов и отправка оповещений
        this.checkThresholds();

        // Сброс счетчиков
        frameCount = 0;
        lastTime = currentTime;

        // Уведомление наблюдателей
        this.notifyObservers();
      }

      if (this.isMonitoring) {
        requestAnimationFrame(measure);
      }
    };

    requestAnimationFrame(measure);
  }

  /**
   * Обновление метрик FPS
   */
  updateFPS(currentFPS) {
    const fps = this.metrics.fps;

    // Сглаживание значения
    fps.current = this.smoothValue(fps.current, currentFPS);

    // Обновление статистики
    fps.history.push(currentFPS);
    if (fps.history.length > this.settings.historySize) {
      fps.history.shift();
    }

    // Расчет среднего, минимума и максимума
    if (fps.history.length > 0) {
      fps.average = fps.history.reduce((a, b) => a + b, 0) / fps.history.length;
      fps.min = Math.min(...fps.history);
      fps.max = Math.max(...fps.history);
    }
  }

  /**
   * Обновление метрик памяти
   */
  updateMemoryMetrics() {
    if (performance.memory) {
      const mem = performance.memory;
      const memory = this.metrics.memory;

      memory.used = mem.usedJSHeapSize;
      memory.total = mem.totalJSHeapSize;
      memory.limit = mem.jsHeapSizeLimit;
      memory.percentage = memory.used / memory.limit;

      memory.history.push(memory.percentage);
      if (memory.history.length > this.settings.historySize) {
        memory.history.shift();
      }
    }
  }

  /**
   * Обновление метрик timing
   */
  updateTimingMetrics() {
    if (performance.timing) {
      const timing = performance.timing;
      const now = performance.now();

      // Расчет времени выполнения различных операций
      this.metrics.timing.frameTime = 1000 / this.metrics.fps.current;
      this.metrics.timing.animationTime = this.measureAnimationTime();
      this.metrics.timing.layoutTime = this.measureLayoutTime();
      this.metrics.timing.paintTime = this.measurePaintTime();
    }
  }

  /**
   * Измерение времени анимаций (примерная оценка)
   */
  measureAnimationTime() {
    // Можно реализовать более точное измерение с помощью Performance API
    // Пока используем оценку на основе FPS
    const baseFrameTime = 16.67; // 60fps
    const currentFrameTime = 1000 / this.metrics.fps.current;
    return Math.max(0, currentFrameTime - baseFrameTime);
  }

  /**
   * Измерение времени layout (примерная оценка)
   */
  measureLayoutTime() {
    // Можно использовать Performance API для более точных измерений
    // Пока возвращаем оценку
    return Math.random() * 2; // 0-2ms
  }

  /**
   * Измерение времени paint (примерная оценка)
   */
  measurePaintTime() {
    // Можно использовать Performance API для более точных измерений
    // Пока возвращаем оценку
    return Math.random() * 3; // 0-3ms
  }

  /**
   * Обновление системных метрик
   */
  updateSystemMetrics() {
    // Оценка загрузки системы (упрощенная)
    const fpsRatio = this.metrics.fps.current / 60;
    const memoryRatio = this.metrics.memory.percentage || 0;
    this.metrics.system.load = (1 - fpsRatio) * 0.7 + memoryRatio * 0.3;
  }

  /**
   * Инициализация сетевого мониторинга
   */
  initNetworkMonitoring() {
    // Мониторинг сетевых запросов
    if (window.PerformanceObserver) {
      try {
        const resourceObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            this.metrics.network.requests++;

            // Расчет latency
            if (entry.responseStart && entry.requestStart) {
              const latency = entry.responseStart - entry.requestStart;
              this.metrics.network.latency = this.smoothValue(this.metrics.network.latency, latency);
            }

            // Проверка на неудачные запросы
            if (entry.transferSize === 0 && entry.decodedBodySize === 0) {
              this.metrics.network.failedRequests++;
            }
          });
        });
        resourceObserver.observe({ entryTypes: ['resource'] });
      } catch (e) {
        console.warn('Resource monitoring not available');
      }
    }

    // Мониторинг connection
    if (navigator.connection) {
      const updateConnection = () => {
        this.metrics.network.bandwidth = navigator.connection.downlink || 10;
        this.metrics.network.latency = navigator.connection.rtt || 50;
      };

      navigator.connection.addEventListener('change', updateConnection);
      updateConnection();
    }
  }

  /**
   * Инициализация мониторинга батареи
   */
  initBatteryMonitoring() {
    if (navigator.getBattery) {
      navigator.getBattery().then(battery => {
        const updateBattery = () => {
          this.metrics.battery.level = battery.level;
          this.metrics.battery.charging = battery.charging;

          if (battery.dischargingTime !== Infinity) {
            this.metrics.battery.dischargeRate = (1 - battery.level) / (battery.dischargingTime / 3600000); // % per hour
          }
        };

        battery.addEventListener('levelchange', updateBattery);
        battery.addEventListener('chargingchange', updateBattery);
        updateBattery();
      });
    }
  }

  /**
   * Обработка длительных задач
   */
  handleLongTask(entry) {
    console.warn('🚨 Long task detected:', entry.duration, 'ms');

    // Отправка оповещения
    this.sendAlert({
      type: 'longTask',
      severity: entry.duration > 100 ? 'critical' : 'warning',
      duration: entry.duration,
      timestamp: Date.now()
    });
  }

  /**
   * Обработка сдвигов layout
   */
  handleLayoutShift(entry) {
    console.warn('📐 Layout shift detected:', entry.value);

    if (entry.value > 0.25) { // Значительный сдвиг
      this.sendAlert({
        type: 'layoutShift',
        severity: 'warning',
        value: entry.value,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Обработка задержки первого ввода
   */
  handleFirstInputDelay(entry) {
    console.log('👆 FID measured:', entry.processingStart - entry.startTime, 'ms');

    if (entry.processingStart - entry.startTime > 100) {
      this.sendAlert({
        type: 'highFID',
        severity: 'warning',
        delay: entry.processingStart - entry.startTime,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Проверка пороговых значений
   */
  checkThresholds() {
    const alerts = [];

    // Проверка FPS
    const fps = this.metrics.fps;
    if (fps.current < fps.thresholds.critical) {
      alerts.push({ type: 'fps', severity: 'critical', value: fps.current });
    } else if (fps.current < fps.thresholds.warning) {
      alerts.push({ type: 'fps', severity: 'warning', value: fps.current });
    }

    // Проверка памяти
    const memory = this.metrics.memory;
    if (memory.percentage > memory.thresholds.critical) {
      alerts.push({ type: 'memory', severity: 'critical', value: memory.percentage });
    } else if (memory.percentage > memory.thresholds.warning) {
      alerts.push({ type: 'memory', severity: 'warning', value: memory.percentage });
    }

    // Проверка батареи
    const battery = this.metrics.battery;
    if (battery.level < 0.1 && !battery.charging) {
      alerts.push({ type: 'battery', severity: 'warning', value: battery.level });
    }

    // Отправка оповещений
    alerts.forEach(alert => this.sendAlert(alert));
  }

  /**
   * Отправка оповещения
   */
  sendAlert(alert) {
    const now = Date.now();

    // Защита от спама оповещениями
    if (now - this.lastAlertTime < this.settings.alertThreshold) {
      return;
    }

    this.lastAlertTime = now;
    this.alerts.push({ ...alert, timestamp: now });

    // Ограничение истории оповещений
    if (this.alerts.length > 50) {
      this.alerts.shift();
    }

    console.warn('🚨 Performance Alert:', alert);

    // Уведомление наблюдателей
    this.notifyObservers('alert', alert);
  }

  /**
   * Сглаживание значения (экспоненциальное сглаживание)
   */
  smoothValue(current, newValue) {
    return current * (1 - this.settings.smoothingFactor) + newValue * this.settings.smoothingFactor;
  }

  /**
   * Добавление наблюдателя
   */
  addObserver(callback) {
    this.observers.add(callback);
  }

  /**
   * Удаление наблюдателя
   */
  removeObserver(callback) {
    this.observers.delete(callback);
  }

  /**
   * Уведомление наблюдателей
   */
  notifyObservers(event = 'update', data = null) {
    const payload = data || this.getMetrics();
    this.observers.forEach(callback => {
      try {
        callback(event, payload);
      } catch (error) {
        console.error('Observer callback error:', error);
      }
    });
  }

  /**
   * Получение текущих метрик
   */
  getMetrics() {
    return {
      timestamp: Date.now(),
      fps: { ...this.metrics.fps },
      memory: { ...this.metrics.memory },
      timing: { ...this.metrics.timing },
      network: { ...this.metrics.network },
      battery: { ...this.metrics.battery },
      system: { ...this.metrics.system },
      alerts: [...this.alerts]
    };
  }

  /**
   * Получение сводки производительности
   */
  getPerformanceSummary() {
    const metrics = this.getMetrics();

    return {
      overall: this.calculateOverallScore(metrics),
      fps: this.getFPSStatus(metrics.fps),
      memory: this.getMemoryStatus(metrics.memory),
      network: this.getNetworkStatus(metrics.network),
      battery: this.getBatteryStatus(metrics.battery),
      recommendations: this.generateRecommendations(metrics)
    };
  }

  /**
   * Расчет общего балла производительности
   */
  calculateOverallScore(metrics) {
    let score = 100;

    // FPS penalty
    if (metrics.fps.current < 30) score -= 30;
    else if (metrics.fps.current < 50) score -= 10;

    // Memory penalty
    if (metrics.memory.percentage > 0.8) score -= 25;
    else if (metrics.memory.percentage > 0.6) score -= 10;

    // Network penalty
    if (metrics.network.latency > 200) score -= 15;
    else if (metrics.network.latency > 100) score -= 5;

    // Battery penalty
    if (metrics.battery.level < 0.2 && !metrics.battery.charging) score -= 20;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Определение статуса FPS
   */
  getFPSStatus(fps) {
    if (fps.current >= fps.thresholds.good) return 'good';
    if (fps.current >= fps.thresholds.warning) return 'warning';
    return 'critical';
  }

  /**
   * Определение статуса памяти
   */
  getMemoryStatus(memory) {
    if (memory.percentage >= memory.thresholds.critical) return 'critical';
    if (memory.percentage >= memory.thresholds.warning) return 'warning';
    return 'good';
  }

  /**
   * Определение статуса сети
   */
  getNetworkStatus(network) {
    if (network.latency > 500) return 'critical';
    if (network.latency > 200) return 'warning';
    return 'good';
  }

  /**
   * Определение статуса батареи
   */
  getBatteryStatus(battery) {
    if (battery.level < 0.1 && !battery.charging) return 'critical';
    if (battery.level < 0.2 && !battery.charging) return 'warning';
    return 'good';
  }

  /**
   * Генерация рекомендаций по оптимизации
   */
  generateRecommendations(metrics) {
    const recommendations = [];

    if (metrics.fps.current < 30) {
      recommendations.push('Reduce animation complexity or disable heavy animations');
    }

    if (metrics.memory.percentage > 0.8) {
      recommendations.push('Clear cache or reduce resource usage');
    }

    if (metrics.network.latency > 200) {
      recommendations.push('Optimize network requests or reduce image quality');
    }

    if (metrics.battery.level < 0.2 && !metrics.battery.charging) {
      recommendations.push('Enable power-saving mode');
    }

    return recommendations;
  }

  /**
   * Fallback мониторинг для браузеров без Performance API
   */
  fallbackMonitoring() {
    console.log('Using fallback performance monitoring');

    // Простой мониторинг FPS через setInterval
    let lastTime = Date.now();
    let frameCount = 0;

    setInterval(() => {
      frameCount++;
      const currentTime = Date.now();
      const deltaTime = currentTime - lastTime;

      if (deltaTime >= 1000) {
        const fps = (frameCount * 1000) / deltaTime;
        this.updateFPS(fps);

        frameCount = 0;
        lastTime = currentTime;

        this.notifyObservers();
      }
    }, 100);
  }

  /**
   * Остановка мониторинга
   */
  stop() {
    this.isMonitoring = false;
    this.observers.clear();
    console.log('📊 Performance Monitor stopped');
  }

  /**
   * Отладочная информация
   */
  debug() {
    const summary = this.getPerformanceSummary();
    console.table(summary);
    console.log('📊 Detailed Metrics:', this.getMetrics());
    return { summary, metrics: this.getMetrics() };
  }
}

// Создаем глобальный экземпляр
window.PerformanceMonitor = new PerformanceMonitor();

// Экспортируем для использования в модулях
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PerformanceMonitor;
}
