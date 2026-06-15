const PermissionRepository = require('../features/roles/repositories/permission.repository');
const RoleRepository = require('../features/roles/repositories/role.repository');
const PermissionService = require('../features/roles/services/permission.service');
const RoleService = require('../features/roles/services/role.service');
const PermissionController = require('../features/roles/controllers/permission.controller');
const RoleController = require('../features/roles/controllers/role.controller');
const UserRepository = require('../features/auth/repositories/user.repository');
const AuthService = require('../features/auth/services/auth.service');
const AuthController = require('../features/auth/controllers/auth.controller');
const UserService = require('../features/users/services/user.service');
const UserController = require('../features/users/controllers/user.controller');
const SpecialtyRepository = require('../features/medical-specialties/repositories/specialty.repository');
const SpecialtyService = require('../features/medical-specialties/services/specialty.service');
const SpecialtyController = require('../features/medical-specialties/controllers/specialty.controller');
const LanguageRepository = require('../features/languages/repositories/language.repository');
const LanguageService = require('../features/languages/services/language.service');
const LanguageController = require('../features/languages/controllers/language.controller');
const DoctorProfileRepository = require('../features/doctors/repositories/doctorProfile.repository');
const DoctorService = require('../features/doctors/services/doctor.service');
const DoctorController = require('../features/doctors/controllers/doctor.controller');
const DoctorAvailabilityRepository = require('../features/doctor-availability/repositories/doctorAvailability.repository');
const DoctorAvailabilityService = require('../features/doctor-availability/services/doctorAvailability.service');
const DoctorAvailabilityController = require('../features/doctor-availability/controllers/doctorAvailability.controller');
const ClinicRepository = require('../features/clinics/repositories/clinic.repository');
const ClinicService = require('../features/clinics/services/clinic.service');
const ClinicController = require('../features/clinics/controllers/clinic.controller');
const PatientProfileRepository = require('../features/patients/repositories/patientProfile.repository');
const PatientService = require('../features/patients/services/patient.service');
const PatientController = require('../features/patients/controllers/patient.controller');
const FamilyMemberRepository = require('../features/family-members/repositories/familyMember.repository');
const FamilyMemberService = require('../features/family-members/services/familyMember.service');
const FamilyMemberController = require('../features/family-members/controllers/familyMember.controller');
const AppointmentRepository = require('../features/appointments/repositories/appointment.repository');
const SlotEngineService = require('../features/appointments/services/slotEngine.service');
const AppointmentService = require('../features/appointments/services/appointment.service');
const AppointmentController = require('../features/appointments/controllers/appointment.controller');
const ConsultationRepository = require('../features/consultations/repositories/consultation.repository');
const ConsultationService = require('../features/consultations/services/consultation.service');
const ConsultationController = require('../features/consultations/controllers/consultation.controller');
const PrescriptionRepository = require('../features/prescriptions/repositories/prescription.repository');
const PrescriptionService = require('../features/prescriptions/services/prescription.service');
const PrescriptionController = require('../features/prescriptions/controllers/prescription.controller');
const MedicalRecordRepository = require('../features/medical-records/repositories/medicalRecord.repository');
const FileStorageService = require('../features/medical-records/services/fileStorage.service');
const MedicalRecordService = require('../features/medical-records/services/medicalRecord.service');
const MedicalRecordController = require('../features/medical-records/controllers/medicalRecord.controller');
const ReviewRepository = require('../features/reviews/repositories/review.repository');
const ReviewService = require('../features/reviews/services/review.service');
const ReviewController = require('../features/reviews/controllers/review.controller');
const NotificationRepository = require('../features/notifications/repositories/notification.repository');
const NotificationPreferenceRepository = require('../features/notifications/repositories/notificationPreference.repository');
const NotificationDispatcherService = require('../features/notifications/services/notificationDispatcher.service');
const NotificationService = require('../features/notifications/services/notification.service');
const NotificationReminderService = require('../features/notifications/services/notificationReminder.service');
const NotificationController = require('../features/notifications/controllers/notification.controller');
const PaymentRepository = require('../features/payments/repositories/payment.repository');
const PaymentGatewayFactory = require('../features/payments/services/paymentGatewayFactory.service');
const PaymentService = require('../features/payments/services/payment.service');
const PaymentController = require('../features/payments/controllers/payment.controller');
const DashboardRepository = require('../features/dashboard/repositories/dashboard.repository');
const DashboardService = require('../features/dashboard/services/dashboard.service');
const DashboardController = require('../features/dashboard/controllers/dashboard.controller');
const ReportRepository = require('../features/reports/repositories/report.repository');
const ReportService = require('../features/reports/services/report.service');
const ReportController = require('../features/reports/controllers/report.controller');
const VideoSessionRepository = require('../features/video-consultations/repositories/videoSession.repository');
const VideoConsultationService = require('../features/video-consultations/services/videoConsultation.service');
const VideoConsultationController = require('../features/video-consultations/controllers/videoConsultation.controller');
const MedicineRepository = require('../features/pharmacy/repositories/medicine.repository');
const PharmacyInventoryRepository = require('../features/pharmacy/repositories/pharmacyInventory.repository');
const PharmacyOrderRepository = require('../features/pharmacy/repositories/pharmacyOrder.repository');
const PrescriptionUploadRepository = require('../features/pharmacy/repositories/prescriptionUpload.repository');
const PharmacyService = require('../features/pharmacy/services/pharmacy.service');
const PharmacyController = require('../features/pharmacy/controllers/pharmacy.controller');
const LabRepository = require('../features/lab/repositories/lab.repository');
const LabTestRepository = require('../features/lab/repositories/labTest.repository');
const LabBookingRepository = require('../features/lab/repositories/labBooking.repository');
const LabReportRepository = require('../features/lab/repositories/labReport.repository');
const LabService = require('../features/lab/services/lab.service');
const LabController = require('../features/lab/controllers/lab.controller');
const ChatConversationRepository = require('../features/chat/repositories/chatConversation.repository');
const ChatMessageRepository = require('../features/chat/repositories/chatMessage.repository');
const ChatService = require('../features/chat/services/chat.service');
const ChatController = require('../features/chat/controllers/chat.controller');
const AnalyticsRepository = require('../features/analytics/repositories/analytics.repository');
const AnalyticsService = require('../features/analytics/services/analytics.service');
const AnalyticsController = require('../features/analytics/controllers/analytics.controller');
const AuditLogRepository = require('../features/audit-logs/repositories/auditLog.repository');
const AuditService = require('../features/audit-logs/services/audit.service');
const AuditController = require('../features/audit-logs/controllers/audit.controller');
const SettingsRepository = require('../features/settings/repositories/settings.repository');
const SettingsService = require('../features/settings/services/settings.service');
const SettingsController = require('../features/settings/controllers/settings.controller');

/**
 * Simple Dependency Injection container.
 * Registers singletons and resolves dependencies for feature modules.
 * Follows Inversion of Control — controllers receive services via constructor injection.
 */
class Container {
  constructor() {
    this._instances = new Map();
    this._registerDefaults();
  }

  _registerDefaults() {
    const userRepository = new UserRepository();
    const permissionRepository = new PermissionRepository();
    const roleRepository = new RoleRepository();

    const auditLogRepository = new AuditLogRepository();
    const auditService = new AuditService(auditLogRepository);
    const auditController = new AuditController(auditService);

    const authService = new AuthService(userRepository, auditService);
    const authController = new AuthController(authService);
    const userService = new UserService(userRepository, auditService);
    const userController = new UserController(userService);
    const permissionService = new PermissionService(permissionRepository);
    const permissionController = new PermissionController(permissionService);
    const roleService = new RoleService(roleRepository, permissionRepository, userRepository);
    const roleController = new RoleController(roleService);
    const specialtyRepository = new SpecialtyRepository();
    const specialtyService = new SpecialtyService(specialtyRepository);
    const specialtyController = new SpecialtyController(specialtyService);
    const languageRepository = new LanguageRepository();
    const languageService = new LanguageService(languageRepository);
    const languageController = new LanguageController(languageService);
    const doctorProfileRepository = new DoctorProfileRepository();
    const doctorService = new DoctorService(
      doctorProfileRepository,
      userRepository,
      specialtyRepository,
      languageRepository,
      auditService,
    );
    const doctorController = new DoctorController(doctorService);
    const doctorAvailabilityRepository = new DoctorAvailabilityRepository();
    const doctorAvailabilityService = new DoctorAvailabilityService(
      doctorAvailabilityRepository,
      doctorProfileRepository,
    );
    const doctorAvailabilityController = new DoctorAvailabilityController(doctorAvailabilityService);
    const clinicRepository = new ClinicRepository();
    const clinicService = new ClinicService(
      clinicRepository,
      doctorProfileRepository,
      userRepository,
    );
    const clinicController = new ClinicController(clinicService);
    const patientProfileRepository = new PatientProfileRepository();
    const patientService = new PatientService(patientProfileRepository, userRepository, auditService);
    const patientController = new PatientController(patientService);
    const familyMemberRepository = new FamilyMemberRepository();
    const familyMemberService = new FamilyMemberService(
      familyMemberRepository,
      patientProfileRepository,
    );
    const familyMemberController = new FamilyMemberController(familyMemberService);
    const appointmentRepository = new AppointmentRepository();
    const slotEngineService = new SlotEngineService(
      appointmentRepository,
      doctorAvailabilityRepository,
      clinicRepository,
    );
    const notificationRepository = new NotificationRepository();
    const notificationPreferenceRepository = new NotificationPreferenceRepository();
    const notificationDispatcherService = new NotificationDispatcherService();
    const notificationService = new NotificationService(
      notificationRepository,
      notificationPreferenceRepository,
      notificationDispatcherService,
      userRepository,
      appointmentRepository,
    );
    const notificationReminderService = new NotificationReminderService(notificationService);
    const notificationController = new NotificationController(notificationService);
    const appointmentService = new AppointmentService(
      appointmentRepository,
      patientProfileRepository,
      doctorProfileRepository,
      clinicRepository,
      doctorAvailabilityRepository,
      familyMemberRepository,
      slotEngineService,
      notificationService,
    );
    const appointmentController = new AppointmentController(appointmentService);
    const consultationRepository = new ConsultationRepository();
    const consultationService = new ConsultationService(
      consultationRepository,
      appointmentRepository,
      patientProfileRepository,
      doctorProfileRepository,
    );
    const consultationController = new ConsultationController(consultationService);
    const prescriptionRepository = new PrescriptionRepository();
    const prescriptionService = new PrescriptionService(
      prescriptionRepository,
      consultationRepository,
      patientProfileRepository,
      doctorProfileRepository,
      notificationService,
    );
    const prescriptionController = new PrescriptionController(prescriptionService);
    const fileStorageService = new FileStorageService();
    const medicalRecordRepository = new MedicalRecordRepository();
    const medicalRecordService = new MedicalRecordService(
      medicalRecordRepository,
      patientProfileRepository,
      familyMemberRepository,
      consultationRepository,
      appointmentRepository,
      fileStorageService,
    );
    const medicalRecordController = new MedicalRecordController(medicalRecordService);
    const reviewRepository = new ReviewRepository();
    const reviewService = new ReviewService(
      reviewRepository,
      appointmentRepository,
      consultationRepository,
      patientProfileRepository,
      doctorProfileRepository,
    );
    const reviewController = new ReviewController(reviewService);
    const paymentRepository = new PaymentRepository();
    const paymentGatewayFactory = new PaymentGatewayFactory();
    const paymentService = new PaymentService(
      paymentRepository,
      appointmentRepository,
      patientProfileRepository,
      paymentGatewayFactory,
      notificationService,
    );
    const paymentController = new PaymentController(paymentService);
    const dashboardRepository = new DashboardRepository();
    const dashboardService = new DashboardService(dashboardRepository);
    const dashboardController = new DashboardController(dashboardService);
    const reportRepository = new ReportRepository();
    const reportService = new ReportService(reportRepository);
    const reportController = new ReportController(reportService);
    const videoSessionRepository = new VideoSessionRepository();
    const videoConsultationService = new VideoConsultationService(
      videoSessionRepository,
      appointmentRepository,
      patientProfileRepository,
      doctorProfileRepository,
    );
    const videoConsultationController = new VideoConsultationController(videoConsultationService);
    const medicineRepository = new MedicineRepository();
    const pharmacyInventoryRepository = new PharmacyInventoryRepository();
    const pharmacyOrderRepository = new PharmacyOrderRepository();
    const prescriptionUploadRepository = new PrescriptionUploadRepository();
    const pharmacyService = new PharmacyService(
      medicineRepository,
      pharmacyInventoryRepository,
      pharmacyOrderRepository,
      prescriptionUploadRepository,
      patientProfileRepository,
      prescriptionRepository,
      consultationRepository,
      auditService,
    );
    const pharmacyController = new PharmacyController(pharmacyService);
    const labRepository = new LabRepository();
    const labTestRepository = new LabTestRepository();
    const labBookingRepository = new LabBookingRepository();
    const labReportRepository = new LabReportRepository();
    const labService = new LabService(
      labRepository,
      labTestRepository,
      labBookingRepository,
      labReportRepository,
      patientProfileRepository,
      auditService,
    );
    const labController = new LabController(labService);
    const chatConversationRepository = new ChatConversationRepository();
    const chatMessageRepository = new ChatMessageRepository();
    const chatService = new ChatService(
      chatConversationRepository,
      chatMessageRepository,
      appointmentRepository,
      patientProfileRepository,
      doctorProfileRepository,
    );
    const chatController = new ChatController(chatService);
    const analyticsRepository = new AnalyticsRepository();
    const analyticsService = new AnalyticsService(analyticsRepository);
    const analyticsController = new AnalyticsController(analyticsService);
    const settingsRepository = new SettingsRepository();
    const settingsService = new SettingsService(settingsRepository, auditService);
    const settingsController = new SettingsController(settingsService);

    this._instances.set('userRepository', userRepository);
    this._instances.set('permissionRepository', permissionRepository);
    this._instances.set('roleRepository', roleRepository);
    this._instances.set('authService', authService);
    this._instances.set('authController', authController);
    this._instances.set('userService', userService);
    this._instances.set('userController', userController);
    this._instances.set('permissionService', permissionService);
    this._instances.set('permissionController', permissionController);
    this._instances.set('roleService', roleService);
    this._instances.set('roleController', roleController);
    this._instances.set('specialtyRepository', specialtyRepository);
    this._instances.set('specialtyService', specialtyService);
    this._instances.set('specialtyController', specialtyController);
    this._instances.set('languageRepository', languageRepository);
    this._instances.set('languageService', languageService);
    this._instances.set('languageController', languageController);
    this._instances.set('doctorProfileRepository', doctorProfileRepository);
    this._instances.set('doctorService', doctorService);
    this._instances.set('doctorController', doctorController);
    this._instances.set('doctorAvailabilityRepository', doctorAvailabilityRepository);
    this._instances.set('doctorAvailabilityService', doctorAvailabilityService);
    this._instances.set('doctorAvailabilityController', doctorAvailabilityController);
    this._instances.set('clinicRepository', clinicRepository);
    this._instances.set('clinicService', clinicService);
    this._instances.set('clinicController', clinicController);
    this._instances.set('patientProfileRepository', patientProfileRepository);
    this._instances.set('patientService', patientService);
    this._instances.set('patientController', patientController);
    this._instances.set('familyMemberRepository', familyMemberRepository);
    this._instances.set('familyMemberService', familyMemberService);
    this._instances.set('familyMemberController', familyMemberController);
    this._instances.set('appointmentRepository', appointmentRepository);
    this._instances.set('slotEngineService', slotEngineService);
    this._instances.set('appointmentService', appointmentService);
    this._instances.set('appointmentController', appointmentController);
    this._instances.set('consultationRepository', consultationRepository);
    this._instances.set('consultationService', consultationService);
    this._instances.set('consultationController', consultationController);
    this._instances.set('prescriptionRepository', prescriptionRepository);
    this._instances.set('prescriptionService', prescriptionService);
    this._instances.set('prescriptionController', prescriptionController);
    this._instances.set('fileStorageService', fileStorageService);
    this._instances.set('medicalRecordRepository', medicalRecordRepository);
    this._instances.set('medicalRecordService', medicalRecordService);
    this._instances.set('medicalRecordController', medicalRecordController);
    this._instances.set('reviewRepository', reviewRepository);
    this._instances.set('reviewService', reviewService);
    this._instances.set('reviewController', reviewController);
    this._instances.set('notificationRepository', notificationRepository);
    this._instances.set('notificationPreferenceRepository', notificationPreferenceRepository);
    this._instances.set('notificationDispatcherService', notificationDispatcherService);
    this._instances.set('notificationService', notificationService);
    this._instances.set('notificationReminderService', notificationReminderService);
    this._instances.set('notificationController', notificationController);
    this._instances.set('paymentRepository', paymentRepository);
    this._instances.set('paymentGatewayFactory', paymentGatewayFactory);
    this._instances.set('paymentService', paymentService);
    this._instances.set('paymentController', paymentController);
    this._instances.set('dashboardRepository', dashboardRepository);
    this._instances.set('dashboardService', dashboardService);
    this._instances.set('dashboardController', dashboardController);
    this._instances.set('reportRepository', reportRepository);
    this._instances.set('reportService', reportService);
    this._instances.set('reportController', reportController);
    this._instances.set('videoSessionRepository', videoSessionRepository);
    this._instances.set('videoConsultationService', videoConsultationService);
    this._instances.set('videoConsultationController', videoConsultationController);
    this._instances.set('medicineRepository', medicineRepository);
    this._instances.set('pharmacyInventoryRepository', pharmacyInventoryRepository);
    this._instances.set('pharmacyOrderRepository', pharmacyOrderRepository);
    this._instances.set('prescriptionUploadRepository', prescriptionUploadRepository);
    this._instances.set('pharmacyService', pharmacyService);
    this._instances.set('pharmacyController', pharmacyController);
    this._instances.set('labRepository', labRepository);
    this._instances.set('labTestRepository', labTestRepository);
    this._instances.set('labBookingRepository', labBookingRepository);
    this._instances.set('labReportRepository', labReportRepository);
    this._instances.set('labService', labService);
    this._instances.set('labController', labController);
    this._instances.set('chatConversationRepository', chatConversationRepository);
    this._instances.set('chatMessageRepository', chatMessageRepository);
    this._instances.set('chatService', chatService);
    this._instances.set('chatController', chatController);
    this._instances.set('analyticsRepository', analyticsRepository);
    this._instances.set('analyticsService', analyticsService);
    this._instances.set('analyticsController', analyticsController);
    this._instances.set('auditLogRepository', auditLogRepository);
    this._instances.set('auditService', auditService);
    this._instances.set('auditController', auditController);
    this._instances.set('settingsRepository', settingsRepository);
    this._instances.set('settingsService', settingsService);
    this._instances.set('settingsController', settingsController);
  }

  resolve(name) {
    const instance = this._instances.get(name);
    if (!instance) {
      throw new Error(`Dependency "${name}" is not registered in the container`);
    }
    return instance;
  }

  register(name, instance) {
    this._instances.set(name, instance);
  }
}

const container = new Container();

module.exports = container;
