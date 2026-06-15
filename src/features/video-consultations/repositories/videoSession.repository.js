const crypto = require('crypto');
const VideoSession = require('../models/videoSession.model');
const VideoSessionMessage = require('../models/videoSessionMessage.model');
const { VideoSessionStatus } = require('../../../shared/enums/videoSessionStatus.enum');

const POPULATE_FIELDS = [
  { path: 'appointmentId', select: 'appointmentDate startTime endTime status consultationFee currency' },
  { path: 'consultationId', select: 'diagnosis createdAt' },
  { path: 'patientUserId', select: 'firstName lastName email role' },
  { path: 'doctorUserId', select: 'firstName lastName email role' },
  { path: 'startedByUserId', select: 'firstName lastName email' },
  { path: 'endedByUserId', select: 'firstName lastName email' },
  { path: 'participants.userId', select: 'firstName lastName email role' },
  { path: 'recordings.initiatedByUserId', select: 'firstName lastName email' },
];

const MESSAGE_POPULATE = [
  { path: 'senderUserId', select: 'firstName lastName email role' },
];

class VideoSessionRepository {
  generateRoomId() {
    return `vc-${crypto.randomBytes(12).toString('hex')}`;
  }

  async create(data) {
    const session = await VideoSession.create(data);
    return session.populate(POPULATE_FIELDS);
  }

  async findById(id) {
    return VideoSession.findById(id).populate(POPULATE_FIELDS);
  }

  async findByRoomId(roomId) {
    return VideoSession.findOne({ roomId, isActive: true }).populate(POPULATE_FIELDS);
  }

  async findActiveByAppointmentId(appointmentId) {
    return VideoSession.findOne({
      appointmentId,
      isActive: true,
      status: { $in: [VideoSessionStatus.WAITING, VideoSessionStatus.ACTIVE] },
    }).populate(POPULATE_FIELDS);
  }

  async updateById(id, data) {
    return VideoSession.findByIdAndUpdate(id, data, { new: true, runValidators: true }).populate(
      POPULATE_FIELDS,
    );
  }

  async addMessage(data) {
    const msg = await VideoSessionMessage.create(data);
    return msg.populate(MESSAGE_POPULATE);
  }

  async findMessages(sessionId, { limit = 100 } = {}) {
    return VideoSessionMessage.find({ sessionId, isActive: true })
      .sort({ createdAt: 1 })
      .limit(limit)
      .populate(MESSAGE_POPULATE);
  }
}

module.exports = VideoSessionRepository;
