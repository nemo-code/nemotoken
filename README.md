# NemoToken 中转站部署项目

这是 NemoToken 中转站的可部署项目包，已经包含当前前端构建产物、后端源码和 Docker 部署配置。服务器拉取本仓库后，可以直接通过 Docker Compose 启动前后端、PostgreSQL 和 Redis。

## 目录说明

- `dist/`：当前已构建好的 NemoToken 前端，由 Nginx 直接托管。
- `TransferStation/`：后端源码和前端源码，Docker 会从这里构建后端服务。
- `deploy/docker-compose.nemotoken.yml`：生产部署用 Compose 文件。
- `deploy/nginx-nemotoken.conf`：Nginx 前端和 API 反向代理配置。
- `deploy/.env.nemotoken.example`：环境变量模板。真实 `.env` 不要提交到 GitHub。

## 服务器要求

- 已安装 Docker 和 Docker Compose。
- 服务器安全组/防火墙放行 `80` 端口；如果后续配置 HTTPS，也需要放行 `443`。
- 域名 DNS 已解析到服务器公网 IP。

## 快速部署

```bash
git clone https://github.com/nemo-code/nemotoken-station.git
cd nemotoken-station

cp deploy/.env.nemotoken.example deploy/.env.nemotoken
nano deploy/.env.nemotoken

docker compose -f deploy/docker-compose.nemotoken.yml --env-file deploy/.env.nemotoken up -d --build
```

启动后访问：

- 前端：`http://你的域名/`
- 健康检查：`http://你的域名/health`

## 必改配置

编辑 `deploy/.env.nemotoken`：

```env
SERVER_FRONTEND_URL=https://你的域名
ADMIN_EMAIL=你的管理员邮箱
ADMIN_PASSWORD=你的管理员密码
POSTGRES_PASSWORD=强密码
JWT_SECRET=32字节以上随机字符串
TOTP_ENCRYPTION_KEY=32字节以上随机字符串
```

可以用下面命令生成随机密钥：

```bash
openssl rand -hex 32
```

同时把 `deploy/nginx-nemotoken.conf` 里的：

```nginx
server_name nemotoken.online www.nemotoken.online;
```

改成你自己的域名，例如：

```nginx
server_name example.com www.example.com;
```

## 登录方式

管理员账号来自 `deploy/.env.nemotoken`：

- 邮箱：`ADMIN_EMAIL`
- 密码：`ADMIN_PASSWORD`

首次启动时后端会自动初始化管理员账号。改过管理员密码后，需要重启服务：

```bash
docker compose -f deploy/docker-compose.nemotoken.yml --env-file deploy/.env.nemotoken up -d --build
```

## 常用命令

查看服务状态：

```bash
docker compose -f deploy/docker-compose.nemotoken.yml --env-file deploy/.env.nemotoken ps
```

查看日志：

```bash
docker compose -f deploy/docker-compose.nemotoken.yml --env-file deploy/.env.nemotoken logs -f
```

重新构建并启动：

```bash
docker compose -f deploy/docker-compose.nemotoken.yml --env-file deploy/.env.nemotoken up -d --build
```

停止服务：

```bash
docker compose -f deploy/docker-compose.nemotoken.yml --env-file deploy/.env.nemotoken down
```

## 注意事项

- 不要提交 `deploy/.env.nemotoken`，里面有数据库密码、管理员密码和 JWT 密钥。
- 不要提交 `deploy/data/`、`deploy/postgres_data/`、`deploy/redis_data/`，这些是服务器运行数据。
- 如果要启用 HTTPS，建议在服务器上用 Nginx Proxy Manager、宝塔面板或 Caddy/Certbot 给域名签发证书，再反向代理到本项目。
