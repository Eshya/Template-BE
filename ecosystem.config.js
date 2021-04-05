module.exports = {
    apps: [{
      name: 'chikin',
      script: 'bin/www',
  
      // Options reference: https://pm2.io/doc/en/runtime/reference/ecosystem-file/
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env_development: {
        COMMON_VARIABLE: 'true',
        PORT: 3000,
        instances: 4,
        NODE_ENV: 'development',
        exec_mode: 'cluster_mode',
        watch: true,
      },
      env_production: {
        PORT: 3001,
        NODE_ENV: 'production',
        instances: 20,
        exec_mode: 'fork_mode',
        watch: false,
      },
    }],
  };
  