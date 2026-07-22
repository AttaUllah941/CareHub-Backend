const mongoose = require('mongoose');

const pharmacySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    city: { type: String, required: true, trim: true },
    citySlug: { type: String, required: true, trim: true, lowercase: true, index: true },
    address: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, lowercase: true, default: '' },
    website: { type: String, trim: true, default: '' },
    images: {
      type: [String],
      default: [],
    },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    timings: { type: String, trim: true, default: '' },
    isHomeDelivery: { type: Boolean, default: true },
    deliveryFee: { type: Number, default: 150, min: 0 },
    deliveryTime: { type: String, trim: true, default: '45–90 min' },
    /** Linked PHARMACY-role user who manages this storefront */
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      sparse: true,
      unique: true,
    },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

pharmacySchema.index({ citySlug: 1, slug: 1 }, { unique: true });

const Pharmacy = mongoose.models.Pharmacy || mongoose.model('Pharmacy', pharmacySchema);

module.exports = { Pharmacy };
