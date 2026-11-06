const { buildPatientPrompt, PATIENT_SUGGESTIONS } = require('../prompts/patient.prompt');

/** Agent definition: its prompt builder and quick-start suggestions. Tools are tagged agent: 'PATIENT'. */
module.exports = {
  name: 'PATIENT',
  label: 'Patient Assistant',
  tagline: 'Ask about doctors, labs, medicines & more',
  welcome: 'Find doctors, book appointments, compare lab prices, order medicines and more.',
  buildSystemPrompt: buildPatientPrompt,
  suggestions: PATIENT_SUGGESTIONS,
};
