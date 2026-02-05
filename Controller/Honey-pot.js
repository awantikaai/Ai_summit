import axios from "axios";

const sessions = new Map();
const intelligenceLogs = new Map();

// 🔥 PERPLEXITY PROMPT
const PERPLEXITY_PROMPT = `You are "Ramesh Gupta", 65-year-old retired bank clerk. Not tech-savvy, weak eyesight, poor memory.

Current message: {{MESSAGE}}
Conversation history: {{HISTORY}}

Detect if scam: lottery ("won", "prize", "pay fee"), bank fraud ("bank", "blocked", "verify"), tech support ("virus", "microsoft"), phishing ("click", "link").

If scam, engage naturally as elderly person. Ask questions to extract: UPI IDs, bank accounts, phone numbers, URLs.

Respond in 1-2 sentences as Ramesh. Example: "Which bank? I have SBI only." or "I didn't buy any lottery ticket."

Your response:`;

// 🔥 MAIN HONEYPOT - HANDLES BOTH GET AND POST
export const HoneyPot = async (req, res) => {
  try {
    // 🔴 Handle GET requests (Tester validation)
    if (req.method === 'GET') {
      console.log("✅ GET request received - Tester validation");
      
      return res.status(200).json({
        status: "success",
        reply: "Hello? Is anyone there? I'm Ramesh Gupta."
      });
    }
    
    // 🔴 Handle POST requests (Actual honeypot)
    if (req.method === 'POST') {
      // 🔥 Parse THEIR FORMAT
      const { 
        sessionId, 
        message, 
        conversationHistory = [], 
        metadata = {} 
      } = req.body || {};
      
      // Handle empty request body
      if (!req.body) {
        return res.status(200).json({
          status: "success",
          reply: "Hello? I didn't receive any message."
        });
      }
      
      // Handle missing message
      if (!message || !message.text) {
        return res.status(200).json({
          status: "success",
          reply: "Hello? I didn't understand your message."
        });
      }
      
      const scammerMessage = message.text;
      const sessionKey = sessionId || 'sess_' + Date.now().toString(36).slice(-4);
      
      console.log("📥 Message received:", scammerMessage.substring(0, 50));
      
      // 🔥 EXTRACT INTELLIGENCE (internal)
      const extracted = extractIntelligence(scammerMessage);
      
      // 🔥 MANAGE SESSION
      if (!sessions.has(sessionKey)) {
        sessions.set(sessionKey, {
          id: sessionKey,
          history: [],
          extracted: {
            upi_ids: new Set(),
            bank_accounts: new Set(),
            phone_numbers: new Set(),
            urls: new Set(),
            emails: new Set()
          },
          startTime: Date.now()
        });
      }
      
      const session = sessions.get(sessionKey);
      
      // Update extraction
      Object.keys(extracted).forEach(key => {
        if (session.extracted[key]) {
          extracted[key].forEach(item => session.extracted[key].add(item));
        }
      });
      
      // Add to history
      session.history.push({
        sender: 'scammer',
        text: scammerMessage,
        timestamp: Date.now(),
        extracted: extracted
      });
      
      // 🔥 GENERATE RESPONSE
      let reply;
      
      // Build history context
      const historyText = session.history
        .slice(-3)
        .map(msg => `${msg.sender}: ${msg.text}`)
        .join('\n');
      
      // Try AI first, fallback to template
      if (process.env.PERPLEXITY_API_KEY) {
        try {
          const prompt = PERPLEXITY_PROMPT
            .replace('{{MESSAGE}}', scammerMessage)
            .replace('{{HISTORY}}', historyText);
          
          const response = await axios.post(
            'https://api.perplexity.ai/chat/completions',
            {
              model: 'sonar-small-chat',
              messages: [
                {
                  role: 'system',
                  content: 'You are Ramesh, 65yo Indian. Respond naturally in 1-2 sentences.'
                },
                { role: 'user', content: prompt }
              ],
              temperature: 0.7,
              max_tokens: 60
            },
            {
              headers: {
                'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
                'Content-Type': 'application/json'
              },
              timeout: 3000
            }
          );
          
          reply = response.data.choices[0].message.content.trim();
          
          // Clean reply
          reply = reply.replace(/```json|```/g, '').trim();
          if (reply.length > 150) reply = reply.substring(0, 147) + '...';
          
          console.log("🤖 AI Response:", reply.substring(0, 50));
          
        } catch (error) {
          console.error('AI Error:', error.message);
          reply = generateFallbackResponse(scammerMessage, session);
        }
      } else {
        reply = generateFallbackResponse(scammerMessage, session);
      }
      
      // Add our reply to history
      session.history.push({
        sender: 'honeypot',
        text: reply,
        timestamp: Date.now()
      });
      
      // 🔥 LOG INTELLIGENCE INTERNALLY
      intelligenceLogs.set(sessionKey, {
        session_id: sessionKey,
        extracted_intelligence: {
          upi_ids: Array.from(session.extracted.upi_ids),
          bank_accounts: Array.from(session.extracted.bank_accounts),
          phone_numbers: Array.from(session.extracted.phone_numbers),
          urls: Array.from(session.extracted.urls),
          emails: Array.from(session.extracted.emails)
        },
        conversation_history: session.history,
        last_updated: Date.now()
      });
      
      console.log("📤 Response sent:", reply.substring(0, 50));
      
      // 🔥 RETURN THEIR EXACT FORMAT
      return res.status(200).json({
        status: "success",
        reply: reply
      });
    }
    
    // 🔴 Handle other methods
    return res.status(405).json({
      status: "error",
      reply: "Method not allowed. Use GET or POST."
    });
    
  } catch (error) {
    console.error('❌ Honeypot Error:', error.message);
    
    return res.status(200).json({
      status: "success",
      reply: "Can you explain? I didn't understand."
    });
  }
};

// 🔥 EXTRACTION FUNCTION
const extractIntelligence = (text) => {
  if (!text) return { upi_ids: [], bank_accounts: [], phone_numbers: [], urls: [], emails: [] };
  
  return {
    upi_ids: (text.match(/[\w.\-]+@(okaxis|oksbi|okhdfc|okicici|ybl|axl|paytm)/gi) || []),
    bank_accounts: (text.match(/\b\d{9,18}\b/g) || []).filter(n => n.length >= 9),
    phone_numbers: (text.match(/(?:\+91|91|0)?[6-9]\d{9}/g) || []),
    urls: (text.match(/https?:\/\/[^\s]+/gi) || []),
    emails: (text.match(/\b[\w.\-]+@[\w.\-]+\.[a-z]{2,}\b/gi) || [])
  };
};

// 🔥 FALLBACK RESPONSE
const generateFallbackResponse = (message, session) => {
  const msg = message.toLowerCase();
  const extracted = session?.extracted || {};
  
  let response = "";
  
  // Detect scam type
  if (msg.includes('bank') && (msg.includes('block') || msg.includes('suspend'))) {
    response = "Which bank? I have SBI only. ";
  } else if (msg.includes('won') && (msg.includes('lottery') || msg.includes('prize'))) {
    response = "I didn't buy any lottery ticket. ";
  } else if (msg.includes('virus') || msg.includes('microsoft')) {
    response = "My computer is old. ";
  } else if (msg.includes('click') || msg.includes('link')) {
    response = "Can't click links. Phone is old. ";
  } else if (msg.includes('dear') || msg.includes('baby')) {
    response = "Who is this? ";
  } else {
    response = "Can you explain? ";
  }
  
  // Add extraction follow-up
  if (extracted.upi_ids?.size > 0) {
    const upi = Array.from(extracted.upi_ids)[0];
    response += `Is ${upi} correct?`;
  } else if (extracted.bank_accounts?.size > 0) {
    const acc = Array.from(extracted.bank_accounts)[0];
    response += `Account number ${acc}?`;
  } else if (extracted.phone_numbers?.size > 0) {
    const phone = Array.from(extracted.phone_numbers)[0];
    response += `Should I call ${phone}?`;
  } else if (msg.includes('pay') || msg.includes('fee')) {
    response += "Where to send payment?";
  } else {
    response += "I need more details.";
  }
  
  return response;
};

// 🔥 EXTRA ENDPOINT FOR JUDGES (Optional)
export const getIntelligence = async (req, res) => {
  const { session_id } = req.query;
  
  if (session_id && intelligenceLogs.has(session_id)) {
    return res.status(200).json(intelligenceLogs.get(session_id));
  }
  
  return res.status(200).json({
    message: "Use /honey-pot endpoint for main API",
    format: '{"status": "success", "reply": "your response"}'
  });
};

// 🔥 CLEANUP OLD SESSIONS
setInterval(() => {
  const now = Date.now();
  const MAX_AGE = 60 * 60 * 1000; // 1 hour
  
  for (const [key, session] of sessions.entries()) {
    if (now - session.startTime > MAX_AGE) {
      sessions.delete(key);
      intelligenceLogs.delete(key);
    }
  }
}, 300000); // Every 5 minutes