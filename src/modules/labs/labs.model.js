const mongoose = require('mongoose');

const labSchema = new mongoose.Schema(
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
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

labSchema.index({ citySlug: 1, slug: 1 }, { unique: true });

const Lab = mongoose.models.Lab || mongoose.model('Lab', labSchema);

module.exports = { Lab };
