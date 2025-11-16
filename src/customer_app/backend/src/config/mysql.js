const mysql = require("mysql2/promise");
const { logError, logInfo } = require("../utils/logger");

const DEFAULT_CONFIG = {
  host: process.env.MYSQL_HOST || process.env.ORDER_DB_HOST || "mysql",
  port: Number(process.env.MYSQL_PORT || process.env.ORDER_DB_PORT || 3306),
  user: process.env.MYSQL_USER || process.env.ORDER_DB_USER || "root",
  password: process.env.MYSQL_PASSWORD || process.env.ORDER_DB_PASSWORD || "password",
  database: process.env.MYSQL_DATABASE || process.env.ORDER_DB_NAME || "ccd_store",
  waitForConnections: true,
  connectionLimit: Number(process.env.MYSQL_POOL_SIZE || 10),
  queueLimit: 0
};

let pool;

const getOrderPool = () => {
  if (!pool) {
    pool = mysql.createPool(DEFAULT_CONFIG);
    logInfo("mysql order pool initialised", {
      host: DEFAULT_CONFIG.host,
      database: DEFAULT_CONFIG.database
    });
    pool.on("error", (error) => {
      logError("mysql pool error", { error: error.message });
    });
  }
  return pool;
};

const closeOrderPool = async () => {
  if (pool) {
    try {
      await pool.end();
      logInfo("mysql order pool closed");
    } catch (error) {
      logError("mysql pool close failed", { error: error.message });
    } finally {
      pool = undefined;
    }
  }
};

module.exports = {
  getOrderPool,
  closeOrderPool
};
