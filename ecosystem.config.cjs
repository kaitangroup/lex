module.exports = {
  apps: [
    {
      name: 'lex',
      script: './dist/index.cjs',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 4004,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 4004,
      },
      error_file: '/var/log/lex/error.log',
      out_file: '/var/log/lex/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
