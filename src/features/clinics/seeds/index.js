const Clinic = require('../models/clinic.model');
const { CLINICS } = require('./clinics.seed');
const { DEFAULT_CLINIC_WORKING_HOURS } = require('../utils/clinicWorkingHours.util');

async function seedClinics() {
  for (const clinic of CLINICS) {
    await Clinic.findOneAndUpdate(
      { slug: clinic.slug },
      { ...clinic, workingHours: DEFAULT_CLINIC_WORKING_HOURS, isActive: true },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }
}

module.exports = { seedClinics };
