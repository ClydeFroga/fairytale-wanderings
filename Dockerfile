# Используем Node.js как базовый образ
FROM node:20-slim

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем файлы package.json и bun.lock
COPY package*.json bun.lock ./

# Устанавливаем зависимости
RUN npm install

# Копируем все файлы проекта
COPY . .

# Собираем клиентскую часть
WORKDIR /app/client
RUN npm run build

# Возвращаемся в корневую директорию
WORKDIR /app

# Открываем порты для клиента и сервера
EXPOSE 3000 4000

# Запускаем приложение
CMD ["npm", "start"]
