require('dotenv').config();
const mongoose = require('mongoose');
const { Doctor } = require('../src/modules/doctors/doctors.model');
const { DoctorApplication } = require('../src/modules/doctor-applications/doctor-applications.model');
const doctorsRepository = require('../src/modules/doctors/doctors.repository');
const clinicsRepository = require('../src/modules/clinics/clinics.repository');
const { Specialty } = require('../src/modules/specialties/specialties.model');
const { slugify } = require('../src/shared/utils/slugify');

/**
 * Fixes approved doctors who are missing city/specialty/clinic data
 * (e.g. registered before onboarding profile persistence was added).
 *
 * Usage:
 *   node scripts/backfill-approved-doctor-listing.js <email> <specialtySlug> <city> [clinicName] [clinicAddress] [fee]
 */
const run = async () => {
  const [email, specialtySlug, city, clinicNameArg, clinicAddressArg, feeArg] = process.argv.slice(2);

  if (!email || !specialtySlug || !city) {
    console.log(
      'Usage: node scripts/backfill-approved-doctor-listing.js <email> <specialtySlug> <city> [clinicName] [clinicAddress] [fee]',
    );
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const application = await DoctorApplication.findOne({ email: email.toLowerCase() });
  if (!application || application.status !== 'approved') {
    console.log(`No approved application found for ${email}`);
    await mongoose.disconnect();
    return;
  }

  const specialty = await Specialty.findOne({ slug: specialtySlug, isActive: true }).lean();
  if (!specialty) {
    console.log(`Specialty not found: ${specialtySlug}`);
    await mongoose.disconnect();
    return;
  }

  const doctor = await Doctor.findById(application.doctorId);
  if (!doctor) {
    console.log(`Doctor profile not found for ${email}`);
    await mongoose.disconnect();
    return;
  }

  const clinicName = clinicNameArg || `${application.firstName} ${application.lastName} Clinic`;
  const clinicAddress = clinicAddressArg || `${city} Clinic Address`;
  const consultationFee = feeArg ? Number(feeArg) : doctor.consultationFee || 2000;

  await doctorsRepository.updateById(doctor._id, {
    verificationStatus: 'VERIFIED',
    isActive: true,
    city: city.trim(),
    specialtyIds: [specialty._id],
    title: specialty.name,
    consultationFee,
  });

  const existingClinics = await clinicsRepository.findActiveByDoctorId(doctor._id);
  if (!existingClinics.length) {
    await clinicsRepository.create({
      doctorId: doctor._id,
      name: clinicName,
      address: clinicAddress,
      city: city.trim(),
      citySlug: slugify(city),
      consultationFee,
      isActive: true,
    });
  }

  console.log(`Listing data backfilled for ${email}`);
  console.log(`  specialty: ${specialty.name} (${specialty.slug})`);
  console.log(`  city: ${city}`);

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
