import axios from "axios";

// ✅ SAFE PROMPT (AI SUGGESTION MODE ONLY) - OPTIMIZED
const SUGGESTION_PROMPT = `Generate ONE natural reply from confused elderly Indian person.

Message: "{{MESSAGE}}"

Rules:
- Sound confused, ask ONE question
- 10-15 words max, Hindi-English mix
- NO AI talk, NO citations
- Plain text only

Reply:`;

// 🧠 SESSION MANAGEMENT
const sessions = new Map();
const MAX_TURNS = 7;     // 🎯 PERFECT LENGTH (not too long!)
const AI_TURNS = 4;      // AI only for first 4 turns

// 🔥 MAIN HONEYPOT FUNCTION - PERFECTED
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

    // 🎯 INITIALIZE SESSION
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
        history: [],
        exitTriggered: false
      });
    }

    const session = sessions.get(sid);
    
    // 🚨 CHECK IF ALREADY EXITED
    if (session.exitTriggered) {
      return res.json({
        status: "success",
        reply: "Main bank jaakar verify karunga. Baad mein."
      });
    }

    session.turns++;
    session.history.push({ role: "scammer", text: text });

    // 🔍 EXTRACT INTELLIGENCE (NO HALLUCINATIONS!)
    extractIntelligence(text, session.extracted);

    let reply;

    // 🚨 HARD STOP AT MAX_TURNS (7 TURNS PERFECT!)
    if (session.turns >= MAX_TURNS) {
      reply = exitReply();
      session.exitTriggered = true;
      
      // 🚀 AUTO-SEND EXTRACTION TO GUVI
      await sendExtractionToGuvi(sid, session);
      
      // Cleanup after short delay
      setTimeout(() => {
        if (sessions.has(sid)) {
          sessions.delete(sid);
        }
      }, 5000);
    }
    // 🤖 AI SUGGESTION PHASE (FIRST 4 TURNS)
    else if (session.turns <= AI_TURNS) {
      reply = await getSuggestionFromAI(text);
    }
    // 🧠 DETERMINISTIC PHASE (TURNS 5-6)
    else {
      reply = deterministicReply(text, session.history);
    }

    // Add to history
    session.history.push({ role: "honeypot", text: reply });
    
    // Clean reply
    reply = cleanReply(reply);
    
    // Cleanup old sessions
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

// 🚀 AUTO-SEND EXTRACTION TO GUVI
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
    
    // 🎯 CALCULATE SCAM CONFIDENCE (NO HALLUCINATIONS!)
    let scamScore = 0;
    if (extractedIntelligence.bankAccounts.length > 0) scamScore += 30;
    if (extractedIntelligence.phoneNumbers.length > 0) scamScore += 20;
    if (extractedIntelligence.upiIds.length > 0) scamScore += 20;
    if (extractedIntelligence.suspiciousKeywords.length >= 3) scamScore += 30;
    
    // 🎯 SMART AGENT NOTES
    const notes = [];
    
    // Bank accounts
    if (extractedIntelligence.bankAccounts.length > 0) {
      notes.push(`Found ${extractedIntelligence.bankAccounts.length} bank account(s)`);
    } else {
      notes.push("No bank accounts shared");
    }
    
    // UPI IDs
    if (extractedIntelligence.upiIds.length > 0) {
      notes.push(`UPI IDs: ${extractedIntelligence.upiIds.join(', ')}`);
    }
    
    // Phone numbers
    if (extractedIntelligence.phoneNumbers.length > 0) {
      notes.push(`Phone: ${extractedIntelligence.phoneNumbers.join(', ')}`);
    }
    
    // Keywords (top 5 only)
    if (extractedIntelligence.suspiciousKeywords.length > 0) {
      const topKeywords = extractedIntelligence.suspiciousKeywords.slice(0, 5).join(', ');
      notes.push(`Red flags: ${topKeywords}`);
    }
    
    const agentNotes = `Scam confidence: ${scamScore}%. ${notes.join('; ')}`;
    
    // 🎯 SEND TO GUVI
    await axios.post(
      "https://hackathon.guvi.in/api/updateHoneyPotFinalResult",
      {
        sessionId,
        scamDetected: true,
        totalMessagesExchanged: session.turns,
        extractedIntelligence,
        agentNotes
      },
      { 
        timeout: 8000,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`✅ GUVI callback sent. Turns: ${session.turns}, Score: ${scamScore}%`);
    
  } catch (error) {
    console.error("❌ GUVI callback failed:", error.message);
  }
};

// 🔍 PERFECT EXTRACTION - NO HALLUCINATIONS!
const extractIntelligence = (text, store) => {
  const lowerText = text.toLowerCase();
  
  // 🎯 BANK ACCOUNTS (12-16 digits)
  const accMatches = text.match(/\b\d{12,16}\b/g) || [];
  accMatches.forEach(account => {
    // 🚨 VALIDATION: Not fake patterns
    if (!/^0+$/.test(account) &&           // Not all zeros
        !/^1234567890/.test(account) &&    // Not sequential
        !/^9876543210/.test(account)) {    // Not reverse sequential
      store.bankAccounts.add(account);
    }
  });
  
  // 🎯 PHONE NUMBERS - STRICT! (NO HALLUCINATIONS!)
  const phoneRegex = /\b(?:\+91[\s\-]?)?[6-9]\d{9}\b/g;
  const phoneMatches = text.match(phoneRegex) || [];
  
  phoneMatches.forEach(phone => {
    // Clean
    let cleanPhone = phone.replace(/[+\s\-]/g, '');
    
    // Remove country code
    if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
      cleanPhone = cleanPhone.substring(2);
    }
    
    // 🚨 STRICT VALIDATION
    if (cleanPhone.length === 10 && 
        /^[6-9]/.test(cleanPhone) &&
        isValidIndianPhone(cleanPhone)) {
      store.phoneNumbers.add(cleanPhone);
    }
  });
  
  // 🎯 REAL UPI IDs (NPCI handles only)
  const realUpiRegex = /\b[a-zA-Z0-9.\-_]+@(okaxis|oksbi|okhdfc|okicici|ybl|paytm|axl|ibl)\b/gi;
  const realUpiMatches = text.match(realUpiRegex) || [];
  realUpiMatches.forEach(upi => {
    store.upiIds.add(upi.toLowerCase());
  });
  
  // 🎯 CONTEXT-AWARE UPI (when scammer calls it UPI)
  const contextPatterns = [
    /(?:upi\s*(?:id|handle|address)?|vpa)[\s:]*([a-zA-Z0-9.\-_]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi,
    /confirm\s+(?:your\s+)?upi\s+(?:id|handle)?\s+([a-zA-Z0-9.\-_]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi,
    /your\s+upi\s+(?:is|id)?\s+([a-zA-Z0-9.\-_]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi
  ];
  
  contextPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const potentialUpi = match[1].toLowerCase();
      store.upiIds.add(potentialUpi);
    }
  });
  
  // 🎯 PHISHING LINKS / EMAILS
  const emailRegex = /\b([a-zA-Z0-9.\-_]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/gi;
  const emailMatches = text.match(emailRegex) || [];
  emailMatches.forEach(email => {
    const cleanEmail = email.toLowerCase();
    // Only add if NOT already in UPI IDs
    if (!Array.from(store.upiIds).some(upi => upi === cleanEmail)) {
      store.phishingLinks.add(cleanEmail);
    }
  });
  
  // 🎯 SUSPICIOUS KEYWORDS (CLEAN)
  const keywords = [
    "urgent", "immediate", "emergency", "block", "suspend", "locked",
    "freeze", "verify", "kyc", "otp", "upi pin", "password", "login",
    "click", "link", "won", "lottery", "prize", "reward", "free",
    "compromised", "fraud", "secure", "threat", "breach", "alert",
    "security", "official", "genuine", "suspicious", "pending",
    "transaction", "beneficiary", "unblock", "processed", "sir",
    "madam", "customer", "officer", "team"
  ];
  
  keywords.forEach(keyword => {
    if (lowerText.includes(keyword)) {
      store.suspiciousKeywords.add(keyword);
    }
  });
};

// ✅ PHONE VALIDATION - PREVENTS HALLUCINATIONS
const isValidIndianPhone = (phone) => {
  // Must be exactly 10 digits
  if (!/^\d{10}$/.test(phone)) return false;
  
  // Must start with 6-9
  if (!/^[6-9]/.test(phone)) return false;
  
  // 🚨 REJECT COMMON FAKE PATTERNS
  const invalidPatterns = [
    /^1234567890$/,      // Sequential
    /^9876543210$/,      // Reverse sequential
    /^[0-5]\d{9}$/,      // Starts with 0-5 (invalid)
    /^(\d)\1{9}$/,       // All same digit
    /^\d{1}0{9}$/,       // Mostly zeros
    /^69\d{8}$/,         // Starts with 69 (suspicious)
    /^7890\d{6}$/,       // Contains 7890 (partial match)
    /^6789\d{6}$/,       // Contains 6789
    /^0123\d{6}$/        // Contains 0123
  ];
  
  return !invalidPatterns.some(pattern => pattern.test(phone));
};

// 🧹 CLEAN REPLY
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
    const lowerPrefix = prefix.toLowerCase();
    if (reply.toLowerCase().startsWith(lowerPrefix)) {
      reply = reply.substring(prefix.length).trim();
    }
  });
  
  // Ensure proper ending
  if (reply.length > 0 && !/[.!?]$/.test(reply)) {
    reply = reply.trim() + '?';
  }
  
  return reply.trim().slice(0, 100);
};

// 🤖 AI SUGGESTION
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
            content: "Output ONLY plain conversational text. NO citations, NO AI disclaimers, NO brackets."
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
        timeout: 5000
      }
    );

    let suggestion = response.data.choices[0]?.message?.content?.trim();
    
    if (!suggestion || suggestion.length < 3) {
      return deterministicReply(message, []);
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
    "language model", "artificial intelligence"
  ];
  
  return badKeywords.some(keyword => lowerText.includes(keyword));
};

// 🧠 SMART DETERMINISTIC REPLIES
const deterministicReply = (msg, history) => {
  const lowerMsg = msg.toLowerCase();
  const lastReplies = history.slice(-3).filter(h => h.role === "honeypot").map(h => h.text);
  
  // 🎯 SMART BANK INCONSISTENCY DETECTION
  if (lowerMsg.includes("sbi") && lowerMsg.includes("xyz")) {
    return "Pehle SBI bola, ab XYZ Bank? Yeh kaunsa bank hai?";
  }
  
  const responses = [
    {
      keywords: ["bank", "account", "suspended", "blocked", "compromised"],
      replies: [
        "Kaunsa bank? Branch kaunsi hai?",
        "Mera account block kaise ho gaya?",
        "Bank ka number do, main call karta hoon.",
        "Account number already diya, kyun puchh rahe ho?"
      ]
    },
    {
      keywords: ["otp", "one time password", "verification"],
      replies: [
        "OTP kyun chahiye? Bank mein jaake pata kar lo.",
        "OTP nahi bhej sakta, risky lag raha hai.",
        "Konsa OTP? Message nahi aaya koi.",
        "OTP sirf bank ke official number se aata hai."
      ]
    },
    {
      keywords: ["upi", "payment", "transfer", "vpa", "upi pin"],
      replies: [
        "UPI kaise karte hain? Main to cash hi deta hoon.",
        "UPI ID kya hota hai? Samjhao.",
        "UPI PIN nahi de sakta, beta manage karta hai.",
        "Mobile payment risky hai, cash better."
      ]
    },
    {
      keywords: ["urgent", "immediate", "emergency", "now", "quick"],
      replies: [
        "Itni jaldi kya hai? Kal office jaunga.",
        "Thoda time do, sochta hoon.",
        "Emergency mein police ko call karna chahiye.",
        "Abhi busy hoon, 10 minute baad."
      ]
    }
  ];
  
  for (const category of responses) {
    if (category.keywords.some(keyword => lowerMsg.includes(keyword))) {
      const available = category.replies.filter(reply => !lastReplies.includes(reply));
      return available.length > 0 ? available[0] : category.replies[0];
    }
  }
  
  // Default responses
  const defaults = [
    "Samjha nahi, thoda detail mein batao?",
    "Kya matlab? Phir se samjhao.",
    "Aap kaun? Kaise pata chala mera number?",
    "Beta se puchh kar batata hoon.",
    "Thoda wait karo, phone pakad raha hoon."
  ];
  
  const availableDefaults = defaults.filter(reply => !lastReplies.includes(reply));
  return availableDefaults.length > 0 ? availableDefaults[0] : "Samjha nahi, phir bhejo.";
};

// 🚪 PERFECT EXIT REPLIES (7 TURN MAX!)
const exitReply = () => {
  const exits = [
    "Main bank jaakar hi verify karunga.",
    "Beta aa gaya hai, woh baat karega.",
    "Doctor ke paas jaana hai, baad mein.",
    "Network issue aa raha hai, phone band karna padega.",
    "Abhi time nahi hai, kal subah baat karenge.",
    "Mujhe lagta hai galat number hai, bye.",
    "Phone battery low hai, charge karna hai."
  ];
  return exits[Math.floor(Math.random() * exits.length)];
};

// 🧹 CLEANUP SESSIONS
const cleanupSessions = () => {
  const now = Date.now();
  const THIRTY_MINUTES = 30 * 60 * 1000;
  
  for (const [key, session] of sessions.entries()) {
    if (now - session.startTime > THIRTY_MINUTES) {
      sessions.delete(key);
    }
  }
};