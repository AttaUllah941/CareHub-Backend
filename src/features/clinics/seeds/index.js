const Clinic = require('../models/clinic.model');
const { CLINICS } = require('./clinics.seed');
const { DEFAULT_CLINIC_WORKING_HOURS } = require('../utils/clinicWorkingHours.util');
const logger = require('../../../core/utils/logger');

async function seedClinics() {
  for (const clinic of CLINICS) {
    await Clinic.findOneAndUpdate(
      { slug: clinic.slug },
      { ...clinic, workingHours: DEFAULT_CLINIC_WORKING_HOURS, isActive: true },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }
  logger.info(`Seeded ${CLINICS.length} clinics`);
}

module.exports = { seedClinics };
