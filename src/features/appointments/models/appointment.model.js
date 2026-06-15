const mongoose = require('mongoose');
const { AppointmentStatus } = require('../../../shared/enums/appointmentStatus.enum');
const { APPOINTMENT_PAYMENT_STATUS_VALUES } = require('../../../shared/enums/paymentStatus.enum');

const appointmentSchema = new mongoose.Schema(
  {
    patientProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PatientProfile',
      required: true,
      index: true,
    },
    familyMemberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FamilyMember',
      default: null,
    },
    doctorProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DoctorProfile',
      required: true,
      index: true,
    },
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      required: true,
      index: true,
    },
    appointmentDate: { type: Date, required: true, index: true },
    startTime: { type: String, required: true, trim: true },
    endTime: { type: String, required: true, trim: true },
    slotDurationMinutes: { type: Number, required: true, min: 5 },
    status: {
      type: String,
      enum: Object.values(AppointmentStatus),
      default: AppointmentStatus.PENDING,
      index: true,
    },
    reason: { type: String, trim: true, maxlength: 500 },
    notes: { type: String, trim: true, maxlength: 2000 },
    cancellationReason: { type: String, trim: true, maxlength: 500 },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cancelledAt: { type: Date },
    rescheduledFromId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', default: null },
    consultationFee: { type: Number, min: 0 },
    currency: { type: String, trim: true, default: 'PKR', maxlength: 10 },
    paymentStatus: {
      type: String,
      enum: APPOINTMENT_PAYMENT_STATUS_VALUES,
      default: 'UNPAID',
      index: true,
    },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
    bookedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
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
        return ret;
      },
    },
  },
);

appointmentSchema.index({ doctorProfileId: 1, appointmentDate: 1, startTime: 1, status: 1 });
appointmentSchema.index({ patientProfileId: 1, appointmentDate: -1 });
appointmentSchema.index({ clinicId: 1, appointmentDate: 1 });
appointmentSchema.index(
  { doctorProfileId: 1, appointmentDate: 1, startTime: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ['PENDING', 'CONFIRMED'] },
      isActive: true,
    },
  },
);

const Appointment = mongoose.model('Appointment', appointmentSchema);

module.exports = Appointment;
