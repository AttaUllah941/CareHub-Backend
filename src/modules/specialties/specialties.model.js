const mongoose = require('mongoose');

const medicalSpecialtySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    icon: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

const MedicalSpecialty =
  mongoose.models.MedicalSpecialty ||
  mongoose.model('MedicalSpecialty', medicalSpecialtySchema);

module.exports = MedicalSpecialty;
