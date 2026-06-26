const mongoose = require('mongoose');

const pharmacySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    city: { type: String, required: true, trim: true },
    citySlug: { type: String, required: true, trim: true, lowercase: true, index: true },
    address: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

pharmacySchema.index({ citySlug: 1, slug: 1 }, { unique: true });

const Pharmacy = mongoose.models.Pharmacy || mongoose.model('Pharmacy', pharmacySchema);

module.exports = { Pharmacy };
