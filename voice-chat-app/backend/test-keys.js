// Test script to verify API keys work
const https = require('https');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

console.log('🔑 Testing API Keys...\n');

// Test OpenAI API
function testOpenAI() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.openai.com',
      path: '/v1/models',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ OpenAI API Key: VALID');
          resolve(true);
        } else {
          console.log(`❌ OpenAI API Key: INVALID (Status: ${res.statusCode})`);
          console.log('   Response:', data.substring(0, 200));
          resolve(false);
        }
      });
    });

    req.on('error', (e) => {
      console.log('❌ OpenAI API Key: ERROR -', e.message);
      resolve(false);
    });

    req.end();
  });
}

// Test Eleven Labs API
function testElevenLabs() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.elevenlabs.io',
      path: '/v1/voices',
      method: 'GET',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          const voices = JSON.parse(data);
          console.log(`✅ Eleven Labs API Key: VALID (${voices.voices?.length || 0} voices available)`);
          resolve(true);
        } else {
          console.log(`❌ Eleven Labs API Key: INVALID (Status: ${res.statusCode})`);
          console.log('   Response:', data.substring(0, 200));
          resolve(false);
        }
      });
    });

    req.on('error', (e) => {
      console.log('❌ Eleven Labs API Key: ERROR -', e.message);
      resolve(false);
    });

    req.end();
  });
}

async function main() {
  const openaiOk = await testOpenAI();
  const elevenLabsOk = await testElevenLabs();
  
  console.log('\n' + '='.repeat(40));
  if (openaiOk && elevenLabsOk) {
    console.log('🎉 All API keys verified! Ready to proceed.');
    process.exit(0);
  } else {
    console.log('⚠️  Some API keys failed verification.');
    process.exit(1);
  }
}

main();
