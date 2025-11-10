const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Функция для рекурсивного поиска изображений, которые еще не конвертированы в WebP
function findImagesNeedingConversion(dir, extensions = ['.jpg', '.jpeg', '.png']) {
  let results = [];
  const list = fs.readdirSync(dir);

  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat && stat.isDirectory()) {
      // Пропускаем node_modules и другие служебные папки
      if (!['node_modules', '.git', 'generated_images', 'optimized_images'].includes(file)) {
        results = results.concat(findImagesNeedingConversion(filePath, extensions));
      }
    } else {
      const ext = path.extname(file).toLowerCase();
      if (extensions.includes(ext)) {
        const webpPath = filePath.replace(/\.(jpg|jpeg|png)$/i, '.webp');
        // Проверяем, существует ли WebP файл и имеет ли он размер > 0
        if (!fs.existsSync(webpPath) || fs.statSync(webpPath).size === 0) {
          results.push(filePath);
        }
      }
    }
  });

  return results;
}

// Функция для конвертации изображения в WebP
function convertToWebP(inputPath) {
  const outputPath = inputPath.replace(/\.(jpg|jpeg|png)$/i, '.webp');

  try {
    // Конвертируем с качеством 85 (хороший баланс между размером и качеством)
    execSync(`cwebp -q 85 "${inputPath}" -o "${outputPath}"`, { stdio: 'inherit' });

    const originalSize = fs.statSync(inputPath).size;
    const webpSize = fs.statSync(outputPath).size;
    const savings = ((1 - webpSize / originalSize) * 100).toFixed(1);

    console.log(`✅ Converted: ${path.basename(inputPath)} → ${path.basename(outputPath)} (${savings}% smaller)`);
    return outputPath;
  } catch (error) {
    console.error(`❌ Error converting ${inputPath}:`, error.message);
    return null;
  }
}

// Основная функция
function main() {
  console.log('🔄 Starting WebP conversion fix...\n');

  // Находим все изображения в assets/images, которые нужно конвертировать
  const imagesDir = path.join(__dirname, 'assets', 'images');

  if (!fs.existsSync(imagesDir)) {
    console.error(`❌ Directory ${imagesDir} not found!`);
    process.exit(1);
  }

  const images = findImagesNeedingConversion(imagesDir);
  console.log(`📸 Found ${images.length} images needing conversion\n`);

  if (images.length === 0) {
    console.log('🎉 All images are already converted!');
    return;
  }

  let converted = 0;
  let errors = 0;

  images.forEach(imagePath => {
    const result = convertToWebP(imagePath);
    if (result) {
      converted++;
    } else {
      errors++;
    }
  });

  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Converted: ${converted}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`\n🎉 WebP conversion fix complete!`);
}

main();

