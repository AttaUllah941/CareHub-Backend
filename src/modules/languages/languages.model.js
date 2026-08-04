const mongoose = require('mongoose');

const languageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, lowercase: true, unique: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

languageSchema.index({ isActive: 1, name: 1 });

const Language = mongoose.models.Language || mongoose.model('Language', languageSchema);

module.exports = { Language };
