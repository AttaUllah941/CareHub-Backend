const openaiProvider = require('./openai.provider');

let override = null;

/** Returns the active LLM provider. Tests can inject a provider with setProvider(). */
const getProvider = () => override || openaiProvider;

const setProvider = (provider) => {
  override = provider;
};

module.exports = { getProvider, setProvider };
