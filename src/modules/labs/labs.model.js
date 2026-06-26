const mongoose = require('mongoose');

const labSchema = new mongoose.Schema(
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

labSchema.index({ citySlug: 1, slug: 1 }, { unique: true });

const Lab = mongoose.models.Lab || mongoose.model('Lab', labSchema);

module.exports = { Lab };
