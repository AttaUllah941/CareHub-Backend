/**
 * Intent router.
 *
 * Two responsibilities, both deterministic and cheap (no extra LLM call):
 *  1. Patients only: detect emergency language so urgent-care guidance is always shown, even if
 *     the model fails. (Doctors and admins discuss clinical topics professionally; no banner.)
 *  2. Infer which domains a message is about, so only the relevant tools are offered to the
 *     model. Fewer tools means better tool selection, lower token cost and a smaller attack surface.
 *
 * Which AGENT handles the request is decided elsewhere (agent.router.js) from the verified role —
 * never from anything in this file or from the message text.
 *
 * When nothing matches (greetings, ambiguous follow-ups) the previous intents of the conversation
 * are reused, and if there are none the full tool set is offered so the model can ask a
 * clarifying question.
 */
const INTENT_PATTERNS = {
  PATIENT: {
    doctors: /\b(doctor|dr\.?|specialist|consultant|physician|cardiolog|dermatolog|gynecolog|pediatric|neurolog|orthop|psychiatr|dentist|ent\b|urolog|oncolog|fee|rating|rated|review|experience|cheaper|cheapest)/i,
    appointments: /\b(appointment|book|booking|slot|slots|availab|reschedule|cancel|upcoming|schedule|video (consult|call)|clinic visit|status|confirm)/i,
    labs: /\b(lab|labs|laborator|test|tests|blood|cbc|hba1c|x-?ray|mri|ct scan|ultrasound|scan|sample|report|diagnostic)/i,
    medicines: /\b(medicine|medicines|medication|pharmac|tablet|capsule|syrup|drug|paracetamol|panadol|order|cart|delivery|stock|antibiotic)/i,
    surgery: /\b(surgery|surgical|operation|procedure|hospital|consultation request|bypass|knee replacement|hernia|appendix|cataract)/i,
    health: /\b(symptom|pain|fever|cough|headache|health|diet|disease|condition|treatment|cause|causes|cure|sick|ill|rash|infection|diabetes|pressure|advice|what is|how (do|can|to)|is it normal|policy|policies|refund|privacy|terms|faq|how does carehub|join as a doctor|reset my password)/i,
  },
  DOCTOR: {
    appointments: /\b(appointment|appointments|today|tomorrow|upcoming|pending|confirm|reject|complete|completed|booking|request|requests|queue|consultation)/i,
    schedule: /\b(schedule|availability|available|slot|slots|working hours|timing|timings|day off|clinic hours|video hours|open|close)/i,
    patients: /\b(patient|patients|history|visit|visits|record|records)/i,
    prescriptions: /\b(prescri|medicine|medication|drug|dosage|dose|diagnosis|rx)/i,
    analytics: /\b(analytic|analytics|statistic|statistics|stats|earning|earnings|revenue|income|how many|performance|completion|trend|this month|this week|last month)/i,
    followups: /\b(follow.?up|follow up|check.?back|revisit|due)/i,
  },
  ADMIN: {
    users: /\b(user|users|account|accounts|activate|deactivate|suspend|signup|sign.?up|registered|email)/i,
    applications: /\b(application|applications|apply|approve|reject|verification|verify|verified|doctor|doctors)/i,
    catalog: /\b(lab|labs|test|tests|pharmac|medicine|medicines|inventory|stock|price|prices|catalog)/i,
    orders: /\b(order|orders|delivery|delivered|shipped|dispatch)/i,
    reports: /\b(report|reports|analytic|analytics|revenue|statistics|stats|summary|overview|dashboard|how many|total|trend|top)/i,
  },
};

const EMERGENCY_PATTERN =
  /\b(chest (pain|tightness|pressure)|heart attack|can'?t breathe|cannot breathe|difficulty breathing|shortness of breath|stroke|face droop|slurred speech|unconscious|not breathing|severe bleeding|bleeding heavily|seizure|convulsion|overdose|poison|suicid|kill myself|end my life|want to die|severe allergic|anaphyla)/i;

const EMERGENCY_NOTICE =
  '**This may be a medical emergency.** If you or someone else has severe symptoms, call **1122** (Rescue) or go to the nearest emergency department immediately. Do not wait for online advice.';

const detectEmergency = (message) => EMERGENCY_PATTERN.test(message);

const detectIntents = (message, agent = 'PATIENT') =>
  Object.entries(INTENT_PATTERNS[agent] || {})
    .filter(([, pattern]) => pattern.test(message))
    .map(([intent]) => intent);

/**
 * @param {{ message: string, agent?: 'PATIENT'|'DOCTOR'|'ADMIN', previousIntents?: string[] }} input
 * @returns {{ intents: string[], emergency: boolean }}
 */
const route = ({ message, agent = 'PATIENT', previousIntents = [] }) => {
  const matched = detectIntents(message, agent);
  const emergency = agent === 'PATIENT' && detectEmergency(message);

  // A medical question about symptoms often also needs doctor discovery.
  if (agent === 'PATIENT' && matched.includes('health') && !matched.includes('doctors')) {
    matched.push('doctors');
  }
  // Prescribing and patient history are used together by doctors.
  if (agent === 'DOCTOR' && matched.includes('prescriptions') && !matched.includes('patients')) {
    matched.push('patients');
  }

  const valid = new Set(Object.keys(INTENT_PATTERNS[agent] || {}));
  const intents = matched.length ? matched : previousIntents.filter((intent) => valid.has(intent));
  return { intents, emergency };
};

module.exports = { route, detectEmergency, detectIntents, EMERGENCY_NOTICE };
