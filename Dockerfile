FROM swr.cn-north-4.myhuaweicloud.com/pixiu-public/905655347/golang:1.25-alpine AS backend-builder
WORKDIR /build/backend
COPY backend/go.mod backend/go.sum ./
RUN export GOPROXY=https://goproxy.cn/ && go mod download
COPY backend/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/server ./cmd/server

FROM swr.cn-north-4.myhuaweicloud.com/pixiu-public/905655347/node:20-alpine	 AS frontend-builder
WORKDIR /build/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
ARG FRONTEND_VITE_API_URL=/api
ENV VITE_API_URL=$FRONTEND_VITE_API_URL
RUN npm run build

FROM swr.cn-north-4.myhuaweicloud.com/pixiu-public/905655347/node:20-alpine	 AS admin-builder
WORKDIR /build/frontend-admin
COPY frontend-admin/package*.json ./
RUN npm ci
COPY frontend-admin/ ./
ARG ADMIN_VITE_API_URL=/api
ENV VITE_API_URL=$ADMIN_VITE_API_URL
RUN npm run build

FROM swr.cn-north-4.myhuaweicloud.com/pixiu-public/905655347/alpine:3.20
RUN apk --no-cache add ca-certificates tzdata nginx
ENV TZ=Asia/Shanghai
WORKDIR /app

COPY --from=backend-builder /out/server /app/server
COPY --from=frontend-builder /build/frontend/dist /usr/share/nginx/html/frontend
COPY --from=admin-builder /build/frontend-admin/dist /usr/share/nginx/html/frontend-admin
COPY deploy/nginx/ssl/frontend /etc/nginx/ssl/frontend
COPY deploy/nginx/ssl /etc/nginx/ssl
COPY deploy/nginx/default.conf /etc/nginx/http.d/default.conf
COPY deploy/start-app.sh /app/start-app.sh

RUN chmod +x /app/start-app.sh && \
    mkdir -p /run/nginx /var/lib/nginx/tmp /var/log/nginx

EXPOSE 80
EXPOSE 443
CMD ["/app/start-app.sh"]