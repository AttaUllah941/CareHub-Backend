const logger = require('../../../core/utils/logger');
const config = require('../../../config');
const { ForbiddenError, NotFoundError } = require('../../../core/errors/AppError');
const { UserRole } = require('../../../shared/enums/userRole.enum');
const { NotificationType } = require('../../../shared/enums/notificationType.enum');
const { NotificationChannel } = require('../../../shared/enums/notificationChannel.enum');
const { NotificationDeliveryStatus } = require('../../../shared/enums/notificationDeliveryStatus.enum');
const { AppointmentStatus } = require('../../../shared/enums/appointmentStatus.enum');
const {
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
} = require('../../../shared/constants/pagination.constants');

class NotificationService {
  constructor(
    notificationRepository,
    notificationPreferenceRepository,
    notificationDispatcherService,
    userRepository,
    appointmentRepository,
  ) {
    this.notificationRepository = notificationRepository;
    this.notificationPreferenceRepository = notificationPreferenceRepository;
    this.notificationDispatcherService = notificationDispatcherService;
    this.userRepository = userRepository;
    this.appointmentRepository = appointmentRepository;
  }

  _isAdmin(requestedBy) {
    return requestedBy && [UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(requestedBy.role);
  }

  _format(notification) {
    const json = notification.toJSON ? notification.toJSON() : notification;
    return {
      ...json,
      userId: json.userId?.id || json.userId?._id?.toString() || json.userId?.toString(),
      isRead: !!json.readAt,
    };
  }

  _userFromAppointment(appointment) {
    const patient = appointment.patientProfileId;
    const user = patient?.userId;
    if (!user) return null;
    return {
      id: user._id?.toString() || user.id,
      email: user.email,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }

  _appointmentDateTime(appointment) {
    const date = appointment.appointmentDate;
    const time = appointment.startTime;
    if (!date) return '';
    const d = new Date(date);
    const dateStr = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    return time ? `${dateStr} at ${time}` : dateStr;
  }

  async _getChannelsForUser(userId, type) {
    const prefs = await this.notificationPreferenceRepository.findOrCreate(userId);
    const channels = [];

    if (prefs.inAppEnabled) channels.push(NotificationChannel.IN_APP);
    if (prefs.emailEnabled) channels.push(NotificationChannel.EMAIL);
    if (prefs.smsEnabled) channels.push(NotificationChannel.SMS);
    if (prefs.pushEnabled) channels.push(NotificationChannel.PUSH);

    if (type === NotificationType.APPOINTMENT_REMINDER && !prefs.appointmentReminders) {
      return [NotificationChannel.IN_APP];
    }
    if (type === NotificationType.PRESCRIPTION_READY && !prefs.prescriptionAlerts) {
      return channels.filter((c) => c === NotificationChannel.IN_APP);
    }

    return channels.length ? channels : [NotificationChannel.IN_APP];
  }

  async _deliverNotification(notification, user, channels) {
    const deliveries = [];
    for (const channel of channels) {
      try {
        const result = await this.notificationDispatcherService.dispatch(channel, {
          user,
          title: notification.title,
          body: notification.body,
          metadata: notification.metadata,
        });
        deliveries.push({
          channel,
          status: result.status,
          sentAt: result.sentAt || null,
          error: result.error || null,
        });
      } catch (err) {
        deliveries.push({
          channel,
          status: NotificationDeliveryStatus.FAILED,
          sentAt: null,
          error: err.message,
        });
      }
    }
    return deliveries;
  }

  async send({ userId, type, title, body, metadata = {}, scheduledFor = null }) {
    const user = await this.userRepository.findById(userId);
    if (!user) return null;

    const userPayload = {
      id: user._id?.toString() || user.id,
      email: user.email,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    const channels = await this._getChannelsForUser(userId, type);
    const deliveries = channels.map((channel) => ({
      channel,
      status: NotificationDeliveryStatus.PENDING,
      sentAt: null,
      error: null,
    }));

    const notification = await this.notificationRepository.create({
      userId,
      type,
      title,
      body,
      metadata,
      scheduledFor,
      deliveries,
      sentAt: scheduledFor ? null : new Date(),
    });

    if (!scheduledFor) {
      const results = await this._deliverNotification(notification, userPayload, channels);
      const updated = await this.notificationRepository.updateById(notification._id, {
        deliveries: results,
        sentAt: new Date(),
      });
      return this._format(updated);
    }

    return this._format(notification);
  }

  async processDueNotifications() {
    const due = await this.notificationRepository.findDueScheduled();
    for (const notification of due) {
      try {
        const user = await this.userRepository.findById(notification.userId);
        if (!user) continue;

        const userPayload = {
          id: user._id?.toString() || user.id,
          email: user.email,
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
        };

        const channels = await this._getChannelsForUser(
          notification.userId.toString(),
          notification.type,
        );
        const results = await this._deliverNotification(notification, userPayload, channels);
        await this.notificationRepository.updateById(notification._id, {
          deliveries: results,
          sentAt: new Date(),
        });
      } catch (err) {
        logger.error(`Failed to process notification ${notification._id}:`, err);
      }
    }
    return due.length;
  }

  async _scheduleAppointmentReminders(appointment) {
    const user = this._userFromAppointment(appointment);
    if (!user?.id) return;

    const prefs = await this.notificationPreferenceRepository.findOrCreate(user.id);
    if (!prefs.appointmentReminders) return;

    const appointmentId = appointment._id?.toString() || appointment.id;
    await this.notificationRepository.cancelScheduledForAppointment(appointmentId);

    const apptDate = new Date(appointment.appointmentDate);
    const [hours, minutes] = (appointment.startTime || '00:00').split(':').map(Number);
    apptDate.setHours(hours || 0, minutes || 0, 0, 0);

    const doctorName = appointment.doctorProfileId?.userId
      ? `Dr. ${appointment.doctorProfileId.userId.firstName} ${appointment.doctorProfileId.userId.lastName}`
      : 'your doctor';

    for (const leadMinutes of prefs.reminderLeadMinutes || [1440, 60]) {
      const scheduledFor = new Date(apptDate.getTime() - leadMinutes * 60 * 1000);
      if (scheduledFor <= new Date()) continue;

      const hoursLabel = leadMinutes >= 60 ? `${Math.round(leadMinutes / 60)} hour(s)` : `${leadMinutes} min`;

      await this.send({
        userId: user.id,
        type: NotificationType.APPOINTMENT_REMINDER,
        title: 'Appointment Reminder',
        body: `Reminder: Your appointment with ${doctorName} is in ${hoursLabel} (${this._appointmentDateTime(appointment)}).`,
        metadata: {
          appointmentId,
          actionUrl: '/patient/appointments',
        },
        scheduledFor,
      });
    }
  }

  async handleAppointmentBooked(appointment) {
    const user = this._userFromAppointment(appointment);
    if (!user?.id) return;

    const appointmentId = appointment._id?.toString() || appointment.id;
    const doctorName = appointment.doctorProfileId?.userId
      ? `Dr. ${appointment.doctorProfileId.userId.firstName} ${appointment.doctorProfileId.userId.lastName}`
      : 'your doctor';

    await this.send({
      userId: user.id,
      type: NotificationType.APPOINTMENT_BOOKED,
      title: 'Appointment Booked',
      body: `Your appointment with ${doctorName} on ${this._appointmentDateTime(appointment)} has been booked and is pending confirmation.`,
      metadata: { appointmentId, actionUrl: '/patient/appointments' },
    });
  }

  async handleAppointmentConfirmed(appointment) {
    const user = this._userFromAppointment(appointment);
    if (!user?.id) return;

    const appointmentId = appointment._id?.toString() || appointment.id;
    const doctorName = appointment.doctorProfileId?.userId
      ? `Dr. ${appointment.doctorProfileId.userId.firstName} ${appointment.doctorProfileId.userId.lastName}`
      : 'your doctor';

    await this.send({
      userId: user.id,
      type: NotificationType.APPOINTMENT_CONFIRMED,
      title: 'Appointment Confirmed',
      body: `Your appointment with ${doctorName} on ${this._appointmentDateTime(appointment)} has been confirmed.`,
      metadata: { appointmentId, actionUrl: '/patient/appointments' },
    });

    if ([AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING].includes(appointment.status)) {
      await this._scheduleAppointmentReminders(appointment);
    }
  }

  async handleAppointmentCancelled(appointment) {
    const user = this._userFromAppointment(appointment);
    if (!user?.id) return;

    const appointmentId = appointment._id?.toString() || appointment.id;
    await this.notificationRepository.cancelScheduledForAppointment(appointmentId);

    await this.send({
      userId: user.id,
      type: NotificationType.APPOINTMENT_CANCELLED,
      title: 'Appointment Cancelled',
      body: `Your appointment on ${this._appointmentDateTime(appointment)} has been cancelled.`,
      metadata: { appointmentId, actionUrl: '/patient/appointments' },
    });
  }

  async handleAppointmentRescheduled(appointment) {
    const user = this._userFromAppointment(appointment);
    if (!user?.id) return;

    const appointmentId = appointment._id?.toString() || appointment.id;
    const doctorName = appointment.doctorProfileId?.userId
      ? `Dr. ${appointment.doctorProfileId.userId.firstName} ${appointment.doctorProfileId.userId.lastName}`
      : 'your doctor';

    await this.notificationRepository.cancelScheduledForAppointment(appointmentId);

    await this.send({
      userId: user.id,
      type: NotificationType.APPOINTMENT_RESCHEDULED,
      title: 'Appointment Rescheduled',
      body: `Your appointment with ${doctorName} has been rescheduled to ${this._appointmentDateTime(appointment)}.`,
      metadata: { appointmentId, actionUrl: '/patient/appointments' },
    });

    await this._scheduleAppointmentReminders(appointment);
  }

  async handlePrescriptionReady(prescription) {
    const appointment = prescription.consultationId?.appointmentId;
    const user = appointment ? this._userFromAppointment(appointment) : null;
    if (!user?.id) return;

    const prescriptionId = prescription._id?.toString() || prescription.id;
    const doctorName = appointment?.doctorProfileId?.userId
      ? `Dr. ${appointment.doctorProfileId.userId.firstName} ${appointment.doctorProfileId.userId.lastName}`
      : 'your doctor';

    await this.send({
      userId: user.id,
      type: NotificationType.PRESCRIPTION_READY,
      title: 'Prescription Ready',
      body: `Your prescription from ${doctorName} is ready. View and download it from your prescriptions.`,
      metadata: {
        prescriptionId,
        consultationId: prescription.consultationId?._id?.toString() || prescription.consultationId,
        actionUrl: '/patient/prescriptions',
      },
    });
  }

  _fireAndForget(promise) {
    promise.catch((err) => logger.error('Notification dispatch failed:', err));
  }

  notifyAppointmentBooked(appointment) {
    this._fireAndForget(this.handleAppointmentBooked(appointment));
  }

  notifyAppointmentConfirmed(appointment) {
    this._fireAndForget(this.handleAppointmentConfirmed(appointment));
  }

  notifyAppointmentCancelled(appointment) {
    this._fireAndForget(this.handleAppointmentCancelled(appointment));
  }

  notifyAppointmentRescheduled(appointment) {
    this._fireAndForget(this.handleAppointmentRescheduled(appointment));
  }

  notifyPrescriptionReady(prescription) {
    this._fireAndForget(this.handlePrescriptionReady(prescription));
  }

  async getMyNotifications(userId, query) {
    const result = await this.notificationRepository.findByUserId(userId, {
      page: parseInt(query.page, 10) || DEFAULT_PAGE,
      limit: parseInt(query.limit, 10) || DEFAULT_LIMIT,
      unreadOnly: query.unreadOnly === 'true',
    });
    return {
      notifications: result.notifications.map((n) => this._format(n)),
      pagination: result.pagination,
    };
  }

  async getUnreadCount(userId) {
    const count = await this.notificationRepository.countUnread(userId);
    return { count };
  }

  async markAsRead(id, userId) {
    const notification = await this.notificationRepository.markAsRead(id, userId);
    if (!notification) throw new NotFoundError('Notification not found');
    return this._format(notification);
  }

  async markAllAsRead(userId) {
    return this.notificationRepository.markAllAsRead(userId);
  }

  async getPreferences(userId) {
    const prefs = await this.notificationPreferenceRepository.findOrCreate(userId);
    return prefs.toJSON ? prefs.toJSON() : prefs;
  }

  async updatePreferences(userId, data) {
    const prefs = await this.notificationPreferenceRepository.upsert(userId, data);
    return prefs.toJSON ? prefs.toJSON() : prefs;
  }

  async getAllNotifications(query, requestedBy) {
    if (!this._isAdmin(requestedBy)) throw new ForbiddenError('Insufficient permissions');
    const result = await this.notificationRepository.findAll({
      page: parseInt(query.page, 10) || DEFAULT_PAGE,
      limit: parseInt(query.limit, 10) || DEFAULT_LIMIT,
      userId: query.userId,
      type: query.type,
      search: query.search,
    });
    return {
      notifications: result.notifications.map((n) => this._format(n)),
      pagination: result.pagination,
    };
  }
}

module.exports = NotificationService;
