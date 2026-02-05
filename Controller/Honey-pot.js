import axios from "axios";

// ✅ SAFE PROMPT (AI SUGGESTION MODE ONLY)
const SUGGESTION_PROMPT = `You are a text suggestion tool. Generate ONE natural reply from a confused elderly person in India.

SCENARIO: They received: "{{MESSAGE}}"

REQUIREMENTS:
- Sound confused, ask ONE simple question
- 10-15 words maximum
- Mix Hindi-English naturally
- NO AI talk, NO citations, NO brackets
- Plain text only

OUTPUT ONLY the reply text.`;

// 🧠 SESSION MANAGEMENT
const sessions = new Map();
const MAX_TURNS = 7;     // total conversation length
const AI_TURNS = 4;      // AI used only in early stage

// 🔥 MAIN HONEYPOT FUNCTION - DOES EVERYTHING
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

    // 🎯 INITIALIZE OR GET SESSION
    if (!sessions.has(sid)) {
      sessions.set(sid, {
        turns: 0,
        extracted: {
          bankAccounts: new Set(),
          upiIds: new Set(),
          phoneNumbers: new Set(),
          suspiciousKeywords: new Set(),
          phishingLinks: new Set()
        },
        startTime: Date.now(),
        history: []
      });
    }

    const session = sessions.get(sid);
    session.turns++;
    session.history.push({ role: "scammer", text: text });

    // 🔍 EXTRACT INTELLIGENCE FROM CURRENT MESSAGE
    extractIntelligence(text, session.extracted);

    let reply;

    // 🚨 CHECK IF CONVERSATION SHOULD END
    if (session.turns >= MAX_TURNS) {
      reply = exitReply();
      
      // 🚀 AUTOMATICALLY SEND EXTRACTION DATA TO GUVI API
      await sendExtractionToGuvi(sid, session);
      
      sessions.delete(sid);
    }
    // 🤖 AI SUGGESTION PHASE
    else if (session.turns <= AI_TURNS) {
      reply = await getSuggestionFromAI(text);
    }
    // 🧠 DETERMINISTIC PHASE
    else {
      reply = deterministicReply(text, session.history);
    }

    // Add honeypot reply to history
    session.history.push({ role: "honeypot", text: reply });
    
    // Clean the reply
    reply = cleanReply(reply);
    
    // Cleanup old sessions
    cleanupSessions();

    // Return response to scammer
    return res.json({
      status: "success",
      reply
    });

  } catch (err) {
    console.error("Honeypot error:", err.message);
    return res.json({
      status: "success",
      reply: "Phone thoda issue kar raha hai, baad mein baat karte hain."
    });
  }
};

// 🚀 AUTOMATIC EXTRACTION SUBMISSION TO GUVI
const sendExtractionToGuvi = async (sessionId, session) => {
  try {
    // Convert Sets to Arrays
    const extractedIntelligence = {
      bankAccounts: Array.from(session.extracted.bankAccounts),
      upiIds: Array.from(session.extracted.upiIds),
      phoneNumbers: Array.from(session.extracted.phoneNumbers),
      suspiciousKeywords: Array.from(session.extracted.suspiciousKeywords),
      phishingLinks: Array.from(session.extracted.phishingLinks)
    };
    
    // Calculate scam confidence
    let scamScore = 0;
    if (extractedIntelligence.bankAccounts.length > 0) scamScore += 25;
    if (extractedIntelligence.phoneNumbers.length > 0) scamScore += 20;
    if (extractedIntelligence.upiIds.length > 0) scamScore += 20;
    if (extractedIntelligence.suspiciousKeywords.length > 3) scamScore += 35;
    
    // Create agent notes
    const notes = [];
    if (extractedIntelligence.bankAccounts.length > 0) {
      notes.push(`Bank accounts found: ${extractedIntelligence.bankAccounts.length}`);
    }
    if (extractedIntelligence.upiIds.length > 0) {
      notes.push(`UPI IDs extracted: ${extractedIntelligence.upiIds.join(', ')}`);
    }
    if (extractedIntelligence.phoneNumbers.length > 0) {
      notes.push(`Phone numbers: ${extractedIntelligence.phoneNumbers.join(', ')}`);
    }
    if (extractedIntelligence.suspiciousKeywords.length > 0) {
      const topKeywords = extractedIntelligence.suspiciousKeywords.slice(0, 5).join(', ');
      notes.push(`Red flags: ${topKeywords}`);
    }
    
    const agentNotes = `Scam detected with ${scamScore}% confidence. ${notes.join('; ')}`;
    
    // 🎯 SEND TO GUVI API AUTOMATICALLY
    const guviResponse = await axios.post(
      "https://hackathon.guvi.in/api/updateHoneyPotFinalResult",
      {
        sessionId,
        scamDetected: true,
        totalMessagesExchanged: session.turns,
        extractedIntelligence,
        agentNotes
      },
      { 
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );
    
    console.log(`✅ GUVI callback successful for session: ${sessionId}`);
    console.log(`📊 Extracted: ${extractedIntelligence.bankAccounts.length} accounts, ${extractedIntelligence.upiIds.length} UPI IDs, ${extractedIntelligence.phoneNumbers.length} phones`);
    
  } catch (error) {
    console.error("❌ GUVI callback failed:", error.message);
    // Don't throw error - just log it
  }
};

// 🔍 INTELLIGENCE EXTRACTION FUNCTION
const extractIntelligence = (text, store) => {
  const lowerText = text.toLowerCase();
  
  // Bank accounts (12-16 digits)
  const accMatches = text.match(/\b\d{12,16}\b/g) || [];
  accMatches.forEach(account => {
    if (!/^0+$/.test(account)) {
      store.bankAccounts.add(account);
    }
  });
  
  // Phone numbers
  const phoneRegex = /(?:\+91[\s\-]?)?[6-9]\d{9}\b/g;
  const phoneMatches = text.match(phoneRegex) || [];
  phoneMatches.forEach(phone => {
    let cleanPhone = phone.replace(/[+\s\-]/g, '');
    if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
      cleanPhone = cleanPhone.substring(2);
    }
    if (cleanPhone.length === 10 && /^[6-9]/.test(cleanPhone)) {
      store.phoneNumbers.add(cleanPhone);
    }
  });
  
  // Real UPI IDs
  const realUpiRegex = /\b[a-zA-Z0-9.\-_]+@(okaxis|oksbi|okhdfc|okicici|ybl|paytm|axl|ibl)\b/gi;
  const realUpiMatches = text.match(realUpiRegex) || [];
  realUpiMatches.forEach(upi => {
    store.upiIds.add(upi.toLowerCase());
  });
  
  // Context-aware UPI extraction
  const contextPatterns = [
    /(?:upi\s*(?:id|handle|address)?|vpa)[\s:]*([a-zA-Z0-9.\-_]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi,
    /confirm\s+(?:your\s+)?upi\s+(?:id|handle)?\s+([a-zA-Z0-9.\-_]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi,
    /(?:send\s+to\s+|via\s+|using\s+)?upi\s+([a-zA-Z0-9.\-_]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi
  ];
  
  contextPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const potentialUpi = match[1].toLowerCase();
      store.upiIds.add(potentialUpi);
    }
  });
  
  // Phishing links / emails
  const emailRegex = /\b([a-zA-Z0-9.\-_]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/gi;
  const emailMatches = text.match(emailRegex) || [];
  emailMatches.forEach(email => {
    const cleanEmail = email.toLowerCase();
    // Only add if not in UPI IDs
    const isInUpiIds = Array.from(store.upiIds).some(upi => upi === cleanEmail);
    if (!isInUpiIds) {
      store.phishingLinks.add(cleanEmail);
    }
  });
  
  // Suspicious keywords
  const keywords = [
    "urgent", "immediate", "emergency", "block", "suspend", "locked",
    "freeze", "verify", "kyc", "otp", "password", "login", "click",
    "link", "won", "lottery", "prize", "reward", "free", "guaranteed",
    "compromised", "fraud", "secure", "threat", "breach", "alert",
    "security", "official", "genuine", "suspicious"
  ];
  
  keywords.forEach(keyword => {
    if (lowerText.includes(keyword)) {
      store.suspiciousKeywords.add(keyword);
    }
  });
};

// 🧹 CLEAN REPLY FUNCTION
const cleanReply = (reply) => {
  if (!reply) return "Samjha nahi, phir bhejo.";
  
  // Remove citations
  reply = reply.replace(/\[\d+\]/g, '');
  reply = reply.replace(/\[|\]/g, '');
  
  // Remove quotes
  reply = reply.replace(/^["']|["']$/g, '');
  
  // Remove AI prefixes
  const aiPrefixes = ["Assistant:", "AI:", "Response:", "Reply:", "Here's"];
  aiPrefixes.forEach(prefix => {
    if (reply.toLowerCase().startsWith(prefix.toLowerCase())) {
      reply = reply.substring(prefix.length).trim();
    }
  });
  
  // Ensure proper ending
  if (reply.length > 0 && !/[.!?]$/.test(reply)) {
    reply = reply.trim() + '?';
  }
  
  return reply.trim().slice(0, 120);
};

// 🤖 AI SUGGESTION FUNCTION
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
            content: "Output ONLY plain conversational text. NO citations, NO AI disclaimers."
          },
          { 
            role: "user", 
            content: prompt 
          }
        ],
        temperature: 0.7,
        max_tokens: 40,
        stream: false
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
          "Content-Type": "application/json"
        },
        timeout: 8000
      }
    );

    let suggestion = response.data.choices[0]?.message?.content?.trim();
    
    if (!suggestion || suggestion.length < 3) {
      throw new Error("No suggestion");
    }

    suggestion = cleanReply(suggestion);
    
    if (isUnsafe(suggestion) || suggestion.length < 5) {
      return deterministicReply(message, []);
    }

    return suggestion;

  } catch (error) {
    return deterministicReply(message, []);
  }
};

// 🚫 SAFETY CHECK
const isUnsafe = (text) => {
  if (!text) return true;
  const lowerText = text.toLowerCase();
  
  const badPatterns = [
    /\[\d+\]/, /\[citation/, /\(source:/,
    /as (?:an?|a) (?:ai|assistant|language model)/i,
    /i(?:'m| am) (?:an?|a) (?:ai|assistant|bot)/i,
    /perplexity/i, /openai/i, /chatgpt/i,
    /cannot (?:help|assist|roleplay)/i
  ];
  
  for (const pattern of badPatterns) {
    if (pattern.test(text)) return true;
  }
  
  const badKeywords = [
    "assistant", "chatbot", "refuse", "apologize", "policy",
    "guideline", "cannot", "unable", "sorry", "ai system",
    "language model"
  ];
  
  return badKeywords.some(keyword => lowerText.includes(keyword));
};

// 🧠 DETERMINISTIC REPLIES
const deterministicReply = (msg, history) => {
  const lowerMsg = msg.toLowerCase();
  const lastReplies = history.slice(-3).filter(h => h.role === "honeypot").map(h => h.text);
  
  const responses = [
    {
      keywords: ["bank", "account", "suspended", "blocked"],
      replies: ["Kaunsa bank? Branch kaunsi hai?", "Mera account block kaise ho gaya?"]
    },
    {
      keywords: ["otp", "one time password", "verification"],
      replies: ["OTP kyun chahiye? Bank mein jaake pata kar lo.", "OTP nahi bhej sakta."]
    },
    {
      keywords: ["upi", "payment", "transfer"],
      replies: ["UPI kaise karte hain? Main to cash hi deta hoon.", "UPI ID kya hota hai?"]
    },
    {
      keywords: ["link", "click", "website"],
      replies: ["Link nahi khol sakta, phone slow ho jata hai.", "Beta ne mana kiya links click karne se."]
    },
    {
      keywords: ["urgent", "immediate", "emergency"],
      replies: ["Itni jaldi kya hai? Kal office jaunga.", "Thoda time do, sochta hoon."]
    }
  ];
  
  for (const category of responses) {
    if (category.keywords.some(keyword => lowerMsg.includes(keyword))) {
      const available = category.replies.filter(reply => !lastReplies.includes(reply));
      return available.length > 0 ? available[0] : category.replies[0];
    }
  }
  
  const defaults = [
    "Samjha nahi, thoda detail mein batao?",
    "Kya matlab? Phir se samjhao.",
    "Aap kaun? Kaise pata chala mera number?"
  ];
  
  const availableDefaults = defaults.filter(reply => !lastReplies.includes(reply));
  return availableDefaults.length > 0 ? availableDefaults[0] : defaults[0];
};

// 🚪 EXIT REPLY
const exitReply = () => {
  const exits = [
    "Main bank ja kar hi verify karunga.",
    "Beta aa gaya hai, woh baat karega.",
    "Abhi time nahi hai, kal subah baat karenge."
  ];
  return exits[Math.floor(Math.random() * exits.length)];
};

// 🧹 CLEANUP SESSIONS
const cleanupSessions = () => {
  const now = Date.now();
  for (const [key, session] of sessions.entries()) {
    if (now - session.startTime > 30 * 60 * 1000) {
      sessions.delete(key);
    }
  }
};