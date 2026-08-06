module.exports = {
  apps: [
    {
      name: "theartistpost",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3013",
      cwd: "/var/www/theartistpost",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "768M",
      env: {
        NODE_ENV: "production",
        PORT: 3013,
      },
    },
  ],
};
