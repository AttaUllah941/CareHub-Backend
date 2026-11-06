/**
 * Builds/refreshes the CareHub AI knowledge index from /knowledge/*.md and answered health questions.
 *
 *   npm run ai:ingest                 incremental (unchanged sources are skipped)
 *   npm run ai:ingest -- --force      re-chunk and re-embed everything
 *   npm run ai:ingest -- --dir=./other --no-questions
 *
 * With OPENAI_API_KEY set, passages are embedded (semantic search). Without it they are stored for
 * keyword search and upgraded to semantic the next time this runs with a key.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../src/config');
const { ingest } = require('../src/modules/ai/rag/ingest.service');
const { getProvider } = require('../src/modules/ai/providers');

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name) => args.find((arg) => arg.startsWith(`--${name}=`))?.split('=')[1];

const run = async () => {
  await mongoose.connect(config.mongodb.uri);

  const provider = getProvider();
  console.log(
    provider.isConfigured()
      ? `Embedding with ${config.ai.embeddingModel} (${config.ai.embeddingDimensions} dims)`
      : 'No OPENAI_API_KEY — indexing for keyword search only (re-run with a key to enable semantic search)',
  );

  const summary = await ingest({
    dir: option('dir') || config.ai.rag.knowledgeDir,
    includeQuestions: !flag('no-questions'),
    force: flag('force'),
  });

  console.log('Done:', summary);
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error('Ingest failed:', error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
