const Specialty = require('../models/specialty.model');
const { DEFAULT_SPECIALTIES } = require('./specialties.seed');

/**
 * Seeds default medical specialties on application startup.
 * Idempotent — safe to run on every boot.
 */
const seedMedicalSpecialties = async () => {
  for (const specialty of DEFAULT_SPECIALTIES) {
    await Specialty.findOneAndUpdate(
      { slug: specialty.slug },
      { $setOnInsert: { ...specialty, isActive: true } },
      { upsert: true, new: true },
    );
  }
};

module.exports = { seedMedicalSpecialties };
