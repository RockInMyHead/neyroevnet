import React, { useState, useCallback } from 'react';

interface ImageGeneratorProps {
  onImageGenerated: (imageUrl: string) => void;
  onStatusChange: (status: string) => void;
}

export const ImageGenerator: React.FC<ImageGeneratorProps> = ({
  onImageGenerated,
  onStatusChange
}) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [maxAttempts] = useState(3);

  const generateImage = useCallback(async (attemptNumber: number = 1) => {
    if (!prompt.trim()) {
      alert('Пожалуйста, введите описание изображения');
      return;
    }

    if (attemptNumber > maxAttempts) {
      onStatusChange('Ошибка: превышено количество попыток');
      setIsGenerating(false);
      return;
    }

    try {
      onStatusChange(`Генерация изображения (попытка ${attemptNumber}/${maxAttempts})...`);
      console.log(`🎨 Starting image generation, attempt ${attemptNumber}/${maxAttempts}`);

      // Отправляем запрос на генерацию изображения
      const generateResponse = await fetch('http://localhost:8002/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          max_attempts: maxAttempts
        }),
      });

      if (!generateResponse.ok) {
        throw new Error(`HTTP ${generateResponse.status}: ${generateResponse.statusText}`);
      }

      const generateData = await generateResponse.json();
      console.log('Изображение сгенерировано:', generateData);

      if (generateData.success && generateData.image_b64) {
        onStatusChange('Сохранение изображения...');

        // Сохраняем изображение
        const saveResponse = await fetch('http://localhost:8002/api/save_image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image_b64: generateData.image_b64,
            filename: generateData.filename || `generated_${Date.now()}.png`,
            model: generateData.model || 'Neuroevent Demo'
          }),
        });

        if (!saveResponse.ok) {
          throw new Error(`Save failed: HTTP ${saveResponse.status}`);
        }

        const saveData = await saveResponse.json();
        console.log('Изображение сохранено:', saveData);

        if (saveData.success) {
          const newImageUrl = `http://localhost:8002/generated_images/${saveData.filename}`;
          console.log('Новое изображение:', newImageUrl);

          // Уведомляем родительский компонент
          onImageGenerated(newImageUrl);
          onStatusChange('Изображение готово!');

          setPrompt('');
          setIsGenerating(false);
        } else {
          throw new Error('Save response indicates failure');
        }
      } else {
        throw new Error(generateData.error || 'Generation failed');
      }

    } catch (error) {
      console.error('Ошибка генерации:', error);

      if (attemptNumber < maxAttempts) {
        console.log(`Повторная попытка через 2 секунды...`);
        onStatusChange(`Ошибка, повторная попытка (${attemptNumber + 1}/${maxAttempts})...`);
        setTimeout(() => generateImage(attemptNumber + 1), 2000);
      } else {
        onStatusChange('Ошибка генерации изображения');
        setIsGenerating(false);
        alert(`Не удалось сгенерировать изображение: ${error.message}`);
      }
    }
  }, [prompt, maxAttempts, onImageGenerated, onStatusChange]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!isGenerating) {
      setIsGenerating(true);
      generateImage();
    }
  }, [isGenerating, generateImage]);

  return (
    <div className="image-generator">
      <form onSubmit={handleSubmit} className="generator-form">
        <div className="input-group">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Опишите желаемое изображение..."
            disabled={isGenerating}
            className="prompt-input"
          />
          <button
            type="submit"
            disabled={isGenerating || !prompt.trim()}
            className="generate-btn"
          >
            {isGenerating ? 'Генерация...' : 'Отправить идеи'}
          </button>
        </div>
      </form>

      <style jsx>{`
        .generator-form {
          max-width: 600px;
          margin: 0 auto;
        }

        .input-group {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
        }

        .prompt-input {
          flex: 1;
          padding: 12px 16px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-size: 16px;
          transition: border-color 0.3s ease;
        }

        .prompt-input:focus {
          outline: none;
          border-color: #007bff;
        }

        .prompt-input:disabled {
          background-color: #f8f9fa;
          cursor: not-allowed;
        }

        .generate-btn {
          padding: 12px 24px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .generate-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .generate-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
      `}</style>
    </div>
  );
};
