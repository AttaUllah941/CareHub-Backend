/**
 * Local development seed script.
 * Run: npm run seed
 */
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const rootDir = path.join(__dirname, '..');

const config = require(path.join(rootDir, 'src/config'));
const { slugify } = require(path.join(rootDir, 'src/shared/utils/slugify'));
const { UserRole } = require(path.join(rootDir, 'src/shared/enums/userRole.enum'));
const { User } = require(path.join(rootDir, 'src/modules/users/users.model'));
const { Specialty } = require(path.join(rootDir, 'src/modules/specialties/specialties.model'));
const { Language } = require(path.join(rootDir, 'src/modules/languages/languages.model'));
const { Doctor } = require(path.join(rootDir, 'src/modules/doctors/doctors.model'));
const { Hospital } = require(path.join(rootDir, 'src/modules/hospitals/hospitals.model'));
const { Lab } = require(path.join(rootDir, 'src/modules/labs/labs.model'));
const { LabTest } = require(path.join(rootDir, 'src/modules/labs/lab-tests.model'));
const { Pharmacy } = require(path.join(rootDir, 'src/modules/medicines/pharmacies.model'));
const { Medicine } = require(path.join(rootDir, 'src/modules/medicines/medicine.model'));

const SPECIALTIES = [
  { name: 'Cardiology', description: 'Heart and cardiovascular care', icon: 'heart' },
  { name: 'Dermatology', description: 'Skin, hair, and nail conditions', icon: 'skin' },
  { name: 'General Medicine', description: 'Primary and general healthcare', icon: 'stethoscope' },
  { name: 'Gynecology', description: "Women's health and reproductive care", icon: 'female' },
  { name: 'Pediatrics', description: 'Child and adolescent healthcare', icon: 'child' },
];

const LANGUAGES = [
  { name: 'English', code: 'en' },
  { name: 'Urdu', code: 'ur' },
  { name: 'Punjabi', code: 'pa' },
];

const DEMO_DOCTORS = [
  { firstName: 'Ayesha', lastName: 'Khan', email: 'dr.ayesha@carehub.test', phone: '+923001000101', city: 'Lahore', title: 'Consultant Physician' },
  { firstName: 'Hassan', lastName: 'Raza', email: 'dr.hassan@carehub.test', phone: '+923001000102', city: 'Karachi', title: 'Cardiologist' },
  { firstName: 'Sana', lastName: 'Malik', email: 'dr.sana@carehub.test', phone: '+923001000103', city: 'Islamabad', title: 'Dermatologist' },
];

const seed = async () => {
  await mongoose.connect(config.mongodb.uri);
  console.log('Connected to MongoDB');

  const passwordHash = await bcrypt.hash('Password123!', config.bcrypt.saltRounds);

  for (const item of SPECIALTIES) {
    await Specialty.updateOne(
      { slug: slugify(item.name) },
      { $set: { ...item, slug: slugify(item.name), isActive: true } },
      { upsert: true },
    );
  }
  console.log(`Seeded ${SPECIALTIES.length} specialties`);

  for (const item of LANGUAGES) {
    await Language.updateOne({ code: item.code }, { $set: { ...item, isActive: true } }, { upsert: true });
  }
  console.log(`Seeded ${LANGUAGES.length} languages`);

  let admin = await User.findOne({ email: 'admin@carehub.test' });
  if (!admin) {
    admin = await User.create({
      firstName: 'CareHub',
      lastName: 'Admin',
      email: 'admin@carehub.test',
      phone: '+923001000001',
      passwordHash,
      role: UserRole.ADMIN,
      isActive: true,
      isEmailVerified: true,
    });
  }
  console.log('Admin user: admin@carehub.test / Password123!');

  for (const doc of DEMO_DOCTORS) {
    let user = await User.findOne({ email: doc.email });
    if (!user) {
      user = await User.create({
        firstName: doc.firstName,
        lastName: doc.lastName,
        email: doc.email,
        phone: doc.phone,
        passwordHash,
        role: UserRole.DOCTOR,
        isActive: true,
        isEmailVerified: true,
      });
    }

    await Doctor.updateOne(
      { userId: user._id },
      {
        $set: {
          userId: user._id,
          fullName: `${doc.firstName} ${doc.lastName}`,
          city: doc.city,
          title: doc.title,
          verificationStatus: 'VERIFIED',
          averageRating: 4.5,
          reviewCount: 12,
        },
      },
      { upsert: true },
    );
  }
  console.log(`Seeded ${DEMO_DOCTORS.length} demo doctors`);

  const hospitals = [
    { name: 'Services Hospital', city: 'Lahore', address: 'Jail Road, Lahore' },
    { name: 'Shaukat Khanum Memorial', city: 'Lahore', address: 'Johar Town, Lahore' },
    { name: 'Aga Khan University Hospital', city: 'Karachi', address: 'Stadium Road, Karachi' },
  ];

  for (const hospital of hospitals) {
    await Hospital.updateOne(
      { citySlug: slugify(hospital.city), slug: slugify(hospital.name) },
      {
        $set: {
          name: hospital.name,
          city: hospital.city,
          address: hospital.address,
          slug: slugify(hospital.name),
          citySlug: slugify(hospital.city),
          isActive: true,
          rating: 4.6,
          reviewCount: 100,
        },
        $unset: { location: '' },
      },
      { upsert: true },
    );
  }
  console.log(`Seeded ${hospitals.length} hospitals`);

  const labs = [
    { name: 'Chughtai Lab Gulberg', city: 'Lahore', address: 'Main Boulevard, Gulberg' },
    { name: 'Excel Labs Karachi', city: 'Karachi', address: 'Clifton Block 5' },
  ];

  for (const lab of labs) {
    const record = await Lab.findOneAndUpdate(
      { citySlug: slugify(lab.city), slug: slugify(lab.name) },
      {
        $set: {
          ...lab,
          slug: slugify(lab.name),
          citySlug: slugify(lab.city),
          isActive: true,
        },
      },
      { upsert: true, new: true },
    );

    await LabTest.updateOne(
      { labId: record._id, name: 'Complete Blood Count' },
      {
        $set: {
          labId: record._id,
          name: 'Complete Blood Count',
          description: 'CBC panel',
          price: 1200,
          currency: 'PKR',
          homeCollectionAvailable: true,
          isActive: true,
        },
      },
      { upsert: true },
    );
  }
  console.log(`Seeded ${labs.length} labs with sample tests`);

  const pharmacies = [
    { name: 'D-Well Pharma', city: 'Lahore', address: 'MM Alam Road, Gulberg' },
    { name: 'Sehat Pharmacy', city: 'Karachi', address: 'PECHS Block 6' },
  ];

  for (const pharmacy of pharmacies) {
    const record = await Pharmacy.findOneAndUpdate(
      { citySlug: slugify(pharmacy.city), slug: slugify(pharmacy.name) },
      {
        $set: {
          ...pharmacy,
          slug: slugify(pharmacy.name),
          citySlug: slugify(pharmacy.city),
          isActive: true,
        },
      },
      { upsert: true, new: true },
    );

    await Medicine.updateOne(
      { pharmacyId: record._id, name: 'Panadol Extra' },
      {
        $set: {
          pharmacyId: record._id,
          name: 'Panadol Extra',
          description: 'Pain relief tablets',
          manufacturer: 'GSK',
          price: 280,
          currency: 'PKR',
          requiresPrescription: false,
          stock: 100,
          isActive: true,
        },
      },
      { upsert: true },
    );
  }
  console.log(`Seeded ${pharmacies.length} pharmacies with sample medicines`);

  await mongoose.disconnect();
  console.log('Seed completed successfully');
};

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
