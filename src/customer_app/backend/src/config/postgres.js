import pg from "pg";

const { Pool } = pg;

let pool;
let poolPromise;
let loyaltyPool;  // separate pool for loyalty DB

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

export const closeTrustPool = async () => {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
};

const buildConnectionString = () => {
  const direct = process.env.POSTGRES_DWH_CONN;
  if (direct) {
    return direct;
  }

  const user = process.env.POSTGRES_DWH_USER || "dwh_user";
  const password = process.env.POSTGRES_DWH_PASSWORD || "dwh_password";
  const host = process.env.POSTGRES_DWH_HOST || "postgres_dw";
  const port = process.env.POSTGRES_DWH_PORT || "5432";
  const database = process.env.POSTGRES_DWH_DB || "datamart";

  return `postgresql://${user}:${password}@${host}:${port}/${database}`;
};

export const getLoyaltyPool = () => {
  if (!loyaltyPool) {
    const connectionString = buildConnectionString();
    const sslEnabled = process.env.POSTGRES_DWH_SSL === "true";
    const poolConfig = { connectionString };

    if (sslEnabled) {
      poolConfig.ssl = { rejectUnauthorized: false };
    }

    loyaltyPool = new Pool(poolConfig);
    loyaltyPool.on("error", (error) => {
      console.error("Postgres loyalty pool error", error);
    });
  }

  return loyaltyPool;
};

const { Pool } = require("pg");

const DEFAULT_CONFIG = {
  host: process.env.PGHOST || process.env.POSTGRES_HOST || "postgres_dw",
  port: Number(process.env.PGPORT || process.env.POSTGRES_PORT || 5432),
  database: process.env.PGDATABASE || process.env.POSTGRES_DB || "datamart",
  user: process.env.PGUSER || process.env.POSTGRES_USER || "dwh_user",
  password: process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD || "dwh_password",
  ssl:
    process.env.PGSSL === "true" || process.env.POSTGRES_SSL === "true"
      ? { rejectUnauthorized: false }
      : false,
  max: Number(process.env.PGPOOL_SIZE || 10),
  idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT || 30_000),
  connectionTimeoutMillis: Number(process.env.PG_CONNECTION_TIMEOUT || 5000)
};

const pools = new Map();

const createPool = (key, overrides = {}) => {
  const normalizedKey = key || "default";
  if (pools.has(normalizedKey)) {
    return pools.get(normalizedKey);
  }

  const pool = new Pool({
    ...DEFAULT_CONFIG,
    ...overrides
  });

  pool.on("error", (error) => {
    console.error(`[postgres:${normalizedKey}] unexpected error`, error);
  });

  pools.set(normalizedKey, pool);
  return pool;
};

const getPool = () => createPool("default");

const getLoyaltyPool = () =>
  createPool("loyalty", {
    database: process.env.LOYALTY_DB || process.env.PGDATABASE || DEFAULT_CONFIG.database,
    user: process.env.LOYALTY_DB_USER || process.env.PGUSER || DEFAULT_CONFIG.user,
    password: process.env.LOYALTY_DB_PASSWORD || process.env.PGPASSWORD || DEFAULT_CONFIG.password
  });

const getAnalyticsPool = () =>
  createPool("analytics", {
    database: process.env.ANALYTICS_DB || DEFAULT_CONFIG.database
  });

const withConnection = async (callback, pool = getPool()) => {
  const client = await pool.connect();
  try {
    return await callback(client);
  } finally {
    client.release();
  }
};

const closePools = async () => {
  const promises = [];
  for (const [key, pool] of pools.entries()) {
    promises.push(
      pool
        .end()
        .catch((error) => console.error(`[postgres:${key}] graceful shutdown failed`, error))
        .finally(() => pools.delete(key))
    );
  }
  await Promise.all(promises);
};

module.exports = {
  DEFAULT_CONFIG,
  getPool,
  getLoyaltyPool,
  getAnalyticsPool,
  withConnection,
  closePools
};
