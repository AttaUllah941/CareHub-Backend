const PDFDocument = require('pdfkit');

function formatDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-PK', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getNested(obj, ...keys) {
  return keys.reduce((acc, key) => acc?.[key], obj);
}

/**
 * Generates a prescription PDF buffer from a populated prescription document.
 */
function generatePrescriptionPdf(prescription) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const consultation = prescription.consultationId;
    const appointment = consultation?.appointmentId;
    const patientUser = getNested(appointment, 'patientProfileId', 'userId');
    const doctor = appointment?.doctorProfileId;
    const doctorUser = doctor?.userId;
    const clinic = appointment?.clinicId;
    const familyMember = appointment?.familyMemberId;
    const medicines = prescription.medicines ?? [];

    const patientName = patientUser
      ? `${patientUser.firstName ?? ''} ${patientUser.lastName ?? ''}`.trim()
      : '—';
    const doctorName = doctorUser
      ? `${doctor?.title ? doctor.title + ' ' : ''}${doctorUser.firstName ?? ''} ${doctorUser.lastName ?? ''}`.trim()
      : '—';

    doc.fontSize(22).fillColor('#0d9488').text('CareHub', { align: 'center' });
    doc.fontSize(14).fillColor('#374151').text('Medical Prescription', { align: 'center' });
    doc.moveDown(1.5);

    doc.fontSize(10).fillColor('#6b7280');
    doc.text(`Prescription ID: ${prescription._id?.toString() ?? prescription.id ?? '—'}`);
    doc.text(`Date: ${formatDate(prescription.createdAt)}`);
    doc.moveDown();

    doc.fontSize(11).fillColor('#111827').text('Patient Information', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#374151');
    doc.text(`Name: ${patientName}`);
    if (familyMember?.firstName) {
      doc.text(`Visit for: ${familyMember.firstName} ${familyMember.lastName} (${familyMember.relationship})`);
    }
    if (patientUser?.phone) doc.text(`Phone: ${patientUser.phone}`);
    doc.moveDown();

    doc.fontSize(11).fillColor('#111827').text('Doctor', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#374151');
    doc.text(`Dr. ${doctorName}`);
    if (clinic?.name) doc.text(`Clinic: ${clinic.name}${clinic.city ? `, ${clinic.city}` : ''}`);
    if (appointment?.appointmentDate) {
      doc.text(`Appointment: ${formatDate(appointment.appointmentDate)} ${appointment.startTime ?? ''}`);
    }
  if (consultation?.diagnosis) doc.text(`Diagnosis: ${consultation.diagnosis}`);
    doc.moveDown();

    doc.fontSize(11).fillColor('#111827').text('Prescribed Medicines', { underline: true });
    doc.moveDown(0.5);

    medicines.forEach((med, index) => {
      doc.fontSize(10).fillColor('#0d9488').text(`${index + 1}. ${med.name}`);
      doc.fontSize(10).fillColor('#374151');
      doc.text(`   Dosage: ${med.dosage}`);
      doc.text(`   Duration: ${med.duration}`);
      if (med.instructions) doc.text(`   Instructions: ${med.instructions}`);
      doc.moveDown(0.4);
    });

    if (prescription.notes) {
      doc.moveDown(0.5);
      doc.fontSize(11).fillColor('#111827').text('Additional Notes', { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor('#374151').text(prescription.notes);
    }

    doc.moveDown(2);
    doc.fontSize(9).fillColor('#9ca3af').text(
      'This is a computer-generated prescription from CareHub. Please follow your doctor\'s advice.',
      { align: 'center' },
    );

    doc.end();
  });
}

module.exports = { generatePrescriptionPdf };
