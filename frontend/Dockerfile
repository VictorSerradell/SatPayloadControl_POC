FROM node:20-alpine AS builder
WORKDIR /app

ARG BACKEND_URL=https://satpayloadcontrolpoc-production.up.railway.app
ENV BACKEND_URL=${BACKEND_URL}

COPY package*.json ./
RUN npm ci
COPY . .

# Patch environment.prod.ts with the real backend URL before building
RUN echo "BACKEND_URL=${BACKEND_URL}" && \
    sed -i "s|apiUrl: '.*'|apiUrl: '${BACKEND_URL}/api/v1'|g" src/environments/environment.prod.ts && \
    sed -i "s|wsUrl: '.*'|wsUrl: '${BACKEND_URL}'|g" src/environments/environment.prod.ts && \
    cat src/environments/environment.prod.ts

RUN npm run build:prod

FROM nginx:alpine AS production
COPY --from=builder /app/dist/satpayloadcontrol/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
