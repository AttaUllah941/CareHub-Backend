const config = require('../../../config');
const logger = require('../../../core/utils/logger');
const { AppError } = require('../../../core/errors/AppError');

/**
 * OpenAI-compatible chat provider (plain HTTPS — no SDK dependency).
 * Any provider exposing the same /chat/completions contract can be used by
 * changing OPENAI_BASE_URL / AI_MODEL; a different API shape needs a new
 * provider that implements the same `chat()` contract.
 *
 * Contract:
 *   chat({ messages, tools?, temperature? }) -> { message, usage }
 *   where message = { role:'assistant', content, tool_calls? }
 */
const isConfigured = () => Boolean(config.ai.apiKey);

const chat = async ({ messages, tools, temperature = 0.2, model = config.ai.model }) => {
  if (!isConfigured()) {
    throw new AppError('The AI assistant is not configured on this server', 503);
  }

  const body = { model, messages, temperature };
  if (tools?.length) {
    body.tools = tools;
    body.tool_choice = 'auto';
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.ai.timeoutMs);

  let response;
  try {
    response = await fetch(`${config.ai.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.ai.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    const timedOut = error.name === 'AbortError';
    logger.error(`AI provider request failed: ${timedOut ? 'timeout' : error.message}`);
    throw new AppError(
      timedOut ? 'The AI assistant took too long to respond. Please try again.' : 'The AI assistant is unreachable right now.',
      timedOut ? 504 : 502,
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    // Never forward provider error bodies to clients (may contain account details).
    const detail = await response.text().catch(() => '');
    logger.error(`AI provider error ${response.status}: ${detail.slice(0, 300)}`);
    const status = response.status === 429 ? 503 : 502;
    throw new AppError(
      response.status === 429
        ? 'The AI assistant is busy. Please try again in a moment.'
        : 'The AI assistant could not process the request.',
      status,
    );
  }

  const json = await response.json();
  const message = json.choices?.[0]?.message;
  if (!message) {
    throw new AppError('The AI assistant returned an empty response.', 502);
  }

  return { message, usage: json.usage || null };
};

/**
 * Embeds texts in one request. Returns vectors in input order.
 * Contract: embed(texts: string[]) -> number[][]
 */
const embed = async (texts) => {
  if (!isConfigured()) {
    throw new AppError('The AI assistant is not configured on this server', 503);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.ai.timeoutMs);

  let response;
  try {
    response = await fetch(`${config.ai.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.ai.apiKey}`,
      },
      body: JSON.stringify({
        model: config.ai.embeddingModel,
        input: texts,
        dimensions: config.ai.embeddingDimensions,
      }),
      signal: controller.signal,
    });
  } catch (error) {
    logger.error(`AI embeddings request failed: ${error.name === 'AbortError' ? 'timeout' : error.message}`);
    throw new AppError('The embeddings service is unreachable right now.', 502);
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    logger.error(`AI embeddings error ${response.status}: ${detail.slice(0, 300)}`);
    throw new AppError('The embeddings service could not process the request.', 502);
  }

  const json = await response.json();
  const vectors = (json.data || []).sort((a, b) => a.index - b.index).map((item) => item.embedding);
  if (vectors.length !== texts.length) {
    throw new AppError('The embeddings service returned an unexpected response.', 502);
  }
  return vectors;
};

module.exports = { name: 'openai', isConfigured, chat, embed };
