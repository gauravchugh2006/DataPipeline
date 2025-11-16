import { buildRequestMeta, logger } from "./logger.js";

export const asyncHandler = (handler) => {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch((error) => {
      logger.error("Request handler failed", {
        ...buildRequestMeta(req),
        error: error.message,
        stack: error.stack,
      });
      // flag to avoid duplicate logging in the global error handler
      Object.defineProperty(error, "__logged", {
        value: true,
        enumerable: false,
        configurable: true,
        writable: true,
      });
      next(error);
    });
  };
};
