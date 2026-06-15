const mongoose = require('mongoose');

const pharmacyInventorySchema = new mongoose.Schema(
  {
    medicineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medicine',
      required: true,
    },
    quantity: { type: Number, required: true, min: 0, default: 0 },
    reservedQuantity: { type: Number, min: 0, default: 0 },
    reorderLevel: { type: Number, min: 0, default: 10 },
    batchNumber: { type: String, trim: true, maxlength: 100 },
    expiryDate: { type: Date, default: null },
    unitCost: { type: Number, min: 0, default: 0 },
    sellingPrice: { type: Number, min: 0, default: 0 },
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
        ret.medicineId =
          ret.medicineId?.id || ret.medicineId?._id?.toString() || ret.medicineId?.toString();
        return ret;
      },
    },
  },
);

pharmacyInventorySchema.index({ medicineId: 1 }, { unique: true });

module.exports = mongoose.model('PharmacyInventory', pharmacyInventorySchema);
