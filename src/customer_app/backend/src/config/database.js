import mysql from "mysql2/promise";

let pool;

export const initPool = () => {
  if (pool) {
    return pool;
  }

  pool = mysql.createPool({
    host: process.env.MYSQL_HOST || "localhost",
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || "ccd_user",
    password: process.env.MYSQL_PASSWORD || "ccd_password",
    database: process.env.MYSQL_DATABASE || "ccd_store",
    waitForConnections: true,
    connectionLimit: 10,
    timezone: "Z",
  });

  console.log("MySQL connection pool initialised");
  return pool;
};

export const getConnection = async () => {
  const activePool = initPool();
  return activePool.getConnection();
};
