const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    city: { type: String, required: true, trim: true },
    citySlug: { type: String, required: true, trim: true, lowercase: true, index: true },
    description: { type: String, trim: true, default: '' },
    address: { type: String, required: true, trim: true },
    location: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: {
        type: [Number],
      },
    },
    images: {
      type: [String],
      default: [],
    },
    facilities: {
      type: [String],
      default: [],
    },
    doctorIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' }],
      default: [],
    },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0, min: 0 },
    offersSurgeries: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

hospitalSchema.index({ citySlug: 1, slug: 1 }, { unique: true });
hospitalSchema.index({ location: '2dsphere' }, { sparse: true });

const Hospital = mongoose.models.Hospital || mongoose.model('Hospital', hospitalSchema);

module.exports = { Hospital };
