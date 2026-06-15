const { ForbiddenError } = require('../../../core/errors/AppError');
const { UserRole } = require('../../../shared/enums/userRole.enum');
const { ReportType } = require('../../../shared/enums/reportType.enum');
const { generateReportPdf } = require('./reportPdf.service');
const { generateReportExcel } = require('./reportExcel.service');

function formatDate(d) {
  if (!d) return null;
  return new Date(d).toISOString();
}

class ReportService {
  constructor(reportRepository) {
    this.reportRepository = reportRepository;
  }

  _isAdmin(requestedBy) {
    return requestedBy && [UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(requestedBy.role);
  }

  _meta(query) {
    return {
      fromDate: query.fromDate || null,
      toDate: query.toDate || null,
      generatedAt: new Date().toISOString(),
    };
  }

  _formatRevenueRow(payment) {
    const json = payment.toJSON ? payment.toJSON() : payment;
    const appt = json.appointmentId;
    const doctor = appt?.doctorProfileId;
    return {
      id: json.id || json._id?.toString(),
      gateway: json.gateway,
      amount: json.amount,
      refundAmount: json.refundAmount || 0,
      currency: json.currency,
      status: json.status,
      paidAt: formatDate(json.paidAt),
      patient: json.bookedByUserId
        ? `${json.bookedByUserId.firstName || ''} ${json.bookedByUserId.lastName || ''}`.trim()
        : '—',
      doctor: doctor?.userId
        ? `${doctor.title || ''} ${doctor.userId.firstName || ''} ${doctor.userId.lastName || ''}`.trim()
        : '—',
      appointmentDate: appt?.appointmentDate ? formatDate(appt.appointmentDate) : null,
    };
  }

  _formatDoctorRow(doctor, appointmentCountMap) {
    const json = doctor.toJSON ? doctor.toJSON() : doctor;
    const id = json.id || json._id?.toString();
    return {
      id,
      name: json.userId ? `${json.userId.firstName || ''} ${json.userId.lastName || ''}`.trim() : '—',
      email: json.userId?.email,
      title: json.title,
      verificationStatus: json.verificationStatus,
      consultationFee: json.consultationFee,
      yearsOfExperience: json.yearsOfExperience,
      city: json.city,
      specialties: (json.specialtyIds || []).map((s) => s.name).filter(Boolean).join(', '),
      appointmentCount: appointmentCountMap[id] || 0,
      createdAt: formatDate(json.createdAt),
    };
  }

  _formatPatientRow(patient, appointmentCountMap) {
    const json = patient.toJSON ? patient.toJSON() : patient;
    const id = json.id || json._id?.toString();
    return {
      id,
      name: json.userId ? `${json.userId.firstName || ''} ${json.userId.lastName || ''}`.trim() : '—',
      email: json.userId?.email,
      phone: json.userId?.phone,
      city: json.city,
      gender: json.gender,
      isActive: json.isActive,
      appointmentCount: appointmentCountMap[id] || 0,
      createdAt: formatDate(json.createdAt),
    };
  }

  _formatAppointmentRow(appt) {
    const json = appt.toJSON ? appt.toJSON() : appt;
    const patient = json.patientProfileId?.userId;
    const doctor = json.doctorProfileId;
    return {
      id: json.id || json._id?.toString(),
      appointmentDate: formatDate(json.appointmentDate),
      startTime: json.startTime,
      endTime: json.endTime,
      status: json.status,
      paymentStatus: json.paymentStatus,
      consultationFee: json.consultationFee,
      currency: json.currency,
      patient: patient ? `${patient.firstName || ''} ${patient.lastName || ''}`.trim() : '—',
      doctor: doctor?.userId
        ? `${doctor.title || ''} ${doctor.userId.firstName || ''} ${doctor.userId.lastName || ''}`.trim()
        : '—',
      clinic: json.clinicId?.name,
      createdAt: formatDate(json.createdAt),
    };
  }

  async getRevenueReport(query, requestedBy) {
    if (!this._isAdmin(requestedBy)) throw new ForbiddenError('Insufficient permissions');
    const raw = await this.reportRepository.getRevenueReport(query);
    return {
      type: ReportType.REVENUE,
      meta: this._meta(query),
      summary: raw.summary,
      byGateway: raw.byGateway,
      byMonth: raw.byMonth,
      rows: raw.rows.map((r) => this._formatRevenueRow(r)),
    };
  }

  async getDoctorReport(query, requestedBy) {
    if (!this._isAdmin(requestedBy)) throw new ForbiddenError('Insufficient permissions');
    const raw = await this.reportRepository.getDoctorReport(query);
    return {
      type: ReportType.DOCTORS,
      meta: this._meta(query),
      summary: raw.summary,
      byVerificationStatus: raw.byVerificationStatus,
      bySpecialty: raw.bySpecialty,
      rows: raw.rows.map((r) => this._formatDoctorRow(r, raw.appointmentCountMap)),
    };
  }

  async getPatientReport(query, requestedBy) {
    if (!this._isAdmin(requestedBy)) throw new ForbiddenError('Insufficient permissions');
    const raw = await this.reportRepository.getPatientReport(query);
    return {
      type: ReportType.PATIENTS,
      meta: this._meta(query),
      summary: raw.summary,
      byCity: raw.byCity,
      rows: raw.rows.map((r) => this._formatPatientRow(r, raw.appointmentCountMap)),
    };
  }

  async getAppointmentReport(query, requestedBy) {
    if (!this._isAdmin(requestedBy)) throw new ForbiddenError('Insufficient permissions');
    const raw = await this.reportRepository.getAppointmentReport(query);
    return {
      type: ReportType.APPOINTMENTS,
      meta: this._meta(query),
      summary: raw.summary,
      byStatus: raw.byStatus,
      byMonth: raw.byMonth,
      rows: raw.rows.map((r) => this._formatAppointmentRow(r)),
    };
  }

  async _fetchReport(type, query, requestedBy) {
    switch (type) {
      case ReportType.REVENUE:
        return this.getRevenueReport(query, requestedBy);
      case ReportType.DOCTORS:
        return this.getDoctorReport(query, requestedBy);
      case ReportType.PATIENTS:
        return this.getPatientReport(query, requestedBy);
      case ReportType.APPOINTMENTS:
        return this.getAppointmentReport(query, requestedBy);
      default:
        throw new ForbiddenError('Invalid report type');
    }
  }

  async exportPdf(type, query, requestedBy) {
    const report = await this._fetchReport(type, query, requestedBy);
    const buffer = await generateReportPdf(report);
    const filename = `carehub-${type.toLowerCase()}-report-${Date.now()}.pdf`;
    return { buffer, filename, contentType: 'application/pdf' };
  }

  async exportExcel(type, query, requestedBy) {
    const report = await this._fetchReport(type, query, requestedBy);
    const buffer = await generateReportExcel(report);
    const filename = `carehub-${type.toLowerCase()}-report-${Date.now()}.xlsx`;
    return {
      buffer,
      filename,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }
}

module.exports = ReportService;
