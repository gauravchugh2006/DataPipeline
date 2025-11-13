import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";

import { initPool } from "./config/database.js";
import apiRouter from "./routes/index.js";

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
    const pool = await initPool();
    app.set("db", pool);

    app.use("/api", (req, res, next) => {
      req.db = pool;
      return apiRouter(req, res, next);
    });

    app.use((err, _req, res, _next) => {
      console.error("Unhandled error", err);
      const status = err.status || 500;
      res.status(status).json({
        error: err.message || "Internal server error",
      });
    });

    app.listen(port, () => {
      console.log(`Customer middleware API listening on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to start server", error);
    process.exit(1);
  }
};

startServer();
