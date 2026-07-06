const mongoose = require('mongoose');

const specialtySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true },
    description: { type: String, trim: true, default: '' },
    icon: { type: String, trim: true, default: '' },
    sortOrder: { type: Number, default: 999, index: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

const Specialty =
  mongoose.models.Specialty || mongoose.model('Specialty', specialtySchema);

module.exports = { Specialty };
