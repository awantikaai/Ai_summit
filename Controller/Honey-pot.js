import axios from "axios";

// ✅ SAFE PROMPT (AI SUGGESTION MODE ONLY) - IMPROVED
const SUGGESTION_PROMPT = `
You are a text suggestion tool. Generate ONE natural reply from a confused person.

SCENARIO: An elderly person received this message: "{{MESSAGE}}"
They are confused and asking for clarification.

REQUIREMENTS:
- Reply should sound natural, confused
- Ask ONE simple question
- Maximum 15 words
- Use simple language like "What do you mean?", "Which bank?"
- NO citations, NO brackets, NO references
- NO AI terminology
- Plain text only

OUTPUT ONLY the suggested reply text, nothing else.`;

// 🧠 SESSION MANAGEMENT
const sessions = new Map();
const MAX_TURNS = 7;     // total conversation length
const AI_TURNS = 4;      // AI used only in early stage

// 🔥 HYBRID HONEYPOT - UPDATED VERSION
export const HoneyPot = async (req, res) => {
  try {
    // Health check
    if (req.method === "GET") {
      return res.json({
        status: "success",
        reply: "Hello? Message aaya kya?"
      });
    }

    const { sessionId, message } = req.body || {};
    const text = message?.text;

    if (!text) {
      return res.json({
        status: "success",
        reply: "Message samjha nahi, phir bhejo."
      });
    }

    const sid = sessionId || "sess_" + Date.now().toString(36);

    if (!sessions.has(sid)) {
      sessions.set(sid, {
        turns: 0,
        extracted: {
          bankAccounts: new Set(),        // 🎯 Using Set to avoid duplicates
          upiIds: new Set(),              // 🎯 Using Set to avoid duplicates
          phoneNumbers: new Set(),        // 🎯 Using Set to avoid duplicates
          suspiciousKeywords: new Set(),  // 🎯 Using Set to avoid duplicates
          phishingLinks: new Set()        // 🎯 NEW: For email-like identifiers
        },
        startTime: Date.now()
      });
    }

    const session = sessions.get(sid);
    session.turns++;

    // 🔍 Extract intelligence every time
    extractIntelligence(text, session.extracted);

    let reply;

    // 🚨 HARD STOP → END CONVERSATION
    if (session.turns >= MAX_TURNS) {
      reply = exitReply();
      await sendFinalCallback(sid, session);
      sessions.delete(sid);
    }
    // 🤖 AI SUGGESTION PHASE (SAFE)
    else if (session.turns <= AI_TURNS) {
      reply = await getSuggestionFromAI(text);
    }
    // 🧠 DETERMINISTIC PHASE (NO AI)
    else {
      reply = deterministicReply(text);
    }

    // 🚨 CRITICAL: CLEAN ANY CITATIONS FROM REPLY
    reply = cleanReply(reply);
    
    cleanupSessions();

    return res.json({
      status: "success",
      reply
    });

  } catch (err) {
    return res.json({
      status: "success",
      reply: "Phone thoda issue kar raha hai, baad mein baat karte hain."
    });
  }
};

// 🧹 CLEAN REPLY FUNCTION
const cleanReply = (reply) => {
  if (!reply) return "Samjha nahi, phir bhejo.";
  
  // Remove all citation markers like [1][2]
  reply = reply.replace(/\[\d+\]/g, '');
  
  // Remove any remaining brackets
  reply = reply.replace(/\[|\]/g, '');
  
  // Remove quotes if at start/end
  reply = reply.replace(/^["']|["']$/g, '');
  
  // Remove common AI prefixes
  const aiPrefixes = [
    "Assistant:", "AI:", "Response:", "Reply:", 
    "Here's", "Sure,", "Okay,", "Well,"
  ];
  
  aiPrefixes.forEach(prefix => {
    if (reply.startsWith(prefix)) {
      reply = reply.substring(prefix.length).trim();
    }
  });
  
  // Ensure proper ending
  if (reply.length > 0 && !/[.!?]$/.test(reply)) {
    reply = reply.trim() + '?';
  }
  
  return reply.trim().slice(0, 150);
};

// 🤖 PERPLEXITY = THINK ONLY (SAFE) - UPDATED
const getSuggestionFromAI = async (message) => {
  try {
    const prompt = SUGGESTION_PROMPT.replace("{{MESSAGE}}", message);

    const response = await axios.post(
      "https://api.perplexity.ai/chat/completions",
      {
        model: "sonar-pro",
        messages: [
          {
            role: "system",
            content: "You are a text suggestion generator. Output ONLY plain conversational text. NO citations, NO brackets, NO AI disclaimers."
          },
          { 
            role: "user", 
            content: prompt 
          }
        ],
        temperature: 0.6,  // Increased for more natural responses
        max_tokens: 50,
        stream: false
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
          "Content-Type": "application/json"
        },
        timeout: 10000
      }
    );

    let suggestion = response.data.choices[0]?.message?.content?.trim();
    
    if (!suggestion) {
      throw new Error("No suggestion generated");
    }

    // Clean before checking safety
    suggestion = cleanReply(suggestion);
    
    if (isUnsafe(suggestion) || suggestion.length < 5) {
      return deterministicReply(message);
    }

    return suggestion;

  } catch (error) {
    console.error("AI Suggestion Error:", error.message);
    return deterministicReply(message);
  }
};

// 🚫 ENHANCED UNSAFE OUTPUT FILTER
const isUnsafe = (text) => {
  if (!text) return true;
  
  const lowerText = text.toLowerCase();
  
  // Check for citations and AI artifacts
  const badPatterns = [
    /\[\d+\]/,                    // Citations [1]
    /\[citation/,                 // [citation...
    /\(source:/,                  // (source:...
    /according to (?:sources|experts|reports)/i,
    /it is (?:important|crucial|essential) to/i,
    /as (?:an?|a) (?:ai|assistant|language model)/i,
    /i(?:'m| am) (?:an?|a) (?:ai|assistant|bot)/i,
    /perplexity/i,
    /openai/i,
    /chatgpt/i,
    /cannot (?:help|assist|roleplay|pretend)/i,
    /my (?:purpose|function|role) is/i,
    /i (?:apologize|regret)/i,
    /ethical (?:guidelines|considerations)/i,
    /terms of service/i,
    /content policy/i
  ];
  
  for (const pattern of badPatterns) {
    if (pattern.test(lowerText)) return true;
  }
  
  // Check for bad keywords
  const badKeywords = [
    "assistant", "chatbot", "refuse", "apologize", "policy",
    "guideline", "cannot", "unable", "sorry", "ai system",
    "language model", "artificial intelligence"
  ];
  
  return badKeywords.some(keyword => lowerText.includes(keyword));
};

// 🧠 IMPROVED DETERMINISTIC HUMAN REPLIES
const deterministicReply = (msg) => {
  const lowerMsg = msg.toLowerCase();
  
  const responses = [
    {
      keywords: ["bank", "account", "suspended", "blocked", "freeze", "compromised"],
      reply: "Kaunsa bank? Branch kaunsi hai?"
    },
    {
      keywords: ["otp", "one time password", "verification code", "pin"],
      reply: "OTP kyun chahiye? Bank mein jaake pata kar lo."
    },
    {
      keywords: ["upi", "payment", "transfer", "send money"],
      reply: "UPI kaise karte hain? Main to cash hi deta hoon."
    },
    {
      keywords: ["link", "click", "website", "portal", "email"],
      reply: "Link nahi khol sakta, phone slow ho jata hai."
    },
    {
      keywords: ["won", "lottery", "prize", "reward"],
      reply: "Maine to kabhi lottery nahi li. Galat number hai."
    },
    {
      keywords: ["virus", "hacked", "security", "microsoft", "breach"],
      reply: "Virus? Beta Sunday ko check karega computer."
    },
    {
      keywords: ["urgent", "immediate", "emergency", "asap", "now"],
      reply: "Itni jaldi kya hai? Kal office jaunga."
    },
    {
      keywords: ["kyc", "verify", "update", "information", "identity"],
      reply: "KYC bank mein hi hoti hai. Wahi jaunga."
    },
    {
      keywords: ["dear", "sir", "madam", "customer", "officer"],
      reply: "Kaun ho aap? Pehchan nahi hai."
    }
  ];
  
  for (const response of responses) {
    if (response.keywords.some(keyword => lowerMsg.includes(keyword))) {
      return response.reply;
    }
  }
  
  // Default confused responses
  const defaults = [
    "Samjha nahi, thoda detail mein batao?",
    "Kya matlab? Phir se samjhao.",
    "Ye technical baat hai, beta se puchhunga.",
    "Aap kaun? Kaise pata chala mera number?",
    "Phone thik se sunai nahi de raha, phir bolo."
  ];
  
  return defaults[Math.floor(Math.random() * defaults.length)];
};

// 🚪 EXIT REPLY (HUMAN & SAFE)
const exitReply = () => {
  const exits = [
    "Main bank ja kar hi verify karunga.",
    "Beta aa gaya hai, woh baat karega.",
    "Doctor ke paas jaana hai, baad mein baat karte hain.",
    "Network issue aa raha hai, phone band karna padega.",
    "Abhi time nahi hai, kal subah baat karenge."
  ];
  return exits[Math.floor(Math.random() * exits.length)];
};

// 🔍 FIXED INTELLIGENCE EXTRACTION (NO HALLUCINATIONS!)
const extractIntelligence = (text, store) => {
  // 🎯 STRICT Bank account extraction (12-16 digits)
  // Must be standalone numbers, not part of larger numbers
  const accMatches = text.match(/\b\d{12,16}\b/g) || [];
  accMatches.forEach(account => {
    // Validate: Should be a real-looking account number
    if (!/^0+$/.test(account) && // Not all zeros
        !/^123456/.test(account)) { // Not obvious fake pattern
      store.bankAccounts.add(account);
    }
  });
  
  // 🎯 STRICT Phone number extraction
  // Only matches: +919876543210 or 9876543210 (starting with 6-9)
  const phoneRegex = /\b(?:\+91)?[6-9]\d{9}\b/g;
  const phoneMatches = text.match(phoneRegex) || [];
  phoneMatches.forEach(phone => {
    // Clean: Remove +91 if present for consistency
    const cleanPhone = phone.replace(/^\+91/, '');
    if (cleanPhone.length === 10) {
      store.phoneNumbers.add(cleanPhone);
    }
  });
  
  // 🎯 REAL UPI IDs only (NPCI handles)
  const upiRegex = /\b[a-zA-Z0-9.\-_]+@(okaxis|oksbi|okhdfc|okicici|ybl|paytm|axl|ibl)\b/gi;
  const upiMatches = text.match(upiRegex) || [];
  upiMatches.forEach(upi => {
    store.upiIds.add(upi.toLowerCase());
  });
  
  // 🎯 Phishing links / email-like identifiers
  const emailRegex = /\b[a-zA-Z0-9.\-_]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/gi;
  const emailMatches = text.match(emailRegex) || [];
  emailMatches.forEach(email => {
    // Only add if it's NOT a real UPI ID
    if (!upiRegex.test(email)) {
      store.phishingLinks.add(email.toLowerCase());
    }
  });
  
  // 🎯 Suspicious keywords (exact matches, no guessing)
  const keywords = [
    "urgent", "immediate", "emergency", "block", "suspend",
    "verify", "kyc", "otp", "password", "login", "click",
    "link", "won", "lottery", "prize", "reward", "free",
    "guaranteed", "risk", "limited", "offer", "exclusive",
    "compromised", "fraud", "secure", "threat", "breach"
  ];
  
  const lowerText = text.toLowerCase();
  keywords.forEach(keyword => {
    if (lowerText.includes(keyword)) {
      store.suspiciousKeywords.add(keyword);
    }
  });
};

// 🚀 FINAL GUVI CALLBACK (MANDATORY) - UPDATED
const sendFinalCallback = async (sessionId, session) => {
  try {
    // Convert Sets to Arrays for JSON serialization
    const extractedIntelligence = {
      bankAccounts: Array.from(session.extracted.bankAccounts),
      upiIds: Array.from(session.extracted.upiIds),
      phoneNumbers: Array.from(session.extracted.phoneNumbers),
      suspiciousKeywords: Array.from(session.extracted.suspiciousKeywords),
      phishingLinks: Array.from(session.extracted.phishingLinks)
    };
    
    // Create meaningful agent notes
    const notes = [];
    if (extractedIntelligence.bankAccounts.length > 0) {
      notes.push(`${extractedIntelligence.bankAccounts.length} bank accounts extracted`);
    }
    if (extractedIntelligence.phoneNumbers.length > 0) {
      notes.push(`${extractedIntelligence.phoneNumbers.length} phone numbers extracted`);
    }
    if (extractedIntelligence.suspiciousKeywords.length > 0) {
      const topKeywords = extractedIntelligence.suspiciousKeywords.slice(0, 3).join(', ');
      notes.push(`Keywords: ${topKeywords}`);
    }
    
    await axios.post(
      "https://hackathon.guvi.in/api/updateHoneyPotFinalResult",
      {
        sessionId,
        scamDetected: true,
        totalMessagesExchanged: session.turns,
        extractedIntelligence,
        agentNotes: notes.join('; ')
      },
      { 
        timeout: 8000,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    console.log(`GUVI callback sent for session: ${sessionId}`, extractedIntelligence);
  } catch (e) {
    console.error("GUVI callback failed:", e.message);
  }
};

// 🧹 CLEANUP - REMOVE OLD SESSIONS
const cleanupSessions = () => {
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;
  
  for (const [key, session] of sessions.entries()) {
    if (now - session.startTime > ONE_HOUR) {
      sessions.delete(key);
    }
  }
};