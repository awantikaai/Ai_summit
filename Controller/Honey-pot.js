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
          bankAccounts: [],
          upiIds: [],
          phoneNumbers: [],
          suspiciousKeywords: []
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
      keywords: ["bank", "account", "suspended", "blocked"],
      reply: "Kaunsa bank? Branch kaunsi hai?"
    },
    {
      keywords: ["otp", "one time password", "verification code"],
      reply: "OTP kyun chahiye? Bank mein jaake pata kar lo."
    },
    {
      keywords: ["upi", "payment", "transfer", "send money"],
      reply: "UPI kaise karte hain? Main to cash hi deta hoon."
    },
    {
      keywords: ["link", "click", "website", "portal"],
      reply: "Link nahi khol sakta, phone slow ho jata hai."
    },
    {
      keywords: ["won", "lottery", "prize", "reward"],
      reply: "Maine to kabhi lottery nahi li. Galat number hai."
    },
    {
      keywords: ["virus", "hacked", "security", "microsoft"],
      reply: "Virus? Beta Sunday ko check karega computer."
    },
    {
      keywords: ["urgent", "immediate", "emergency", "asap"],
      reply: "Itni jaldi kya hai? Kal office jaunga."
    },
    {
      keywords: ["kyc", "verify", "update", "information"],
      reply: "KYC bank mein hi hoti hai. Wahi jaunga."
    },
    {
      keywords: ["dear", "sir", "madam", "customer"],
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

// 🔍 IMPROVED INTELLIGENCE EXTRACTION
const extractIntelligence = (text, store) => {
  // Phone numbers (Indian format)
  const phoneRegex = /(?:\+91[\s-]?)?[6789]\d{9}/g;
  const phones = text.match(phoneRegex);
  if (phones) {
    phones.forEach(phone => store.phoneNumbers.push(phone.replace(/\s+/g, '')));
  }
  
  // UPI IDs
  const upiRegex = /[a-zA-Z0-9.\-_]+@(?:okaxis|oksbi|okhdfc|okicici|ybl|axl|ibl)/g;
  const upis = text.match(upiRegex);
  if (upis) {
    upis.forEach(upi => store.upiIds.push(upi.toLowerCase()));
  }
  
  // Bank accounts (10-18 digits)
  const accRegex = /\b\d{10,18}\b/g;
  const accounts = text.match(accRegex);
  if (accounts) {
    accounts.forEach(acc => store.bankAccounts.push(acc));
  }
  
  // Suspicious keywords
  const keywords = [
    "urgent", "immediate", "emergency", "block", "suspend",
    "verify", "kyc", "otp", "password", "login", "click",
    "link", "won", "lottery", "prize", "reward", "free",
    "guaranteed", "risk", "limited", "offer", "exclusive"
  ];
  
  const lowerText = text.toLowerCase();
  keywords.forEach(keyword => {
    if (lowerText.includes(keyword)) {
      if (!store.suspiciousKeywords.includes(keyword)) {
        store.suspiciousKeywords.push(keyword);
      }
    }
  });
};

// 🚀 FINAL GUVI CALLBACK (MANDATORY)
const sendFinalCallback = async (sessionId, session) => {
  try {
    await axios.post(
      "https://hackathon.guvi.in/api/updateHoneyPotFinalResult",
      {
        sessionId,
        scamDetected: true,
        totalMessagesExchanged: session.turns,
        extractedIntelligence: session.extracted,
        agentNotes: `Detected ${session.extracted.suspiciousKeywords.length} scam indicators including ${session.extracted.suspiciousKeywords.slice(0, 3).join(', ')}`
      },
      { 
        timeout: 8000,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    console.log(`GUVI callback sent for session: ${sessionId}`);
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
      console.log(`Cleaned up old session: ${key}`);
    }
  }
};