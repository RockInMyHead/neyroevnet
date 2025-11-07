import React, { useState, useCallback, useEffect } from 'react';
import { ImageSlider } from './ImageSlider';
import { ImageGenerator } from './ImageGenerator';

export const NeuroDemo: React.FC = () => {
  const [generationStatus, setGenerationStatus] = useState('Отправить идеи');
  const [isStarted, setIsStarted] = useState(false);
  const [images, setImages] = useState<string[]>([
    '/assets/images/photo_2025-10-28 02.57.15.jpeg',
    '/assets/images/photo_2025-10-28 02.57.19.jpeg',
    '/assets/images/photo_2025-10-28 02.57.22.jpeg',
    '/assets/images/photo_2025-10-28 02.57.25.jpeg',
    '/assets/images/photo_2025-10-28 02.57.27.jpeg',
    '/assets/images/photo_2025-10-28 02.57.30.jpeg',
    '/assets/images/photo_2025-10-28 02.57.33.jpeg',
    '/assets/images/photo_2025-10-28 02.57.35.jpeg',
    '/assets/images/photo_2025-10-28 02.57.38.jpeg'
  ]);

  // Обработчик генерации изображения
  const handleImageGenerated = useCallback((imageUrl: string) => {
    console.log('🎯 Image generated, updating slider:', imageUrl);

    // Добавляем новое изображение в массив (или заменяем текущее)
    setImages(prevImages => {
      const newImages = [...prevImages];
      // Заменяем первое изображение на сгенерированное
      newImages[0] = imageUrl;
      return newImages;
    });

    // Через некоторое время возвращаем оригинальное изображение
    setTimeout(() => {
      setImages(prevImages => {
        const resetImages = [...prevImages];
        resetImages[0] = '/assets/images/photo_2025-10-28 02.57.15.jpeg';
        return resetImages;
      });
    }, 20000); // Через 20 секунд возвращаем оригинал
  }, []);

  // Запуск демо
  const startExperience = useCallback(() => {
    if (isStarted) return;

    setIsStarted(true);
    console.log('🎬 Starting Neuroevent experience');

    // Запуск фоновой музыки
    const bgMusic = document.getElementById('bg-music') as HTMLAudioElement;
    if (bgMusic) {
      bgMusic.play().catch(e => {
        console.log('Не удалось автоматически запустить музыку:', e);
        alert('Нажмите на страницу, чтобы запустить музыку');
      });
    }

    // Здесь можно добавить дополнительные эффекты запуска
  }, [isStarted]);

  // Инициализация при монтировании
  useEffect(() => {
    const startBtn = document.getElementById('fcMail');
    if (startBtn) {
      startBtn.addEventListener('click', startExperience);
      return () => startBtn.removeEventListener('click', startExperience);
    }
  }, [startExperience]);

  return (
    <div className="neuro-demo">
      {/* Левый блок - слайдер изображений */}
      <div className="col-12 col-lg-7">
        <div className="video-s__content">
          <div className="ratio ne-ratio-4x3 ne-framed-item">
            <ImageSlider
              images={images}
              onImageGenerated={handleImageGenerated}
            />
          </div>
        </div>
      </div>

      {/* Правый блок - генератор изображений */}
      <div className="col-12 col-lg-5">
        <div className="footer-contactcard ne-sticky-right ne-framed-item">
          <p className="fc-lead">
            ИИ подхватит вашу мысль и превратит её в визуальный образ уже в следующем кадре. Готовы? Нажмите <span className="text-primary">«Начать»</span>. Хотите изменить сюжет — напишите пару фраз и жмите <span className="text-primary">«Отправить идеи»</span>.
          </p>

          <div className="footer-contactcard__grid">
            <ImageGenerator
              onImageGenerated={handleImageGenerated}
              onStatusChange={setGenerationStatus}
            />

            <div className="status-display">
              <p className="status-text">{generationStatus}</p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .neuro-demo {
          display: flex;
          flex-wrap: wrap;
          gap: 2rem;
          align-items: flex-start;
        }

        .status-display {
          text-align: center;
          margin-top: 20px;
          padding: 10px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
        }

        .status-text {
          color: #007bff;
          font-weight: 500;
          margin: 0;
        }

        @media (max-width: 991px) {
          .neuro-demo {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};
