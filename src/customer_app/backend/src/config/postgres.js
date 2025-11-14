import { Pool } from "pg";

let loyaltyPool;

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
