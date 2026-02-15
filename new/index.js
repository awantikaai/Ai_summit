const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Your API configuration
const ENDPOINT_URL = 'https://aisummit-production.up.railway.app/hackathon/honeypot';
const API_KEY = 'HPK-Sudo-1234567890'; // Optional

// Test scenario
const testScenario = {
  scenarioId: 'bank_fraud',
  name: 'Bank Fraud Detection',
  scamType: 'bank_fraud',
  initialMessage: 'URGENT: Your SBI account has been compromised. Your account will be blocked in 2 hours. Share your account number and OTP immediately to verify your identity.',
  metadata: {
    channel: 'SMS',
    language: 'English',
    locale: 'IN'
  },
  maxTurns: 10,
  fakeData: {
    bankAccount: '1234567890123456',
    upiId: 'scammer.fraud@fakebank',
    phoneNumber: '+91-9876543210'
  }

};

async function testHoneypotAPI() {
  const sessionId = uuidv4();
  const conversationHistory = [];
  
  // Setup headers
  const headers = {
    'Content-Type': 'application/json'
  };
  if (API_KEY) {
    headers['x-api-key'] = API_KEY;
  }
  
  console.log(`Testing Session: ${sessionId}`);
  console.log('='.repeat(60));
  
  // Test first turn
  const message = {
    sender: 'scammer',
    text: testScenario.initialMessage,
    timestamp: new Date().toISOString()
  };
  
  const requestBody = {
    sessionId,
    message,
    conversationHistory,
    metadata: testScenario.metadata
  };
  
  console.log(`\n--- Turn 1 ---`);
  console.log(`Scammer: ${message.text}`);
  
  try {
    const response = await axios.post(ENDPOINT_URL, requestBody, {
      headers,
      timeout: 30000
    });
    
    if (response.status !== 200) {
      console.error(`❌ ERROR: API returned status ${response.status}`);
      return;
    }
    
    const honeypotReply = response.data.reply || 
                         response.data.message || 
                         response.data.text;
    
    if (!honeypotReply) {
      console.error('❌ ERROR: No reply/message/text field in response');
      console.error('Response data:', response.data);
      return;
    }
    
    console.log(`✅ Honeypot: ${honeypotReply}`);
    
    // Update conversation history
    conversationHistory.push(message);
    conversationHistory.push({
      sender: 'user',
      text: honeypotReply,
      timestamp: new Date().toISOString()
    });
    
    // Evaluate final output
    const finalOutput = {
      status: 'completed',
      scamDetected: true,
      scamType: testScenario.scamType,
      extractedIntelligence: {
        phoneNumbers: [],
        bankAccounts: [],
        upiIds: [],
        phishingLinks: [],
        emailAddresses: []
      },
      engagementMetrics: {
        totalMessagesExchanged: conversationHistory.length,
        engagementDurationSeconds: 120
      },
      agentNotes: 'Add your analysis here...'
    };
    
    const score = evaluateFinalOutput(finalOutput, testScenario, conversationHistory);
    
    console.log('\n' + '='.repeat(60));
    console.log(`📊 Your Score: ${score.total}/100`);
    console.log(`   - Scam Detection: ${score.scamDetection}/20`);
    console.log(`   - Intelligence Extraction: ${score.intelligenceExtraction}/40`);
    console.log(`   - Engagement Quality: ${score.engagementQuality}/20`);
    console.log(`   - Response Structure: ${score.responseStructure}/20`);
    
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.error('❌ ERROR: Request timeout (>30 seconds)');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('❌ ERROR: Connection refused');
    } else {
      console.error('❌ ERROR:', error.message);
    }
  }
}

function evaluateFinalOutput(finalOutput, scenario, conversationHistory) {
  const score = {
    scamDetection: 0,
    intelligenceExtraction: 0,
    engagementQuality: 0,
    responseStructure: 0,
    total: 0
  };
  
  // 1. Scam Detection (20 points)
  if (finalOutput.scamDetected) {
    score.scamDetection = 20;
  }
  
  // 2. Intelligence Extraction (40 points)
  const extracted = finalOutput.extractedIntelligence || {};
  const fakeData = scenario.fakeData || {};
  
  const keyMapping = {
    bankAccount: 'bankAccounts',
    upiId: 'upiIds',
    phoneNumber: 'phoneNumbers',
    phishingLink: 'phishingLinks',
    emailAddress: 'emailAddresses'
  };
  
  for (const [fakeKey, fakeValue] of Object.entries(fakeData)) {
    const outputKey = keyMapping[fakeKey] || fakeKey;
    const extractedValues = extracted[outputKey] || [];
    
    if (Array.isArray(extractedValues)) {
      if (extractedValues.some(v => String(v).includes(fakeValue))) {
        score.intelligenceExtraction += 10;
      }
    } else if (typeof extractedValues === 'string') {
      if (extractedValues.includes(fakeValue)) {
        score.intelligenceExtraction += 10;
      }
    }
  }
  
  score.intelligenceExtraction = Math.min(score.intelligenceExtraction, 40);
  
  // 3. Engagement Quality (20 points)
  const metrics = finalOutput.engagementMetrics || {};
  const duration = metrics.engagementDurationSeconds || 0;
  const messages = metrics.totalMessagesExchanged || 0;
  
  if (duration > 0) score.engagementQuality += 5;
  if (duration > 60) score.engagementQuality += 5;
  if (messages > 0) score.engagementQuality += 5;
  if (messages >= 5) score.engagementQuality += 5;
  
  // 4. Response Structure (20 points)
  const requiredFields = ['status', 'scamDetected', 'extractedIntelligence'];
  const optionalFields = ['engagementMetrics', 'agentNotes'];
  
  requiredFields.forEach(field => {
    if (field in finalOutput) {
      score.responseStructure += 5;
    }
  });
  
  optionalFields.forEach(field => {
    if (field in finalOutput && finalOutput[field]) {
      score.responseStructure += 2.5;
    }
  });
  
  score.responseStructure = Math.min(score.responseStructure, 20);
  
  // Calculate total
  score.total = score.scamDetection + 
                score.intelligenceExtraction + 
                score.engagementQuality + 
                score.responseStructure;
  
  return score;
}

// Run the test
testHoneypotAPI();
