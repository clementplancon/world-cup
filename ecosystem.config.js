module.exports = {
  apps: [{
    name: "world-cup-data",
    script: "./server.js",
    cwd: "/opt/world-cup-data",
    instances: 1, // état SSE en mémoire — ne jamais clusteriser sans pub/sub partagé
    autorestart: true,
    max_restarts: 20,
    min_uptime: "10s",
    restart_delay: 3000,
    watch: false,
    out_file: "./logs/out.log",
    error_file: "./logs/error.log",
    time: true,
  }]
};
