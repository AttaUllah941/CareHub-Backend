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
  { name: 'General Physician', description: 'Primary care and general health consultations', icon: 'stethoscope', sortOrder: 1 },
  { name: 'Pediatrician', description: 'Healthcare for infants, children, and adolescents', icon: 'child', sortOrder: 2 },
  {
    name: 'Gynecologist & Obstetrician (OB/GYN)',
    description: "Women's reproductive health, pregnancy, and childbirth care",
    icon: 'female',
    sortOrder: 3,
  },
  { name: 'Dermatologist', description: 'Skin, hair, and nail conditions', icon: 'skin', sortOrder: 4 },
  { name: 'Cardiologist', description: 'Heart and cardiovascular care', icon: 'heart', sortOrder: 5 },
  { name: 'Gastroenterologist', description: 'Digestive system and gastrointestinal care', icon: 'stethoscope', sortOrder: 6 },
  { name: 'Orthopedic Surgeon', description: 'Bones, joints, muscles, and musculoskeletal surgery', icon: 'bone', sortOrder: 7 },
  { name: 'Neurologist', description: 'Brain, spine, and nervous system disorders', icon: 'brain', sortOrder: 8 },
  { name: 'Ophthalmologist', description: 'Eye care, vision, and ocular surgery', icon: 'eye', sortOrder: 9 },
  {
    name: 'ENT Specialist (Otolaryngologist)',
    description: 'Ear, nose, throat, and head/neck conditions',
    icon: 'ent',
    sortOrder: 10,
  },
];

const LANGUAGES = [
  { name: 'English', code: 'en' },
  { name: 'Urdu', code: 'ur' },
  { name: 'Punjabi', code: 'pa' },
];

const DEMO_DOCTORS = [
  {
    firstName: 'Ayesha',
    lastName: 'Khan',
    email: 'dr.ayesha@carehub.test',
    phone: '+923001000101',
    city: 'Lahore',
    title: 'Consultant Physician',
    specialtySlug: 'general-physician',
    yearsOfExperience: 15,
    consultationFee: 2000,
    gender: 'FEMALE',
  },
  {
    firstName: 'Bilal',
    lastName: 'Ahmed',
    email: 'dr.bilal@carehub.test',
    phone: '+923001000104',
    city: 'Lahore',
    title: 'Pediatrician',
    specialtySlug: 'pediatrician',
    yearsOfExperience: 12,
    consultationFee: 2200,
    gender: 'MALE',
  },
  {
    firstName: 'Nadia',
    lastName: 'Hussain',
    email: 'dr.nadia@carehub.test',
    phone: '+923001000105',
    city: 'Lahore',
    title: 'Gynecologist',
    specialtySlug: 'gynecologist-obstetrician-obgyn',
    yearsOfExperience: 14,
    consultationFee: 3000,
    gender: 'FEMALE',
  },
  {
    firstName: 'Sana',
    lastName: 'Malik',
    email: 'dr.sana@carehub.test',
    phone: '+923001000103',
    city: 'Lahore',
    title: 'Dermatologist',
    specialtySlug: 'dermatologist',
    yearsOfExperience: 10,
    consultationFee: 2500,
    gender: 'FEMALE',
  },
  {
    firstName: 'Hassan',
    lastName: 'Raza',
    email: 'dr.hassan@carehub.test',
    phone: '+923001000102',
    city: 'Lahore',
    title: 'Cardiologist',
    specialtySlug: 'cardiologist',
    yearsOfExperience: 18,
    consultationFee: 3500,
    gender: 'MALE',
  },
  {
    firstName: 'Imran',
    lastName: 'Qureshi',
    email: 'dr.imran@carehub.test',
    phone: '+923001000106',
    city: 'Lahore',
    title: 'Gastroenterologist',
    specialtySlug: 'gastroenterologist',
    yearsOfExperience: 16,
    consultationFee: 3200,
    gender: 'MALE',
  },
  {
    firstName: 'Kamran',
    lastName: 'Sheikh',
    email: 'dr.kamran@carehub.test',
    phone: '+923001000107',
    city: 'Lahore',
    title: 'Orthopedic Surgeon',
    specialtySlug: 'orthopedic-surgeon',
    yearsOfExperience: 20,
    consultationFee: 4000,
    gender: 'MALE',
  },
  {
    firstName: 'Laila',
    lastName: 'Siddiqui',
    email: 'dr.laila@carehub.test',
    phone: '+923001000108',
    city: 'Lahore',
    title: 'Neurologist',
    specialtySlug: 'neurologist',
    yearsOfExperience: 13,
    consultationFee: 3800,
    gender: 'FEMALE',
  },
  {
    firstName: 'Omar',
    lastName: 'Farooq',
    email: 'dr.omar@carehub.test',
    phone: '+923001000109',
    city: 'Lahore',
    title: 'Ophthalmologist',
    specialtySlug: 'ophthalmologist',
    yearsOfExperience: 11,
    consultationFee: 2800,
    gender: 'MALE',
  },
  {
    firstName: 'Rabia',
    lastName: 'Noor',
    email: 'dr.rabia@carehub.test',
    phone: '+923001000110',
    city: 'Lahore',
    title: 'ENT Specialist',
    specialtySlug: 'ent-specialist-otolaryngologist',
    yearsOfExperience: 9,
    consultationFee: 2600,
    gender: 'FEMALE',
  },
  {
    firstName: 'Tariq',
    lastName: 'Mehmood',
    email: 'dr.tariq@carehub.test',
    phone: '+923001000111',
    city: 'Karachi',
    title: 'Dermatologist',
    specialtySlug: 'dermatologist',
    yearsOfExperience: 8,
    consultationFee: 2400,
    gender: 'MALE',
  },
  {
    firstName: 'Zainab',
    lastName: 'Akhtar',
    email: 'dr.zainab@carehub.test',
    phone: '+923001000112',
    city: 'Islamabad',
    title: 'General Physician',
    specialtySlug: 'general-physician',
    yearsOfExperience: 7,
    consultationFee: 1800,
    gender: 'FEMALE',
  },
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

  const activeSlugs = SPECIALTIES.map((item) => slugify(item.name));
  await Specialty.updateMany({ slug: { $nin: activeSlugs } }, { $set: { isActive: false } });
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

    const specialty = await Specialty.findOne({ slug: doc.specialtySlug, isActive: true });
    const english = await Language.findOne({ code: 'en' });
    const urdu = await Language.findOne({ code: 'ur' });

    await Doctor.updateOne(
      { userId: user._id },
      {
        $set: {
          userId: user._id,
          fullName: `${doc.firstName} ${doc.lastName}`,
          gender: doc.gender ?? 'MALE',
          city: doc.city,
          country: 'Pakistan',
          title: doc.title,
          about: `${doc.title} with ${doc.yearsOfExperience}+ years of experience serving patients in ${doc.city}.`,
          yearsOfExperience: doc.yearsOfExperience ?? 5,
          consultationFee: doc.consultationFee ?? 2000,
          currency: 'PKR',
          specialtyIds: specialty ? [specialty._id] : [],
          languageIds: [english?._id, urdu?._id].filter(Boolean),
          qualifications: [
            { degree: 'MBBS', institution: 'King Edward Medical University', year: 2010 },
            { degree: 'FCPS', institution: 'College of Physicians and Surgeons Pakistan', year: 2015 },
          ],
          verificationStatus: 'VERIFIED',
          isActive: true,
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
