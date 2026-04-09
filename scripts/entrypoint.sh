#!/bin/sh
set -e

echo "Running migrations..."
node -e "
const { drizzle } = require('drizzle-orm/mysql2');
const { migrate } = require('drizzle-orm/mysql2/migrator');
const mysql = require('mysql2/promise');

(async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
  });
  const db = drizzle(connection);
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('Migration complete.');
  await connection.end();
})();
"

echo "Starting server..."
exec node server.js
