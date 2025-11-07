const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function optimizeImages() {
  const inputDir = 'assets/images';
  const outputDir = 'optimized_images';

  console.log('🚀 Начинаю оптимизацию изображений с помощью ImageMagick...');

  try {
    // Создаем выходную директорию
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Получаем список изображений
    const imageFiles = getImageFiles(inputDir);
    console.log(`📁 Найдено ${imageFiles.length} изображений для оптимизации`);

    let processedCount = 0;
    let totalOriginalSize = 0;
    let totalOptimizedSize = 0;

    for (const imagePath of imageFiles) {
      const relativePath = path.relative(inputDir, imagePath);
      const outputPath = path.join(outputDir, relativePath);

      // Создаем поддиректории
      const outputDirPath = path.dirname(outputPath);
      if (!fs.existsSync(outputDirPath)) {
        fs.mkdirSync(outputDirPath, { recursive: true });
      }

      const originalSize = fs.statSync(imagePath).size;
      totalOriginalSize += originalSize;

      // Оптимизируем изображение
      const ext = path.extname(imagePath).toLowerCase();
      let command;

      if (ext === '.jpg' || ext === '.jpeg') {
        // Оптимизация JPEG
        command = `convert "${imagePath}" -strip -quality 80 -interlace Plane "${outputPath}"`;
      } else if (ext === '.png') {
        // Оптимизация PNG
        command = `convert "${imagePath}" -strip "${outputPath}"`;
      } else {
        // Копируем без изменений
        fs.copyFileSync(imagePath, outputPath);
        console.log(`📋 Скопирован: ${relativePath}`);
        continue;
      }

      try {
        execSync(command);
        const optimizedSize = fs.statSync(outputPath).size;
        totalOptimizedSize += optimizedSize;

        const compressionRatio = ((originalSize - optimizedSize) / originalSize * 100).toFixed(1);
        console.log(`✅ Оптимизирован: ${relativePath} (${formatBytes(originalSize)} → ${formatBytes(optimizedSize)}, -${compressionRatio}%)`);

        processedCount++;
      } catch (error) {
        console.error(`❌ Ошибка обработки ${relativePath}:`, error.message);
        // Копируем оригинал при ошибке
        fs.copyFileSync(imagePath, outputPath);
      }
    }

    console.log('\n🎉 Оптимизация завершена!');
    console.log(`📊 Файлов обработано: ${processedCount}`);
    console.log(`📁 Исходный размер: ${formatBytes(totalOriginalSize)}`);
    console.log(`📁 Оптимизированный размер: ${formatBytes(totalOptimizedSize)}`);
    console.log(`📊 Общее сжатие: ${(((totalOriginalSize - totalOptimizedSize) / totalOriginalSize) * 100).toFixed(1)}%`);

  } catch (error) {
    console.error('❌ Ошибка оптимизации:', error);
  }
}

function getImageFiles(dir) {
  const files = [];

  function scanDir(currentDir) {
    const items = fs.readdirSync(currentDir);

    for (const item of items) {
      const itemPath = path.join(currentDir, item);
      const stat = fs.statSync(itemPath);

      if (stat.isDirectory()) {
        // Пропускаем директории node_modules и .git
        if (item !== 'node_modules' && item !== '.git' && item !== '__pycache__') {
          scanDir(itemPath);
        }
      } else if (stat.isFile()) {
        const ext = path.extname(item).toLowerCase();
        if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
          files.push(itemPath);
        }
      }
    }
  }

  scanDir(dir);
  return files;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

optimizeImages();
