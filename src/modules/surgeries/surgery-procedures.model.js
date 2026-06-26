const mongoose = require('mongoose');

const estimatedCostRangeSchema = new mongoose.Schema(
  {
    min: { type: Number, required: true, min: 0 },
    max: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const surgeryProcedureSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true },
    description: { type: String, trim: true, default: '' },
    category: { type: String, required: true, trim: true, index: true },
    estimatedCostRange: {
      type: estimatedCostRangeSchema,
      required: true,
    },
    currency: { type: String, default: 'PKR', trim: true },
    hospitalIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' }],
      default: [],
    },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

surgeryProcedureSchema.index({ name: 'text', description: 'text', category: 'text' });

const SurgeryProcedure =
  mongoose.models.SurgeryProcedure ||
  mongoose.model('SurgeryProcedure', surgeryProcedureSchema);

module.exports = { SurgeryProcedure };
