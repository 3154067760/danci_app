# danci-app 部署文档

本文档说明在 **Windows 本地** 与 **Linux 服务器** 上部署、常驻运行及更新的完整流程。

---

## 1. 环境要求

| 项目 | 版本建议 |
|------|----------|
| Node.js | 18.x 或 20.x LTS |
| npm | 9+ |
| 操作系统 | Windows 10+ / Ubuntu 20.04+ / CentOS 7+ |
| 内存 | ≥ 512 MB（推荐 1 GB） |
| 磁盘 | ≥ 500 MB（含 node_modules、词库资源） |

可选：

- **PM2**：Linux / Windows 生产环境进程守护
- **Nginx**：反向代理、HTTPS、域名访问

---

## 2. 部署模式说明

| 模式 | 命令 | 端口 | 适用 |
|------|------|------|------|
| 开发 | `npm run dev` | 5173 | 本地调试、热更新 |
| 生产 | `npm run build` + `npm run start` | 3002 | 服务器长期运行 |

> **重要**：本应用依赖 Vite 的 `local-data` 插件提供文件读写 API（添加单词、批量导入、同步发音等）。  
> **不能**仅把 `dist/` 丢到 Nginx 静态目录——那样只能只读，无法写入词库。  
> 生产环境请使用 **`npm run start`（vite preview）** 或 PM2 托管该命令。

---

## 3. Windows 本地部署

### 3.1 首次启动（开发）

```powershell
cd C:\Users\31540\Desktop\project\study\danci_app
npm install
npm run dev
```

浏览器访问：http://localhost:5173

### 3.2 本地生产模式

```powershell
npm install
npm run build
npm run start
```

访问：http://localhost:3002

### 3.3 常见问题（Windows）

| 错误 | 处理 |
|------|------|
| `tsc: Permission denied` | 执行 `npm install`；或 `chmod` 不适用，删除 `node_modules` 后重装 |
| 端口占用 | 修改 `vite.config.ts` 中 `preview.port` |
| 脚本无法执行 | PowerShell 执行策略：`Set-ExecutionPolicy RemoteSigned -Scope CurrentUser` |

---

## 4. Linux 服务器部署

以下以目录 `/var/www/danci_app`、用户 `admin`、端口 **3002** 为例。

### 4.1 上传代码

```bash
# 方式一：git clone
git clone <你的仓库地址> /var/www/danci_app

# 方式二：本地上传 zip 后解压
cd /var/www/danci_app
```

### 4.2 安装与构建

```bash
cd /var/www/danci_app
npm install
npm run build
```

构建成功后会生成 `dist/`，并将 `data/local/` 同步到 `public/local/`。

### 4.3 使用 PM2 常驻运行

**首次启动**（无 ecosystem 文件时）：

```bash
pm2 start npm --name danci-app -- run start
pm2 save
```

**使用项目内配置**（需已上传 `ecosystem.config.cjs`）：

```bash
pm2 start ecosystem.config.cjs
pm2 save
```

**开机自启**（执行 `pm2 startup` 输出的 sudo 命令）：

```bash
pm2 startup
# 复制输出的 sudo env PATH=... 命令并执行
pm2 save
```

### 4.4 PM2 常用命令

```bash
pm2 status              # 查看状态，应为 online
pm2 logs danci-app      # 查看日志
pm2 restart danci-app   # 重启
pm2 stop danci-app      # 停止
pm2 delete danci-app    # 移除进程
```

### 4.5 防火墙 / 安全组

在云控制台或系统防火墙中放行 **TCP 3002**（或你修改后的端口）。

```bash
# Ubuntu ufw 示例
sudo ufw allow 3002/tcp
```

访问：`http://<公网IP>:3002`

---

## 5. Nginx 反向代理（可选）

将 80/443 转发到本机 3002，便于使用域名与 HTTPS。

```nginx
server {
    listen 80;
    server_name your-domain.com;

    client_max_body_size 50M;   # 批量导入 Excel + 图片需要较大 body

    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

HTTPS 可使用 Certbot / 云厂商 SSL 证书，此处不赘述。

---

## 6. 端口配置

修改端口需同时改两处：

**`vite.config.ts`**

```ts
preview: {
  host: true,
  port: 3002,  // 改成你的端口
},
```

**`package.json`**

```json
"start": "npx vite preview --host 0.0.0.0 --port 3002"
```

修改后：

```bash
npm run build
pm2 restart danci-app
```

并更新防火墙规则。

| 用途 | 配置文件 | 默认端口 |
|------|----------|----------|
| 开发 | `server.port` | 5173 |
| 生产 | `preview.port` + `npm run start` | 3002 |

---

## 7. 更新部署流程

代码或词库更新后：

```bash
cd /var/www/danci_app
git pull                    # 或重新上传文件
npm install                 # 依赖有变更时
npm run build
pm2 restart danci-app
```

仅更新词库文件（entries.json、图片）且未改前端代码时，可只重启 PM2；若改了 `src/`，必须重新 `build`。

---

## 8. 数据与备份

部署后以下目录包含业务数据，**升级或迁移服务器前请备份**：

```
data/local/                              # 用户数据
src/data/offlineDictionary/entries.json  # 内置词库
data/dictionary/import.csv               # 词库 CSV
public/dictionary/images/                # 配图（唯一存储）
public/dictionary/audio/                 # 发音
data/dictionary/image-inbox/             # 待同步配图（可选）
```

恢复时原路径覆盖即可，然后 `pm2 restart danci-app`。

---

## 9. 部署检查清单

- [ ] Node.js 已安装（`node -v`）
- [ ] `npm install` 无报错
- [ ] `npm run build` 成功
- [ ] PM2 状态 `online`
- [ ] 防火墙 / 安全组已放行端口
- [ ] 浏览器可打开首页
- [ ] 「我的」页词库维护可用（API 正常）
- [ ] 批量导入测试通过
- [ ] `pm2 save` + `pm2 startup` 已配置（服务器）

---

## 10. 故障排查

| 现象 | 排查 |
|------|------|
| 无法访问 | `pm2 status`、`pm2 logs`；`curl http://127.0.0.1:3002` |
| 502（Nginx） | 确认 3002 进程在线；检查 proxy_pass |
| 批量导入失败 | 必须 PM2 跑 `npm run start`，非纯静态 |
| build 失败 tsc | `rm -rf node_modules && npm install` |
| PM2 找不到进程 | 用 `pm2 start npm --name danci-app -- run start` 首次启动 |
| ecosystem 找不到 | 上传 `ecosystem.config.cjs` 或直接用 npm 命令 |
| 导入后词库不更新 | 确认 `/api/local-data/entries` 可访问；刷新页面 |

---

## 11. 架构示意

```
                    ┌─────────────────┐
  浏览器 / 手机 ──► │  Nginx :80      │（可选）
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ vite preview    │
                    │ PM2 :3002       │
                    │ + local-data API│
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
  data/local/*.json   entries.json      public/dictionary/
  （用户数据）         （词库）           （图片、音频）
```

---

## 12. 相关文档

- [技术文档](./TECHNICAL.md) — 架构、API、脚本说明  
- [操作文档](./OPERATION.md) — 功能使用与词库维护
