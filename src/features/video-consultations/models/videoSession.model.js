const mongoose = require('mongoose');
const { VIDEO_SESSION_STATUS_VALUES } = require('../../../shared/enums/videoSessionStatus.enum');
const { VIDEO_RECORDING_STATUS_VALUES } = require('../../../shared/enums/videoRecordingStatus.enum');

const participantSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['DOCTOR', 'PATIENT', 'ADMIN'], required: true },
    joinedAt: { type: Date, default: null },
    leftAt: { type: Date, default: null },
    audioEnabled: { type: Boolean, default: true },
    videoEnabled: { type: Boolean, default: true },
    screenSharing: { type: Boolean, default: false },
  },
  { _id: true },
);

const recordingSchema = new mongoose.Schema(
  {
    status: { type: String, enum: VIDEO_RECORDING_STATUS_VALUES, default: 'PENDING' },
    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
    durationSeconds: { type: Number, min: 0, default: 0 },
    storageProvider: { type: String, trim: true, default: 'local' },
    storageKey: { type: String, trim: true },
    storageUrl: { type: String, trim: true },
    fileSizeBytes: { type: Number, min: 0 },
    mimeType: { type: String, trim: true, default: 'video/webm' },
    initiatedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    failureReason: { type: String, trim: true, maxlength: 500 },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true },
);

const videoSessionSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
      index: true,
    },
    consultationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Consultation', default: null },
    roomId: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: VIDEO_SESSION_STATUS_VALUES,
      default: 'WAITING',
      index: true,
    },
    patientUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    doctorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    startedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    participants: { type: [participantSchema], default: [] },
    recordings: { type: [recordingSchema], default: [] },
    iceServers: { type: mongoose.Schema.Types.Mixed },
    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
    endedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    isActive: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        if (ret.recordings) {
          ret.recordings = ret.recordings.map((r) => ({
            ...r,
            id: r._id?.toString(),
            _id: undefined,
          }));
        }
        return ret;
      },
    },
  },
);

videoSessionSchema.index({ appointmentId: 1, status: 1 });

module.exports = mongoose.model('VideoSession', videoSessionSchema);
