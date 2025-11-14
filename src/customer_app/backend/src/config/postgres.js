import pg from "pg";

const { Pool } = pg;

let pool;
let poolPromise;

const resolveConfig = () => {
  const connectionString = process.env.POSTGRES_DWH_CONN;
  if (connectionString) {
    return {
      connectionString,
      max: Number(process.env.POSTGRES_DWH_POOL_SIZE || 5),
    };
  }

  const password = process.env.POSTGRES_DWH_PASSWORD;
  if (!password) {
    throw new Error(
      "POSTGRES_DWH_PASSWORD must be provided when POSTGRES_DWH_CONN is not set"
    );
  }

  return {
    host: process.env.POSTGRES_DWH_HOST || "localhost",
    port: Number(process.env.POSTGRES_DWH_PORT || 5432),
    user: process.env.POSTGRES_DWH_USER || "dwh_user",
    password,
    database: process.env.POSTGRES_DWH_DB || "datamart",
    max: Number(process.env.POSTGRES_DWH_POOL_SIZE || 5),
  };
};

export const initTrustPool = async () => {
  if (pool) {
    return pool;
  }

  if (poolPromise) {
    return poolPromise;
  }

  const config = resolveConfig();
  pool = new Pool(config);

  poolPromise = (async () => {
    try {
      const client = await pool.connect();
      client.release();
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

export const getTrustPool = async () => {
  const active = await initTrustPool();
  return active;
};

export const queryTrustDb = async (query, params = []) => {
  const active = await getTrustPool();
  return active.query(query, params);
};
