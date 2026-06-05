/** PM2 进程配置：npm run build 后执行 pm2 start ecosystem.config.cjs */
module.exports = {
  apps: [
    {
      name: 'danci-app',
      script: 'npm',
      args: 'run start',
      cwd: './',
      env: {
        NODE_ENV: 'production',
      },
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
    },
  ],
}
