FROM node:8-alpine

# Создать директорию app
WORKDIR /

# Установить зависимости приложения
# Используется символ подстановки для копирования как package.json, так и package-lock.json,
# работает с npm@5+
COPY package*.json ./
COPY yarn*.lock ./

RUN yarn install

# Скопировать исходники приложения
COPY . /

EXPOSE 3030
CMD [ "yarn", "start:docker" ]
