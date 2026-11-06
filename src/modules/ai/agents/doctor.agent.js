const { buildDoctorPrompt, DOCTOR_SUGGESTIONS } = require('../prompts/doctor.prompt');

module.exports = {
  name: 'DOCTOR',
  label: 'Doctor Assistant',
  tagline: 'Appointments, patients, prescriptions & analytics',
  welcome: 'Review your day, manage requests and schedule, look up your patients and track your practice.',
  buildSystemPrompt: buildDoctorPrompt,
  suggestions: DOCTOR_SUGGESTIONS,
};
