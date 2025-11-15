const http = require("http");
const { createApp } = require("./app");
const { closePools } = require("./config/postgres");
const { logInfo, logError } = require("./utils/logger");

const port = Number(process.env.PORT || 4000);
const app = createApp();

const server = http.createServer(app);

server.listen(port, () => {
  logInfo("customer app backend listening", { port });
});

const shutdown = async (signal) => {
  logInfo("received shutdown signal", { signal });
  server.close(async (error) => {
    if (error) {
      logError("error closing server", { error: error.message });
      process.exit(1);
    }
    await closePools();
    process.exit(0);
  });
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

module.exports = server;
