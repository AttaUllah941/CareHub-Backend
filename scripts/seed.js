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
const { SurgeryProcedure } = require(path.join(rootDir, 'src/modules/surgeries/surgery-procedures.model'));
const { Pharmacy } = require(path.join(rootDir, 'src/modules/medicines/pharmacies.model'));
const { Medicine } = require(path.join(rootDir, 'src/modules/medicines/medicine.model'));
const {
  getHospitalEnrichment,
  getLabEnrichment,
  getPharmacyEnrichment,
} = require(path.join(__dirname, 'data/facility-enrichment'));

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

const SEED_CITIES = ['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar'];

const GENERAL_PHYSICIAN_NAMES = [
  ['Ayesha', 'Khan'],
  ['Zainab', 'Akhtar'],
  ['Muhammad', 'Ali'],
  ['Fatima', 'Sheikh'],
  ['Usman', 'Malik'],
  ['Hina', 'Rashid'],
  ['Asad', 'Javed'],
  ['Maryam', 'Butt'],
  ['Fahad', 'Chaudhry'],
  ['Sadia', 'Ansari'],
  ['Khalid', 'Mirza'],
  ['Amna', 'Siddiqui'],
  ['Waqar', 'Hussain'],
  ['Rubina', 'Qureshi'],
  ['Yasir', 'Iqbal'],
];

const PEDIATRICIAN_NAMES = [
  ['Bilal', 'Ahmed'],
  ['Sara', 'Khan'],
  ['Hamza', 'Rafiq'],
  ['Nida', 'Parvez'],
  ['Arslan', 'Haider'],
  ['Hira', 'Nawaz'],
  ['Danish', 'Saleem'],
  ['Areeba', 'Zafar'],
  ['Saad', 'Mahmood'],
  ['Laiba', 'Yousaf'],
  ['Rehan', 'Abbasi'],
];

const DERMATOLOGIST_NAMES = [
  ['Sana', 'Malik'],
  ['Tariq', 'Mehmood'],
  ['Noreen', 'Shah'],
  ['Ahmed', 'Riaz'],
  ['Kiran', 'Afzal'],
  ['Bilal', 'Hameed'],
  ['Maha', 'Tahir'],
  ['Junaid', 'Saeed'],
  ['Aisha', 'Bajwa'],
  ['Omer', 'Latif'],
  ['Huma', 'Dar'],
];

const buildDoctorsForSpecialty = ({
  names,
  specialtySlug,
  title,
  phoneSeries,
  baseFee,
  emailPrefix,
}) =>
  names.map(([firstName, lastName], index) => ({
    firstName,
    lastName,
    email: `dr.${emailPrefix}${String(index + 1).padStart(2, '0')}@carehub.test`,
    phone: `+92310${phoneSeries}${String(index + 1).padStart(4, '0')}`,
    city: SEED_CITIES[index % SEED_CITIES.length],
    title,
    specialtySlug,
    yearsOfExperience: 6 + (index % 15),
    consultationFee: baseFee + (index % 4) * 200,
    gender: index % 2 === 0 ? 'FEMALE' : 'MALE',
  }));

const OTHER_DEMO_DOCTORS = [
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
];

const GENERAL_PHYSICIAN_DOCTORS = buildDoctorsForSpecialty({
  names: GENERAL_PHYSICIAN_NAMES,
  specialtySlug: 'general-physician',
  title: 'Consultant Physician',
  phoneSeries: '110',
  baseFee: 1800,
  emailPrefix: 'gp',
});

const PEDIATRICIAN_DOCTORS = buildDoctorsForSpecialty({
  names: PEDIATRICIAN_NAMES,
  specialtySlug: 'pediatrician',
  title: 'Consultant Pediatrician',
  phoneSeries: '120',
  baseFee: 2000,
  emailPrefix: 'ped',
});

const DERMATOLOGIST_DOCTORS = buildDoctorsForSpecialty({
  names: DERMATOLOGIST_NAMES,
  specialtySlug: 'dermatologist',
  title: 'Consultant Dermatologist',
  phoneSeries: '130',
  baseFee: 2200,
  emailPrefix: 'derm',
});

// Preserve legacy demo accounts for the first doctor in each expanded specialty set.
GENERAL_PHYSICIAN_DOCTORS[0].email = 'dr.ayesha@carehub.test';
GENERAL_PHYSICIAN_DOCTORS[0].phone = '+923001000101';
PEDIATRICIAN_DOCTORS[0].email = 'dr.bilal@carehub.test';
PEDIATRICIAN_DOCTORS[0].phone = '+923001000104';
DERMATOLOGIST_DOCTORS[0].email = 'dr.sana@carehub.test';
DERMATOLOGIST_DOCTORS[0].phone = '+923001000103';
DERMATOLOGIST_DOCTORS[1].email = 'dr.tariq@carehub.test';
DERMATOLOGIST_DOCTORS[1].phone = '+923001000111';
DERMATOLOGIST_DOCTORS[1].city = 'Karachi';

const DEMO_DOCTORS = [
  ...GENERAL_PHYSICIAN_DOCTORS,
  ...PEDIATRICIAN_DOCTORS,
  ...DERMATOLOGIST_DOCTORS,
  ...OTHER_DEMO_DOCTORS,
];

const DEMO_CLINIC_ADDRESSES = {
  Lahore: [
    '14-A Main Boulevard, Gulberg III, Lahore',
    '22 Jail Road, Garden Town, Lahore',
    '45-D MM Alam Road, Gulberg, Lahore',
  ],
  Karachi: [
    'Shop 12, Block 5, Clifton, Karachi',
    'Plot 8, Stadium Road, Gulshan-e-Iqbal, Karachi',
    'Office 3, Khayaban-e-Shamsheer, DHA Phase 5, Karachi',
  ],
  Islamabad: [
    'Plot 22, F-8 Markaz, Islamabad',
    'Plaza 14, Blue Area, Jinnah Avenue, Islamabad',
    'House 9, Street 12, G-11 Markaz, Islamabad',
  ],
  Rawalpindi: ['Bank Road, Saddar, Rawalpindi', '6th Road, Satellite Town, Rawalpindi'],
  Faisalabad: ['Kohinoor City, Jaranwala Road, Faisalabad', 'D Ground, Civil Lines, Faisalabad'],
  Multan: ['Abdali Road, Cantt, Multan', 'Bosan Road, Gulgasht Colony, Multan'],
  Peshawar: ['University Road, Peshawar', 'Arbab Road, Saddar, Peshawar'],
};

const getClinicAddress = (city, index = 0) => {
  const addresses = DEMO_CLINIC_ADDRESSES[city];
  if (Array.isArray(addresses) && addresses.length) {
    return addresses[index % addresses.length];
  }
  return `${city} City Center`;
};

const MENTIONED_CITIES = ['Lahore', 'Karachi', 'Islamabad', 'Multan', 'Peshawar', 'Faisalabad', 'Sargodha'];

const HOSPITAL_DOCTOR_ROLES = [
  { specialtySlug: 'general-physician', title: 'Consultant General Physician', baseFee: 2200 },
  { specialtySlug: 'pediatrician', title: 'Consultant Pediatrician', baseFee: 2400 },
  { specialtySlug: 'dermatologist', title: 'Consultant Dermatologist', baseFee: 2600 },
  { specialtySlug: 'cardiologist', title: 'Consultant Cardiologist', baseFee: 3600 },
];

const HOSPITAL_DOCTOR_NAME_POOL = [
  ['Ahmed', 'Raza'],
  ['Sana', 'Gill'],
  ['Bilal', 'Hussain'],
  ['Aisha', 'Noor'],
  ['Faisal', 'Butt'],
  ['Hira', 'Saeed'],
  ['Usman', 'Chaudhry'],
  ['Nida', 'Kiani'],
  ['Kamran', 'Abbasi'],
  ['Laiba', 'Mir'],
  ['Saad', 'Anwar'],
  ['Maha', 'Sultan'],
  ['Rizwan', 'Haider'],
  ['Areej', 'Bukhari'],
  ['Shahid', 'Latif'],
  ['Zoya', 'Nazir'],
  ['Imran', 'Saleem'],
  ['Hania', 'Qadir'],
  ['Noman', 'Javed'],
  ['Saba', 'Rashid'],
  ['Tariq', 'Mahmood'],
  ['Eman', 'Akbar'],
  ['Waseem', 'Dar'],
  ['Palwasha', 'Khan'],
  ['Zeeshan', 'Arif'],
  ['Mahnoor', 'Shafi'],
  ['Adil', 'Yousaf'],
  ['Rabail', 'Hashmi'],
];

const CITY_HOSPITAL_DEFINITIONS = {
  Lahore: [
    {
      name: 'Shaukat Khanum Memorial Cancer Hospital',
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
          title: 'Consultant General Physician',
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
          title: 'Consultant Dermatologist',
          specialtySlug: 'dermatologist',
          yearsOfExperience: 18,
          consultationFee: 4200,
          gender: 'MALE',
        },
      ],
    },
    {
      name: 'Services Hospital',
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
          title: 'Consultant General Physician',
          specialtySlug: 'general-physician',
          yearsOfExperience: 15,
          consultationFee: 2800,
          gender: 'FEMALE',
        },
        {
          firstName: 'Waqas',
          lastName: 'Ali',
          email: 'dr.waqas.services@carehub.test',
          phone: '+923001000206',
          title: 'Consultant Pediatrician',
          specialtySlug: 'pediatrician',
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
          title: 'Consultant Cardiologist',
          specialtySlug: 'cardiologist',
          yearsOfExperience: 13,
          consultationFee: 2700,
          gender: 'MALE',
        },
      ],
    },
    {
      name: 'Mayo Hospital',
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
          title: 'Consultant Pediatrician',
          specialtySlug: 'pediatrician',
          yearsOfExperience: 14,
          consultationFee: 3000,
          gender: 'FEMALE',
        },
        {
          firstName: 'Shahzad',
          lastName: 'Iqbal',
          email: 'dr.shahzad.mayo@carehub.test',
          phone: '+923001000211',
          title: 'Consultant Dermatologist',
          specialtySlug: 'dermatologist',
          yearsOfExperience: 17,
          consultationFee: 3400,
          gender: 'MALE',
        },
        {
          firstName: 'Bushra',
          lastName: 'Khalid',
          email: 'dr.bushra.mayo@carehub.test',
          phone: '+923001000212',
          title: 'Consultant Cardiologist',
          specialtySlug: 'cardiologist',
          yearsOfExperience: 12,
          consultationFee: 2400,
          gender: 'FEMALE',
        },
      ],
    },
    {
      name: 'Hameed Latif Hospital',
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
          title: 'Consultant General Physician',
          specialtySlug: 'general-physician',
          yearsOfExperience: 16,
          consultationFee: 3500,
          gender: 'FEMALE',
        },
        {
          firstName: 'Hamza',
          lastName: 'Siddiqui',
          email: 'dr.hamza.hlh@carehub.test',
          phone: '+923001000214',
          title: 'Consultant Pediatrician',
          specialtySlug: 'pediatrician',
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
          title: 'Consultant Cardiologist',
          specialtySlug: 'cardiologist',
          yearsOfExperience: 19,
          consultationFee: 4500,
          gender: 'MALE',
        },
      ],
    },
  ],
  Karachi: [
    {
      name: 'Aga Khan University Hospital',
      address: 'Stadium Road, Karachi',
      description: 'Leading private tertiary care hospital in Karachi with advanced specialty services.',
      facilities: ['Emergency', 'ICU', 'Pharmacy', 'Laboratory', 'Radiology', 'Surgery'],
      rating: 4.8,
      reviewCount: 1500,
    },
    {
      name: 'Jinnah Postgraduate Medical Centre',
      address: 'Rafiqui Shaheed Road, Karachi',
      description: 'Major public teaching hospital providing tertiary care and postgraduate medical training.',
      facilities: ['Emergency', 'ICU', 'OPD', 'Pharmacy', 'Laboratory', 'Radiology'],
      rating: 4.5,
      reviewCount: 980,
    },
    {
      name: 'Liaquat National Hospital',
      address: 'National Stadium Road, Karachi',
      description: 'Renowned private hospital offering multi-specialty care and surgical services.',
      facilities: ['Emergency', 'ICU', 'Maternity', 'Pharmacy', 'Laboratory', 'Radiology', 'Parking'],
      rating: 4.6,
      reviewCount: 870,
    },
    {
      name: 'South City Hospital',
      address: 'Clifton Block 3, Karachi',
      description: 'Modern private hospital in Clifton serving patients across Karachi.',
      facilities: ['Emergency', 'ICU', 'OPD', 'Pharmacy', 'Laboratory', 'Radiology', 'Cafeteria'],
      rating: 4.4,
      reviewCount: 640,
    },
  ],
  Islamabad: [
    {
      name: 'Shifa International Hospital',
      address: 'Pitras Bukhari Road, H-8/4, Islamabad',
      description: 'Premier private hospital in Islamabad with comprehensive specialty departments.',
      facilities: ['Emergency', 'ICU', 'Pharmacy', 'Laboratory', 'Radiology', 'Surgery', 'Parking'],
      rating: 4.7,
      reviewCount: 920,
    },
    {
      name: 'Pakistan Institute of Medical Sciences',
      address: 'Shaheed-e-Millat Road, Islamabad',
      description: 'Federal tertiary care hospital and national referral center.',
      facilities: ['Emergency', 'ICU', 'OPD', 'Pharmacy', 'Laboratory', 'Radiology', 'Blood Bank'],
      rating: 4.3,
      reviewCount: 1100,
    },
    {
      name: 'Maroof International Hospital',
      address: 'F-10 Markaz, Islamabad',
      description: 'Private multi-specialty hospital in the F-10 sector.',
      facilities: ['Emergency', 'ICU', 'Maternity', 'Pharmacy', 'Laboratory', 'Radiology'],
      rating: 4.5,
      reviewCount: 520,
    },
    {
      name: 'KRL Hospital',
      address: 'Kahuta Road, Islamabad',
      description: 'Hospital serving Islamabad and surrounding areas with general and specialty care.',
      facilities: ['Emergency', 'ICU', 'OPD', 'Pharmacy', 'Laboratory', 'Radiology'],
      rating: 4.2,
      reviewCount: 410,
    },
  ],
  Multan: [
    {
      name: 'Nishtar Hospital',
      address: 'Nishtar Road, Multan',
      description: 'Major teaching hospital and referral center for southern Punjab.',
      facilities: ['Emergency', 'ICU', 'OPD', 'Pharmacy', 'Laboratory', 'Radiology', 'Surgery'],
      rating: 4.4,
      reviewCount: 780,
    },
    {
      name: 'Bakhtawar Amin Memorial Hospital',
      address: 'Abdali Road, Multan',
      description: 'Private hospital known for maternity and general medical services.',
      facilities: ['Emergency', 'Maternity', 'Pharmacy', 'Laboratory', 'Radiology'],
      rating: 4.3,
      reviewCount: 430,
    },
    {
      name: 'Medicare Hospital',
      address: 'Kutchery Road, Multan',
      description: 'Multi-specialty private hospital in central Multan.',
      facilities: ['Emergency', 'ICU', 'OPD', 'Pharmacy', 'Laboratory'],
      rating: 4.1,
      reviewCount: 360,
    },
    {
      name: 'Mukhtar Sheikh Memorial Hospital',
      address: 'Northern Bypass, Multan',
      description: 'Modern hospital offering surgical and diagnostic services.',
      facilities: ['Emergency', 'ICU', 'Pharmacy', 'Laboratory', 'Radiology', 'Parking'],
      rating: 4.2,
      reviewCount: 290,
    },
  ],
  Peshawar: [
    {
      name: 'Lady Reading Hospital',
      address: 'Hospital Road, Peshawar',
      description: 'Historic tertiary care hospital serving Khyber Pakhtunkhwa.',
      facilities: ['Emergency', 'Trauma Center', 'ICU', 'OPD', 'Pharmacy', 'Laboratory'],
      rating: 4.3,
      reviewCount: 850,
    },
    {
      name: 'Rehman Medical Institute',
      address: 'Phase 5 Hayatabad, Peshawar',
      description: 'Private teaching hospital with advanced specialty care.',
      facilities: ['Emergency', 'ICU', 'Pharmacy', 'Laboratory', 'Radiology', 'Surgery'],
      rating: 4.6,
      reviewCount: 540,
    },
    {
      name: 'Northwest General Hospital',
      address: 'Sector E-8, Phase 8, Hayatabad, Peshawar',
      description: 'Private hospital providing multi-specialty services in Hayatabad.',
      facilities: ['Emergency', 'ICU', 'Maternity', 'Pharmacy', 'Laboratory', 'Radiology'],
      rating: 4.4,
      reviewCount: 470,
    },
    {
      name: 'Khyber Teaching Hospital',
      address: 'University Road, Peshawar',
      description: 'Teaching hospital affiliated with Khyber Medical University.',
      facilities: ['Emergency', 'ICU', 'OPD', 'Pharmacy', 'Laboratory', 'Radiology'],
      rating: 4.2,
      reviewCount: 620,
    },
  ],
  Faisalabad: [
    {
      name: 'Allied Hospital',
      address: 'Sargodha Road, Faisalabad',
      description: 'Major public teaching hospital for Faisalabad division.',
      facilities: ['Emergency', 'ICU', 'OPD', 'Pharmacy', 'Laboratory', 'Radiology'],
      rating: 4.2,
      reviewCount: 700,
    },
    {
      name: 'Faisal Hospital',
      address: 'East Canal Road, Faisalabad',
      description: 'Private hospital offering general and specialty outpatient services.',
      facilities: ['Emergency', 'ICU', 'Pharmacy', 'Laboratory', 'Radiology'],
      rating: 4.1,
      reviewCount: 380,
    },
    {
      name: 'National Hospital',
      address: 'Jinnah Colony, Faisalabad',
      description: 'Trusted private hospital serving central Faisalabad.',
      facilities: ['Emergency', 'OPD', 'Pharmacy', 'Laboratory', 'Radiology', 'Parking'],
      rating: 4.0,
      reviewCount: 310,
    },
    {
      name: 'Saeed Hospital',
      address: 'Susan Road, Madina Town, Faisalabad',
      description: 'Community hospital with maternity and surgical facilities.',
      facilities: ['Emergency', 'Maternity', 'Pharmacy', 'Laboratory'],
      rating: 4.1,
      reviewCount: 260,
    },
  ],
  Sargodha: [
    {
      name: 'District Headquarters Hospital',
      address: 'Club Road, Sargodha',
      description: 'Primary public hospital for Sargodha district.',
      facilities: ['Emergency', 'ICU', 'OPD', 'Pharmacy', 'Laboratory'],
      rating: 4.0,
      reviewCount: 420,
    },
    {
      name: 'Faisal Hospital Sargodha',
      address: 'Queens Road, Sargodha',
      description: 'Private hospital providing general and specialty care.',
      facilities: ['Emergency', 'OPD', 'Pharmacy', 'Laboratory', 'Radiology'],
      rating: 4.1,
      reviewCount: 240,
    },
    {
      name: 'Al-Shifa Hospital',
      address: 'University Road, Sargodha',
      description: 'Private multi-specialty hospital near Sargodha University.',
      facilities: ['Emergency', 'ICU', 'Pharmacy', 'Laboratory'],
      rating: 4.2,
      reviewCount: 210,
    },
    {
      name: 'City Care Hospital',
      address: 'Fatima Jinnah Road, Sargodha',
      description: 'Community hospital serving Sargodha city and nearby areas.',
      facilities: ['Emergency', 'OPD', 'Pharmacy', 'Laboratory', 'Parking'],
      rating: 4.0,
      reviewCount: 180,
    },
  ],
};

const attachHospitalDoctors = (hospital, city, cityIndex, hospitalIndex) => {
  if (Array.isArray(hospital.doctors) && hospital.doctors.length === 4) {
    return { ...hospital, city };
  }

  const citySlug = slugify(city);
  const doctors = HOSPITAL_DOCTOR_ROLES.map((role, doctorIndex) => {
    const nameIndex =
      (cityIndex * 16 + hospitalIndex * 4 + doctorIndex) % HOSPITAL_DOCTOR_NAME_POOL.length;
    const [firstName, lastName] = HOSPITAL_DOCTOR_NAME_POOL[nameIndex];

    return {
      firstName,
      lastName,
      email: `dr.${citySlug}.h${hospitalIndex + 1}.d${doctorIndex + 1}@carehub.test`,
      phone: `+9232${String(cityIndex + 1)}${String(hospitalIndex + 1)}${String(doctorIndex + 1).padStart(5, '0')}`,
      title: role.title,
      specialtySlug: role.specialtySlug,
      yearsOfExperience: 8 + doctorIndex * 2 + hospitalIndex,
      consultationFee: role.baseFee + cityIndex * 100,
      gender: doctorIndex % 2 === 0 ? 'MALE' : 'FEMALE',
    };
  });

  return { ...hospital, city, doctors };
};

const CITY_HOSPITALS = MENTIONED_CITIES.flatMap((city, cityIndex) => {
  const hospitals = CITY_HOSPITAL_DEFINITIONS[city] ?? [];
  return hospitals.map((hospital, hospitalIndex) =>
    attachHospitalDoctors(hospital, city, cityIndex, hospitalIndex),
  );
});

const STANDARD_LAB_TESTS = [
  {
    name: 'Complete Blood Count (CBC)',
    description: 'Full blood count panel including RBC, WBC, hemoglobin, and platelets.',
    price: 1200,
    homeCollectionAvailable: true,
  },
  {
    name: 'Lipid Profile',
    description: 'Cholesterol, HDL, LDL, and triglycerides screening.',
    price: 2500,
    homeCollectionAvailable: true,
  },
  {
    name: 'Liver Function Test (LFT)',
    description: 'ALT, AST, bilirubin, and alkaline phosphatase panel.',
    price: 2200,
    homeCollectionAvailable: true,
  },
  {
    name: 'Kidney Function Test (KFT)',
    description: 'Serum creatinine, urea, and electrolytes panel.',
    price: 2100,
    homeCollectionAvailable: true,
  },
  {
    name: 'Thyroid Profile (T3, T4, TSH)',
    description: 'Thyroid hormone screening panel.',
    price: 2800,
    homeCollectionAvailable: true,
  },
  {
    name: 'HbA1c',
    description: 'Three-month average blood sugar test for diabetes monitoring.',
    price: 1800,
    homeCollectionAvailable: true,
  },
  {
    name: 'Urine Complete Examination',
    description: 'Routine urine analysis for infection and metabolic screening.',
    price: 800,
    homeCollectionAvailable: false,
  },
  {
    name: 'Vitamin D',
    description: '25-hydroxy vitamin D level test.',
    price: 3500,
    homeCollectionAvailable: true,
  },
  {
    name: 'Dengue NS1 Antigen',
    description: 'Early detection test for dengue fever.',
    price: 1500,
    homeCollectionAvailable: true,
  },
  {
    name: 'COVID-19 PCR',
    description: 'Molecular PCR test for SARS-CoV-2 detection.',
    price: 4500,
    homeCollectionAvailable: true,
  },
];

const CITY_LAB_DEFINITIONS = {
  Lahore: [
    { name: 'Chughtai Lab Gulberg', address: 'Main Boulevard, Gulberg III, Lahore' },
    { name: 'IDC Lab DHA', address: 'Y-Block, Phase 3, DHA, Lahore' },
    { name: 'Al-Razi Healthcare Lab', address: 'Ferozepur Road, Lahore' },
    { name: 'Test Zone Diagnostics', address: 'Model Town Link Road, Lahore' },
  ],
  Karachi: [
    { name: 'Excel Labs Clifton', address: 'Block 5, Clifton, Karachi' },
    { name: 'Chughtai Lab Karachi', address: 'Shaheed-e-Millat Road, Karachi' },
    { name: 'Aga Khan Clinical Lab', address: 'Stadium Road, Karachi' },
    { name: "Dr. Essa's Laboratory", address: 'Main Khayaban-e-Shamsheer, DHA Phase 5, Karachi' },
  ],
  Islamabad: [
    { name: 'Chughtai Lab Islamabad', address: 'F-8 Markaz, Islamabad' },
    { name: 'IDC Lab Blue Area', address: 'Jinnah Avenue, Blue Area, Islamabad' },
    { name: 'Shifa International Lab', address: 'Pitras Bukhari Road, H-8/4, Islamabad' },
    { name: 'Metro Medical Laboratory', address: 'G-9 Markaz, Islamabad' },
  ],
  Multan: [
    { name: 'Chughtai Lab Multan', address: 'Abdali Road, Multan' },
    { name: 'Niazi Lab', address: 'Kutchery Road, Multan' },
    { name: 'Al-Khidmat Diagnostic Center', address: 'Northern Bypass, Multan' },
    { name: 'City Lab Multan', address: 'Bosan Road, Multan' },
  ],
  Peshawar: [
    { name: 'Rehman Medical Lab', address: 'Phase 5 Hayatabad, Peshawar' },
    { name: 'Khyber Medical Lab', address: 'University Road, Peshawar' },
    { name: 'Chughtai Lab Peshawar', address: 'University Town, Peshawar' },
    { name: 'Hayatabad Diagnostic Center', address: 'Sector E-8, Hayatabad, Peshawar' },
  ],
  Faisalabad: [
    { name: 'Chughtai Lab Faisalabad', address: 'Susan Road, Madina Town, Faisalabad' },
    { name: 'Al-Noor Diagnostic Lab', address: 'Jinnah Colony, Faisalabad' },
    { name: 'Madina Laboratory', address: 'East Canal Road, Faisalabad' },
    { name: 'Chenab Lab', address: 'Sargodha Road, Faisalabad' },
  ],
  Sargodha: [
    { name: 'Chughtai Lab Sargodha', address: 'Queens Road, Sargodha' },
    { name: 'Al-Shifa Lab Sargodha', address: 'University Road, Sargodha' },
    { name: 'City Diagnostic Lab', address: 'Fatima Jinnah Road, Sargodha' },
    { name: 'Punjab Lab Sargodha', address: 'Club Road, Sargodha' },
  ],
};

const CITY_LABS = MENTIONED_CITIES.flatMap((city) =>
  (CITY_LAB_DEFINITIONS[city] ?? []).map((lab) => ({ ...lab, city })),
);

const SURGERY_HOSPITAL_FACILITIES = [
  'Emergency',
  'ICU',
  'Operation Theatre',
  'Pharmacy',
  'Laboratory',
  'Radiology',
  'Anesthesia',
  'Recovery Ward',
];

const SURGERY_PROCEDURE_TEMPLATES = [
  {
    key: 'appendectomy',
    name: 'Laparoscopic Appendectomy',
    category: 'General Surgery',
    description: 'Minimally invasive removal of the appendix with short recovery time.',
    min: 120000,
    max: 180000,
  },
  {
    key: 'cholecystectomy',
    name: 'Gallbladder Removal (Cholecystectomy)',
    category: 'General Surgery',
    description: 'Laparoscopic gallbladder surgery for gallstones and biliary disease.',
    min: 150000,
    max: 220000,
  },
  {
    key: 'hernia-repair',
    name: 'Inguinal Hernia Repair',
    category: 'General Surgery',
    description: 'Surgical repair of inguinal hernia with mesh reinforcement.',
    min: 100000,
    max: 160000,
  },
  {
    key: 'knee-replacement',
    name: 'Total Knee Replacement',
    category: 'Orthopedic Surgery',
    description: 'Joint replacement surgery for severe knee arthritis and mobility loss.',
    min: 450000,
    max: 650000,
  },
  {
    key: 'cataract-surgery',
    name: 'Phacoemulsification Cataract Surgery',
    category: 'Ophthalmology',
    description: 'Micro-incision cataract removal with intraocular lens implantation.',
    min: 80000,
    max: 140000,
  },
  {
    key: 'cesarean-section',
    name: 'Cesarean Section (C-Section)',
    category: 'Gynecology',
    description: 'Elective or emergency cesarean delivery with post-operative maternity care.',
    min: 180000,
    max: 280000,
  },
];

const CITY_SURGERY_HOSPITAL_DEFINITIONS = {
  Lahore: [
    {
      name: 'Ittefaq Hospital Surgical Centre',
      address: '1 H-Block, Model Town, Lahore',
      description: 'Dedicated surgical centre offering advanced laparoscopic and orthopedic procedures.',
      rating: 4.6,
      reviewCount: 540,
    },
    {
      name: 'Evercare Hospital Surgical Wing',
      address: '1 Khayaban-e-Firdousi, DHA Phase 5, Lahore',
      description: 'Multi-specialty surgical wing with modern operation theatres and ICU support.',
      rating: 4.7,
      reviewCount: 620,
    },
  ],
  Karachi: [
    {
      name: 'Patel Hospital Surgical Centre',
      address: 'ST-1, Block 4, Scheme 33, Gulzar-e-Hijri, Karachi',
      description: 'Established surgical hospital known for general and laparoscopic surgery.',
      rating: 4.5,
      reviewCount: 480,
    },
    {
      name: 'National Medical Centre Surgery',
      address: 'National Stadium Road, Karachi',
      description: 'Comprehensive surgical services with experienced consultant surgeons.',
      rating: 4.4,
      reviewCount: 410,
    },
  ],
  Islamabad: [
    {
      name: 'Kulsum International Surgical Hospital',
      address: '202 Sitara Market, G-9 Markaz, Islamabad',
      description: 'Private surgical hospital serving Islamabad and surrounding areas.',
      rating: 4.6,
      reviewCount: 390,
    },
    {
      name: 'Maroof International Surgical Centre',
      address: 'F-10 Markaz, Islamabad',
      description: 'Advanced surgical centre with specialty operation theatres.',
      rating: 4.5,
      reviewCount: 350,
    },
  ],
  Multan: [
    {
      name: 'Bakhtawar Amin Surgical Hospital',
      address: 'Abdali Road, Multan',
      description: 'Leading private surgical hospital in southern Punjab.',
      rating: 4.3,
      reviewCount: 280,
    },
    {
      name: 'Nishtar Surgical Centre',
      address: 'Nishtar Road, Multan',
      description: 'Surgical centre affiliated with major teaching hospital services.',
      rating: 4.2,
      reviewCount: 320,
    },
  ],
  Peshawar: [
    {
      name: 'Rehman Surgical Institute',
      address: 'Phase 5 Hayatabad, Peshawar',
      description: 'Specialized surgical institute with orthopedic and general surgery units.',
      rating: 4.5,
      reviewCount: 300,
    },
    {
      name: 'Lady Reading Surgical Centre',
      address: 'Hospital Road, Peshawar',
      description: 'Tertiary surgical centre for Khyber Pakhtunkhwa patients.',
      rating: 4.3,
      reviewCount: 360,
    },
  ],
  Faisalabad: [
    {
      name: 'Allied Surgical Hospital',
      address: 'Sargodha Road, Faisalabad',
      description: 'Major surgical hospital for Faisalabad division.',
      rating: 4.2,
      reviewCount: 250,
    },
    {
      name: 'National Surgical Centre Faisalabad',
      address: 'Jinnah Colony, Faisalabad',
      description: 'Private surgical centre with modern diagnostics and recovery facilities.',
      rating: 4.1,
      reviewCount: 220,
    },
  ],
  Sargodha: [
    {
      name: 'DHQ Surgical Wing',
      address: 'Club Road, Sargodha',
      description: 'Public surgical wing offering essential and elective procedures.',
      rating: 4.0,
      reviewCount: 180,
    },
    {
      name: 'City Care Surgical Hospital',
      address: 'Fatima Jinnah Road, Sargodha',
      description: 'Community surgical hospital for Sargodha and nearby districts.',
      rating: 4.1,
      reviewCount: 160,
    },
  ],
};

const CITY_SURGERY_HOSPITALS = MENTIONED_CITIES.flatMap((city) =>
  (CITY_SURGERY_HOSPITAL_DEFINITIONS[city] ?? []).map((hospital) => ({ ...hospital, city })),
);

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
  console.log(`  - General Physician: ${GENERAL_PHYSICIAN_DOCTORS.length}`);
  console.log(`  - Pediatrician: ${PEDIATRICIAN_DOCTORS.length}`);
  console.log(`  - Dermatologist: ${DERMATOLOGIST_DOCTORS.length}`);

  for (const [index, doc] of DEMO_DOCTORS.entries()) {
    const user = await User.findOne({ email: doc.email });
    if (!user) continue;

    const doctor = await Doctor.findOne({ userId: user._id });
    if (!doctor) continue;

    const clinicName = `${doc.firstName} ${doc.lastName} Clinic`;
    const address = getClinicAddress(doc.city, index);

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
        $unset: { location: '' },
      },
      { upsert: true },
    );
  }
  console.log(`Seeded in-clinic locations for ${DEMO_DOCTORS.length} demo doctors`);

  const english = await Language.findOne({ code: 'en' });
  const urdu = await Language.findOne({ code: 'ur' });

  let hospitalDoctorCount = 0;

  for (const hospital of CITY_HOSPITALS) {
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

    const citySlug = slugify(hospital.city);
    const hospitalSlug = slugify(hospital.name);
    const enrichment = getHospitalEnrichment(citySlug, hospitalSlug);

    await Hospital.updateOne(
      { citySlug, slug: hospitalSlug },
      {
        $set: {
          name: hospital.name,
          city: hospital.city,
          address: hospital.address,
          description: hospital.description,
          facilities: hospital.facilities,
          slug: hospitalSlug,
          citySlug,
          doctorIds,
          isActive: true,
          rating: hospital.rating,
          reviewCount: hospital.reviewCount,
          phone: enrichment.phone,
          email: enrichment.email,
          website: enrichment.website,
          images: enrichment.images,
        },
        $unset: { location: '' },
      },
      { upsert: true },
    );
  }

  // Soft-deactivate the old short-named Shaukat Khanum seed if it still exists
  await Hospital.updateOne(
    { citySlug: 'lahore', slug: 'shaukat-khanum-memorial' },
    { $set: { isActive: false } },
  );

  console.log(
    `Seeded ${CITY_HOSPITALS.length} hospitals (${MENTIONED_CITIES.length} cities × 4 hospitals) with ${hospitalDoctorCount} linked doctors`,
  );
  for (const city of MENTIONED_CITIES) {
    const count = CITY_HOSPITAL_DEFINITIONS[city]?.length ?? 0;
    console.log(`  - ${city}: ${count} hospitals`);
  }

  let labTestCount = 0;

  for (const lab of CITY_LABS) {
    const citySlug = slugify(lab.city);
    const labSlug = slugify(lab.name);
    const enrichment = getLabEnrichment(citySlug, labSlug);

    const record = await Lab.findOneAndUpdate(
      { citySlug, slug: labSlug },
      {
        $set: {
          name: lab.name,
          city: lab.city,
          address: lab.address,
          slug: labSlug,
          citySlug,
          phone: enrichment.phone,
          email: enrichment.email,
          website: enrichment.website,
          images: enrichment.images,
          description: enrichment.description,
          timings: enrichment.timings,
          rating: enrichment.rating,
          isActive: true,
        },
      },
      { upsert: true, new: true },
    );

    for (const test of STANDARD_LAB_TESTS) {
      await LabTest.updateOne(
        { labId: record._id, name: test.name },
        {
          $set: {
            labId: record._id,
            name: test.name,
            description: test.description,
            price: test.price,
            currency: 'PKR',
            homeCollectionAvailable: test.homeCollectionAvailable,
            isActive: true,
          },
        },
        { upsert: true },
      );
      labTestCount += 1;
    }
  }

  console.log(
    `Seeded ${CITY_LABS.length} labs (${MENTIONED_CITIES.length} cities × 4 labs) with ${STANDARD_LAB_TESTS.length} tests each (${labTestCount} total tests)`,
  );
  for (const city of MENTIONED_CITIES) {
    const count = CITY_LAB_DEFINITIONS[city]?.length ?? 0;
    console.log(`  - ${city}: ${count} labs`);
  }

  let surgeryProcedureCount = 0;

  for (const hospital of CITY_SURGERY_HOSPITALS) {
    const hospitalSlug = slugify(hospital.name);
    const citySlug = slugify(hospital.city);
    const enrichment = getHospitalEnrichment(citySlug, hospitalSlug);

    const record = await Hospital.findOneAndUpdate(
      { citySlug, slug: hospitalSlug },
      {
        $set: {
          name: hospital.name,
          city: hospital.city,
          address: hospital.address,
          description: hospital.description,
          facilities: SURGERY_HOSPITAL_FACILITIES,
          slug: hospitalSlug,
          citySlug,
          doctorIds: [],
          isActive: true,
          offersSurgeries: true,
          rating: hospital.rating,
          reviewCount: hospital.reviewCount,
          phone: enrichment.phone,
          email: enrichment.email,
          website: enrichment.website,
          images: enrichment.images,
        },
        $unset: { location: '' },
      },
      { upsert: true, new: true },
    );

    for (const template of SURGERY_PROCEDURE_TEMPLATES) {
      const procedureSlug = `${citySlug}-${hospitalSlug}-${template.key}`;

      await SurgeryProcedure.updateOne(
        { slug: procedureSlug },
        {
          $set: {
            name: template.name,
            slug: procedureSlug,
            description: template.description,
            category: template.category,
            estimatedCostRange: { min: template.min, max: template.max },
            currency: 'PKR',
            hospitalIds: [record._id],
            isActive: true,
          },
        },
        { upsert: true },
      );
      surgeryProcedureCount += 1;
    }
  }

  console.log(
    `Seeded ${CITY_SURGERY_HOSPITALS.length} surgery hospitals (${MENTIONED_CITIES.length} cities × 2) with ${SURGERY_PROCEDURE_TEMPLATES.length} surgeries each (${surgeryProcedureCount} total procedures)`,
  );
  for (const city of MENTIONED_CITIES) {
    const count = CITY_SURGERY_HOSPITAL_DEFINITIONS[city]?.length ?? 0;
    console.log(`  - ${city}: ${count} surgery hospitals`);
  }

  const pharmacies = [
    { name: 'D-Well Pharma', city: 'Lahore', address: 'MM Alam Road, Gulberg' },
    { name: 'Sehat Pharmacy', city: 'Karachi', address: 'PECHS Block 6' },
    { name: 'Green Plus Pharmacy', city: 'Islamabad', address: 'Jinnah Avenue, Blue Area' },
    { name: 'Care Mart Pharmacy', city: 'Multan', address: 'Bosan Road, Gulgasht' },
  ];

  // Sparse unique index skips missing fields, not explicit nulls
  await Pharmacy.updateMany({ userId: null }, { $unset: { userId: 1 } });

  for (const pharmacy of pharmacies) {
    const citySlug = slugify(pharmacy.city);
    const pharmacySlug = slugify(pharmacy.name);
    const enrichment = getPharmacyEnrichment(citySlug, pharmacySlug);

    const record = await Pharmacy.findOneAndUpdate(
      { citySlug, slug: pharmacySlug },
      {
        $set: {
          ...pharmacy,
          slug: pharmacySlug,
          citySlug,
          description: enrichment.description,
          phone: enrichment.phone,
          email: enrichment.email,
          website: enrichment.website,
          images: enrichment.images,
          rating: enrichment.rating,
          timings: enrichment.timings,
          isHomeDelivery: enrichment.isHomeDelivery,
          deliveryFee: enrichment.deliveryFee,
          deliveryTime: enrichment.deliveryTime,
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

  const pharmacyAccounts = [
    {
      email: 'pharmacy.dwell@carehub.test',
      firstName: 'D-Well',
      lastName: 'Manager',
      phone: '+923001100001',
      pharmacySlug: slugify('D-Well Pharma'),
      citySlug: slugify('Lahore'),
    },
    {
      email: 'pharmacy.sehat@carehub.test',
      firstName: 'Sehat',
      lastName: 'Manager',
      phone: '+923001100002',
      pharmacySlug: slugify('Sehat Pharmacy'),
      citySlug: slugify('Karachi'),
    },
    {
      email: 'pharmacy.greenplus@carehub.test',
      firstName: 'Green Plus',
      lastName: 'Manager',
      phone: '+923001100003',
      pharmacySlug: slugify('Green Plus Pharmacy'),
      citySlug: slugify('Islamabad'),
    },
    {
      email: 'pharmacy.caremart@carehub.test',
      firstName: 'Care Mart',
      lastName: 'Manager',
      phone: '+923001100004',
      pharmacySlug: slugify('Care Mart Pharmacy'),
      citySlug: slugify('Multan'),
    },
  ];

  for (const account of pharmacyAccounts) {
    let user = await User.findOne({ email: account.email });
    if (!user) {
      user = await User.create({
        firstName: account.firstName,
        lastName: account.lastName,
        email: account.email,
        phone: account.phone,
        passwordHash,
        role: UserRole.PHARMACY,
        isActive: true,
        isEmailVerified: true,
      });
    } else if (user.role !== UserRole.PHARMACY) {
      user.role = UserRole.PHARMACY;
      user.passwordHash = passwordHash;
      user.isActive = true;
      user.isEmailVerified = true;
      await user.save();
    }

    await Pharmacy.updateOne(
      { citySlug: account.citySlug, slug: account.pharmacySlug },
      { $set: { userId: user._id } },
    );
    console.log(`Pharmacy user: ${account.email} / Password123!`);
  }

  await mongoose.disconnect();
  console.log('Seed completed successfully');
};

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
