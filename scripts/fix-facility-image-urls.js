require('dotenv').config();
const mongoose = require('mongoose');
const { Hospital } = require('../src/modules/hospitals/hospitals.model');
const { Lab } = require('../src/modules/labs/labs.model');
const { Pharmacy } = require('../src/modules/medicines/pharmacies.model');

/**
 * Remaps known-broken Unsplash photo IDs stored on facility documents.
 * Safe to re-run (idempotent for already-replaced URLs).
 *
 * Usage:
 *   node scripts/fix-facility-image-urls.js
 */

const PHOTO_REPLACEMENTS = {
  // Broken seeded URLs → verified working Unsplash photos
  'photo-1538108141814-8e0e75c5e45e': 'photo-1519494140681-8b17d830a3e9',
  'photo-1631217868264-e5b90bb7e630': 'photo-1631815588090-d4bfec5b1ccb',
  'photo-1551076805-e1869033fa41': 'photo-1582750433449-648ed127bb54',
  'photo-1579154204601-01588fcc3518': 'photo-1582719478250-c89cae4dc85b',
  'photo-1587854692152-cf660a4e3718': 'photo-1471864190281-a93a3070b6de',
};

const OPTIMIZED_QUERY = 'w=960&q=75&auto=format&fit=crop';

const replaceImageUrl = (url) => {
  if (typeof url !== 'string' || !url.includes('images.unsplash.com')) {
    return { url, changed: false };
  }

  let next = url;
  let changed = false;

  for (const [fromId, toId] of Object.entries(PHOTO_REPLACEMENTS)) {
    if (next.includes(fromId)) {
      next = next.replace(fromId, toId);
      changed = true;
    }
  }

  if (changed) {
    // Normalize query params for replaced URLs
    const base = next.split('?')[0];
    next = `${base}?${OPTIMIZED_QUERY}`;
  }

  return { url: next, changed };
};

const remapDocumentImages = async (Model, label) => {
  const docs = await Model.find({ 'images.0': { $exists: true } }).select('_id name images').lean();
  let updatedDocs = 0;
  let replacedUrls = 0;

  for (const doc of docs) {
    let docChanged = false;
    const nextImages = (doc.images || []).map((image) => {
      const { url, changed } = replaceImageUrl(image);
      if (changed) {
        docChanged = true;
        replacedUrls += 1;
      }
      return url;
    });

    if (docChanged) {
      await Model.updateOne({ _id: doc._id }, { $set: { images: nextImages } });
      updatedDocs += 1;
      console.log(`  ✓ ${label}: ${doc.name || doc._id}`);
    }
  }

  return { scanned: docs.length, updatedDocs, replacedUrls };
};

const run = async () => {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is required');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected. Remapping broken facility image URLs...\n');

  const hospitalStats = await remapDocumentImages(Hospital, 'Hospital');
  const labStats = await remapDocumentImages(Lab, 'Lab');
  const pharmacyStats = await remapDocumentImages(Pharmacy, 'Pharmacy');

  console.log('\nDone.');
  console.log(
    `Hospitals: scanned ${hospitalStats.scanned}, updated ${hospitalStats.updatedDocs}, urls ${hospitalStats.replacedUrls}`,
  );
  console.log(
    `Labs: scanned ${labStats.scanned}, updated ${labStats.updatedDocs}, urls ${labStats.replacedUrls}`,
  );
  console.log(
    `Pharmacies: scanned ${pharmacyStats.scanned}, updated ${pharmacyStats.updatedDocs}, urls ${pharmacyStats.replacedUrls}`,
  );

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(error);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
