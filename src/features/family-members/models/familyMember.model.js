const mongoose = require('mongoose');
const { FAMILY_RELATIONSHIPS } = require('../../../shared/enums/familyRelationship.enum');

const familyMemberSchema = new mongoose.Schema(
  {
    patientProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PatientProfile',
      required: true,
      index: true,
    },
    relationship: {
      type: String,
      enum: FAMILY_RELATIONSHIPS,
      required: true,
      index: true,
    },
    firstName: { type: String, required: true, trim: true, maxlength: 50 },
    lastName: { type: String, required: true, trim: true, maxlength: 50 },
    gender: { type: String, enum: ['MALE', 'FEMALE', 'OTHER'], trim: true },
    dateOfBirth: { type: Date },
    phone: { type: String, trim: true, maxlength: 30 },
    email: { type: String, trim: true, lowercase: true, maxlength: 150 },
    notes: { type: String, trim: true, maxlength: 500 },
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

familyMemberSchema.index({ patientProfileId: 1, relationship: 1 });
familyMemberSchema.index({ patientProfileId: 1, isActive: 1 });

const FamilyMember = mongoose.model('FamilyMember', familyMemberSchema);

module.exports = FamilyMember;
