# NemoToken 服务器部署指南

## 环境要求

- Linux 服务器（Ubuntu 22.04+ / Debian 11+ 推荐）
- Docker 和 Docker Compose
- Node.js 18+（仅构建前端时需要）
- 域名 `nemotoken.fun` 已解析到服务器 IP

---

## 一、服务器准备

### 安装 Docker

```bash
curl -fsSL https://get.docker.com | bash
sudo systemctl enable docker
```

### 安装 Node.js（构建前端用）

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash
sudo apt install -y nodejs
```

---

## 二、下载项目

```bash
git clone https://github.com/nemo-code/nemotoken.git
cd nemotoken
```

---

## 三、配置环境变量

复制环境变量模板：

```bash
cp deploy/.env.nemotoken.example deploy/.env
```

`.env.nemotoken.example` 文件已经预填了生成的密钥，复制即可用：

```env
# 数据库密码
POSTGRES_PASSWORD=f1f5159b3cff86c10b69e6a3905d9d5f

# 管理员账号
ADMIN_EMAIL=admin@nemotoken.fun
ADMIN_PASSWORD=admin123456

# JWT 密钥
JWT_SECRET=f065304b2812c7619bbba56bcbc1d4668d51a40e623b1e296ea6c20771d688e6

# TOTP 加密密钥
TOTP_ENCRYPTION_KEY=44a770a7da185ad3707a98d6f97f0fb8181d9d14a288f3e853909dadfa281057

# 域名
SERVER_FRONTEND_URL=https://nemotoken.fun

# 监听端口
WEB_PORT=80
```

> 以上密钥已预生成，可直接部署使用。如需更换，在服务器上运行：
> ```bash
> POSTGRES_PASSWORD=$(openssl rand -hex 16)
> ADMIN_PASSWORD=你的密码
> JWT_SECRET=$(openssl rand -hex 32)
> TOTP_ENCRYPTION_KEY=$(openssl rand -hex 32)
> ```

---

## 四、配置域名

Nginx 配置已预填域名 `nemotoken.fun`，无需额外修改。

文件位置：`deploy/nginx-nemotoken.conf`

---

## 五、构建前端

```bash
npm install
npm run build
```

构建产物会输出到 `dist/` 目录，Docker Compose 会自动挂载到 Nginx 容器中。

---

## 六、启动服务

```bash
docker compose -f deploy/docker-compose.nemotoken.yml up -d
```

查看启动日志：

```bash
docker compose -f deploy/docker-compose.nemotoken.yml logs -f
```

确认服务状态：

```bash
docker compose -f deploy/docker-compose.nemotoken.yml ps
```

应该看到 4 个容器均在运行：

- `nemotoken-web` — Nginx 前端
- `nemotoken-backend` — Go 后端 API
- `nemotoken-postgres` — PostgreSQL 数据库
- `nemotoken-redis` — Redis 缓存

---

## 七、配置 SSL（HTTPS）

### 方式一：Caddy（推荐，自动 SSL）

安装 Caddy：

```bash
sudo apt install -y debian-keyring debian-archive-keyring
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

创建 `/etc/caddy/Caddyfile`：

```caddyfile
nemotoken.fun {
    reverse_proxy localhost:80
}
```

重启 Caddy：

```bash
sudo systemctl restart caddy
```

Caddy 会自动申请和续期 SSL 证书。

### 方式二：Nginx + certbot

安装 Nginx 和 certbot：

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

创建 `/etc/nginx/sites-enabled/nemotoken`：

```nginx
server {
    listen 80;
    server_name nemotoken.fun www.nemotoken.fun;

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

申请证书并自动配置 HTTPS：

```bash
sudo certbot --nginx -d nemotoken.fun -d www.nemotoken.fun
```

---

## 八、常用运维命令

```bash
# 查看日志
docker compose -f deploy/docker-compose.nemotoken.yml logs -f

# 重启服务
docker compose -f deploy/docker-compose.nemotoken.yml restart

# 更新服务（拉取最新代码后重新构建）
git pull
npm install && npm run build
docker compose -f deploy/docker-compose.nemotoken.yml up -d --build

# 停止服务
docker compose -f deploy/docker-compose.nemotoken.yml down

# 清理数据（会删除数据库和 Redis 数据）
docker compose -f deploy/docker-compose.nemotoken.yml down -v
```

---

## 九、访问

启动并配置好 SSL 后，浏览器打开 `https://nemotoken.fun` 即可访问。

首次启动会自动创建管理员账号：
- 邮箱：`admin@nemotoken.fun`
- 密码：`admin123456`
