const MedicalRecordType = Object.freeze({
  REPORT: 'REPORT',
  SCAN: 'SCAN',
  IMAGE: 'IMAGE',
  LAB: 'LAB',
  OTHER: 'OTHER',
});

const MEDICAL_RECORD_TYPES = Object.values(MedicalRecordType);

module.exports = { MedicalRecordType, MEDICAL_RECORD_TYPES };
