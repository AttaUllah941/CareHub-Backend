const mongoose = require('mongoose');

const labTestSchema = new mongoose.Schema(
  {
    labId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab', required: true },
    name: { type: String, required: true, trim: true, maxlength: 200, index: true },
    code: { type: String, trim: true, maxlength: 50 },
    category: {
      type: String,
      enum: ['BLOOD', 'URINE', 'STOOL', 'IMAGING', 'HORMONE', 'COVID', 'OTHER'],
      default: 'BLOOD',
      index: true,
    },
    description: { type: String, trim: true, maxlength: 2000 },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, trim: true, default: 'PKR', maxlength: 10 },
    sampleType: { type: String, trim: true, maxlength: 100 },
    preparationInstructions: { type: String, trim: true, maxlength: 1000 },
    turnaroundHours: { type: Number, min: 1, default: 24 },
    homeCollectionAvailable: { type: Boolean, default: true },
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
        ret.labId = ret.labId?.id || ret.labId?._id?.toString() || ret.labId?.toString();
        return ret;
      },
    },
  },
);

labTestSchema.index({ labId: 1, name: 1 });

module.exports = mongoose.model('LabTest', labTestSchema);
