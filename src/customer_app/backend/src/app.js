const express = require("express");
const morgan = require("morgan");
const routes = require("./routes");
const { authenticateOptionalUser } = require("./middleware/auth");
const { errorHandler } = require("./middleware/errorHandler");

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use(morgan("tiny"));
  app.use(authenticateOptionalUser);

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api", routes);
  app.use(errorHandler);

  return app;
};

module.exports = {
  createApp
};
