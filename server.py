from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse, HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
import os
import time
import uvicorn
from image_service import generate_image_async, save_image, list_images

app = FastAPI(title="Neuroevent AI Image Generator")

# Добавляем сжатие GZip для всех ответов
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Добавляем CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # В продакшене лучше указать конкретные домены
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Монтируем статические файлы
app.mount("/assets", StaticFiles(directory="Neuroevent 3/assets"), name="assets")
app.mount("/generated_images", StaticFiles(directory="generated_images"), name="generated_images")

def get_demo_page():
    """Вспомогательная функция для получения demo.html"""
    try:
        with open("Neuroevent 3/demo.html", "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return "<h1>Demo</h1><p>Демо страница не найдена</p>"

@app.get("/", response_class=HTMLResponse)
async def home():
    """Главная страница - перенаправление на demo.html"""
    return HTMLResponse(get_demo_page())

@app.get("/demo.html", response_class=HTMLResponse)
async def demo_html():
    """Демо страница"""
    return HTMLResponse(get_demo_page())

@app.get("/api/test")
async def api_test():
    """Тестовый API endpoint"""
    return JSONResponse({"message": "API работает"})

@app.post("/api/generate")
async def api_generate(request: Request):
    """API для генерации изображений через Gemini 2.5 Flash Image Preview API"""
    try:
        # Проверяем тип контента
        content_type = request.headers.get('content-type', '')

        if 'multipart/form-data' in content_type:
            # Обработка FormData (новый алгоритм с изображениями)
            form = await request.form()
            prompt = form.get("prompt")
            width = int(form.get("width", 1024)) if form.get("width") else 1024
            height = int(form.get("height", 1024)) if form.get("height") else 1024
            reference_image = form.get("reference_image")  # base64 референсное изображение
            timestamp = form.get("timestamp")

            print(f"🖼️ Получен запрос с референсным изображением. Timestamp: {timestamp}")
            print(f"📝 Промпт: {prompt[:100]}...")
            print(f"📐 Размер: {width}x{height}")

        elif 'application/json' in content_type:
            # Обработка JSON (старый формат)
            data = await request.json()
            prompt = data.get("prompt")
            width = data.get("width", 1024)
            height = data.get("height", 1024)
            reference_image = None

        else:
            return JSONResponse({"error": "Unsupported content type"}, status_code=400)

        if not prompt:
            return JSONResponse({"error": "Prompt is required"}, status_code=400)

        if len(prompt.strip()) < 3:
            return JSONResponse({"error": "Prompt must be at least 3 characters long"}, status_code=400)

        if len(prompt.strip()) > 4000:
            return JSONResponse({"error": "Prompt must be less than 4000 characters"}, status_code=400)

        # Если есть референсное изображение, улучшаем промпт
        if reference_image:
            enhanced_prompt = f"Измени это изображение, добавив: {prompt}. Сохрани композицию, цветовую палитру и художественные элементы из исходного изображения, но добавь новые элементы согласно промпту."
            print(f"🎨 Улучшенный промпт для референсного изображения: {enhanced_prompt[:150]}...")
            print(f"📸 Референсное изображение будет отправлено в Gemini API")
        else:
            enhanced_prompt = prompt

        # Генерируем изображение через Gemini API
        # Передаем референсное изображение напрямую в API
        result = await generate_image_async(enhanced_prompt, width or 1024, height or 1024, reference_image)

        if "error" in result:
            return JSONResponse({"error": result["error"]}, status_code=400)

        response_data = {
            "success": True,
            "image_b64": result["image_b64"],
            "model": result["model"],
            "generation_time": result["generation_time"],
            "prompt": prompt,
            "enhanced_prompt": enhanced_prompt if reference_image else None,
            "reference_image_used": reference_image is not None
        }

        print(f"✅ Изображение сгенерировано успешно. Референсное изображение использовано: {reference_image is not None}")

        return JSONResponse(response_data)

    except Exception as e:
        print(f"❌ Error in API generate: {e}")
        return JSONResponse({"error": f"Internal server error: {str(e)}"}, status_code=500)

@app.post("/api/save_image")
async def api_save_image(request: Request):
    """API для сохранения изображений"""
    try:
        import base64
        from PIL import Image
        import io

        data = await request.json()
        image_b64 = data.get("image_b64")
        prompt = data.get("prompt", "Unknown prompt")
        width = data.get("width", 1024)
        height = data.get("height", 1024)

        if not image_b64:
            return JSONResponse({"error": "No image data provided"}, status_code=400)

        # Убираем префикс data:image/png;base64, если он есть
        if image_b64.startswith('data:image'):
            image_b64 = image_b64.split(',')[1]

        # Декодируем base64
        try:
            image_data = base64.b64decode(image_b64)
        except Exception as e:
            return JSONResponse({"error": f"Invalid base64 data: {str(e)}"}, status_code=400)

        # Создаем уникальное имя файла
        filename = f"generated_{int(time.time())}.png"
        filepath = os.path.join("generated_images", filename)

        # Сохраняем изображение
        try:
            # Открываем изображение с помощью PIL для обработки
            with Image.open(io.BytesIO(image_data)) as img:
                # Конвертируем в RGB если нужно
                if img.mode != 'RGB':
                    img = img.convert('RGB')

                # Сохраняем как PNG
                img.save(filepath, 'PNG')
                actual_width, actual_height = img.size

        except Exception as e:
            # Если PIL не может обработать, сохраняем как есть
            with open(filepath, 'wb') as f:
                f.write(image_data)
            actual_width, actual_height = width, height

        # Получаем размер файла
        file_size = os.path.getsize(filepath)

        return JSONResponse({
            "success": True,
            "filename": filename,
            "width": actual_width,
            "height": actual_height,
            "model": "Neuroevent Demo",
            "generation_time": 0,
            "file_size": file_size,
            "prompt": prompt,
            "created": time.strftime("%Y-%m-%dT%H:%M:%S")
        })

    except Exception as e:
        return JSONResponse({"error": f"Error saving image: {str(e)}"}, status_code=500)

@app.get("/api/images")
async def api_list_images():
    """API для получения списка изображений"""
    # Mock список изображений для тестирования
    return JSONResponse({
        "images": [
            {
                "filename": "test_image.png",
                "size": 1000,
                "width": 512,
                "height": 512,
                "prompt": "Test image",
                "model": "Test Model",
                "generation_time": 0,
                "created": "2025-01-01T00:00:00"
            }
        ]
    })

@app.get("/api/generated_images/{filename}")
async def api_serve_image(filename: str):
    """Отдает изображение по имени файла"""
    try:
        filepath = os.path.join("generated_images", filename)
        if os.path.exists(filepath):
            return FileResponse(filepath)
        else:
            raise HTTPException(status_code=404, detail="Image not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error serving image: {str(e)}")

@app.get("/api/download/{filename}")
async def api_download_image(filename: str):
    """Скачивание изображения"""
    try:
        filepath = os.path.join("generated_images", filename)
        if os.path.exists(filepath):
            return FileResponse(
                filepath,
                media_type='application/octet-stream',
                filename=filename
            )
        else:
            raise HTTPException(status_code=404, detail="File not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error downloading image: {str(e)}")

if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 8002))  # Используем свободный порт 8002 по умолчанию
    print(f"🚀 Запуск Neuroevent веб-сервиса на порту {port}...")
    print(f"📱 Откройте браузер: http://localhost:{port}")
    print(f"🎨 API доступно по адресу: http://localhost:{port}/api/")
    uvicorn.run(app, host="0.0.0.0", port=port)
