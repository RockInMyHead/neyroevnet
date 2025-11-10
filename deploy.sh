#!/bin/bash

# Neuroevent Deployment Script
# Использование: ./deploy.sh [dev|prod]

set -e

ENVIRONMENT=${1:-prod}
PROJECT_NAME="neuroevent"

echo "🚀 Начинаем развертывание Neuroevent ($ENVIRONMENT)..."

# Проверка наличия .env файла
if [ ! -f .env ]; then
    echo "❌ Файл .env не найден!"
    echo "Создайте .env файл на основе env-example.txt"
    exit 1
fi

# Проверка Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен!"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose не установлен!"
    exit 1
fi

# Сборка и запуск
echo "🔨 Собираем Docker образ..."
docker-compose build

echo "🛑 Останавливаем предыдущие контейнеры..."
docker-compose down

echo "▶️ Запускаем сервисы..."
if [ "$ENVIRONMENT" = "prod" ]; then
    # Продакшн с Nginx
    docker-compose --profile nginx up -d
    echo "✅ Приложение запущено на порту 80 (с Nginx)"
else
    # Разработка без Nginx
    docker-compose up -d neuroevent
    echo "✅ Приложение запущено на порту 8002 (без Nginx)"
fi

# Ожидание запуска
echo "⏳ Ждем запуска сервисов..."
sleep 10

# Проверка здоровья
echo "🔍 Проверяем здоровье сервисов..."
if curl -f http://localhost:8002/api/test &>/dev/null; then
    echo "✅ API работает корректно!"
    echo ""
    echo "🌐 Доступ к приложению:"
    if [ "$ENVIRONMENT" = "prod" ]; then
        echo "  - Главная: http://localhost"
        echo "  - API: http://localhost/api/"
    else
        echo "  - Главная: http://localhost:8002"
        echo "  - API: http://localhost:8002/api/"
    fi
else
    echo "❌ API недоступен. Проверьте логи:"
    echo "  docker-compose logs"
    exit 1
fi

echo ""
echo "📋 Управление:"
echo "  Просмотр логов: docker-compose logs -f"
echo "  Остановка: docker-compose down"
echo "  Перезапуск: docker-compose restart"

echo ""
echo "🎉 Развертывание завершено успешно!"
