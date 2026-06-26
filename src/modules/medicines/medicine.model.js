const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema(
  {
    pharmacyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pharmacy',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    manufacturer: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'PKR', trim: true },
    requiresPrescription: { type: Boolean, default: false, index: true },
    stock: { type: Number, required: true, min: 0, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

medicineSchema.index({ pharmacyId: 1, name: 1 });
medicineSchema.index({ name: 'text', description: 'text', manufacturer: 'text' });

const Medicine = mongoose.models.Medicine || mongoose.model('Medicine', medicineSchema);

module.exports = { Medicine };
