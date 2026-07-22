/**
 * Public contact details and facility imagery for seeded hospitals & labs.
 * Keys: `${citySlug}|${facilitySlug}` (slugify of name).
 */

const IMG = {
  hospital1: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1200&q=80&auto=format&fit=crop',
  hospital2: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=1200&q=80&auto=format&fit=crop',
  hospital3: 'https://images.unsplash.com/photo-1538108141814-8e0e75c5e45e?w=1200&q=80&auto=format&fit=crop',
  hospital4: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=1200&q=80&auto=format&fit=crop',
  hospital5: 'https://images.unsplash.com/photo-1631217868264-e5b90bb7e630?w=1200&q=80&auto=format&fit=crop',
  hospital6: 'https://images.unsplash.com/photo-1666214280557-f1b5022eb634?w=1200&q=80&auto=format&fit=crop',
  hospital7: 'https://images.unsplash.com/photo-1551076805-e1869033fa41?w=1200&q=80&auto=format&fit=crop',
  hospital8: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=1200&q=80&auto=format&fit=crop',
  surgery1: 'https://images.unsplash.com/photo-1551190822-a9333d879b1f?w=1200&q=80&auto=format&fit=crop',
  surgery2: 'https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=1200&q=80&auto=format&fit=crop',
  surgery3: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&q=80&auto=format&fit=crop',
  surgery4: 'https://images.unsplash.com/photo-1504439468489-c8920d796a29?w=1200&q=80&auto=format&fit=crop',
  lab1: 'https://images.unsplash.com/photo-1579154204601-01588fcc3518?w=1200&q=80&auto=format&fit=crop',
  lab2: 'https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=1200&q=80&auto=format&fit=crop',
  lab3: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=1200&q=80&auto=format&fit=crop',
  lab4: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?w=1200&q=80&auto=format&fit=crop',
  lab5: 'https://images.unsplash.com/photo-1581093588401-fbb62a02f120?w=1200&q=80&auto=format&fit=crop',
  lab6: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1200&q=80&auto=format&fit=crop',
  pharmacy1: 'https://images.unsplash.com/photo-1587854692152-cf660a4e3718?w=1200&q=80&auto=format&fit=crop',
  pharmacy2: 'https://images.unsplash.com/photo-1576602976047-174e57a47881?w=1200&q=80&auto=format&fit=crop',
  pharmacy3: 'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=1200&q=80&auto=format&fit=crop',
  pharmacy4: 'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=1200&q=80&auto=format&fit=crop',
};

const hospital = (phone, email, website, images) => ({
  phone,
  email,
  website,
  images: Array.isArray(images) ? images : [images],
});

const lab = (phone, email, website, images, extras = {}) => ({
  phone,
  email,
  website,
  images: Array.isArray(images) ? images : [images],
  timings: extras.timings || 'Mon–Sat: 8:00 AM – 9:00 PM · Sun: 9:00 AM – 5:00 PM',
  rating: extras.rating ?? 4.6,
  description:
    extras.description ||
    'Accredited diagnostic laboratory offering pathology, molecular testing, and home sample collection.',
});

const pharmacy = (phone, email, website, images, extras = {}) => ({
  phone,
  email,
  website,
  images: Array.isArray(images) ? images : [images],
  timings: extras.timings || 'Mon–Sun: 9:00 AM – 10:00 PM',
  rating: extras.rating ?? 4.5,
  description:
    extras.description ||
    'Licensed pharmacy offering authentic medicines with home delivery and prescription support.',
  isHomeDelivery: extras.isHomeDelivery !== false,
  deliveryFee: extras.deliveryFee ?? 150,
  deliveryTime: extras.deliveryTime || '45–90 min',
});

const HOSPITAL_ENRICHMENT = {
  'lahore|shaukat-khanum-memorial-cancer-hospital': hospital('+92-42-35905000', 'info@skm.org.pk', 'https://shaukatkhanum.org.pk', [IMG.hospital1, IMG.hospital5]),
  'lahore|services-hospital': hospital('+92-42-99203402', 'info@serviceshospital.gop.pk', 'https://serviceshospital.gop.pk', [IMG.hospital2, IMG.hospital7]),
  'lahore|mayo-hospital': hospital('+92-42-99211100', 'info@mayohospital.gop.pk', 'https://mayohospital.gop.pk', [IMG.hospital3, IMG.hospital8]),
  'lahore|hameed-latif-hospital': hospital('+92-42-111-000-043', 'info@hameedlatifhospital.com', 'https://www.hameedlatifhospital.com', [IMG.hospital4, IMG.hospital6]),
  'lahore|ittefaq-hospital-surgical-centre': hospital('+92-42-111-000-033', 'info@ittefaqhospital.com', 'https://www.ittefaqhospital.com', [IMG.surgery1, IMG.surgery3]),
  'lahore|evercare-hospital-surgical-wing': hospital('+92-42-111-883-883', 'info@evercarepk.com', 'https://www.evercare.pk', [IMG.surgery2, IMG.surgery4]),

  'karachi|aga-khan-university-hospital': hospital('+92-21-111-911-911', 'patient.care@aku.edu', 'https://hospitals.aku.edu', [IMG.hospital5, IMG.hospital1]),
  'karachi|jinnah-postgraduate-medical-centre': hospital('+92-21-99201300', 'info@jpmc.edu.pk', 'https://www.jpmc.edu.pk', [IMG.hospital6, IMG.hospital2]),
  'karachi|liaquat-national-hospital': hospital('+92-21-34412610', 'info@lnh.edu.pk', 'https://www.lnh.edu.pk', [IMG.hospital7, IMG.hospital3]),
  'karachi|south-city-hospital': hospital('+92-21-111-724-724', 'info@southcityhospital.org', 'https://www.southcityhospital.org', [IMG.hospital8, IMG.hospital4]),
  'karachi|patel-hospital-surgical-centre': hospital('+92-21-111-174-174', 'info@patel-hospital.com', 'https://www.patel-hospital.com', [IMG.surgery3, IMG.surgery1]),
  'karachi|national-medical-centre-surgery': hospital('+92-21-34931951', 'info@nmc.pk', 'https://www.nmckhi.com', [IMG.surgery4, IMG.surgery2]),

  'islamabad|shifa-international-hospital': hospital('+92-51-8464646', 'info@shifa.com.pk', 'https://www.shifa.com.pk', [IMG.hospital1, IMG.hospital6]),
  'islamabad|pakistan-institute-of-medical-sciences': hospital('+92-51-9261170', 'info@pims.gov.pk', 'https://www.pims.gov.pk', [IMG.hospital2, IMG.hospital5]),
  'islamabad|maroof-international-hospital': hospital('+92-51-111-600-600', 'info@maroof.com.pk', 'https://www.maroof.com.pk', [IMG.hospital3, IMG.hospital7]),
  'islamabad|krl-hospital': hospital('+92-51-9248223', 'info@krlhospital.gov.pk', 'https://www.krl.org.pk', [IMG.hospital4, IMG.hospital8]),
  'islamabad|kulsum-international-surgical-hospital': hospital('+92-51-8446666', 'info@kih.com.pk', 'https://www.kih.com.pk', [IMG.surgery1, IMG.surgery4]),
  'islamabad|maroof-international-surgical-centre': hospital('+92-51-111-600-600', 'surgery@maroof.com.pk', 'https://www.maroof.com.pk', [IMG.surgery2, IMG.surgery3]),

  'multan|nishtar-hospital': hospital('+92-61-9200231', 'info@nishtar.org.pk', 'https://www.nishtar.edu.pk', [IMG.hospital5, IMG.hospital2]),
  'multan|bakhtawar-amin-memorial-hospital': hospital('+92-61-111-000-012', 'info@bakhtawaramin.com', 'https://www.bakhtawaramin.com', [IMG.hospital6, IMG.hospital1]),
  'multan|medicare-hospital': hospital('+92-61-4540404', 'info@medicarehospital.pk', 'https://www.medicarehospital.pk', [IMG.hospital7, IMG.hospital3]),
  'multan|mukhtar-sheikh-memorial-hospital': hospital('+92-61-4578900', 'info@msmhospital.com', 'https://www.msmhospital.com', [IMG.hospital8, IMG.hospital4]),
  'multan|bakhtawar-amin-surgical-hospital': hospital('+92-61-111-000-012', 'surgery@bakhtawaramin.com', 'https://www.bakhtawaramin.com', [IMG.surgery3, IMG.surgery2]),
  'multan|nishtar-surgical-centre': hospital('+92-61-9200231', 'surgery@nishtar.org.pk', 'https://www.nishtar.edu.pk', [IMG.surgery4, IMG.surgery1]),

  'peshawar|lady-reading-hospital': hospital('+92-91-9211430', 'info@lrh.edu.pk', 'https://www.lrh.edu.pk', [IMG.hospital1, IMG.hospital7]),
  'peshawar|rehman-medical-institute': hospital('+92-91-5838000', 'info@rmi.edu.pk', 'https://www.rmi.edu.pk', [IMG.hospital2, IMG.hospital8]),
  'peshawar|northwest-general-hospital': hospital('+92-91-5825501', 'info@nwgh.pk', 'https://www.nwgh.pk', [IMG.hospital3, IMG.hospital5]),
  'peshawar|khyber-teaching-hospital': hospital('+92-91-9214014', 'info@kth.edu.pk', 'https://www.kth.edu.pk', [IMG.hospital4, IMG.hospital6]),
  'peshawar|rehman-surgical-institute': hospital('+92-91-5838000', 'surgery@rmi.edu.pk', 'https://www.rmi.edu.pk', [IMG.surgery1, IMG.surgery2]),
  'peshawar|lady-reading-surgical-centre': hospital('+92-91-9211430', 'surgery@lrh.edu.pk', 'https://www.lrh.edu.pk', [IMG.surgery3, IMG.surgery4]),

  'faisalabad|allied-hospital': hospital('+92-41-9210080', 'info@alliedhospital.gop.pk', 'https://www.fjmu.edu.pk', [IMG.hospital5, IMG.hospital3]),
  'faisalabad|faisal-hospital': hospital('+92-41-8711000', 'info@faisalhospital.com', 'https://www.faisalhospital.com', [IMG.hospital6, IMG.hospital4]),
  'faisalabad|national-hospital': hospital('+92-41-8711222', 'info@nationalhospitalfsd.com', 'https://www.nationalhospitalfsd.com', [IMG.hospital7, IMG.hospital1]),
  'faisalabad|saeed-hospital': hospital('+92-41-8788000', 'info@saeedhospital.com', 'https://www.saeedhospital.com', [IMG.hospital8, IMG.hospital2]),
  'faisalabad|allied-surgical-hospital': hospital('+92-41-9210080', 'surgery@alliedhospital.gop.pk', 'https://www.fjmu.edu.pk', [IMG.surgery2, IMG.surgery1]),
  'faisalabad|national-surgical-centre-faisalabad': hospital('+92-41-8711222', 'surgery@nationalhospitalfsd.com', 'https://www.nationalhospitalfsd.com', [IMG.surgery4, IMG.surgery3]),

  'sargodha|district-headquarters-hospital': hospital('+92-48-9230055', 'info@dhqsargodha.gop.pk', 'https://www.dhqsargodha.gop.pk', [IMG.hospital1, IMG.hospital4]),
  'sargodha|faisal-hospital-sargodha': hospital('+92-48-3721000', 'info@faisalhospitalsgd.com', 'https://www.faisalhospitalsgd.com', [IMG.hospital2, IMG.hospital6]),
  'sargodha|al-shifa-hospital': hospital('+92-48-3715000', 'info@alshifahospital.pk', 'https://www.alshifahospital.pk', [IMG.hospital3, IMG.hospital8]),
  'sargodha|city-care-hospital': hospital('+92-48-3722222', 'info@citycarehospital.pk', 'https://www.citycarehospital.pk', [IMG.hospital4, IMG.hospital5]),
  'sargodha|dhq-surgical-wing': hospital('+92-48-9230055', 'surgery@dhqsargodha.gop.pk', 'https://www.dhqsargodha.gop.pk', [IMG.surgery1, IMG.surgery3]),
  'sargodha|city-care-surgical-hospital': hospital('+92-48-3722222', 'surgery@citycarehospital.pk', 'https://www.citycarehospital.pk', [IMG.surgery2, IMG.surgery4]),
};

const LAB_ENRICHMENT = {
  'lahore|chughtai-lab-gulberg': lab('+92-42-111-456-789', 'info@chughtailab.com', 'https://chughtailab.com', [IMG.lab1, IMG.lab3], { rating: 4.8, description: 'Pakistan’s largest pathology network with ISO-accredited testing and home sampling.' }),
  'lahore|idc-lab-dha': lab('+92-42-35734000', 'info@idc.net.pk', 'https://www.idc.net.pk', [IMG.lab2, IMG.lab4], { rating: 4.7, description: 'Islamabad Diagnostic Centre Lahore branch offering advanced imaging and pathology.' }),
  'lahore|al-razi-healthcare-lab': lab('+92-42-111-000-123', 'lab@alrazihealthcare.com', 'https://www.alrazihealthcare.com', [IMG.lab3, IMG.lab5]),
  'lahore|test-zone-diagnostics': lab('+92-42-35888801', 'info@testzone.pk', 'https://www.testzone.pk', [IMG.lab4, IMG.lab6]),

  'karachi|excel-labs-clifton': lab('+92-21-111-000-234', 'info@excellabs.com.pk', 'https://www.excellabs.com.pk', [IMG.lab5, IMG.lab1], { rating: 4.7 }),
  'karachi|chughtai-lab-karachi': lab('+92-21-111-456-789', 'karachi@chughtailab.com', 'https://chughtailab.com', [IMG.lab6, IMG.lab2], { rating: 4.8 }),
  'karachi|aga-khan-clinical-lab': lab('+92-21-111-911-911', 'lab@aku.edu', 'https://hospitals.aku.edu', [IMG.lab1, IMG.lab4], { rating: 4.9, description: 'Aga Khan University Hospital clinical laboratories with international quality standards.' }),
  'karachi|dr-essas-laboratory': lab('+92-21-111-000-372', 'info@essalab.com', 'https://www.essalab.com', [IMG.lab2, IMG.lab5]),

  'islamabad|chughtai-lab-islamabad': lab('+92-51-111-456-789', 'islamabad@chughtailab.com', 'https://chughtailab.com', [IMG.lab3, IMG.lab6], { rating: 4.8 }),
  'islamabad|idc-lab-blue-area': lab('+92-51-111-000-432', 'info@idc.net.pk', 'https://www.idc.net.pk', [IMG.lab4, IMG.lab1], { rating: 4.7 }),
  'islamabad|shifa-international-lab': lab('+92-51-8464646', 'lab@shifa.com.pk', 'https://www.shifa.com.pk', [IMG.lab5, IMG.lab2], { rating: 4.8 }),
  'islamabad|metro-medical-laboratory': lab('+92-51-2851234', 'info@metrolab.pk', 'https://www.metrolab.pk', [IMG.lab6, IMG.lab3]),

  'multan|chughtai-lab-multan': lab('+92-61-111-456-789', 'multan@chughtailab.com', 'https://chughtailab.com', [IMG.lab1, IMG.lab5], { rating: 4.7 }),
  'multan|niazi-lab': lab('+92-61-4512345', 'info@niazilab.com', 'https://www.niazilab.com', [IMG.lab2, IMG.lab6]),
  'multan|al-khidmat-diagnostic-center': lab('+92-61-4578901', 'lab@alkhidmat.org', 'https://www.alkhidmat.org', [IMG.lab3, IMG.lab4]),
  'multan|city-lab-multan': lab('+92-61-4580123', 'info@citylabmultan.com', 'https://www.citylabmultan.com', [IMG.lab4, IMG.lab5]),

  'peshawar|rehman-medical-lab': lab('+92-91-5838000', 'lab@rmi.edu.pk', 'https://www.rmi.edu.pk', [IMG.lab5, IMG.lab1], { rating: 4.8 }),
  'peshawar|khyber-medical-lab': lab('+92-91-5841234', 'info@khyberlab.pk', 'https://www.khyberlab.pk', [IMG.lab6, IMG.lab2]),
  'peshawar|chughtai-lab-peshawar': lab('+92-91-111-456-789', 'peshawar@chughtailab.com', 'https://chughtailab.com', [IMG.lab1, IMG.lab3], { rating: 4.7 }),
  'peshawar|hayatabad-diagnostic-center': lab('+92-91-5812345', 'info@hayatabaddc.pk', 'https://www.hayatabaddc.pk', [IMG.lab2, IMG.lab4]),

  'faisalabad|chughtai-lab-faisalabad': lab('+92-41-111-456-789', 'faisalabad@chughtailab.com', 'https://chughtailab.com', [IMG.lab3, IMG.lab5], { rating: 4.7 }),
  'faisalabad|al-noor-diagnostic-lab': lab('+92-41-8712345', 'info@alnoorlab.pk', 'https://www.alnoorlab.pk', [IMG.lab4, IMG.lab6]),
  'faisalabad|madina-laboratory': lab('+92-41-2429182', 'lab@mth.edu.pk', 'https://www.umc.edu.pk', [IMG.lab5, IMG.lab1]),
  'faisalabad|chenab-lab': lab('+92-41-8789012', 'info@chenablab.pk', 'https://www.chenablab.pk', [IMG.lab6, IMG.lab2]),

  'sargodha|chughtai-lab-sargodha': lab('+92-48-111-456-789', 'sargodha@chughtailab.com', 'https://chughtailab.com', [IMG.lab1, IMG.lab4], { rating: 4.6 }),
  'sargodha|al-shifa-lab-sargodha': lab('+92-48-3712345', 'info@alshifalab.pk', 'https://www.alshifalab.pk', [IMG.lab2, IMG.lab5]),
  'sargodha|city-diagnostic-lab': lab('+92-48-3723456', 'info@citydiagnostic.pk', 'https://www.citydiagnostic.pk', [IMG.lab3, IMG.lab6]),
  'sargodha|punjab-lab-sargodha': lab('+92-48-3734567', 'info@punjablab.pk', 'https://www.punjablab.pk', [IMG.lab4, IMG.lab1]),
};

const PHARMACY_ENRICHMENT = {
  'lahore|d-well-pharma': pharmacy(
    '+92-42-35781234',
    'hello@dwellpharma.pk',
    'https://www.dwellpharma.pk',
    [IMG.pharmacy1, IMG.pharmacy3],
    {
      rating: 4.7,
      description: 'Premium Gulberg pharmacy with verified medicines, vaccine fridge, and same-day delivery across Lahore.',
      deliveryFee: 120,
      deliveryTime: '30–60 min',
    },
  ),
  'karachi|sehat-pharmacy': pharmacy(
    '+92-21-34311234',
    'care@sehatpharmacy.pk',
    'https://www.sehatpharmacy.pk',
    [IMG.pharmacy2, IMG.pharmacy4],
    {
      rating: 4.6,
      description: 'Neighbourhood PECHS pharmacy focused on chronic care medicines, OTC wellness, and reliable home delivery.',
      deliveryFee: 150,
      deliveryTime: '45–90 min',
    },
  ),
  'islamabad|green-plus-pharmacy': pharmacy(
    '+92-51-2345678',
    'info@greenpluspharmacy.pk',
    'https://www.greenpluspharmacy.pk',
    [IMG.pharmacy3, IMG.pharmacy1],
    {
      rating: 4.8,
      description: 'Blue Area pharmacy with compounding support, diabetic care aisle, and city-wide delivery.',
      deliveryFee: 100,
      deliveryTime: '40–75 min',
    },
  ),
  'multan|care-mart-pharmacy': pharmacy(
    '+92-61-4516789',
    'orders@caremartpharmacy.pk',
    'https://www.caremartpharmacy.pk',
    [IMG.pharmacy4, IMG.pharmacy2],
    {
      rating: 4.5,
      description: 'Trusted Multan pharmacy for branded and generic medicines with evening delivery windows.',
    },
  ),
};

const getHospitalEnrichment = (citySlug, slug) =>
  HOSPITAL_ENRICHMENT[`${citySlug}|${slug}`] || {
    phone: '',
    email: '',
    website: '',
    images: [IMG.hospital1],
  };

const getLabEnrichment = (citySlug, slug) =>
  LAB_ENRICHMENT[`${citySlug}|${slug}`] || {
    phone: '',
    email: '',
    website: '',
    images: [IMG.lab1],
    timings: 'Mon–Sat: 8:00 AM – 9:00 PM · Sun: 9:00 AM – 5:00 PM',
    rating: 4.5,
    description: 'Diagnostic laboratory offering pathology and home sample collection.',
  };

const getPharmacyEnrichment = (citySlug, slug) =>
  PHARMACY_ENRICHMENT[`${citySlug}|${slug}`] || {
    phone: '',
    email: '',
    website: '',
    images: [IMG.pharmacy1],
    timings: 'Mon–Sun: 9:00 AM – 10:00 PM',
    rating: 4.5,
    description: 'Licensed pharmacy offering authentic medicines with home delivery.',
    isHomeDelivery: true,
    deliveryFee: 150,
    deliveryTime: '45–90 min',
  };

module.exports = {
  IMG,
  HOSPITAL_ENRICHMENT,
  LAB_ENRICHMENT,
  PHARMACY_ENRICHMENT,
  getHospitalEnrichment,
  getLabEnrichment,
  getPharmacyEnrichment,
};
