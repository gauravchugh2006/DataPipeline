import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";

import { initPool } from "./config/database.js";
import { initTrustPool } from "./config/postgres.js";
import apiRouter from "./routes/index.js";
import { buildRequestMeta, logger } from "./utils/logger.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;
const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

app.use(helmet());
app.use(
  cors({
    origin: [frontendOrigin],
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", message: "Customer experience API is running" });
});

const startServer = async () => {
  try {
    logger.info("Initializing database connections");
    const [pool, trustPool] = await Promise.all([initPool(), initTrustPool()]);
    app.set("db", pool);
    app.set("trustDb", trustPool);

    app.use("/api", (req, res, next) => {
      req.db = pool;
      req.trustDb = trustPool;
      return apiRouter(req, res, next);
    });

    app.use((err, req, res, _next) => {
      if (!err.__logged) {
        logger.error("Unhandled error", {
          ...buildRequestMeta(req),
          error: err.message,
          stack: err.stack,
        });
      }

      const status = err.status || 500;
      const message = status >= 500 ? "Internal server error" : err.message;
      res.status(status).json({
        error: message,
      });
    });

    app.listen(port, () => {
      logger.info("Customer middleware API listening", { port });
    });
  } catch (error) {
    logger.error("Failed to start server", {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
};

startServer();
