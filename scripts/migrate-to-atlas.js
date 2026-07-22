/**
 * One-off: copy all collections from local MongoDB to Atlas.
 * Usage: node scripts/migrate-to-atlas.js
 *
 * Reads LOCAL_MONGODB_URI (default localhost/carehub) and MONGODB_URI from .env (Atlas).
 */
require('dotenv').config();
const { MongoClient } = require('mongodb');

const LOCAL_URI =
  process.env.LOCAL_MONGODB_URI || 'mongodb://127.0.0.1:27017/carehub';
const ATLAS_URI = process.env.MONGODB_URI;

if (!ATLAS_URI || ATLAS_URI.includes('localhost') || ATLAS_URI.includes('127.0.0.1')) {
  console.error('MONGODB_URI must point to Atlas in .env before running this script.');
  process.exit(1);
}

const dbNameFromUri = (uri) => {
  try {
    const path = new URL(uri.replace('mongodb+srv://', 'https://').replace('mongodb://', 'http://'))
      .pathname.replace(/^\//, '');
    return path.split('?')[0] || 'carehub';
  } catch {
    return 'carehub';
  }
};

async function copyCollection(sourceDb, targetDb, name) {
  const docs = await sourceDb.collection(name).find({}).toArray();
  if (!docs.length) {
    console.log(`  - ${name}: 0 docs (skipped)`);
    return { name, count: 0 };
  }

  await targetDb.collection(name).deleteMany({});
  // Preserve _id; insert in batches
  const batchSize = 500;
  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = docs.slice(i, i + batchSize);
    await targetDb.collection(name).insertMany(batch, { ordered: false });
  }
  console.log(`  - ${name}: ${docs.length} docs`);
  return { name, count: docs.length };
}

async function migrate() {
  const localDbName = dbNameFromUri(LOCAL_URI);
  const atlasDbName = dbNameFromUri(ATLAS_URI) || localDbName;

  console.log(`Source: ${LOCAL_URI.replace(/\/\/.*@/, '//***@')} (db: ${localDbName})`);
  console.log(`Target: Atlas (db: ${atlasDbName})`);

  const local = new MongoClient(LOCAL_URI);
  const atlas = new MongoClient(ATLAS_URI);

  try {
    await local.connect();
    await atlas.connect();
    console.log('Connected to local and Atlas.');

    const sourceDb = local.db(localDbName);
    const targetDb = atlas.db(atlasDbName);

    const collections = (await sourceDb.listCollections().toArray())
      .map((c) => c.name)
      .filter((name) => !name.startsWith('system.'))
      .sort();

    if (!collections.length) {
      console.error(`No collections found in local database "${localDbName}".`);
      process.exit(1);
    }

    console.log(`Copying ${collections.length} collections…`);
    let total = 0;
    for (const name of collections) {
      const result = await copyCollection(sourceDb, targetDb, name);
      total += result.count;
    }

    console.log(`Done. Migrated ${total} documents across ${collections.length} collections.`);
  } finally {
    await local.close();
    await atlas.close();
  }
}

migrate().catch((err) => {
  console.error('Migration failed:', err.message || err);
  process.exit(1);
});
