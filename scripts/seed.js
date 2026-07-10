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
const Clinic = require(path.join(rootDir, 'src/modules/clinics/clinics.model'));
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

const DEMO_CLINIC_ADDRESSES = {
  Lahore: '14-A Main Boulevard, Gulberg III, Lahore',
  Karachi: 'Shop 12, Block 5, Clifton, Karachi',
  Islamabad: 'Plot 22, F-8 Markaz, Islamabad',
};

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
            { degree: 'MBBS', institute: 'King Edward Medical University', year: 2010 },
            { degree: 'FCPS', institute: 'College of Physicians and Surgeons Pakistan', year: 2015 },
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

  for (const doc of DEMO_DOCTORS) {
    const user = await User.findOne({ email: doc.email });
    if (!user) continue;

    const doctor = await Doctor.findOne({ userId: user._id });
    if (!doctor) continue;

    const clinicName = `${doc.firstName} ${doc.lastName} Clinic`;
    const address = DEMO_CLINIC_ADDRESSES[doc.city] || `${doc.city} City Center`;

    await Clinic.updateOne(
      { doctorId: doctor._id, name: clinicName },
      {
        $set: {
          doctorId: doctor._id,
          name: clinicName,
          address,
          city: doc.city,
          citySlug: slugify(doc.city),
          consultationFee: doc.consultationFee ?? 2000,
          isActive: true,
        },
      },
      { upsert: true },
    );
  }
  console.log(`Seeded in-clinic locations for ${DEMO_DOCTORS.length} demo doctors`);

  const english = await Language.findOne({ code: 'en' });
  const urdu = await Language.findOne({ code: 'ur' });

  const LAHORE_HOSPITALS = [
    {
      name: 'Shaukat Khanum Memorial Cancer Hospital',
      city: 'Lahore',
      address: '7-A Block R-3, M.A. Johar Town, Lahore',
      description:
        'Pakistan’s leading tertiary cancer hospital providing diagnosis, treatment, and research with a strong focus on patient care.',
      facilities: ['Emergency', 'ICU', 'Pharmacy', 'Laboratory', 'Radiology', 'Chemotherapy', 'Parking'],
      rating: 4.9,
      reviewCount: 1250,
      doctors: [
        {
          firstName: 'Farah',
          lastName: 'Iqbal',
          email: 'dr.farah.skm@carehub.test',
          phone: '+923001000201',
          title: 'Consultant Oncologist',
          specialtySlug: 'general-physician',
          yearsOfExperience: 16,
          consultationFee: 4500,
          gender: 'FEMALE',
        },
        {
          firstName: 'Usman',
          lastName: 'Javed',
          email: 'dr.usman.skm@carehub.test',
          phone: '+923001000202',
          title: 'Consultant Cardiologist',
          specialtySlug: 'cardiologist',
          yearsOfExperience: 14,
          consultationFee: 4000,
          gender: 'MALE',
        },
        {
          firstName: 'Mehwish',
          lastName: 'Rauf',
          email: 'dr.mehwish.skm@carehub.test',
          phone: '+923001000203',
          title: 'Consultant Pediatrician',
          specialtySlug: 'pediatrician',
          yearsOfExperience: 11,
          consultationFee: 3200,
          gender: 'FEMALE',
        },
        {
          firstName: 'Adnan',
          lastName: 'Bashir',
          email: 'dr.adnan.skm@carehub.test',
          phone: '+923001000204',
          title: 'Consultant Orthopedic Surgeon',
          specialtySlug: 'orthopedic-surgeon',
          yearsOfExperience: 18,
          consultationFee: 4200,
          gender: 'MALE',
        },
      ],
    },
    {
      name: 'Services Hospital',
      city: 'Lahore',
      address: 'Jail Road, Lahore',
      description:
        'One of Lahore’s major public teaching hospitals offering multi-specialty care, emergency services, and postgraduate training.',
      facilities: ['Emergency', 'ICU', 'OPD', 'Pharmacy', 'Laboratory', 'Radiology', 'Surgery'],
      rating: 4.5,
      reviewCount: 890,
      doctors: [
        {
          firstName: 'Saima',
          lastName: 'Yousaf',
          email: 'dr.saima.services@carehub.test',
          phone: '+923001000205',
          title: 'Consultant Gynecologist',
          specialtySlug: 'gynecologist-obstetrician-obgyn',
          yearsOfExperience: 15,
          consultationFee: 2800,
          gender: 'FEMALE',
        },
        {
          firstName: 'Waqas',
          lastName: 'Ali',
          email: 'dr.waqas.services@carehub.test',
          phone: '+923001000206',
          title: 'Consultant Neurologist',
          specialtySlug: 'neurologist',
          yearsOfExperience: 12,
          consultationFee: 3500,
          gender: 'MALE',
        },
        {
          firstName: 'Hina',
          lastName: 'Shahid',
          email: 'dr.hina.services@carehub.test',
          phone: '+923001000207',
          title: 'Consultant Dermatologist',
          specialtySlug: 'dermatologist',
          yearsOfExperience: 10,
          consultationFee: 2500,
          gender: 'FEMALE',
        },
        {
          firstName: 'Faisal',
          lastName: 'Nadeem',
          email: 'dr.faisal.services@carehub.test',
          phone: '+923001000208',
          title: 'Consultant ENT Specialist',
          specialtySlug: 'ent-specialist-otolaryngologist',
          yearsOfExperience: 13,
          consultationFee: 2700,
          gender: 'MALE',
        },
      ],
    },
    {
      name: 'Mayo Hospital',
      city: 'Lahore',
      address: 'Hospital Road, Anarkali, Lahore',
      description:
        'Historic tertiary care and teaching hospital affiliated with King Edward Medical University, serving a large patient population across Punjab.',
      facilities: ['Emergency', 'Trauma Center', 'ICU', 'OPD', 'Pharmacy', 'Laboratory', 'Blood Bank'],
      rating: 4.4,
      reviewCount: 1020,
      doctors: [
        {
          firstName: 'Naveed',
          lastName: 'Anwar',
          email: 'dr.naveed.mayo@carehub.test',
          phone: '+923001000209',
          title: 'Consultant General Physician',
          specialtySlug: 'general-physician',
          yearsOfExperience: 20,
          consultationFee: 2200,
          gender: 'MALE',
        },
        {
          firstName: 'Amina',
          lastName: 'Tariq',
          email: 'dr.amina.mayo@carehub.test',
          phone: '+923001000210',
          title: 'Consultant Ophthalmologist',
          specialtySlug: 'ophthalmologist',
          yearsOfExperience: 14,
          consultationFee: 3000,
          gender: 'FEMALE',
        },
        {
          firstName: 'Shahzad',
          lastName: 'Iqbal',
          email: 'dr.shahzad.mayo@carehub.test',
          phone: '+923001000211',
          title: 'Consultant Gastroenterologist',
          specialtySlug: 'gastroenterologist',
          yearsOfExperience: 17,
          consultationFee: 3400,
          gender: 'MALE',
        },
        {
          firstName: 'Bushra',
          lastName: 'Khalid',
          email: 'dr.bushra.mayo@carehub.test',
          phone: '+923001000212',
          title: 'Consultant Pediatrician',
          specialtySlug: 'pediatrician',
          yearsOfExperience: 12,
          consultationFee: 2400,
          gender: 'FEMALE',
        },
      ],
    },
    {
      name: 'Hameed Latif Hospital',
      city: 'Lahore',
      address: '14 Abu Bakar Block, New Garden Town, Lahore',
      description:
        'Well-known private multi-specialty hospital in Lahore offering advanced diagnostics, maternity care, and surgical services.',
      facilities: ['Emergency', 'ICU', 'Maternity', 'Pharmacy', 'Laboratory', 'Radiology', 'Parking', 'Cafeteria'],
      rating: 4.7,
      reviewCount: 760,
      doctors: [
        {
          firstName: 'Asma',
          lastName: 'Rehman',
          email: 'dr.asma.hlh@carehub.test',
          phone: '+923001000213',
          title: 'Consultant Gynecologist',
          specialtySlug: 'gynecologist-obstetrician-obgyn',
          yearsOfExperience: 16,
          consultationFee: 3500,
          gender: 'FEMALE',
        },
        {
          firstName: 'Hamza',
          lastName: 'Siddiqui',
          email: 'dr.hamza.hlh@carehub.test',
          phone: '+923001000214',
          title: 'Consultant Cardiologist',
          specialtySlug: 'cardiologist',
          yearsOfExperience: 15,
          consultationFee: 4000,
          gender: 'MALE',
        },
        {
          firstName: 'Iqra',
          lastName: 'Malik',
          email: 'dr.iqra.hlh@carehub.test',
          phone: '+923001000215',
          title: 'Consultant Dermatologist',
          specialtySlug: 'dermatologist',
          yearsOfExperience: 9,
          consultationFee: 2800,
          gender: 'FEMALE',
        },
        {
          firstName: 'Junaid',
          lastName: 'Akram',
          email: 'dr.junaid.hlh@carehub.test',
          phone: '+923001000216',
          title: 'Consultant Orthopedic Surgeon',
          specialtySlug: 'orthopedic-surgeon',
          yearsOfExperience: 19,
          consultationFee: 4500,
          gender: 'MALE',
        },
      ],
    },
  ];

  let hospitalDoctorCount = 0;

  for (const hospital of LAHORE_HOSPITALS) {
    const doctorIds = [];

    for (const doc of hospital.doctors) {
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

      const doctor = await Doctor.findOneAndUpdate(
        { userId: user._id },
        {
          $set: {
            userId: user._id,
            fullName: `${doc.firstName} ${doc.lastName}`,
            gender: doc.gender ?? 'MALE',
            city: hospital.city,
            country: 'Pakistan',
            title: doc.title,
            about: `${doc.title} at ${hospital.name} with ${doc.yearsOfExperience}+ years of experience.`,
            yearsOfExperience: doc.yearsOfExperience ?? 5,
            consultationFee: doc.consultationFee ?? 2000,
            currency: 'PKR',
            specialtyIds: specialty ? [specialty._id] : [],
            languageIds: [english?._id, urdu?._id].filter(Boolean),
            qualifications: [
              { degree: 'MBBS', institute: 'King Edward Medical University', year: 2010 },
              { degree: 'FCPS', institute: 'College of Physicians and Surgeons Pakistan', year: 2015 },
            ],
            workHistory: [
              {
                organization: hospital.name,
                position: doc.title,
                from: 2016,
              },
            ],
            verificationStatus: 'VERIFIED',
            isActive: true,
            averageRating: 4.6,
            reviewCount: 18,
          },
        },
        { upsert: true, new: true },
      );

      doctorIds.push(doctor._id);
      hospitalDoctorCount += 1;
    }

    await Hospital.updateOne(
      { citySlug: slugify(hospital.city), slug: slugify(hospital.name) },
      {
        $set: {
          name: hospital.name,
          city: hospital.city,
          address: hospital.address,
          description: hospital.description,
          facilities: hospital.facilities,
          slug: slugify(hospital.name),
          citySlug: slugify(hospital.city),
          doctorIds,
          isActive: true,
          rating: hospital.rating,
          reviewCount: hospital.reviewCount,
        },
        $unset: { location: '' },
      },
      { upsert: true },
    );
  }

  // Keep a Karachi hospital for multi-city coverage
  await Hospital.updateOne(
    { citySlug: 'karachi', slug: slugify('Aga Khan University Hospital') },
    {
      $set: {
        name: 'Aga Khan University Hospital',
        city: 'Karachi',
        address: 'Stadium Road, Karachi',
        description: 'Leading private tertiary care hospital in Karachi.',
        facilities: ['Emergency', 'ICU', 'Pharmacy', 'Laboratory', 'Radiology'],
        slug: slugify('Aga Khan University Hospital'),
        citySlug: 'karachi',
        isActive: true,
        rating: 4.8,
        reviewCount: 1500,
      },
      $unset: { location: '' },
    },
    { upsert: true },
  );

  // Soft-deactivate the old short-named Shaukat Khanum seed if it still exists
  await Hospital.updateOne(
    { citySlug: 'lahore', slug: 'shaukat-khanum-memorial' },
    { $set: { isActive: false } },
  );

  console.log(`Seeded ${LAHORE_HOSPITALS.length} Lahore hospitals with ${hospitalDoctorCount} linked doctors`);
  console.log('Seeded 1 Karachi hospital');

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
