const mongoose = require('mongoose');

/**
 * Medical specialty reference data (e.g. Cardiology, Dermatology).
 */
const specialtySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Specialty name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Specialty slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

const Specialty = mongoose.model('Specialty', specialtySchema);

module.exports = Specialty;
