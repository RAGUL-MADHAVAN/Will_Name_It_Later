const mongoose = require('mongoose');
const Resource = require('../models/Resource');
const { addResourceToAI, aiSearchEnabled } = require('../utils/aiSearch');

const run = async () => {
  if (!aiSearchEnabled) {
    console.error('AI search is disabled. Set GEMINI_API_KEY and PINECONE_API_KEY first.');
    process.exit(1);
  }

  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart_hostel';
  await mongoose.connect(mongoUri);

  const resources = await Resource.find({});
  console.log(`Found ${resources.length} resources. Indexing...`);

  for (const resource of resources) {
    const text = `${resource.name} ${resource.description} ${resource.category} ${(resource.tags || []).join(' ')}`;
    await addResourceToAI(resource._id, text);
    console.log(`Indexed: ${resource.name}`);
    await new Promise((resolve) => setTimeout(resolve, 120));
  }

  await mongoose.disconnect();
  console.log('Backfill complete.');
};

run().catch((error) => {
  console.error('Backfill failed:', error.message || error);
  process.exit(1);
});
