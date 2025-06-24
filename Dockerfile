# Step 1: Build the app
FROM node:20-alpine AS builder
WORKDIR /app

# Only copy what we need for install/build
COPY package*.json ./
RUN npm ci

# Copy source code and build
COPY . .
RUN npm run build

# Step 2: Serve with nginx
FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html

# Optional: custom nginx config (if needed)
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
