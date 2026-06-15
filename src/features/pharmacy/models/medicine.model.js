const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200, index: true },
    genericName: { type: String, trim: true, maxlength: 200, index: true },
    brandName: { type: String, trim: true, maxlength: 200 },
    strength: { type: String, trim: true, maxlength: 100 },
    form: {
      type: String,
      enum: ['TABLET', 'CAPSULE', 'SYRUP', 'INJECTION', 'CREAM', 'DROPS', 'INHALER', 'OTHER'],
      default: 'TABLET',
    },
    unit: { type: String, trim: true, maxlength: 50, default: 'unit' },
    sku: { type: String, trim: true, maxlength: 100, unique: true, sparse: true },
    barcode: { type: String, trim: true, maxlength: 100 },
    category: { type: String, trim: true, maxlength: 100, index: true },
    requiresPrescription: { type: Boolean, default: true },
    description: { type: String, trim: true, maxlength: 2000 },
    manufacturer: { type: String, trim: true, maxlength: 200 },
    sellingPrice: { type: Number, min: 0, default: 0 },
    currency: { type: String, trim: true, default: 'PKR', maxlength: 10 },
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

medicineSchema.index({ name: 'text', genericName: 'text', brandName: 'text' });

module.exports = mongoose.model('Medicine', medicineSchema);
