module.exports = {
  apps: [
    {
      name: 'furry-drama-backend',
      script: 'src/index.js',
      cwd: '/var/www/furry-drama-tracker/backend',
      env: {
        NODE_ENV: 'production',
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      max_memory_restart: '512M',
    },
  ],
};
