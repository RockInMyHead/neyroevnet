import React, { useState, useEffect, useCallback } from 'react';

interface ImageSliderProps {
  images: string[];
  onImageGenerated?: (imageUrl: string) => void;
}

export const ImageSlider: React.FC<ImageSliderProps> = ({
  images,
  onImageGenerated
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [sliderInterval, setSliderInterval] = useState<NodeJS.Timeout | null>(null);

  // Функция для показа следующего изображения
  const showNextImage = useCallback(() => {
    setCurrentImageIndex(prevIndex => (prevIndex + 1) % images.length);
  }, [images.length]);

  // Запуск автоматической смены изображений
  const startSlider = useCallback(() => {
    if (sliderInterval) return;

    const interval = setInterval(showNextImage, 35000); // 35 секунд
    setSliderInterval(interval);
    console.log('▶️ Started automatic slider');
  }, [sliderInterval, showNextImage]);

  // Остановка слайдера
  const stopSlider = useCallback(() => {
    if (sliderInterval) {
      clearInterval(sliderInterval);
      setSliderInterval(null);
      console.log('⏸️ Stopped automatic slider');
    }
  }, [sliderInterval]);

  // Замена изображения на сгенерированное
  const replaceWithGeneratedImage = useCallback((imageUrl: string) => {
    console.log('🚀 Replacing current image with generated:', imageUrl);

    // Останавливаем слайдер на время загрузки
    stopSlider();

    // Создаем новый массив изображений с заменой текущего
    const newImages = [...images];
    newImages[currentImageIndex] = imageUrl;

    // В React мы можем обновить состояние, но для простоты
    // будем использовать прямое обновление через ref или callback
    if (onImageGenerated) {
      onImageGenerated(imageUrl);
    }

    // Перезапускаем слайдер через 15 секунд
    setTimeout(() => {
      startSlider();
    }, 15000);

    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 2000);
  }, [images, currentImageIndex, stopSlider, startSlider, onImageGenerated]);

  // Инициализация слайдера
  useEffect(() => {
    startSlider();
    return () => stopSlider();
  }, [startSlider, stopSlider]);

  // Экспортируем функции для внешнего использования
  useEffect(() => {
    (window as any).sliderAPI = {
      replaceWithGeneratedImage,
      startSlider,
      stopSlider
    };
  }, [replaceWithGeneratedImage, startSlider, stopSlider]);

  return (
    <div className="image-slider-container">
      {images.map((image, index) => (
        <img
          key={`${image}-${index}`}
          src={image}
          alt={`Slide ${index + 1}`}
          className={`slider-image ${index === currentImageIndex ? 'active' : ''} ${isAnimating ? 'generating' : ''}`}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: index === currentImageIndex ? 1 : 0,
            transition: 'opacity 1.5s ease-in-out, filter 1.5s ease-in-out',
            transform: index === 0 ? 'scale(1.0)' : 'scale(1.3)',
            animation: index === 0
              ? 'firstImageZoom 60s ease-in-out infinite'
              : 'zoomPulse 30s ease-in-out infinite'
          }}
        />
      ))}

      <style jsx>{`
        .slider-image.generating {
          filter: blur(2px);
          animation: none !important;
        }

        @keyframes zoomPulse {
          0%, 100% { transform: scale(1.3); }
          50% { transform: scale(1.35); }
        }

        @keyframes firstImageZoom {
          0% { transform: scale(1.0); }
          50% { transform: scale(1.3); }
          100% { transform: scale(1.35); }
        }
      `}</style>
    </div>
  );
};
