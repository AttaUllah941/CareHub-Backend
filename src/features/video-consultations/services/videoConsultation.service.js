const {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
  ConflictError,
} = require('../../../core/errors/AppError');
const { UserRole } = require('../../../shared/enums/userRole.enum');
const { AppointmentStatus } = require('../../../shared/enums/appointmentStatus.enum');
const { VideoSessionStatus } = require('../../../shared/enums/videoSessionStatus.enum');
const { VideoRecordingStatus } = require('../../../shared/enums/videoRecordingStatus.enum');
const config = require('../../../config');

const JOINABLE_APPOINTMENT_STATUSES = [AppointmentStatus.CONFIRMED, AppointmentStatus.COMPLETED];

class VideoConsultationService {
  constructor(
    videoSessionRepository,
    appointmentRepository,
    patientProfileRepository,
    doctorProfileRepository,
  ) {
    this.videoSessionRepository = videoSessionRepository;
    this.appointmentRepository = appointmentRepository;
    this.patientProfileRepository = patientProfileRepository;
    this.doctorProfileRepository = doctorProfileRepository;
  }

  _isAdmin(requestedBy) {
    return requestedBy && [UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(requestedBy.role);
  }

  _getIceServers() {
    return config.webrtc?.iceServers || [{ urls: 'stun:stun.l.google.com:19302' }];
  }

  _formatUser(user) {
    if (!user || typeof user !== 'object') return undefined;
    return {
      id: user.id || user._id?.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
    };
  }

  _format(session) {
    const json = session.toJSON ? session.toJSON() : session;
    return {
      ...json,
      appointmentId:
        json.appointmentId?.id || json.appointmentId?._id?.toString() || json.appointmentId?.toString(),
      consultationId:
        json.consultationId?.id || json.consultationId?._id?.toString() || json.consultationId?.toString(),
      patientUserId:
        json.patientUserId?.id || json.patientUserId?._id?.toString() || json.patientUserId?.toString(),
      doctorUserId:
        json.doctorUserId?.id || json.doctorUserId?._id?.toString() || json.doctorUserId?.toString(),
      patient: this._formatUser(json.patientUserId),
      doctor: this._formatUser(json.doctorUserId),
      participants: (json.participants || []).map((p) => ({
        ...p,
        id: p._id?.toString(),
        user: this._formatUser(p.userId),
      })),
    };
  }

  async _authorizeAppointment(appointment, requestedBy) {
    if (!appointment || !appointment.isActive) throw new NotFoundError('Appointment not found');

    if (this._isAdmin(requestedBy)) return;

    if (requestedBy.role === UserRole.DOCTOR) {
      const profile = await this.doctorProfileRepository.findByUserId(requestedBy.id);
      const doctorId =
        appointment.doctorProfileId?._id?.toString() || appointment.doctorProfileId?.toString();
      if (!profile || profile._id.toString() !== doctorId) {
        throw new ForbiddenError('You are not the doctor for this appointment');
      }
      return;
    }

    if (requestedBy.role === UserRole.PATIENT) {
      const profile = await this.patientProfileRepository.findByUserId(requestedBy.id);
      const patientId =
        appointment.patientProfileId?._id?.toString() || appointment.patientProfileId?.toString();
      if (!profile || profile._id.toString() !== patientId) {
        throw new ForbiddenError('You are not the patient for this appointment');
      }
      return;
    }

    throw new ForbiddenError('Insufficient permissions');
  }

  async _resolveParticipantRole(appointment, requestedBy) {
    if (requestedBy.role === UserRole.DOCTOR) return 'DOCTOR';
    if (requestedBy.role === UserRole.PATIENT) return 'PATIENT';
    if (this._isAdmin(requestedBy)) return 'ADMIN';
    throw new ForbiddenError('Insufficient permissions');
  }

  async createOrJoinSession(appointmentId, requestedBy) {
    const appointment = await this.appointmentRepository.findById(appointmentId);
    await this._authorizeAppointment(appointment, requestedBy);

    if (!JOINABLE_APPOINTMENT_STATUSES.includes(appointment.status)) {
      throw new BadRequestError('Video consultation is only available for confirmed appointments');
    }

    const existing = await this.videoSessionRepository.findActiveByAppointmentId(appointmentId);
    if (existing) {
      return this.joinSession(existing._id.toString(), requestedBy);
    }

    const patientProfile = appointment.patientProfileId;
    const doctorProfile = appointment.doctorProfileId;
    const patientUserId =
      patientProfile?.userId?._id || patientProfile?.userId || appointment.bookedByUserId;
    const doctorUserId = doctorProfile?.userId?._id || doctorProfile?.userId;

    if (!patientUserId || !doctorUserId) {
      throw new BadRequestError('Unable to resolve session participants');
    }

    const role = await this._resolveParticipantRole(appointment, requestedBy);
    const session = await this.videoSessionRepository.create({
      appointmentId,
      roomId: this.videoSessionRepository.generateRoomId(),
      status: VideoSessionStatus.WAITING,
      patientUserId,
      doctorUserId,
      startedByUserId: requestedBy.id,
      iceServers: this._getIceServers(),
      participants: [
        {
          userId: requestedBy.id,
          role,
          joinedAt: new Date(),
          audioEnabled: true,
          videoEnabled: true,
        },
      ],
      startedAt: new Date(),
    });

    const formatted = this._format(session);
    return { session: formatted, iceServers: this._getIceServers() };
  }

  async joinSession(sessionId, requestedBy) {
    const session = await this.videoSessionRepository.findById(sessionId);
    if (!session || !session.isActive) throw new NotFoundError('Video session not found');

    if ([VideoSessionStatus.ENDED, VideoSessionStatus.CANCELLED].includes(session.status)) {
      throw new BadRequestError('This video session has ended');
    }

    const appointment = await this.appointmentRepository.findById(session.appointmentId);
    await this._authorizeAppointment(appointment, requestedBy);

    const role = await this._resolveParticipantRole(appointment, requestedBy);
    const userId = requestedBy.id;
    const participants = session.participants || [];
    const existingIdx = participants.findIndex((p) => p.userId?.toString() === userId);

    if (existingIdx >= 0) {
      participants[existingIdx].joinedAt = new Date();
      participants[existingIdx].leftAt = null;
    } else {
      participants.push({
        userId,
        role,
        joinedAt: new Date(),
        audioEnabled: true,
        videoEnabled: true,
      });
    }

    const updated = await this.videoSessionRepository.updateById(sessionId, {
      participants,
      status: VideoSessionStatus.ACTIVE,
      startedAt: session.startedAt || new Date(),
    });

    return { session: this._format(updated), iceServers: session.iceServers || this._getIceServers() };
  }

  async getSession(sessionId, requestedBy) {
    const session = await this.videoSessionRepository.findById(sessionId);
    if (!session || !session.isActive) throw new NotFoundError('Video session not found');

    const appointment = await this.appointmentRepository.findById(session.appointmentId);
    await this._authorizeAppointment(appointment, requestedBy);

    return {
      session: this._format(session),
      iceServers: session.iceServers || this._getIceServers(),
    };
  }

  async getSessionByAppointment(appointmentId, requestedBy) {
    const appointment = await this.appointmentRepository.findById(appointmentId);
    await this._authorizeAppointment(appointment, requestedBy);

    const session = await this.videoSessionRepository.findActiveByAppointmentId(appointmentId);
    if (!session) throw new NotFoundError('No active video session for this appointment');

    return {
      session: this._format(session),
      iceServers: session.iceServers || this._getIceServers(),
    };
  }

  async endSession(sessionId, requestedBy) {
    const session = await this.videoSessionRepository.findById(sessionId);
    if (!session || !session.isActive) throw new NotFoundError('Video session not found');

    const appointment = await this.appointmentRepository.findById(session.appointmentId);
    await this._authorizeAppointment(appointment, requestedBy);

    const updated = await this.videoSessionRepository.updateById(sessionId, {
      status: VideoSessionStatus.ENDED,
      endedAt: new Date(),
      endedByUserId: requestedBy.id,
    });

    return this._format(updated);
  }

  async getMessages(sessionId, requestedBy) {
    const session = await this.videoSessionRepository.findById(sessionId);
    if (!session || !session.isActive) throw new NotFoundError('Video session not found');

    const appointment = await this.appointmentRepository.findById(session.appointmentId);
    await this._authorizeAppointment(appointment, requestedBy);

    const messages = await this.videoSessionRepository.findMessages(sessionId);
    return messages.map((m) => {
      const json = m.toJSON ? m.toJSON() : m;
      return {
        ...json,
        sender: this._formatUser(json.senderUserId),
      };
    });
  }

  async saveChatMessage(sessionId, senderUserId, message) {
    const session = await this.videoSessionRepository.findById(sessionId);
    if (!session || !session.isActive) throw new NotFoundError('Video session not found');
    if (session.status === VideoSessionStatus.ENDED) {
      throw new BadRequestError('Session has ended');
    }

    const saved = await this.videoSessionRepository.addMessage({
      sessionId,
      senderUserId,
      message: message.trim(),
    });
    const json = saved.toJSON ? saved.toJSON() : saved;
    return {
      ...json,
      sender: this._formatUser(json.senderUserId),
    };
  }

  async updateMediaState(sessionId, userId, { audioEnabled, videoEnabled, screenSharing }) {
    const session = await this.videoSessionRepository.findById(sessionId);
    if (!session) return null;

    const participants = (session.participants || []).map((p) => {
      if (p.userId?.toString() !== userId) return p.toObject ? p.toObject() : p;
      return {
        ...(p.toObject ? p.toObject() : p),
        audioEnabled: audioEnabled ?? p.audioEnabled,
        videoEnabled: videoEnabled ?? p.videoEnabled,
        screenSharing: screenSharing ?? p.screenSharing,
      };
    });

    return this.videoSessionRepository.updateById(sessionId, { participants });
  }

  async startRecording(sessionId, requestedBy) {
    const session = await this.videoSessionRepository.findById(sessionId);
    if (!session || !session.isActive) throw new NotFoundError('Video session not found');

    if (![UserRole.DOCTOR, UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(requestedBy.role)) {
      throw new ForbiddenError('Only doctors or admins can start recording');
    }

    const activeRecording = (session.recordings || []).find(
      (r) => r.status === VideoRecordingStatus.RECORDING || r.status === VideoRecordingStatus.PENDING,
    );
    if (activeRecording) throw new ConflictError('A recording is already in progress');

    const recordingEntry = {
      status: VideoRecordingStatus.RECORDING,
      startedAt: new Date(),
      initiatedByUserId: requestedBy.id,
      storageProvider: config.storage?.provider || 'local',
      metadata: { note: 'Client-side MediaRecorder stub — wire to storage pipeline in production' },
    };

    const updated = await this.videoSessionRepository.updateById(sessionId, {
      recordings: [...(session.recordings || []), recordingEntry],
    });

    const recording = updated.recordings[updated.recordings.length - 1];
    return { session: this._format(updated), recording };
  }

  async stopRecording(sessionId, requestedBy, { storageKey, fileSizeBytes, durationSeconds } = {}) {
    const session = await this.videoSessionRepository.findById(sessionId);
    if (!session || !session.isActive) throw new NotFoundError('Video session not found');

    const idx = (session.recordings || []).findLastIndex(
      (r) => r.status === VideoRecordingStatus.RECORDING,
    );
    if (idx < 0) throw new BadRequestError('No active recording to stop');

    const recordings = session.recordings.map((r, i) => {
      if (i !== idx) return r.toObject ? r.toObject() : r;
      const base = r.toObject ? r.toObject() : r;
      return {
        ...base,
        status: VideoRecordingStatus.PROCESSING,
        endedAt: new Date(),
        durationSeconds: durationSeconds ?? base.durationSeconds ?? 0,
        storageKey: storageKey || `recordings/${session.roomId}/${Date.now()}.webm`,
        storageUrl: null,
        fileSizeBytes: fileSizeBytes ?? 0,
      };
    });

    const updated = await this.videoSessionRepository.updateById(sessionId, { recordings });

    if (!config.isProduction) {
      const finalIdx = recordings.length - 1;
      recordings[finalIdx].status = VideoRecordingStatus.COMPLETED;
      recordings[finalIdx].storageUrl = `/uploads/video-recordings/${session.roomId}.webm`;
      await this.videoSessionRepository.updateById(sessionId, { recordings });
    }

    const refreshed = await this.videoSessionRepository.findById(sessionId);
    return { session: this._format(refreshed), recording: refreshed.recordings[idx] };
  }

  async verifySessionAccess(sessionId, userId) {
    const session = await this.videoSessionRepository.findById(sessionId);
    if (!session || !session.isActive) return false;
    const allowed = [
      session.patientUserId?.toString(),
      session.doctorUserId?.toString(),
      session.startedByUserId?.toString(),
    ];
    return allowed.includes(userId);
  }
}

module.exports = VideoConsultationService;
