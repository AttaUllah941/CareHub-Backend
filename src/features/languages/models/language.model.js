const mongoose = require('mongoose');

/**
 * Language reference data (e.g. English, Arabic, Urdu).
 */
const languageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Language name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    code: {
      type: String,
      required: [true, 'Language code is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    nativeName: {
      type: String,
      trim: true,
      maxlength: [100, 'Native name cannot exceed 100 characters'],
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

const Language = mongoose.model('Language', languageSchema);

module.exports = Language;
