import fs from "fs/promises";
import path from "path";
import mysql from "mysql2/promise";
import { fileURLToPath } from "url";

let pool;
let poolPromise;

const ensureDatabase = async (dbPool) => {
  const databaseName = process.env.MYSQL_DATABASE || "ccd_store";
  const [rows] = await dbPool.query(
    `SELECT COUNT(*) AS tableCount
     FROM information_schema.tables
     WHERE table_schema = ? AND table_name = 'customers'`,
    [databaseName]
  );

  if (rows[0]?.tableCount) {
    return;
  }

  const currentFile = fileURLToPath(import.meta.url);
  const currentDir = path.dirname(currentFile);
  const initSqlPath = path.resolve(currentDir, "../../sql/init.sql");
  const initScript = await fs.readFile(initSqlPath, "utf-8");

  await dbPool.query(initScript);
  console.log("Database schema bootstrapped from sql/init.sql");
};

export const initPool = async () => {
  if (pool) {
    return pool;
  }

  if (poolPromise) {
    return poolPromise;
  }

  pool = mysql.createPool({
    host: process.env.MYSQL_HOST || "localhost",
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || "ccd_user",
    password: process.env.MYSQL_PASSWORD || "ccd_password",
    database: process.env.MYSQL_DATABASE || "ccd_store",
    waitForConnections: true,
    connectionLimit: 10,
    multipleStatements: true,
    timezone: "Z",
  });

  console.log("MySQL connection pool initialised");

  poolPromise = (async () => {
    try {
      await ensureDatabase(pool);
      return pool;
    } catch (error) {
      pool = undefined;
      throw error;
    } finally {
      poolPromise = undefined;
    }
  })();

  return poolPromise;
};

export const getConnection = async () => {
  const activePool = await initPool();
  return activePool.getConnection();
};
