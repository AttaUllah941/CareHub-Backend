const { ForbiddenError } = require('../../../core/errors/AppError');
const { UserRole } = require('../../../shared/enums/userRole.enum');

class DashboardService {
  constructor(dashboardRepository) {
    this.dashboardRepository = dashboardRepository;
  }

  _isAdmin(requestedBy) {
    return requestedBy && [UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(requestedBy.role);
  }

  _formatDoctor(doc) {
    const json = doc.toJSON ? doc.toJSON() : doc;
    return {
      id: json.id || json._id?.toString(),
      title: json.title,
      yearsOfExperience: json.yearsOfExperience,
      consultationFee: json.consultationFee,
      verificationStatus: json.verificationStatus,
      createdAt: json.createdAt,
      user: json.userId
        ? {
            firstName: json.userId.firstName,
            lastName: json.userId.lastName,
            email: json.userId.email,
          }
        : undefined,
      specialties: (json.specialtyIds || []).map((s) => ({
        id: s.id || s._id?.toString(),
        name: s.name,
      })),
    };
  }

  _formatAppointment(appt) {
    const json = appt.toJSON ? appt.toJSON() : appt;
    return {
      id: json.id || json._id?.toString(),
      appointmentDate: json.appointmentDate,
      startTime: json.startTime,
      status: json.status,
      consultationFee: json.consultationFee,
      currency: json.currency,
      createdAt: json.createdAt,
      patient: json.patientProfileId?.userId
        ? {
            firstName: json.patientProfileId.userId.firstName,
            lastName: json.patientProfileId.userId.lastName,
          }
        : undefined,
      doctor: json.doctorProfileId
        ? {
            title: json.doctorProfileId.title,
            firstName: json.doctorProfileId.userId?.firstName,
            lastName: json.doctorProfileId.userId?.lastName,
          }
        : undefined,
      clinic: json.clinicId ? { name: json.clinicId.name } : undefined,
    };
  }

  async getAdminStats(requestedBy) {
    if (!this._isAdmin(requestedBy)) {
      throw new ForbiddenError('Insufficient permissions');
    }

    const [doctors, patients, appointments, revenue, pendingApprovals, recentPendingDoctors, recentAppointments] =
      await Promise.all([
        this.dashboardRepository.getDoctorStats(),
        this.dashboardRepository.getPatientStats(),
        this.dashboardRepository.getAppointmentStats(),
        this.dashboardRepository.getRevenueStats(),
        this.dashboardRepository.getPendingApprovalStats(),
        this.dashboardRepository.getRecentPendingDoctors(5),
        this.dashboardRepository.getRecentAppointments(5),
      ]);

    return {
      doctors,
      patients,
      appointments,
      revenue,
      pendingApprovals,
      recentPendingDoctors: recentPendingDoctors.map((d) => this._formatDoctor(d)),
      recentAppointments: recentAppointments.map((a) => this._formatAppointment(a)),
      generatedAt: new Date().toISOString(),
    };
  }
}

module.exports = DashboardService;
