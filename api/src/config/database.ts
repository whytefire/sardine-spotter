import sql from "mssql";

function getConfig(): sql.config {
  // DB_SERVER may be "hostname,port" (Azure format) or just "hostname"
  const rawServer = process.env.DB_SERVER || "localhost";
  const [server, portStr] = rawServer.split(",");
  const port = portStr ? parseInt(portStr, 10) : 1433;

  const isAzure = server.includes("database.windows.net");

  console.log(`DB config: server=${server}, port=${port}, db=${process.env.DB_NAME}`);
  return {
    server,
    port,
    database: process.env.DB_NAME || "SardineWatch",
    user: process.env.DB_USER || undefined,
    password: process.env.DB_PASSWORD || undefined,
    options: {
      encrypt: isAzure,
      trustServerCertificate: !isAzure,
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
