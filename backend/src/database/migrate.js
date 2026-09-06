'use strict';

/**
 * Migratsiya skripti: `npm run db:migrate`
 * `--force` bayrog'i bilan barcha jadvallarni o'chirib, noldan yaratadi.
 */

const fs = require('node:fs');
const path = require('node:path');

require('../config/default').assertConfig();
const db = require('./connection');
const logger = require('../utils/logger');

const FORCE = process.argv.includes('--force');

const DROP_SQL = `
  DROP TABLE IF EXISTS order_status_history CASCADE;
  DROP TABLE IF EXISTS order_items          CASCADE;
  DROP TABLE IF EXISTS orders               CASCADE;
  DROP TABLE IF EXISTS products             CASCADE;
  DROP TABLE IF EXISTS categories           CASCADE;
  DROP TABLE IF EXISTS stories              CASCADE;
  DROP TABLE IF EXISTS users                CASCADE;
  DROP TYPE  IF EXISTS order_status         CASCADE;
  DROP SEQUENCE IF EXISTS order_public_no_seq;
`;

async function main() {
  await db.healthCheck();

  if (FORCE) {
    logger.warn('--force: mavjud jadvallar o’chirilmoqda...');
    await db.query(DROP_SQL);
  }

  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await db.query(sql);

  const { rows } = await db.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' ORDER BY table_name`
  );

  logger.info('Migratsiya yakunlandi', { tables: rows.map((r) => r.table_name) });
}

main()
  .then(() => db.close())
  .then(() => process.exit(0))
  .catch(async (err) => {
    logger.error('Migratsiya muvaffaqiyatsiz', err);
    await db.close().catch(() => {});
    process.exit(1);
  });
