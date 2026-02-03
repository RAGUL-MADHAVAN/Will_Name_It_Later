const { GoogleGenerativeAI } = require('@google/generative-ai');
const https = require('https');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });

(async () => {
  const result = await model.embedContent('laptop computer');
  const vector = result.embedding.values;
  console.log('Vector length:', vector.length, 'Sample:', vector.slice(0, 5));

  const data = JSON.stringify({
    vectors: [{
      id: 'test-embed',
      values: vector,
      metadata: { text: 'laptop computer' }
    }]
  });

  const opts = {
    hostname: 'search-83nlca1.svc.aped-4627-b74a.pinecone.io',
    path: '/vectors/upsert',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Api-Key': process.env.PINECONE_API_KEY
    }
  };

  const req = https.request(opts, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => console.log('Status:', res.statusCode, 'Body:', body));
  });
  req.on('error', console.error);
  req.write(data);
  req.end();
})();
