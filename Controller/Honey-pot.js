import axios from "axios";

const sessions = new Map();
const CACHE_TTL = 30000; // 30 seconds cache

// 🔥 ULTIMATE PERPLEXITY PROMPT FOR HACKATHON
const PERPLEXITY_PROMPT = `You are an autonomous scam honeypot AI for a hackathon project.

ROLE: You are "Ramesh Gupta", a 65-year-old retired bank clerk from Delhi. You:
- Live on pension, not tech-savvy
- Use basic smartphone, know WhatsApp but not UPI well
- Have weak eyesight, poor memory
- Rely on son/daughter for tech help
- Speak simple Hinglish: "Theek hai", "Acha", "Samjha nahi"

YOUR MISSION:
1. DETECT if message is scam (lottery, tech support, bank fraud, phishing, romance scam)
2. If SCAM: Engage naturally to extract intelligence
3. EXTRACT: UPI IDs, bank accounts, phone numbers, URLs, emails
4. Continue conversation believably

SCAM DETECTION CLUES:
✅ SCAM: "won lottery", "pay fee", "click link", "bank suspended", "Microsoft virus", "dear need money"
❌ NOT SCAM: Normal conversation, greetings, questions

CONVERSATION STRATEGY:
PHASE 1 (Initial): "I didn't buy ticket", "Are you sure?", "Which company?"
PHASE 2 (Middle): "Let me check with son", "How to claim?", "Need proof"
PHASE 3 (Late): "Where to send?", "Is UPI correct?", "What documents?"

EXTRACTION TECHNIQUES:
1. If they give UPI: "Is xyz@okaxis correct? I'm not good with UPI"
2. If bank account: "Account number 1234...? My eyes are weak"
3. If phone: "Should I call 98765...?"
4. If URL: "Is website safe? My son says don't click links"

RESPONSE FORMAT - RETURN STRICT JSON ONLY:
{
  "analysis": {
    "is_scam": true/false,
    "scam_type": "lottery/tech_support/phishing/bank_fraud/romance",
    "confidence": 0.0 to 1.0,
    "reason": "Brief reason for detection"
  },
  "engagement": {
    "reply": "Your response as Ramesh (1-2 sentences max, simple)",
    "persona_notes": "What Ramesh is thinking/feeling"
  },
  "extraction": {
    "upi_ids": [],
    "bank_accounts": [],
    "phone_numbers": [],
    "urls": [],
    "emails": [],
    "crypto_addresses": []
  },
  "next_strategy": "doubt/verify/engage/extract/end"
}

CONVERSATION HISTORY (if any):
{{HISTORY}}

CURRENT MESSAGE to analyze:
"{{MESSAGE}}"

Return ONLY the JSON object, no other text.`;

// 🔥 REGEX EXTRACTION (Fast fallback)
const extractIntelligence = (message) => {
  return {
    upi_ids: (message.match(/[a-zA-Z0-9.\-_]+@(okaxis|oksbi|okhdfc|okicici|ybl|axl|paytm)/gi) || []),
    bank_accounts: (message.match(/\b\d{9,18}\b/g) || []).filter(n => n.length >= 9),
    phone_numbers: (message.match(/(\+91|91|0)?[6-9]\d{9}/g) || []),
    urls: (message.match(/https?:\/\/[^\s]+/gi) || []),
    emails: (message.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi) || []),
    crypto_addresses: (message.match(/\b(0x[a-fA-F0-9]{40}|bc1[a-zA-Z0-9]{39,59})\b/g) || [])
  };
};

// 🔥 SESSION MANAGEMENT
class ScamSession {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.messages = [];
    this.extracted = {
      upi_ids: new Set(),
      bank_accounts: new Set(),
      phone_numbers: new Set(),
      urls: new Set(),
      emails: new Set(),
      crypto_addresses: new Set()
    };
    this.conversationStage = 1; // 1: doubt, 2: curiosity, 3: engagement, 4: extraction
    this.startTime = Date.now();
  }
  
  addMessage(role, content) {
    this.messages.push({ role, content, timestamp: Date.now() });
  }
  
  updateExtracted(newData) {
    Object.keys(newData).forEach(key => {
      if (this.extracted[key]) {
        newData[key].forEach(item => this.extracted[key].add(item));
      }
    });
  }
  
  getFormattedExtracted() {
    const result = {};
    Object.keys(this.extracted).forEach(key => {
      result[key] = Array.from(this.extracted[key]);
    });
    return result;
  }
  
  getConversationHistory() {
    return this.messages.slice(-4).map(m => `${m.role}: ${m.content}`).join('\n');
  }
}

// 🔥 MAIN HONEYPOT CONTROLLER
export const HoneyPot = async (req, res) => {
  try {
    const { message, session_id } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        error: "Invalid request",
        details: "Message is required and must be a string"
      });
    }
    
    // 🔄 1. SESSION MANAGEMENT
    let session;
    if (session_id && sessions.has(session_id)) {
      session = sessions.get(session_id);
    } else {
      const newSessionId = `scam_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`;
      session = new ScamSession(newSessionId);
      sessions.set(newSessionId, session);
    }
    
    // Add scammer message to session
    session.addMessage('scammer', message);
    
    // 🔄 2. CALL PERPLEXITY AI
    const aiResponse = await analyzeWithPerplexity(message, session);
    
    // 🔄 3. UPDATE SESSION WITH AI ANALYSIS
    session.addMessage('honeypot', aiResponse.engagement.reply);
    
    // Update extracted intelligence
    const regexExtracted = extractIntelligence(message);
    session.updateExtracted(regexExtracted);
    
    // Also add AI extracted data
    const aiExtracted = {
      upi_ids: aiResponse.extraction.upi_ids || [],
      bank_accounts: aiResponse.extraction.bank_accounts || [],
      phone_numbers: aiResponse.extraction.phone_numbers || [],
      urls: aiResponse.extraction.urls || [],
      emails: aiResponse.extraction.emails || [],
      crypto_addresses: aiResponse.extraction.crypto_addresses || []
    };
    session.updateExtracted(aiExtracted);
    
    // Update conversation stage
    if (aiResponse.next_strategy === 'extract') {
      session.conversationStage = 4;
    } else if (aiResponse.next_strategy === 'engage') {
      session.conversationStage = 3;
    } else if (aiResponse.analysis.is_scam) {
      session.conversationStage = 2;
    }
    
    // 🔄 4. PREPARE HACKATHON RESPONSE FORMAT
    const response = {
      // Required by hackathon
      session_id: session.sessionId,
      is_scam: aiResponse.analysis.is_scam,
      reply_to_scammer: aiResponse.engagement.reply,
      extracted_intelligence: session.getFormattedExtracted(),
      
      // Enhanced data for judges
      analysis: {
        scam_type: aiResponse.analysis.scam_type,
        confidence: aiResponse.analysis.confidence,
        detection_reason: aiResponse.analysis.reason,
        conversation_stage: session.conversationStage,
        message_count: session.messages.length / 2
      },
    
      // System info
      persona: "Ramesh Gupta (65yo retired bank clerk)",
      strategy: aiResponse.next_strategy,
      timestamp: new Date().toISOString(),
          
      next_request_format: {
        session_id: session.sessionId,
        message: "<next_scammer_message>"
      },
      
    };
    
    
    // 🔄 5. CLEANUP OLD SESSIONS
    cleanupOldSessions();
    
    return res.status(200).json(response);
    
  } catch (error) {
    console.error('Honeypot Error:', error);
    
    // Fallback response if everything fails
    return res.status(200).json({
      session_id: `fallback_${Date.now().toString(36)}`,
      is_scam: /(won|lottery|pay|fee|click|bank|virus)/i.test(req.body.message || ''),
      reply_to_scammer: "I need to think about this. Can you explain more?",
      extracted_intelligence: extractIntelligence(req.body.message || ''),
      analysis: {
        scam_type: "unknown",
        confidence: 0.5,
        detection_reason: "System error, using fallback",
        conversation_stage: 1
      },
      next_request_format: {
        session_id: "new_session_id_will_be_generated",
        message: "<next_scammer_message>"
      }
    });
  }
};

// 🔥 PERPLEXITY AI ANALYZER
const analyzeWithPerplexity = async (message, session) => {
  try {
    // Prepare prompt with conversation history
    const history = session.getConversationHistory();
    const prompt = PERPLEXITY_PROMPT
      .replace('{{HISTORY}}', history)
      .replace('{{MESSAGE}}', message);
    
    const response = await axios.post(
      'https://api.perplexity.ai/chat/completions',
      {
        model: 'sonar-pro',
        messages: [
          {
            role: 'system',
            content: 'You are a scam detection AI. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 800
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
    
    const content = response.data.choices[0].message.content;
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    // Validate and add defaults
    return {
      analysis: {
        is_scam: parsed.analysis?.is_scam ?? /(won|lottery|pay|fee)/i.test(message),
        scam_type: parsed.analysis?.scam_type || 'advance_fee',
        confidence: parsed.analysis?.confidence || 0.8,
        reason: parsed.analysis?.reason || 'Pattern matching'
      },
      engagement: {
        reply: parsed.engagement?.reply || generateFallbackResponse(message),
        persona_notes: parsed.engagement?.persona_notes || 'Elderly confusion'
      },
      extraction: {
        upi_ids: parsed.extraction?.upi_ids || [],
        bank_accounts: parsed.extraction?.bank_accounts || [],
        phone_numbers: parsed.extraction?.phone_numbers || [],
        urls: parsed.extraction?.urls || [],
        emails: parsed.extraction?.emails || [],
        crypto_addresses: parsed.extraction?.crypto_addresses || []
      },
      next_strategy: parsed.next_strategy || 'engage'
    };
    
  } catch (error) {
    console.error('Perplexity analysis failed:', error.message);
    
    // Fallback analysis
    const isScam = /(won|lottery|prize|pay.*fee|click.*link|virus|bank.*suspend)/i.test(message);
    
    return {
      analysis: {
        is_scam: isScam,
        scam_type: isScam ? 'advance_fee' : 'not_scam',
        confidence: isScam ? 0.85 : 0.2,
        reason: isScam ? 'Contains scam keywords' : 'No scam indicators'
      },
      engagement: {
        reply: generateFallbackResponse(message),
        persona_notes: 'Using fallback response'
      },
      extraction: extractIntelligence(message),
      next_strategy: isScam ? 'engage' : 'end'
    };
  }
};

// 🔥 FALLBACK RESPONSE GENERATOR
const generateFallbackResponse = (message) => {
  const responses = {
    lottery: [
      "I didn't buy any lottery ticket. How did I win?",
      "Which lottery is this? I don't remember.",
      "My son says lottery messages are always fake.",
      "25 lakh? That's huge money. But I'm not sure."
    ],
    tech_support: [
      "My computer is slow. Is that the virus?",
      "Windows? I have Windows 7 only.",
      "How to check for virus? My son set password.",
      "Will my photos get deleted?"
    ],
    bank_fraud: [
      "Which bank? I have SBI account only.",
      "My passbook is with daughter.",
      "Can't do online banking. Go to branch only.",
      "Should I call bank manager?"
    ],
    default: [
      "Can you explain? I don't understand.",
      "My eyes are weak. Can you type clearly?",
      "Let me think about this.",
      "I need to ask my son about this."
    ]
  };
  
  // Determine scam type
  let scamType = 'default';
  if (/(won|lottery|prize)/i.test(message)) scamType = 'lottery';
  else if (/(virus|microsoft|windows|support)/i.test(message)) scamType = 'tech_support';
  else if (/(bank|account|suspend|kyc)/i.test(message)) scamType = 'bank_fraud';
  
  const chosen = responses[scamType];
  return chosen[Math.floor(Math.random() * chosen.length)];
};

// 🔥 CLEANUP OLD SESSIONS
const cleanupOldSessions = () => {
  const now = Date.now();
  const MAX_AGE = 30 * 60 * 1000; // 30 minutes
  
  for (const [sessionId, session] of sessions.entries()) {
    if (now - session.startTime > MAX_AGE) {
      sessions.delete(sessionId);
    }
  }
};

// 🔥 TEST ENDPOINT FOR HACKATHON DEMO
export const testHoneypot = async (req, res) => {
  // Simulate a complete scam conversation for demo
  const demoScenarios = [
    {
      name: "Lottery Scam",
      messages: [
        "Congratulations! You won ₹25 lakh in government lottery!",
        "This is 100% genuine. Pay ₹5000 processing fee to claim.",
        "Send to UPI: scammer@okaxis or account: 1234567890",
        "After payment, money will be transferred to your account in 2 hours."
      ]
    },
    {
      name: "Tech Support Scam",
      messages: [
        "Alert! Your computer has virus. Call Microsoft support immediately.",
        "We need remote access to fix. Go to anydesk.com/download",
        "Pay ₹1999 for antivirus to UPI: support@paytm",
        "Your data is at risk. Quick payment required."
      ]
    }
  ];
  
  const results = [];
  
  for (const scenario of demoScenarios) {
    let sessionId = null;
    const scenarioResults = [];
    
    for (const message of scenario.messages) {
      const mockReq = {
        body: {
          message,
          session_id: sessionId
        }
      };
      
      // Create a mock response to capture data
      let capturedData;
      const mockRes = {
        json: (data) => { capturedData = data; }
      };
      
      await HoneyPotController(mockReq, mockRes);
      
      scenarioResults.push({
        scammer_message: message,
        honeypot_reply: capturedData.reply_to_scammer,
        extracted: capturedData.extracted_intelligence,
        is_scam: capturedData.is_scam
      });
      
      sessionId = capturedData.session_id;
    }
    
    results.push({
      scenario: scenario.name,
      conversation: scenarioResults
    });
  }
  
  res.json({
    project: "Agentic Honeypot for Scam Detection",
    description: "Autonomous AI system that engages scammers and extracts intelligence",
    features: [
      "Real-time scam detection using AI",
      "Believable elderly persona engagement",
      "Intelligence extraction (UPI, accounts, links)",
      "Conversation state management",
      "Structured JSON output"
    ],
    demo_results: results
  });
};