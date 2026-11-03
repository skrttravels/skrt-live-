/**
 * Data Restore Script
 * Migrates data from the old ttc_enterprise dump into skrt_transport Atlas DB
 * Run: node restore-data.js
 */
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const dns = require('dns');
const BSON = require('bson');

dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
dns.setDefaultResultOrder('ipv4first');
dotenv.config();

const DUMP_DIR = path.join(__dirname, '..', 'dump', 'ttc_enterprise');

// Map old collection names → new collection names in skrt_transport
const COLLECTION_MAP = {
  cashmemos:          'cashmemos',
  challans:           'challans',
  contacts:           'contacts',
  deliverystatements: 'deliverystatements',
  drivers:            'drivers',
  entryregisters:     'entryregisters',
  shipments:          'shipments',
  summaryregisters:   'summaryregisters',
  users:              'users',
  vehicles:           'vehicles'
};

async function restoreCollection(db, bsonFile, collectionName) {
  const fullPath = path.join(DUMP_DIR, bsonFile);
  const stat = fs.statSync(fullPath);

  if (stat.size === 0) {
    console.log(`  ⏭  Skipping ${collectionName} (empty file)`);
    return 0;
  }

  const buffer = fs.readFileSync(fullPath);
  const docs = [];
  let offset = 0;

  // Parse BSON — each document is length-prefixed
  while (offset < buffer.length) {
    const docLen = buffer.readInt32LE(offset);
    const docBuf = buffer.slice(offset, offset + docLen);
    try {
      const doc = BSON.deserialize(docBuf);
      docs.push(doc);
    } catch (e) {
      console.warn(`  ⚠  Failed to parse doc at offset ${offset}: ${e.message}`);
    }
    offset += docLen;
  }

  if (docs.length === 0) {
    console.log(`  ⏭  Skipping ${collectionName} (0 documents parsed)`);
    return 0;
  }

  const collection = db.collection(collectionName);
  const existing = await collection.countDocuments();

  if (existing > 0) {
    console.log(`  ℹ  ${collectionName}: already has ${existing} docs — skipping to avoid duplicates`);
    return 0;
  }

  await collection.insertMany(docs, { ordered: false });
  console.log(`  ✅ ${collectionName}: inserted ${docs.length} documents`);
  return docs.length;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('❌ MONGODB_URI not set'); process.exit(1); }

  console.log('🔌 Connecting to MongoDB Atlas...');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 20000 });
  const db = mongoose.connection.db;
  console.log(`✅ Connected to: ${db.databaseName}\n`);

  let total = 0;

  for (const [bsonName, collName] of Object.entries(COLLECTION_MAP)) {
    const bsonFile = `${bsonName}.bson`;
    const filePath = path.join(DUMP_DIR, bsonFile);
    if (!fs.existsSync(filePath)) {
      console.log(`  ⏭  ${bsonFile} not found — skipping`);
      continue;
    }
    console.log(`📦 Restoring: ${bsonName} → ${collName}`);
    try {
      const count = await restoreCollection(db, bsonFile, collName);
      total += count;
    } catch (err) {
      console.error(`  ❌ Error restoring ${bsonName}:`, err.message);
    }
  }

  await mongoose.connection.close();
  console.log(`\n🎉 Restore complete! Total documents inserted: ${total}`);
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Restore failed:', err.message);
  process.exit(1);
});
