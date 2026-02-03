const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Pinecone } = require('@pinecone-database/pinecone');

const geminiKey = process.env.GEMINI_API_KEY;
const pineconeKey = process.env.PINECONE_API_KEY;
const pineconeIndexName = process.env.PINECONE_INDEX_NAME || 'resource-search';
const embedModel = process.env.GEMINI_EMBED_MODEL || 'text-embedding-004';

const aiSearchEnabled = Boolean(geminiKey && pineconeKey);
let model;
let index;

if (aiSearchEnabled) {
  const genAI = new GoogleGenerativeAI(geminiKey);
  model = genAI.getGenerativeModel({ model: embedModel });
  const pinecone = new Pinecone({ apiKey: pineconeKey });
  index = pinecone.index(pineconeIndexName);
}

const getVector = async (text) => {
  if (!model) return null;
  try {
    const result = await model.embedContent(text);
    const vector = result.embedding.values;
    if (!vector || !vector.length) {
      console.error('Empty embedding for text:', text);
      return null;
    }
    return vector;
  } catch (error) {
    console.error('Embedding failed:', error.message || error);
    return null;
  }
};

const addResourceToAI = async (id, textData) => {
  if (!index || !model) return;
  try {
    const vector = await getVector(textData);
    if (!vector) {
      console.error('Skipping index due to empty vector for:', textData);
      return;
    }
    const payload = {
      vectors: [{
        id: id.toString(),
        values: vector,
        metadata: { text: textData }
      }]
    };
    const host = 'search-83nlca1.svc.aped-4627-b74a.pinecone.io';
    const res = await fetch(`https://${host}/vectors/upsert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': pineconeKey
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Pinecone upsert error: ${res.status} ${err}`);
    }
    console.log(`Indexed: ${textData}`);
  } catch (error) {
    console.error('AI Indexing failed:', error.message || error);
  }
};

const searchAI = async (query, topK = 10, minScore = parseFloat(process.env.AI_SEARCH_MIN_SCORE || '0.55')) => {
  if (!index || !model) return [];
  try {
    const vector = await getVector(query);
    if (!vector) return [];
    const searchResult = await index.query({
      vector,
      topK,
      includeMetadata: false
    });

    return (searchResult.matches || [])
      .filter((match) => typeof match.score !== 'number' || match.score >= minScore)
      .map((match) => match.id);
  } catch (error) {
    console.error('AI Search failed:', error.message || error);
    return [];
  }
};

module.exports = {
  addResourceToAI,
  searchAI,
  aiSearchEnabled
};
