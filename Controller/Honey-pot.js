import axios from "axios";

// ✅ SAFE PROMPT (AI SUGGESTION MODE ONLY)
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
const MAX_TURNS = 7;     // 🎯 PERFECT LENGTH
const AI_TURNS = 4;      // AI only for first 4 turns

// 🔥 MAIN HONEYPOT FUNCTION - IMPROVED
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

    // 🎯 INITIALIZE SESSION WITH DEBUG INFO
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
        exitTriggered: false,
        debug: []  // 🎯 ADDED: Track extraction for debugging
      });
      console.log(`🆕 New session: ${sid}`);
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
    console.log(`🔄 Session ${sid}: Turn ${session.turns}`);
    session.history.push({ role: "scammer", text: text });

    // 🔍 EXTRACT INTELLIGENCE WITH DEBUGGING
    const extractionResults = extractIntelligenceWithDebug(text, session.extracted);
    session.debug.push({ turn: session.turns, text: text.substring(0, 100), extractionResults });

    let reply;

    // 🚨 HARD STOP AT MAX_TURNS
    if (session.turns >= MAX_TURNS) {
      reply = exitReply();
      session.exitTriggered = true;
      
      // 🚀 AUTO-SEND EXTRACTION TO GUVI
      await sendExtractionToGuvi(sid, session);
      
      // Log extraction summary
      console.log(`📊 FINAL EXTRACTION for ${sid}:`);
      console.log(`   Bank accounts: ${Array.from(session.extracted.bankAccounts)}`);
      console.log(`   Phone numbers: ${Array.from(session.extracted.phoneNumbers)}`);
      console.log(`   UPI IDs: ${Array.from(session.extracted.upiIds)}`);
      
      // Cleanup immediately
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
    console.error("Honeypot error:", err.message);
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
    
    // 🎯 CALCULATE ACCURATE SCAM CONFIDENCE
    let scamScore = 0;
    if (extractedIntelligence.bankAccounts.length > 0) scamScore += 30;
    if (extractedIntelligence.phoneNumbers.length > 0) scamScore += 20;
    if (extractedIntelligence.upiIds.length > 0) scamScore += 20;
    if (extractedIntelligence.suspiciousKeywords.length >= 3) scamScore += 30;
    
    // 🎯 ACCURATE AGENT NOTES
    const notes = [];
    
    if (extractedIntelligence.bankAccounts.length > 0) {
      notes.push(`Bank accounts: ${extractedIntelligence.bankAccounts.join(', ')}`);
    }
    
    if (extractedIntelligence.phoneNumbers.length > 0) {
      notes.push(`Phone numbers: ${extractedIntelligence.phoneNumbers.join(', ')}`);
    } else {
      notes.push(`No phone numbers shared by scammer`);
    }
    
    if (extractedIntelligence.upiIds.length > 0) {
      notes.push(`UPI IDs: ${extractedIntelligence.upiIds.join(', ')}`);
    }
    
    if (extractedIntelligence.phishingLinks.length > 0) {
      notes.push(`Phishing links: ${extractedIntelligence.phishingLinks.join(', ')}`);
    }
    
    if (extractedIntelligence.suspiciousKeywords.length > 0) {
      const topKeywords = extractedIntelligence.suspiciousKeywords.slice(0, 5).join(', ');
      notes.push(`Red flags: ${topKeywords}`);
    }
    
    const agentNotes = notes.length > 0 ? notes.join('; ') : "Minimal intelligence extracted";
    
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
    
    console.log(`✅ GUVI callback sent. Session: ${sessionId}, Turns: ${session.turns}, Score: ${scamScore}%`);
    
  } catch (error) {
    console.error("❌ GUVI callback failed:", error.message);
  }
};

// 🔍 IMPROVED EXTRACTION WITH DEBUGGING
const extractIntelligenceWithDebug = (text, store) => {
  const results = {
    bankAccounts: [],
    phoneNumbers: [],
    upiIds: [],
    keywords: []
  };
  
  const lowerText = text.toLowerCase();
  
  // 🎯 1. BANK ACCOUNTS - STRICTER
  // Match 12-16 digit numbers that are NOT part of larger numbers
  const accountRegex = /\b\d{12,16}\b/g;
  const accountMatches = text.match(accountRegex) || [];
  
  accountMatches.forEach(account => {
    // Validate it's a real-looking account number
    if (isValidBankAccount(account)) {
      store.bankAccounts.add(account);
      results.bankAccounts.push(account);
    }
  });
  
  // 🎯 2. PHONE NUMBERS - MUCH STRICTER
  // Only match REAL Indian phone number patterns
  const phonePatterns = [
    // +91-9876543210
    /\+\d{2}[-\s]?\d{10}/g,
    // 9876543210 (standalone 10-digit)
    /\b[6-9]\d{9}\b/g
  ];
  
  phonePatterns.forEach(pattern => {
    const matches = text.match(pattern) || [];
    matches.forEach(phone => {
      const cleanPhone = cleanPhoneNumber(phone);
      if (cleanPhone && isValidIndianPhone(cleanPhone)) {
        store.phoneNumbers.add(cleanPhone);
        results.phoneNumbers.push(cleanPhone);
      }
    });
  });
  
  // 🎯 3. UPI IDs - ONLY VALID HANDLES
  const upiRegex = /[\w.\-]+@(okaxis|oksbi|okhdfc|okicici|ybl|paytm|axl|ibl)\b/gi;
  const upiMatches = text.match(upiRegex) || [];
  upiMatches.forEach(upi => {
    const cleanUpi = upi.toLowerCase();
    store.upiIds.add(cleanUpi);
    results.upiIds.push(cleanUpi);
  });
  
  // 🎯 4. CONTEXT-AWARE UPI
  if (text.toLowerCase().includes("upi id") || text.toLowerCase().includes("upi handle")) {
    const contextPattern = /upi\s+(?:id|handle)[\s:]*([\w.\-]+@[\w.\-]+\.\w+)/gi;
    let match;
    while ((match = contextPattern.exec(text)) !== null) {
      const potentialUpi = match[1].toLowerCase();
      if (!store.upiIds.has(potentialUpi)) {
        store.upiIds.add(potentialUpi);
        results.upiIds.push(potentialUpi);
      }
    }
  }
  
  // 🎯 5. EMAILS / PHISHING LINKS
  const emailRegex = /[\w.\-]+@[\w.\-]+\.\w+/gi;
  const emailMatches = text.match(emailRegex) || [];
  emailMatches.forEach(email => {
    const cleanEmail = email.toLowerCase();
    // Only add if not a UPI ID
    const isUpi = /@(okaxis|oksbi|okhdfc|okicici|ybl|paytm|axl|ibl)/i.test(cleanEmail);
    if (!isUpi && !store.phishingLinks.has(cleanEmail)) {
      store.phishingLinks.add(cleanEmail);
    }
  });
  
  // 🎯 6. KEYWORDS - RELEVANT TO SCAMS
  const keywords = [
    "urgent", "emergency", "immediate", "now", "quick",
    "block", "suspend", "freeze", "locked", "compromised",
    "otp", "verification", "verify", "kyc", "authentication",
    "fraud", "scam", "hack", "security", "alert",
    "transaction", "transfer", "payment", "money"
  ];
  
  keywords.forEach(keyword => {
    if (lowerText.includes(keyword) && !store.suspiciousKeywords.has(keyword)) {
      store.suspiciousKeywords.add(keyword);
      results.keywords.push(keyword);
    }
  });
  
  return results;
};

// 🔧 CLEAN PHONE NUMBER
const cleanPhoneNumber = (phone) => {
  // Remove all non-digit characters except leading +
  let clean = phone.replace(/[^\d+]/g, '');
  
  // Remove +91 if present
  if (clean.startsWith('91') && clean.length === 12) {
    clean = clean.substring(2);
  } else if (clean.startsWith('+91') && clean.length === 13) {
    clean = clean.substring(3);
  }
  
  return clean;
};

// ✅ VALIDATE INDIAN PHONE
const isValidIndianPhone = (phone) => {
  // Must be exactly 10 digits
  if (!/^\d{10}$/.test(phone)) return false;
  
  // Must start with 6-9
  if (!/^[6-9]/.test(phone)) return false;
  
  // Reject obvious fake patterns
  const fakePatterns = [
    /^0+$/,                 // All zeros
    /^1+$/,                 // All ones
    /^(\d)\1{9}$/,          // All same digit
    /^1234567890$/,         // Sequential ascending
    /^9876543210$/,         // Sequential descending
    /^[0-5]\d{9}$/          // Starts with invalid prefix
  ];
  
  return !fakePatterns.some(pattern => pattern.test(phone));
};

// ✅ VALIDATE BANK ACCOUNT
const isValidBankAccount = (account) => {
  // Must be 12-16 digits
  if (account.length < 12 || account.length > 16) return false;
  
  // Not all zeros
  if (/^0+$/.test(account)) return false;
  
  // Not obvious fake patterns
  const fakePatterns = [
    /^1234567890/,      // Sequential
    /^9876543210/,      // Reverse sequential
    /^(\d)\1+$/         // All same digit
  ];
  
  return !fakePatterns.some(pattern => pattern.test(account));
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
    if (reply.toLowerCase().startsWith(prefix.toLowerCase())) {
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
    console.error("AI Suggestion Error:", error.message);
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

// 🧠 DETERMINISTIC REPLIES (using your improved responses)
const deterministicReply = (msg, history) => {
  const lowerMsg = msg.toLowerCase();
  const lastReplies = history.slice(-3).filter(h => h.role === "honeypot").map(h => h.text);
  
  // 🎯 SMART BANK INCONSISTENCY DETECTION
  if (lowerMsg.includes("sbi") && lowerMsg.includes("xyz")) {
    return "Pehle SBI bola, ab XYZ Bank? Yeh kaunsa bank hai?";
  }
  
  const responses = [
    {
      keywords: ["bank", "account", "suspended", "blocked", "compromised", "freeze", "locked"],
      replies: [
        "Kaunsa bank hai? Branch kaunsi hai?",
        "Account number pehle se diya hai, phir kyun puchh rahe ho?",
        "Mera account block kaise ho gaya? Kya transaction hua hai?",
        "SBI hai ya koi aur bank? Maine sirf SBI mein account rakha hai.",
        "Kal hi bank gaya tha, kisi ne kuch nahi bola account block ke baare mein.",
        "Account mein kitna balance hai abhi? Passbook update nahi ki maine.",
        "Mobile banking nahi use karta, toh kaise compromise hua mera account?",
        "Kya mere naam se koi fraud transaction hua hai? Amount kitna hai?",
        "Bank manager ka naam batao, main verify kar leta hoon.",
        "Agar account block karna hai toh FIR karni padegi na?"
      ]
    },
    {
      keywords: ["otp", "one time password", "verification code"],
      replies: [
        "OTP kyun chahiye? Maine koi transaction start nahi ki.",
        "OTP sirf bank ke official number se aata hai, aapka number personal hai.",
        "Koi SMS nahi aaya aaj OTP ka, aapka system sahi hai?",
        "Agar OTP de diya toh paise transfer ho jayenge kya?",
        "Beta bola hai OTP kisi ko mat dena, aaj kal scams bahut hain.",
        "Transaction OTP hai ya login OTP? Main toh login bhi nahi kiya aaj.",
        "OTP ka time limit 2 minute hota hai, abhi tak expire ho gaya hoga.",
        "Maine koi online shopping nahi ki, toh OTP kahan se aayega?",
        "Bank ne kaha tha OTP kabhi share mat karna, aap kaun ho?",
        "Agar genuine ho toh verification code bhejo official email se."
      ]
    },
    {
      keywords: ["upi", "upi pin", "mpin", "vpa", "payment"],
      replies: [
        "UPI PIN nahi de sakta, beta manage karta hai sab.",
        "UPI kabhi use nahi kiya maine, cheque book se transfer karta hoon.",
        "Mera UPI ID kya hai? Mobile number @oksbi hai kya?",
        "Agar UPI PIN de diya toh paise nikal jayenge mera account se.",
        "Beta ne kaha tha UPI scams bahut hain, isliye main use nahi karta.",
        "Mere paas feature phone hai, UPI nahi chalta ispe.",
        "Internet banking activate nahi hai, UPI kaise chalega?",
        "UPI se daily limit kitna hai? Main toh 10,000 se jyada ka transaction nahi karta.",
        "Aapka UPI ID kya hai? Official bank ID hona chahiye.",
        "Bank ne UPI activate karne ke liye branch mein bulaya tha, main nahi gaya."
      ]
    },
    {
      keywords: ["urgent", "immediate", "emergency", "now", "turant"],
      replies: [
        "Itni jaldi kya hai? Bank 10 baje khulta hai, wahan jaunga.",
        "Emergency hai toh police ko call karo, main retire ho gaya hoon.",
        "Beta office se aa raha hai, uske baad decide karenge.",
        "Agar account block hona hai toh block ho jaye, kal jaunga bank.",
        "Phone pe itna urgent kaam nahi karta, face-to-face baat karni chahiye.",
        "Meri age 65 hai, tension se blood pressure badh jayega.",
        "Aapka tone bahut aggressive hai, politely baat karo.",
        "Agar paise transfer karne hain toh 24 hours bhi time hai.",
        "Doctor ke paas jaana hai, uske baad baat karte hain.",
        "Bank holiday hai kya aaj? Kal subah jaunga."
      ]
    },
    {
      keywords: ["fraud", "team", "officer", "security", "department"],
      replies: [
        "Kaun ho aap? Employee ID number batao.",
        "Maine koi complaint nahi ki, toh fraud department kaise involve hua?",
        "Aapka naam kya hai? Department konsa hai?",
        "Bank ka official email ID kya hai? Wahan se mail aana chahiye.",
        "Call recording start kar raha hoon, police complaint ke liye.",
        "Meri beti bank officer hai, usse verify kar leta hoon.",
        "Last month bhi aisa fraud call aaya tha, maine police ko diya tha.",
        "Agar sach mein fraud team se ho toh verification code bhejo.",
        "Aapka contact number konsa hai? Main bank se verify kar ke call back karta hoon.",
        "Aapka accent different hai, konsi branch se ho?"
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
    "Thoda wait karo, phone pakad raha hoon.",
    "Ye technical baat hai, main nahi samjhta.",
    "Mujhe lagta hai galat number hai.",
    "Phone thik se sunai nahi de raha, phir bolo."
  ];
  
  const availableDefaults = defaults.filter(reply => !lastReplies.includes(reply));
  return availableDefaults.length > 0 ? availableDefaults[0] : "Samjha nahi, phir bhejo.";
};

// 🚪 EXIT REPLY
const exitReply = () => {
  const exits = [
    "Main bank jaakar hi verify karunga.",
    "Beta aa gaya hai, woh baat karega.",
    "Abhi time nahi hai, kal subah baat karenge."
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
      console.log(`🧹 Cleaned up old session: ${key}`);
    }
  }
};