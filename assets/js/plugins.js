/* ==============
 ========= js documentation ==========================

 * theme name: Aikeu
 * version: 1.0
 * description: Artificial Neural Network AI HTML Template
 * author: Pixelaxis
 * author-url: https://themeforest.net/user/pixelaxis

    ==================================================

     01. get device width
     -------------------------------------------------
     02. odometer counter
     -------------------------------------------------
     03. banner large image slider
     -------------------------------------------------
     04. banner small image slider
     -------------------------------------------------
     05. text slider
     -------------------------------------------------
     06. large text slider
     -------------------------------------------------
     07. partner slider
     -------------------------------------------------
     08. sponsor slider
     -------------------------------------------------
     09. showcase slider
     -------------------------------------------------
     10. particles background
     -------------------------------------------------
     11. product masonry
     -------------------------------------------------
     12. category masonry
     -------------------------------------------------
     13. case study masonry
     -------------------------------------------------
     14. review slider
     -------------------------------------------------
     15. banner five text slider
     -------------------------------------------------
     16. case slider
     -------------------------------------------------
     17. publisher slider
     -------------------------------------------------
     18. video popup
     -------------------------------------------------
     19. product details slider
     -------------------------------------------------
     20. register gsap plugins
     -------------------------------------------------
     21. gsap null config
     -------------------------------------------------
     22. target section with gsap
     -------------------------------------------------
     23. smooth scroll with gsap
     -------------------------------------------------
     24. section subtitle animation
     -------------------------------------------------
     25. banner animation
     -------------------------------------------------
     26. banner three animation
     -------------------------------------------------
     27. text brief animation
     -------------------------------------------------
     28. cmn banner image animation
     -------------------------------------------------
     29. banner five image animation
     -------------------------------------------------
     30. large text animation
     -------------------------------------------------
     31. cta two animation
     -------------------------------------------------
     32. service details sticky
     -------------------------------------------------
     33. blog details sticky
     -------------------------------------------------
     34. shop sticky
     -------------------------------------------------
     35. case details sticky
     -------------------------------------------------
     36. image reveal animation
     -------------------------------------------------
     37. parallax image effects
     -------------------------------------------------
     38. appear down
     -------------------------------------------------
     39. service horizontal move
     -------------------------------------------------
     40. title animation
     -------------------------------------------------
     41. fade top gsap animation
     -------------------------------------------------
     42. slide top gsap animation
     -------------------------------------------------
     43. footer image animation
     -------------------------------------------------
     44. vanilla tilt animation

    ==================================================
============== */

(function ($) {
  "use strict";

  /**
   * Настройка коммуникации между менеджерами
   */
  function setupManagerCommunication() {
    // PerformanceMonitor -> AdaptiveManager
    if (window.PerformanceMonitor && window.AdaptiveManager) {
      window.PerformanceMonitor.addObserver((event, data) => {
        if (window.AdaptiveManager && typeof window.AdaptiveManager.handlePerformanceUpdate === 'function') {
          window.AdaptiveManager.handlePerformanceUpdate(event, data);
        }
      });
    }

    // AdaptiveManager -> все менеджеры
    if (window.AdaptiveManager) {
      // При успешной адаптации уведомляем все менеджеры
      const originalExecuteAdaptation = window.AdaptiveManager.executeAdaptation;
      window.AdaptiveManager.executeAdaptation = async function(reason, severity, summary) {
        const result = await originalExecuteAdaptation.call(this, reason, severity, summary);

        // Уведомление SmartSliderManager
        if (window.SmartSliderManager && typeof window.SmartSliderManager.updatePerformanceMode === 'function') {
          window.SmartSliderManager.updatePerformanceMode();
        }

        // Уведомление GSAPManager
        if (window.GSAPManager && typeof window.GSAPManager.updatePerformanceConfig === 'function') {
          window.GSAPManager.updatePerformanceConfig();
        }

        // Уведомление ResourceManager (автоматически через PerformanceManager)

        return result;
      };
    }

    // PerformanceManager изменения уровня -> все менеджеры
    if (window.PerformanceManager) {
      const originalUpdatePerformanceTier = window.PerformanceManager.updatePerformanceTier;
      window.PerformanceManager.updatePerformanceTier = function(newTier) {
        const result = originalUpdatePerformanceTier.call(this, newTier);

        if (result) {
          console.log(`🔄 Performance tier changed to ${newTier}, updating all managers`);

          // Обновление SmartSliderManager
          if (window.SmartSliderManager) {
            window.SmartSliderManager.updatePerformanceMode();
          }

          // Обновление GSAPManager
          if (window.GSAPManager) {
            window.GSAPManager.updatePerformanceConfig();
          }

          // Сброс адаптаций AdaptiveManager
          if (window.AdaptiveManager) {
            window.AdaptiveManager.resetAdaptations();
          }
        }

        return result;
      };
    }

    console.log('🔗 Manager communication established');
  }

  jQuery(document).ready(async function () {
    /**
     * ======================================
     * 01. get device width and performance detection
     * ======================================
     */
    let device_width = window.innerWidth;

    // Инициализация продвинутой системы детекции производительности
    const performanceTier = await window.PerformanceManager.init();
    const performanceConfig = window.PerformanceManager.getConfig();

    // Инициализация менеджеров
    await window.SmartSliderManager.init();
    await window.GSAPManager.init();
    await window.ResourceManager.init();
    await window.AdaptiveManager.init();

    // Для обратной совместимости создаем переменную isLowPerformance
    const isLowPerformance = performanceTier === 'low';

    console.log('🎯 Device performance tier:', performanceTier);
    console.log('⚙️ Performance config:', performanceConfig);
    console.log('🎠 Smart Slider Manager ready');
    console.log('🎭 GSAP Manager ready');
    console.log('📦 Resource Manager ready');
    console.log('🔄 Adaptive Manager ready');

    // Настройка обратной связи между менеджерами
    setupManagerCommunication();

    /**
     * ======================================
     * 02. odometer counter
     * ======================================
     */
    $(".odometer").each(function () {
      $(this).isInViewport(function (status) {
        if (status === "entered") {
          for (
            var i = 0;
            i < document.querySelectorAll(".odometer").length;
            i++
          ) {
            var el = document.querySelectorAll(".odometer")[i];
            el.innerHTML = el.getAttribute("data-odometer-final");
          }
        }
      });
    });

    /**
     * ======================================
     * 03. banner large image slider
     * ======================================
     */
    // Инициализация большого баннерного слайдера через SmartSliderManager
    if ($(".banner__large-slider").length > 0) {
      const largeSliderConfig = performanceConfig.slick.autoplay ? {
        slidesToShow: 1,
        slidesToScroll: 1,
        autoplay: performanceConfig.slick.autoplay,
        autoplaySpeed: performanceConfig.slick.autoplaySpeed,
        speed: performanceConfig.slick.speed,
        arrows: false,
        dots: false,
        pauseOnHover: performanceConfig.slick.pauseOnHover,
        draggable: performanceConfig.slick.draggable,
        variableWidth: true,
        cssEase: "linear",
        lazyLoad: "ondemand",
      } : {
        slidesToShow: 1,
        slidesToScroll: 1,
        autoplay: false,
        arrows: false,
        dots: false,
        draggable: true,
        variableWidth: true,
        cssEase: "linear",
        lazyLoad: "ondemand",
      };

      $(".banner__large-slider").not(".slick-initialized").slick(largeSliderConfig);
      window.SmartSliderManager.registerSlider('banner-large', $(".banner__large-slider"), largeSliderConfig);
    }

    /**
     * ======================================
     * 04. banner small image slider
     * ======================================
     */
    // Инициализация малого баннерного слайдера через SmartSliderManager
    if ($(".banner__small-slider").length > 0) {
      const smallSliderConfig = performanceConfig.slick.autoplay ? {
        slidesToShow: 1,
        slidesToScroll: 1,
        autoplay: performanceConfig.slick.autoplay,
        autoplaySpeed: performanceConfig.slick.autoplaySpeed,
        speed: performanceConfig.slick.speed,
        arrows: false,
        dots: false,
        pauseOnHover: performanceConfig.slick.pauseOnHover,
        draggable: performanceConfig.slick.draggable,
        variableWidth: true,
        rtl: true,
        cssEase: "linear",
        lazyLoad: "ondemand",
      } : {
        slidesToShow: 1,
        slidesToScroll: 1,
        autoplay: false,
        arrows: false,
        dots: false,
        draggable: true,
        variableWidth: true,
        rtl: true,
        cssEase: "linear",
        lazyLoad: "ondemand",
      };

      $(".banner__small-slider").not(".slick-initialized").slick(smallSliderConfig);
      window.SmartSliderManager.registerSlider('banner-small', $(".banner__small-slider"), smallSliderConfig);
    }


    /**
     * ======================================
     * 05. text slider
     * ======================================
     */
    $(".text-slider").not(".slick-initialized").slick({
      slidesToShow: 1,
      slidesToScroll: 1,
      autoplay: performanceConfig.slick.autoplay,
      autoplaySpeed: performanceConfig.slick.autoplaySpeed,
      speed: performanceConfig.slick.autoplay ? 12000 : 0,
      arrows: false,
      dots: false,
      pauseOnHover: performanceConfig.slick.pauseOnHover,
      draggable: performanceConfig.slick.draggable,
      variableWidth: true,
      cssEase: "linear",
    });

    /**
     * ======================================
     * 06. large text slider
     * ======================================
     */
    $(".text-slider-large").not(".slick-initialized").slick({
      slidesToShow: 2,
      slidesToScroll: 1,
      autoplay: performanceConfig.slick.autoplay,
      autoplaySpeed: performanceConfig.slick.autoplaySpeed,
      speed: performanceConfig.slick.autoplay ? 8000 : 0,
      arrows: false,
      dots: false,
      pauseOnHover: false,
      draggable: performanceConfig.slick.draggable,
      variableWidth: true,
      cssEase: "linear",
    });

    $(".text-slider-large-rtl").not(".slick-initialized").slick({
      slidesToShow: 2,
      slidesToScroll: 1,
      autoplay: performanceConfig.slick.autoplay,
      autoplaySpeed: performanceConfig.slick.autoplaySpeed,
      speed: performanceConfig.slick.autoplay ? 12000 : 0,
      arrows: false,
      dots: false,
      pauseOnHover: false,
      draggable: performanceConfig.slick.draggable,
      variableWidth: true,
      cssEase: "linear",
      rtl: true,
    });

    /**
     * ======================================
     * 07. partner slider
     * ======================================
     */
    $(".partner__slider").slick({
      slidesToShow: 5,
      slidesToScroll: 1,
      autoplay: true,
      autoplaySpeed: 1000,
      speed: 4000,
      arrows: false,
      dots: false,
      pauseOnHover: false,
      centerMode: true,
      centerPadding: "0px",
      responsive: [
        {
          breakpoint: 992,
          settings: {
            slidesToShow: 4,
            slidesToScroll: 1,
          },
        },
        {
          breakpoint: 768,
          settings: {
            slidesToShow: 3,
            slidesToScroll: 1,
          },
        },

        {
          breakpoint: 424,
          settings: {
            slidesToShow: 2,
            slidesToScroll: 1,
          },
        },
      ],
    });

    /**
     * ======================================
     * 08. sposnor slider
     * ======================================
     */
    $(".sponsor__slider")
      .not(".slick-initialized")
      .slick({
        slidesToShow: 6,
        slidesToScroll: 1,
        autoplay: true,
        autoplaySpeed: 0,
        speed: 8000,
        arrows: false,
        dots: false,
        pauseOnHover: false,
        draggable: false,
        variableWidth: false,
        cssEase: "linear",
        responsive: [
          {
            breakpoint: 1200,
            settings: {
              slidesToShow: 4,
            },
          },
          {
            breakpoint: 992,
            settings: {
              slidesToShow: 3,
              slidesToScroll: 1,
            },
          },

          {
            breakpoint: 576,
            settings: {
              slidesToShow: 2,
              slidesToScroll: 1,
            },
          },
        ],
      });

    /**
     * ======================================
     * 09. showcase slider
     * ======================================
     */
    $(".showcase__slider")
      .not(".slick-initialized")
      .slick({
        slidesToShow: 6,
        slidesToScroll: 1,
        autoplay: true,
        autoplaySpeed: 0,
        speed: 8000,
        arrows: false,
        dots: false,
        pauseOnHover: true,
        draggable: false,
        variableWidth: false,
        cssEase: "linear",
        responsive: [
          {
            breakpoint: 1400,
            settings: {
              slidesToShow: 4,
            },
          },
          {
            breakpoint: 992,
            settings: {
              slidesToShow: 3,
              slidesToScroll: 1,
            },
          },
          {
            breakpoint: 768,
            settings: {
              slidesToShow: 2,
              slidesToScroll: 1,
            },
          },
          {
            breakpoint: 425,
            settings: {
              slidesToShow: 1,
              slidesToScroll: 1,
            },
          },
        ],
      });

    /**
     * ======================================
     * 10. particles background
     * ======================================
     */
    if ($("#particles-js").length && performanceConfig.particles.enabled) {
      particlesJS("particles-js", {
        particles: {
          number: performanceConfig.particles.number,
          color: {
            value: "#0a1968",
          },
          shape: {
            type: "circle",
            stroke: {
              width: 0,
              color: "#0a1968",
            },
            shadow: {
              enable: false,
            },
          },
          opacity: performanceConfig.particles.opacity,
          size: performanceConfig.particles.size,
          line_linked: {
            enable: false,
          },
          move: performanceConfig.particles.move,
        },
        interactivity: {
          detect_on: "canvas",
          events: {
            onhover: {
              enable: false,
            },
            onclick: {
              enable: false,
            },
            resize: true,
          },
        },
        retina_detect: true,
      });
    } else if ($("#particles-js").length && !performanceConfig.particles.enabled) {
      // Для низкой производительности скрываем частицы
      $("#particles-js").hide();
    }

    /**
     * ======================================
     * 11.  product masonry
     * ======================================
     */
    function masonryMain() {
      if ($(".masonry-grid").length) {
        var $grid = $(".masonry-grid").isotope({
          layoutMode: "packery",
          itemSelector: ".grid-item-main",
        });

        var filterFns = {
          all: function () {
            return true;
          },
        };

        $(".product-filter__wrapper").on("click", "button", function () {
          var filterValue = $(this).attr("data-filter");
          filterValue = filterFns[filterValue] || filterValue;
          $grid.isotope({ filter: filterValue });
        });

        $(".product-filter__wrapper").each(function (i, buttonGroup) {
          var $buttonGroup = $(buttonGroup);
          $buttonGroup.on("click", "button", function () {
            $buttonGroup.find(".active").removeClass("active");
            $(this).addClass("active");
          });
        });

        $grid.isotope({
          transitionDuration: "1200ms",
        });
      }
    }

    masonryMain();

    /**
     * ======================================
     * 12.  category masonry
     * ======================================
     */
    function masonryCategory() {
      if ($(".category-masonry").length) {
        var $grid = $(".category-masonry").isotope({
          layoutMode: "fitRows",
          itemSelector: ".category-item",
        });

        var filterFns = {
          all: function () {
            return true;
          },
        };

        $(".category-filter").on("click", "button", function () {
          var filterValue = $(this).attr("data-filter");
          filterValue = filterFns[filterValue] || filterValue;
          $grid.isotope({ filter: filterValue });
        });

        $(".category-filter").each(function (i, buttonGroup) {
          var $buttonGroup = $(buttonGroup);
          $buttonGroup.on("click", "button", function () {
            $buttonGroup.find(".active").removeClass("active");
            $(this).addClass("active");
          });
        });

        $grid.isotope({
          transitionDuration: "1200ms",
        });
      }
    }

    masonryCategory();

    /**
     * ======================================
     * 13.  case study masonry
     * ======================================
     */
    function masonryCase() {
      if ($(".case-masonry").length) {
        var $grid = $(".case-masonry").isotope({
          layoutMode: "fitRows",
          itemSelector: ".case-item",
        });

        var filterFns = {
          all: function () {
            return true;
          },
        };

        $(".case-filter__wrapper").on("click", "button", function () {
          var filterValue = $(this).attr("data-filter");
          filterValue = filterFns[filterValue] || filterValue;
          $grid.isotope({ filter: filterValue });
        });

        $(".case-filter__wrapper").each(function (i, buttonGroup) {
          var $buttonGroup = $(buttonGroup);
          $buttonGroup.on("click", "button", function () {
            $buttonGroup.find(".active").removeClass("active");
            $(this).addClass("active");
          });
        });

        $grid.isotope({
          transitionDuration: "1200ms",
        });
      }
    }

    masonryCase();

    /**
     * ======================================
     * 14. review slider
     * ======================================
     */
    $(".review__slider").slick({
      slidesToShow: 3,
      slidesToScroll: 1,
      autoplay: true,
      autoplaySpeed: 6000,
      speed: 3000,
      arrows: false,
      dots: true,
      appendDots: $(".review-pagination"),
      pauseOnHover: true,
      centerMode: true,
      centerPadding: "0px",
      responsive: [
        {
          breakpoint: 992,
          settings: {
            slidesToShow: 2,
          },
        },
        {
          breakpoint: 424,
          settings: {
            slidesToShow: 1,
          },
        },
      ],
    });

    /**
     * ======================================
     * 15. banner five text slider
     * ======================================
     */
    $(".b-text-slider").not(".slick-initialized").slick({
      slidesToShow: 1,
      slidesToScroll: 1,
      autoplay: true,
      autoplaySpeed: 0,
      speed: 19000,
      arrows: false,
      dots: false,
      pauseOnHover: false,
      draggable: false,
      variableWidth: true,
      cssEase: "linear",
    });

    $(".b-text-slider-alt").not(".slick-initialized").slick({
      slidesToShow: 1,
      slidesToScroll: 1,
      autoplay: true,
      autoplaySpeed: 0,
      speed: 24000,
      arrows: false,
      dots: false,
      pauseOnHover: false,
      draggable: false,
      variableWidth: true,
      cssEase: "linear",
      rtl: true,
    });

    /**
     * ======================================
     * 16. case slider
     * ======================================
     */
    $(".c-slide__wrapper")
      .not(".slick-initialized")
      .slick({
        slidesToShow: 4,
        slidesToScroll: 1,
        autoplay: true,
        autoplaySpeed: 6000,
        speed: 2000,
        arrows: false,
        dots: false,
        pauseOnHover: true,
        draggable: false,
        responsive: [
          {
            breakpoint: 1200,
            settings: {
              slidesToShow: 3,
            },
          },
          {
            breakpoint: 992,
            settings: {
              slidesToShow: 2,
              slidesToScroll: 1,
            },
          },
          {
            breakpoint: 576,
            settings: {
              slidesToShow: 1,
              slidesToScroll: 1,
            },
          },
        ],
      });

    /**
     * ======================================
     * 17. publisher slider
     * ======================================
     */
    $(".publisher__slider")
      .not(".slick-initialized")
      .slick({
        slidesToShow: 5,
        slidesToScroll: 1,
        autoplay: true,
        autoplaySpeed: 6000,
        speed: 2000,
        arrows: false,
        dots: false,
        pauseOnHover: true,
        draggable: false,
        responsive: [
          {
            breakpoint: 1200,
            settings: {
              slidesToShow: 4,
            },
          },
          {
            breakpoint: 992,
            settings: {
              slidesToShow: 3,
              slidesToScroll: 1,
            },
          },
          {
            breakpoint: 768,
            settings: {
              slidesToShow: 2,
              slidesToScroll: 1,
            },
          },
          {
            breakpoint: 425,
            settings: {
              slidesToShow: 1,
              slidesToScroll: 1,
            },
          },
        ],
      });

    /**
     * ======================================
     * 18. video popup
     * ======================================
     */
    if (document.querySelector(".video-btn") !== null) {
      $(".video-btn").magnificPopup({
        disableOn: 768,
        type: "iframe",
        mainClass: "mfp-fade",
        removalDelay: 160,
        preloader: false,
        fixedContentPos: false,
      });
    }

    /**
     * ======================================
     * 19. product details slider
     * ======================================
     */
    $(".large-product-img").not(".slick-initialized").slick({
      slidesToShow: 1,
      slidesToScroll: 1,
      arrows: false,
      autoplay: true,
      autoplaySpeed: 3000,
      speed: 1000,
      arrows: false,
      dots: false,
      asNavFor: ".small-product-img",
    });

    $(".small-product-img")
      .not(".slick-initialized")
      .slick({
        slidesToShow: 3,
        slidesToScroll: 1,
        asNavFor: ".large-product-img",
        arrows: false,
        autoplay: true,
        autoplaySpeed: 3000,
        speed: 1000,
        arrows: false,
        dots: false,
        focusOnSelect: true,
        centerMode: true,
        centerPadding: "0px",
        responsive: [
          {
            breakpoint: 576,
            settings: {
              slidesToShow: 2,
            },
          },
        ],
      });

    /**
     * ======================================
     * 20. register gsap plugins
     * ======================================
     */
    gsap.registerPlugin(
      ScrollTrigger,
      ScrollSmoother,
      ScrollToPlugin,
      SplitText
    );

    /**
     * ======================================
     * 21. gsap null config
     * ======================================
     */
    gsap.config({
      nullTargetWarn: false,
      debug: false,
      force3D: performanceConfig.gsap.force3D,
      autoSleep: performanceTier === 'low' ? 30 : 60, // Более агрессивный сон для слабых устройств
    });

    // Оптимизация ScrollTrigger
    ScrollTrigger.config({
      ignoreMobileResize: true,
      syncRefresh: performanceTier === 'low' ? false : true, // Отключаем sync для слабых устройств
    });

    /**
     * ======================================
     * 22.  target section with gsap
     * ======================================
     */
    $('a[href^="#"]').on("click", function (event) {
      event.preventDefault();

      var target = $(this).attr("href");
      // sanitize '#' anchor: scroll to top if no valid selector
      var scrollTarget = (target === '#' ? 0 : target);

      gsap.to(window, {
        scrollTo: {
          y: scrollTarget,
          offsetY: 50,
        },
        duration: 0.5,
        ease: "power3.inOut",
      });
    });

    /**
     * ======================================
     * 23. smooth scroll with gsap
     * ======================================
     */
    // Отключаем ScrollSmoother для максимальной производительности
    // ScrollSmoother.create({
    //   smooth: 1.2,
    //   effects: true,
    //   smoothTouch: 0.5,
    // });

    /**
     * ======================================
     * 24.  section subtitle animation
     * ======================================
     */
    if ($(".sub-title-two").length > 0) {
      gsap.utils.toArray(".sub-title-two").forEach((el) => {
        gsap.to(el, {
          "--width": "40px",
          duration: 1,
          scrollTrigger: {
            trigger: el,
            start: "top 80%",
            markers: false,
          },
        });
      });
    }

    /**
     * ======================================
     * 25.  banner animation
     * ======================================
     */
    if ($(".banner").length > 0) {
      if (device_width >= 768) {
        var tl = gsap.timeline({
          scrollTrigger: {
            trigger: ".banner",
            start: "center center",
            end: "+=40%",
            scrub: 1,
            pin: false,
          },
        });
        tl.to(".banner-thumb-one img", {
          transform: "rotate(14deg)",
          x: "300px",
          opacity: 1,
          duration: 3,
        });
        tl.to(".banner .banner-anime", {
          "--transformY": "300px",
          opacity: 0,
          duration: 3,
        });
      }
    }

    /**
     * ======================================
     * 26.  banner three animation
     * ======================================
     */
    if ($(".banner-three").length > 0) {
      if (device_width >= 768) {
        var tl = gsap.timeline({
          scrollTrigger: {
            trigger: ".banner-three",
            start: "center center",
            end: "+=40%",
            scrub: 1,
            pin: false,
          },
        });
        tl.to(".banner-t-s-thumb", {
          transform: "scale(1.2)",
          y: "300px",
          opacity: 0.5,
          duration: 3,
        });
      }
    }

    /**
     * ======================================
     * 27.  text brief animation
     * ======================================
     */
    if ($(".text-brief").length > 0) {
      if (device_width >= 768) {
        var tl = gsap.timeline({
          scrollTrigger: {
            trigger: ".text-brief",
            start: "center center",
            end: "+=40%",
            scrub: 1,
            pin: false,
          },
        });
        tl.to(".t-br-one img", {
          transform: "scale(1.2)",
          y: "60px",
          opacity: 0.5,
          duration: 2,
        });
        tl.to(
          ".t-br-two img",
          {
            y: "60px",
            opacity: 0.5,
            duration: 2,
          },
          "<"
        );
      }
    }

    /**
     * ======================================
     * 28.  cmn banner image animation
     * ======================================
     */
    if ($(".cmn-banner").length > 0) {
      if (device_width >= 768) {
        var tl = gsap.timeline({
          scrollTrigger: {
            trigger: ".cmn-banner",
            start: "top top",
            end: "+=20%",
            scrub: 1,
            pin: false,
          },
        });
        tl.to(".cmn-banner .thumb-left img", {
          y: "190px",
          duration: 2,
        });
      }
    }

    /**
     * ======================================
     * 29. banner five image animation
     * ======================================
     */
    if ($(".banner-five").length > 0) {
      if (device_width >= 768) {
        var tl = gsap.timeline({
          scrollTrigger: {
            trigger: ".banner-five",
            start: "top top",
            end: "+=20%",
            scrub: 1,
            pin: false,
          },
        });
        tl.to(".banner__five-content h1", {
          y: "390px",
          scale: 1.5,
          zIndex: -1,
          opacity: "0.2",
          duration: 3,
        });
        tl.to(
          ".banner__five-content img",
          {
            scale: 1.3,
            duration: 2,
          },
          0
        );
        tl.to(
          ".b-f-s-thumb",
          {
            y: "-200px",
            duration: 2,
          },
          0
        );
      }
    }

    /**
     * ======================================
     * 30.  large text animation
     * ======================================
     */
    if ($(".b-g-text-slider").length > 0) {
      if (device_width >= 768) {
        var tl = gsap.timeline({
          scrollTrigger: {
            trigger: ".b-g-text-slider",
            start: "top center",
            end: "+=100%",
            scrub: 1,
            pin: false,
          },
        });
        tl.to(".b-g-text-slider", {
          y: "390px",
          scale: 2,
          zIndex: -1,
          opacity: "0.2",
          duration: 6,
        });
      }
    }

    /**
     * ======================================
     * 31.  cta two animation
     * ======================================
     */
    if ($(".cta-two").length > 0) {
      if (device_width >= 768) {
        var tl = gsap.timeline({
          scrollTrigger: {
            trigger: ".cta-two",
            start: "top center",
            end: "+=100%",
            scrub: 1,
            pin: false,
          },
        });
        tl.to(".cta-two__inner", {
          y: "-190px",
          duration: 1,
        });
      }
    }

    /**
     * ======================================
     * 32.  service details sticky
     * ======================================
     */
    if ($(".s-details").length > 0) {
      if (device_width >= 992) {
        const metaElement = document.querySelector(".s-details__content");
        const sidebarElement = document.querySelector(".s-details__sidebar");
        let nullPadding;

        if (device_width >= 1200) {
          nullPadding = 320;
        } else {
          nullPadding: 320;
        }

        ScrollTrigger.create({
          trigger: ".s-details",
          start: "top top",
          end: "bottom top+=" + (metaElement.clientHeight + nullPadding),
          pin: metaElement,
          pinSpacing: false,
          id: "l",
          markers: false,
        });

        ScrollTrigger.create({
          trigger: ".s-details",
          start: "top top",
          end: "bottom top+=" + (sidebarElement.clientHeight + nullPadding),
          pin: sidebarElement,
          pinSpacing: false,
          id: "r",
          markers: false,
        });
      }
    }

    /**
     * ======================================
     * 33.  blog details sticky
     * ======================================
     */
    if ($(".b-details").length > 0) {
      if (device_width >= 992) {
        const metaElement = document.querySelector(".b-details__content");
        const sidebarElement = document.querySelector(".b-details__sidebar");
        let nullPadding;

        if (device_width >= 1200) {
          nullPadding = 320;
        } else {
          nullPadding: 320;
        }

        ScrollTrigger.create({
          trigger: ".b-details",
          start: "top top",
          end: "bottom top+=" + (metaElement.clientHeight + nullPadding),
          pin: metaElement,
          pinSpacing: false,
          id: "e",
          markers: false,
        });

        ScrollTrigger.create({
          trigger: ".b-details",
          start: "top top",
          end: "bottom top+=" + (sidebarElement.clientHeight + nullPadding),
          pin: sidebarElement,
          pinSpacing: false,
          id: "f",
          markers: false,
        });
      }
    }

    /**
     * ======================================
     * 34.  shop sticky
     * ======================================
     */
    if ($(".shop").length > 0) {
      if (device_width >= 992) {
        const metaElement = document.querySelector(".shop__content");
        const sidebarElement = document.querySelector(".shop__sidebar");
        let nullPadding;

        if (device_width >= 992) {
          nullPadding = 320;
        } else {
          nullPadding: 320;
        }

        ScrollTrigger.create({
          trigger: ".shop",
          start: "top top",
          end: "bottom top+=" + (metaElement.clientHeight + nullPadding),
          pin: metaElement,
          pinSpacing: false,
          id: "e",
          markers: false,
        });

        ScrollTrigger.create({
          trigger: ".shop",
          start: "top top",
          end: "bottom top+=" + (sidebarElement.clientHeight + nullPadding),
          pin: sidebarElement,
          pinSpacing: false,
          id: "f",
          markers: false,
        });
      }
    }

    /**
     * ======================================
     * 35.  case details sticky
     * ======================================
     */
    if ($(".case-details__content").length > 0) {
      if (device_width >= 992) {
        const metaElement = document.querySelector(".case-d-content-left");
        const sidebarElement = document.querySelector(".case-d-content-right");
        let nullPadding;

        if (device_width >= 1200) {
          nullPadding = 0;
        } else {
          nullPadding: 0;
        }

        ScrollTrigger.create({
          trigger: ".case-details__content",
          start: "top top+=180px",
          end: "bottom top+=" + (metaElement.clientHeight + 180),
          pin: metaElement,
          pinSpacing: false,
          id: "e",
          markers: false,
        });

        ScrollTrigger.create({
          trigger: ".case-details__content",
          start: "top top",
          end: "bottom top+=" + (sidebarElement.clientHeight + nullPadding),
          pin: sidebarElement,
          pinSpacing: false,
          id: "f",
          markers: false,
        });
      }
    }

    /**
     * ======================================
     * 36. image reveal animation
     * ======================================
     */
    if ($(".reveal-img").length > 0) {
      gsap.utils.toArray(".reveal-img").forEach((el) => {
        gsap.to(el, {
          scrollTrigger: {
            trigger: el,
            start: "top 80%",
            markers: false,
            onEnter: () => {
              el.classList.add("reveal-img-active");
            },
          },
        });
      });
    }

    /**
     * ======================================
     * 37. parallax image effects
     * ======================================
     */
    // Отключаем parallax эффекты для максимальной производительности
    // if ($(".parallax-img").length > 0) {
    //   if (device_width >= 1200) {
    //     gsap.utils.toArray(".parallax-img").forEach((el) => {
    //       var tl = gsap.timeline({
    //         scrollTrigger: {
    //           trigger: el,
    //           start: "center center",
    //           end: "+=40%",
    //           scrub: 1,
    //           pin: false,
    //           invalidateOnRefresh: true,
    //         },
    //       });
    //       tl.to(el, {
    //         y: "60px",
    //         zIndex: "-1",
    //         opacity: 0.5,
    //         duration: 2,
    //       });
    //     });
    //   }
    // }

    /**
     * ======================================
     * 38. appear down
     * ======================================
     */
    $(".appear-down").each(function () {
      const section = $(this);
      gsap.fromTo(
        section,
        {
          scale: 0.8,
          opacity: 0,
        },
        {
          scale: 1,
          opacity: 1,
          duration: 1.5,
          scrollTrigger: {
            trigger: section[0],
            scrub: 1,
            start: "top bottom",
            end: "bottom center",
            markers: false,
          },
        }
      );
    });

    /**
     * ======================================
     * 39. service horizontal move
     * ======================================
     */
    if ($(".service-slider-wrapper").length > 0) {
      let container = document.querySelector(".service-slider-wrapper");
      let mainTimeline;
      let itemTimelines = [];
    
      function updateTimeline() {
        if (window.innerWidth >= 992) {
          if (!mainTimeline) {
            mainTimeline = gsap.timeline({
              scrollTrigger: {
                trigger: container,
                scrub: 1,
                pin: true,
                start: "center center",
              },
            });
          } else {
            mainTimeline.clear();
          }
    
          mainTimeline.to(container, {
            x:
              -(container.scrollWidth - document.documentElement.clientWidth) +
              "px",
            ease: "none",
            duration: 1,
          });
    
          itemTimelines.forEach((itemTimeline) => {
            itemTimeline.clear();
            itemTimeline.to(itemTimeline.target, {
              y: 100,
              scrollTrigger: {
                trigger: container,
                scrub: 1,
                start: "center center",
                toggleActions: "play none none reverse",
                end: () => container.offsetWidth - 100,
                markers: true,
              },
            });
          });
    
          ScrollTrigger.refresh();
        } else {
          if (mainTimeline) {
            mainTimeline.scrollTrigger.kill(true);
            mainTimeline = null;
          }
          itemTimelines.forEach((itemTimeline) => itemTimeline.clear());
        }
      }
    
      updateTimeline();
    
      window.addEventListener("resize", function () {
        updateTimeline();
      });
    }

    /**
     * ======================================
     * 40. title animation
     * ======================================
     */
    if ($(".title-animation").length > 0 && performanceConfig.animations.splitText) {
      let char_come = gsap.utils.toArray(".title-animation");
      char_come.forEach((char_come) => {
        if (!window.GSAPManager.shouldAnimate(char_come)) return;

        let split_char = new SplitText(char_come, {
          type: "chars, words",
          lineThreshold: 0.5,
        });

        // Используем GSAPManager для создания оптимизированного таймлайна
        const { timeline } = window.GSAPManager.createOptimizedTimeline(char_come, {
          start: "top 90%",
          end: "bottom 60%",
          scrub: performanceConfig.gsap.scrub,
          markers: false,
          toggleActions: performanceTier === 'low' ? "play none none none" : "play none none reverse",
        });

        timeline.from(split_char.chars, {
          duration: performanceConfig.gsap.duration * 0.2,
          x: 10,
          autoAlpha: 0,
          stagger: performanceConfig.gsap.stagger * 2,
          ease: performanceConfig.gsap.ease,
        });
      });
    } else if ($(".title-animation").length > 0 && !performanceConfig.animations.splitText) {
      // Для низкой производительности просто показываем текст без анимации
      $(".title-animation").css({
        opacity: 1,
        transform: 'none'
      });
    }

    /**
     * ======================================
     * 41. fade top gsap animation
     * ======================================
     */
    if ($(".fade-wrapper").length > 0 && performanceConfig.animations.fadeIn) {
      $(".fade-wrapper").each(function () {
        var section = $(this);
        var fadeItems = section.find(".fade-top");

        fadeItems.each(function (index, element) {
          if (!window.GSAPManager.shouldAnimate(element)) return;

          var delay = index * performanceConfig.gsap.stagger;

          // Используем GSAPManager для создания оптимизированного ScrollTrigger
          window.GSAPManager.setScrollTrigger(element, {
            start: "top 90%",
            end: "bottom 20%",
            scrub: performanceConfig.gsap.scrub,
            onEnter: function () {
              window.GSAPManager.animate(element, {
                opacity: 1,
                y: 0
              }, {
                duration: performanceConfig.gsap.duration,
                delay: delay,
                ease: performanceConfig.gsap.ease,
              });
            },
            once: performanceTier === 'low', // Одноразовые анимации для слабых устройств
          });
        });
      });
    } else if ($(".fade-wrapper").length > 0 && !performanceConfig.animations.fadeIn) {
      // Для низкой производительности просто показываем элементы
      $(".fade-top").css({
        opacity: 1,
        transform: 'none'
      });
    }

    /**
     * ======================================
     * 42. slide top gsap animation
     * ======================================
     */
    $(".slide-top").each(function () {
      const section = $(this);
      gsap.fromTo(
        section,
        {
          scale: 0.8,
          opacity: 0,
          y: 140,
        },
        {
          scale: 1,
          opacity: 1,
          duration: 1,
          y: 0,
          scrollTrigger: {
            trigger: section[0],
            scrub: false,
            start: "top bottom",
            end: "bottom center",
            markers: false,
          },
        }
      );
    });

    /**
     * ======================================
     * 43. footer image animation
     * ======================================
     */
    if ($(".footer").length > 0) {
      if (device_width >= 768) {
        var tl = gsap.timeline({
          scrollTrigger: {
            trigger: ".footer",
            start: "top center",
            end: "+=40%",
            scrub: 0.5,
            pin: false,
          },
        });
        tl.to(".footer__content .light-title span", {
          "--opacity": 1,
          "--transformY": 0,
          duration: 3,
        });
        tl.to(".footer-thumb-one img", {
          transform: "rotate(-24deg)",
          x: "0px",
          opacity: 1,
          duration: 3,
        });
       tl.to(".footer-thumb-two img", {
          x: "+=190",          
          y: "-=150",
          opacity: 1,
          duration: 3,
        });
      }
    }

    /**
     * ======================================
     * 44. vanilla tilt animation
     * ======================================
     */
    let topylotilt = document.querySelectorAll(".topy-tilt");

    if (topylotilt && performanceConfig.tilt.enabled) {
      VanillaTilt.init(document.querySelectorAll(".topy-tilt"), {
        max: performanceConfig.tilt.max,
        speed: performanceConfig.tilt.speed,
        scale: performanceConfig.tilt.scale,
      });
    }

    /**
     * ======================================
     * Resource preloading for sections
     * ======================================
     */
    // Предзагрузка ресурсов для баннерной секции (временно отключена для диагностики)
    /*
    if ($("#top").length > 0) {
      window.ResourceManager.preloadSection('banner', [
        'assets/images/banner/banner-one-bg.webp?v=1',
        'assets/images/banner/large-slider/one.webp?v=1',
        'assets/images/banner/large-slider/two.webp?v=1',
        'assets/images/banner/large-slider/three.webp?v=1',
        'assets/images/banner/large-slider/four.webp?v=1',
        'assets/images/banner/large-slider/five.webp?v=1',
        'assets/images/banner/large-slider/six.webp?v=1'
      ]);
    }

    // Предзагрузка ресурсов для секции "О НАС"
    if ($("#about").length > 0) {
      window.ResourceManager.preloadSection('about', [
        'assets/images/craft-thumb.webp?v=1'
      ]);
    }

    // Предзагрузка ресурсов для секции "ЧТО МЫ ДЕЛАЕМ"
    if ($("#product").length > 0) {
      window.ResourceManager.preloadSection('product', [
        'assets/images/tools-thumb.webp?v=1'
      ]);
    }

    // Предзагрузка ресурсов для секции "КАК ЭТО РАБОТАЕТ"
    if ($(".gen").length > 0) {
      window.ResourceManager.preloadSection('gen', [
        'assets/images/gen-hero.webp?v=1',
        'assets/images/gen-thumb.webp?v=1'
      ]);
    }
    */

    console.log('🎯 All managers initialized and resources preloaded');
  });
})(jQuery);
