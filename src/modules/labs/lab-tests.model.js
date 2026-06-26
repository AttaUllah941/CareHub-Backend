const mongoose = require('mongoose');

const labTestSchema = new mongoose.Schema(
  {
    labId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lab',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'PKR', trim: true },
    homeCollectionAvailable: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

labTestSchema.index({ labId: 1, name: 1 });

const LabTest = mongoose.models.LabTest || mongoose.model('LabTest', labTestSchema);

module.exports = { LabTest };
