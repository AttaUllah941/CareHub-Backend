const mongoose = require('mongoose');

const QUESTION_STATUSES = ['pending', 'answered'];

const healthQuestionSchema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true, maxlength: 1000 },
    category: { type: String, required: true, trim: true, maxlength: 100 },
    city: { type: String, trim: true, maxlength: 100, default: '' },
    isAnonymous: { type: Boolean, default: true },
    askerName: { type: String, trim: true, maxlength: 150, default: '' },
    age: { type: Number, min: 0, max: 120, default: null },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', ''],
      default: '',
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: QUESTION_STATUSES,
      default: 'pending',
      index: true,
    },
    answer: { type: String, trim: true, maxlength: 3000, default: '' },
    doctorName: { type: String, trim: true, maxlength: 150, default: '' },
    specialty: { type: String, trim: true, maxlength: 100, default: '' },
    specialtySlug: { type: String, trim: true, maxlength: 100, default: '' },
    views: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

healthQuestionSchema.index({ status: 1, createdAt: -1 });
healthQuestionSchema.index({ patientId: 1, createdAt: -1 });

const HealthQuestion =
  mongoose.models.HealthQuestion || mongoose.model('HealthQuestion', healthQuestionSchema);

module.exports = {
  HealthQuestion,
  QUESTION_STATUSES,
};
