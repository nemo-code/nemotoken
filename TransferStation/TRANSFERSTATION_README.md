# TransferStation

这是基于开源项目 `Wei-Shaw/sub2api` 二开的 AI API 中转站项目，已将默认站点品牌从 `Sub2API` 改为 `TransferStation`，并加入新的默认 logo。

## 已改动

- 默认站点名：`TransferStation`
- 默认页面标题：`TransferStation - AI API Gateway`
- 首页、登录/注册、安装向导、管理后台默认品牌文案
- TOTP issuer、邮件/支付默认产品名、服务日志里的品牌名
- 默认 logo：`frontend/public/logo.svg`

## 前端验证

```bash
cd frontend
corepack pnpm install --frozen-lockfile
corepack pnpm exec vite build
```

构建产物会输出到：

```text
backend/internal/web/dist
```

## 本地完整运行

这个项目是完整后端 + 前端的一体化中转站，需要 PostgreSQL、Redis 和 Go 环境，或直接使用 Docker Compose。

推荐先走 Docker 开发配置：

```bash
cd deploy
cp .env.example .env
docker compose -f docker-compose.dev.yml up -d
```

启动后查看初始化管理员密码：

```bash
docker compose -f docker-compose.dev.yml logs -f sub2api
```

如果使用源码方式运行，需要先安装 Go，然后在 `backend` 目录编译/运行；前端已经可以单独构建并嵌入后端。

## 后续配置

首次启动后进入安装向导，配置数据库、管理员账号、上游账号池、渠道、分组、API Key、计费与支付。站点名和 logo 也可以在后台系统设置里继续修改。
