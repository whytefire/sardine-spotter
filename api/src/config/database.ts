import sql from "mssql";

function getConfig(): sql.config {
  console.log(`DB config: server=${process.env.DB_SERVER}, db=${process.env.DB_NAME}`);
  return {
    server: process.env.DB_SERVER || "localhost",
    database: process.env.DB_NAME || "SardineSpotter",
    user: process.env.DB_USER || undefined,
    password: process.env.DB_PASSWORD || undefined,
    options: {
      encrypt: false,
      trustServerCertificate: true,
      trustedConnection: process.env.DB_TRUSTED_CONNECTION === "true",
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  };
}

let pool: sql.ConnectionPool | null = null;

export async function getPool(): Promise<sql.ConnectionPool> {
  if (!pool) {
    pool = await sql.connect(getConfig());
    console.log("Connected to SQL Server");
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.close();
    pool = null;
  }
}

export default sql;
