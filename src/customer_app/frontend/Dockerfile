FROM node:18-alpine AS build
WORKDIR /usr/src/app
COPY package.json package-lock.json* ./
RUN npm install && npm cache clean --force
COPY . .
RUN npm run build

FROM nginx:1.25-alpine
COPY --from=build /usr/src/app/dist /usr/share/nginx/html
EXPOSE 5173
CMD ["nginx", "-g", "daemon off;"]
