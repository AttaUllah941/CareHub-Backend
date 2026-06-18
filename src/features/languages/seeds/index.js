const Language = require('../models/language.model');
const { DEFAULT_LANGUAGES } = require('./languages.seed');

/**
 * Seeds default languages on application startup.
 * Idempotent — safe to run on every boot.
 */
const seedLanguages = async () => {
  for (const language of DEFAULT_LANGUAGES) {
    await Language.findOneAndUpdate(
      { code: language.code },
      { $setOnInsert: { ...language, isActive: true } },
      { upsert: true, new: true },
    );
  }
};

module.exports = { seedLanguages };
