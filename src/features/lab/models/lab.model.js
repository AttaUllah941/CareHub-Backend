const mongoose = require('mongoose');

const labSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200, index: true },
    description: { type: String, trim: true, maxlength: 2000 },
    address: { type: String, trim: true, maxlength: 500 },
    city: { type: String, trim: true, maxlength: 100, index: true },
    state: { type: String, trim: true, maxlength: 100 },
    phone: { type: String, trim: true, maxlength: 30 },
    email: { type: String, trim: true, lowercase: true, maxlength: 200 },
    website: { type: String, trim: true, maxlength: 300 },
    homeCollectionAvailable: { type: Boolean, default: true },
    homeCollectionFee: { type: Number, min: 0, default: 0 },
    openingHours: { type: String, trim: true, maxlength: 500 },
    rating: { type: Number, min: 0, max: 5, default: 0 },
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

labSchema.index({ name: 'text', city: 'text', description: 'text' });

module.exports = mongoose.model('Lab', labSchema);
