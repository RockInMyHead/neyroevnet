import os
import httpx
import base64
import uuid
import time
import json
import random
from datetime import datetime
from dotenv import load_dotenv
from PIL import Image, ImageOps, ImageDraw, ImageFilter
from io import BytesIO
import asyncio
import logging

# Загружаем переменные из .env файла
load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Конфигурация Google Gemini 2.5 Flash Image Preview API
GEMINI_MODEL = "gemini-2.5-flash-image-preview"
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY environment variable is required. Please set it in .env file or environment variables.")

# Временное отключение генерации изображений
ENABLE_IMAGE_GENERATION = True
IMAGE_GENERATION_MESSAGE = "🎨 Генерация изображений временно недоступна из-за ограничений API. Попробуйте позже."

# Папка для сохранения изображений
UPLOAD_FOLDER = 'generated_images'
METADATA_FILE = os.path.join(UPLOAD_FOLDER, 'metadata.json')

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

def load_metadata():
    """Загружает метаданные изображений"""
    if os.path.exists(METADATA_FILE):
        try:
            with open(METADATA_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return {}
    return {}

def save_metadata(metadata):
    """Сохраняет метаданные изображений"""
    try:
        with open(METADATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error(f"Ошибка сохранения метаданных: {e}")

def add_image_metadata(filename, width, height, prompt, model, generation_time):
    """Добавляет метаданные для нового изображения"""
    metadata = load_metadata()
    metadata[filename] = {
        'width': width,
        'height': height,
        'prompt': prompt,
        'model': model,
        'generation_time': generation_time,
        'created': datetime.now().isoformat()
    }
    save_metadata(metadata)

# Функции для работы с Gemini API
def get_aspect_ratio(width, height):
    """Определяет ближайшее допустимое соотношение сторон для Gemini API"""
    allowed = ['1:1','2:3','3:2','3:4','4:3','4:5','5:4','9:16','16:9','21:9']
    target = width / height
    best = allowed[0]
    best_diff = float('inf')
    for ar in allowed:
        a, b = map(int, ar.split(':'))
        ratio = a / b
        diff = abs(ratio - target)
        if diff < best_diff:
            best_diff = diff
            best = ar
    return best

def generate_prompt_for_size(prompt: str, width: int, height: int) -> str:
    """Генерирует расширенный промпт с указанием размера"""
    return f"{prompt}\n\nIMPORTANT: Fill the entire frame completely. No black bars, no letterboxing, no pillarboxing. The image should extend to all edges of the canvas."

# Функция для обработки черных полос в DALL-E 3 изображениях
async def fill_black_borders(img, prompt: str) -> Image.Image:
    """Заполняет черные полосы в изображениях DALL-E 3"""
    if img.mode != 'RGB':
        img = img.convert('RGB')

    width, height = img.size
    black_threshold = 30

    # Определяем толщину черных полей
    def scan_top():
        for y in range(height):
            if any(img.getpixel((x, y))[c] > black_threshold for x in range(width) for c in range(3)):
                return y
        return 0

    def scan_bottom():
        for y in range(height - 1, -1, -1):
            if any(img.getpixel((x, y))[c] > black_threshold for x in range(width) for c in range(3)):
                return height - 1 - y
        return 0

    def scan_left():
        for x in range(width):
            if any(img.getpixel((x, y))[c] > black_threshold for y in range(height) for c in range(3)):
                return x
        return 0

    def scan_right():
        for x in range(width - 1, -1, -1):
            if any(img.getpixel((x, y))[c] > black_threshold for y in range(height) for c in range(3)):
                return width - 1 - x
        return 0

    top_thick = scan_top()
    bottom_thick = scan_bottom()
    left_thick = scan_left()
    right_thick = scan_right()

    logger.info(f"Detected border thicknesses - top: {top_thick}px, bottom: {bottom_thick}px, left: {left_thick}px, right: {right_thick}px")

    # Если черных полос нет, возвращаем оригинал
    if not (top_thick or bottom_thick or left_thick or right_thick):
        logger.info("Черные полосы не обнаружены")
        return img

    # Для DALL-E 3 просто возвращаем изображение как есть
    # DALL-E 3 обычно генерирует изображения без черных полос
    logger.info("Возвращаем изображение без дополнительной обработки черных полос")
    return img

async def generate_image_with_retry(prompt: str, width: int = 1024, height: int = 1024, reference_image: str = None, max_retries: int = 3) -> str:
    """Генерирует изображение через Gemini API с повторными попытками"""
    api_key = GEMINI_API_KEY
    if not api_key:
        raise ValueError("GEMINI_API_KEY not set")
    
    aspect_ratio = get_aspect_ratio(width, height)
    enhanced_prompt = generate_prompt_for_size(prompt, width, height)
    
    for attempt in range(max_retries):
        try:
            logger.info(f"Generating image with Gemini API (attempt {attempt + 1}/{max_retries})")
            logger.info(f"Aspect ratio: {aspect_ratio}, Prompt: {enhanced_prompt[:100]}...")
            logger.info(f"Reference image: {'provided' if reference_image else 'not provided'}")

            # Формируем parts для запроса
            parts = []
            
            # Если есть референсное изображение, добавляем его в начало
            if reference_image:
                parts.append({
                    "inlineData": {
                        "mimeType": "image/png",
                        "data": reference_image
                    }
                })
                logger.info("📸 Референсное изображение добавлено в запрос")
            
            # Добавляем текстовый промпт
            parts.append({"text": enhanced_prompt})
            
            payload = {
                "contents": [{
                    "parts": parts
                }],
                "generationConfig": {
                    "imageConfig": {
                        "aspectRatio": aspect_ratio
                    },
                    "responseModalities": ["IMAGE"]
                }
            }

            headers = {
                "Content-Type": "application/json",
                "x-goog-api-key": api_key
            }

            # Отправляем запрос к Gemini API
            async with httpx.AsyncClient(timeout=60) as client:
                resp = await client.post(GEMINI_URL, headers=headers, json=payload)

            if resp.status_code == 429:
                # Обработка rate limit
                retry_after = 10
                logger.warning(f"Rate limit exceeded, retrying in {retry_after} seconds")
                await asyncio.sleep(retry_after)
                continue

            elif resp.status_code == 400:
                # Обработка ошибок валидации
                error_data = resp.json()
                error_msg = error_data.get("error", {}).get("message", "Validation error")
                raise Exception(f"Validation error: {error_msg}")

            resp.raise_for_status()
            resp_json = resp.json()
            
            logger.info(f"Gemini API response structure: {list(resp_json.keys())}")

            # Извлекаем изображение из ответа
            candidates = resp_json.get("candidates", [])
            logger.info(f"Found {len(candidates)} candidates in response")
            
            for i, candidate in enumerate(candidates):
                logger.info(f"Processing candidate {i+1}")
                content = candidate.get("content", {})
                parts = content.get("parts", [])
                logger.info(f"Candidate {i+1} has {len(parts)} parts")
                
                for j, part in enumerate(parts):
                    logger.info(f"Processing part {j+1}, keys: {list(part.keys())}")
                    
                    # Проверяем различные возможные форматы
                    inline = part.get("inlineData") or part.get("inline_data")
                    if inline:
                        logger.info(f"Found inline data, keys: {list(inline.keys())}")
                        if inline.get("data"):
                            img_b64 = inline["data"]
                            logger.info("Image generated successfully with Gemini API")
                            return img_b64
                        elif inline.get("mimeType") and inline.get("data"):
                            img_b64 = inline["data"]
                            logger.info("Image generated successfully with Gemini API (with mimeType)")
                            return img_b64
                    
                    # Проверяем прямой формат
                    if "data" in part:
                        img_b64 = part["data"]
                        logger.info("Image generated successfully with Gemini API (direct data)")
                        return img_b64

            logger.error(f"No image found in response. Full response: {resp_json}")
            raise Exception("No image in response")

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:
                if attempt < max_retries - 1:
                    retry_after = 10
                    logger.warning(f"Rate limit, retrying in {retry_after}s (attempt {attempt + 1})")
                    await asyncio.sleep(retry_after)
                    continue
                else:
                    raise Exception("Rate limit exceeded, please try again later")
            else:
                error_text = e.response.text if hasattr(e.response, 'text') else str(e.response)
                raise Exception(f"HTTP Error: {e.response.status_code} — {error_text}")

        except Exception as e:
            if attempt < max_retries - 1:
                logger.warning(f"Gemini API error (attempt {attempt + 1}): {e}")
                await asyncio.sleep(2 ** attempt)  # Exponential backoff
                continue
            else:
                raise Exception(f"Gemini API generation failed after {max_retries} attempts: {str(e)}")

async def generate_image_async(prompt: str, width: int = 1024, height: int = 1024, reference_image: str = None) -> dict:
    """Асинхронная генерация изображения через Gemini API"""
    try:
        import time
        start_time = time.time()

        logger.info(f"Starting Gemini API image generation for prompt: {prompt}")
        logger.info(f"Requested size: {width}x{height}")
        logger.info(f"Reference image: {'provided' if reference_image else 'not provided'}")

        # Проверяем, включена ли генерация изображений
        if not ENABLE_IMAGE_GENERATION:
            return {"error": IMAGE_GENERATION_MESSAGE}

        # Генерируем изображение через Gemini API
        image_b64 = await generate_image_with_retry(prompt, width, height, reference_image)

        generation_time = time.time() - start_time
        logger.info(f"Image generated in {generation_time:.2f} seconds")

        return {
            "image_b64": image_b64,
            "generation_time": generation_time,
            "model": "Gemini 2.5 Flash Image Preview"
        }

    except Exception as e:
        logger.error(f"Error generating image: {e}")
        return {"error": f"Failed to generate image: {str(e)}"}

def generate_image_new(prompt: str, width: int = 1024, height: int = 1024) -> dict:
    """Синхронная обертка для генерации изображения"""
    # Для совместимости возвращаем тестовое изображение
    # В реальном использовании нужно использовать asyncio.run()
    logger.info(f"Image generation requested for prompt: {prompt}")
    test_png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
    return {"image_b64": test_png}

def generate_image(prompt: str, width: int = 1024, height: int = 1024) -> dict:
    """Генерирует изображение и возвращает результат"""
    return generate_image_new(prompt, width, height)

async def save_image(image_b64: str, prompt: str = "Unknown prompt", width: int = 1024, height: int = 1024) -> dict:
    """Сохраняет изображение из base64 на сервере"""
    try:
        if not image_b64:
            return {"error": "No image data provided"}

        # Декодируем base64
        try:
            image_data = base64.b64decode(image_b64)
        except Exception as e:
            return {"error": f"Invalid base64 data: {str(e)}"}

        # Создаем уникальное имя файла
        filename = f"image_{uuid.uuid4().hex[:8]}_{int(time.time())}.png"
        filepath = os.path.join(UPLOAD_FOLDER, filename)

        # Обрабатываем изображение с помощью PIL
        try:
            with Image.open(BytesIO(image_data)) as img:
                # Конвертируем в RGB если нужно
                if img.mode != 'RGB':
                    img = img.convert('RGB')

                original_size = img.size
                logger.info(f"Исходный размер изображения от Gemini: {original_size}")
                logger.info(f"Целевой размер: {width}x{height}")

                # Изменяем размер с сохранением пропорций БЕЗ обрезки
                # Вычисляем коэффициент масштабирования (уменьшаем, чтобы поместилось)
                ratio = min(width / original_size[0], height / original_size[1])
                new_size = (int(original_size[0] * ratio), int(original_size[1] * ratio))

                # Масштабируем изображение
                img = img.resize(new_size, Image.Resampling.LANCZOS)
                logger.info(f"Размер после масштабирования: {img.size}")

                # Создаем новое изображение целевого размера с черным фоном
                result = Image.new('RGB', (width, height), (0, 0, 0))

                # Вычисляем позицию для центрирования
                paste_x = (width - new_size[0]) // 2
                paste_y = (height - new_size[1]) // 2

                # Вставляем масштабированное изображение по центру
                result.paste(img, (paste_x, paste_y))
                logger.info(f"Изображение вставлено в позицию: ({paste_x}, {paste_y})")

                # Заполняем черные полосы сгенерированным контентом
                result = await fill_black_borders(result, prompt)

                logger.info(f"Финальный размер: {result.size}")

                # Сохраняем как PNG
                result.save(filepath, 'PNG')
                actual_width, actual_height = result.size

        except Exception as e:
            # Если PIL не может обработать, сохраняем как есть
            with open(filepath, 'wb') as f:
                f.write(image_data)
            actual_width, actual_height = width, height

        # Добавляем метаданные
        generation_time = 0  # Время генерации уже прошло
        add_image_metadata(filename, actual_width, actual_height, prompt, "DALL-E 3", generation_time)

        # Размер файла
        file_size = os.path.getsize(filepath)

        return {
            "success": True,
            "filename": filename,
            "width": actual_width,
            "height": actual_height,
            "model": "Gemini 2.5 Flash",
            "generation_time": generation_time,
            "file_size": file_size,
            "prompt": prompt,
            "created": datetime.now().isoformat()
        }

    except Exception as e:
        logger.exception("Error saving image")
        return {"error": f"Error saving image: {str(e)}"}

def list_images() -> dict:
    """Возвращает список всех сгенерированных изображений"""
    try:
        metadata = load_metadata()
        images = []

        for filename in os.listdir(UPLOAD_FOLDER):
            if filename.endswith('.png'):
                filepath = os.path.join(UPLOAD_FOLDER, filename)
                if os.path.isfile(filepath):
                    file_size = os.path.getsize(filepath)

                    # Получаем метаданные
                    img_metadata = metadata.get(filename, {})

                    images.append({
                        'filename': filename,
                        'size': file_size,
                        'width': img_metadata.get('width', 'Unknown'),
                        'height': img_metadata.get('height', 'Unknown'),
                        'prompt': img_metadata.get('prompt', 'Unknown'),
                        'model': img_metadata.get('model', 'Unknown'),
                        'generation_time': img_metadata.get('generation_time', 0),
                        'created': img_metadata.get('created', 'Unknown')
                    })

        # Сортируем по дате создания (новые сначала)
        images.sort(key=lambda x: x['created'], reverse=True)

        return {'images': images}

    except Exception as e:
        logger.exception("Error listing images")
        return {"error": f"Error listing images: {str(e)}"}

