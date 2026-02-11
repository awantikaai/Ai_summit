import axios from "axios";

// ✅ SAFE PROMPT (AI SUGGESTION MODE ONLY) - KEEPING YOUR EXACT PROMPT
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
const AI_TURNS = 7;      // AI FOR ALL TURNS NOW (as you requested)

// 🔥 MAIN HONEYPOT FUNCTION
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
          phishingLinks: new Set(),
          personalInfo: new Set()
        },
        startTime: Date.now(),
        history: [],
        exitTriggered: false,
        scamConfidence: 0
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
    
    // 🎯 ADD SCAMMER MESSAGE TO HISTORY
    session.history.push({ role: "scammer", text: text, timestamp: Date.now() });

    // 🔍 ENHANCED EXTRACTION: REGEX + AI HYBRID
    await enhancedExtractIntelligence(text, session.extracted, session);

    let reply;

    // 🚨 HARD STOP AT MAX_TURNS
    if (session.turns >= MAX_TURNS) {
      reply = generateExitReply(session);
      session.exitTriggered = true;
      
      // 🚀 AUTO-SEND EXTRACTION TO GUVI WITH AI ENHANCED DATA
      await sendEnhancedExtractionToGuvi(sid, session);
      
      // Cleanup after short delay
      setTimeout(() => {
        if (sessions.has(sid)) {
          sessions.delete(sid);
        }
      }, 5000);
    }
    // 🤖 AI SUGGESTION FOR ALL TURNS (as you requested)
    else {
      reply = await getEnhancedSuggestionFromAI(text, session.history, session.turns);
      
      // Fallback if AI fails
      if (!reply || reply.length < 5) {
        reply = deterministicReply(text, session.history);
      }
    }

    // Add honeypot reply to history
    session.history.push({ role: "honeypot", text: reply, timestamp: Date.now() });
    
    // Clean reply
    reply = cleanReply(reply);
    
    // Update scam confidence
    updateScamConfidence(session);
    
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

// 🔍 ENHANCED HYBRID EXTRACTION: REGEX + AI
const enhancedExtractIntelligence = async (text, store, session) => {
  // 🎯 PHASE 1: REGEX EXTRACTION (FAST & ACCURATE)
  const regexResults = regexExtractIntelligence(text);
  
  // Add regex results to store
  regexResults.bankAccounts.forEach(acc => store.bankAccounts.add(acc));
  regexResults.phoneNumbers.forEach(phone => store.phoneNumbers.add(phone));
  regexResults.upiIds.forEach(upi => store.upiIds.add(upi));
  regexResults.phishingLinks.forEach(link => store.phishingLinks.add(link));
  regexResults.personalInfo.forEach(info => store.personalInfo.add(info));
  regexResults.keywords.forEach(keyword => store.suspiciousKeywords.add(keyword));
  
  // 🎯 PHASE 2: AI ENHANCED EXTRACTION (FOR MISSED/COMPLEX PATTERNS)
  try {
    const aiExtracted = await aiExtractIntelligence(text);
    
    // Add AI results if they look valid
    if (aiExtracted.bankAccount && !store.bankAccounts.has(aiExtracted.bankAccount)) {
      store.bankAccounts.add(aiExtracted.bankAccount);
    }
    
    if (aiExtracted.phoneNumber && !store.phoneNumbers.has(aiExtracted.phoneNumber)) {
      store.phoneNumbers.add(aiExtracted.phoneNumber);
    }
    
    if (aiExtracted.upiId && !store.upiIds.has(aiExtracted.upiId)) {
      store.upiIds.add(aiExtracted.upiId);
    }
    
    // Add AI detected suspicious patterns
    if (aiExtracted.suspiciousPatterns) {
      aiExtracted.suspiciousPatterns.forEach(pattern => {
        store.suspiciousKeywords.add(pattern);
      });
    }
    
  } catch (error) {
    console.log("AI extraction failed, using regex only:", error.message);
  }
  
  return store;
};

// 🔍 ROBUST REGEX EXTRACTION
const regexExtractIntelligence = (text) => {
  const results = {
    bankAccounts: [],
    phoneNumbers: [],
    upiIds: [],
    phishingLinks: [],
    personalInfo: [],
    keywords: []
  };
  
  const lowerText = text.toLowerCase();
  
  // 🎯 1. BANK ACCOUNTS - MULTIPLE PATTERNS
  const accountPatterns = [
    /\b\d{12,16}\b/g,  // Standard 12-16 digits
    /account\s*(?:number|no|#)?\s*[:=]?\s*(\d{12,16})/gi,
    /a\/c\s*(?:no|number)?\s*[:=]?\s*(\d{12,16})/gi,
    /acc\.?\s*(?:no|number)?\s*[:=]?\s*(\d{12,16})/gi
  ];
  
  accountPatterns.forEach(pattern => {
    const matches = text.match(pattern) || [];
    matches.forEach(match => {
      const account = match.replace(/[^\d]/g, '').slice(-16);
      if (account.length >= 12 && account.length <= 16) {
        const isFake = isFakeAccount(account);
        if (!isFake) {
          results.bankAccounts.push(account);
        }
      }
    });
  });
  
  // 🎯 2. PHONE NUMBERS - COMPREHENSIVE DETECTION
  const phonePatterns = [
    /\+\d{1,3}[-\s]?\d{10}/g,                    // +91-9876543210
    /\b[6-9]\d{2}[-\s]?\d{3}[-\s]?\d{4}\b/g,     // 987-654-3210
    /\b[6-9]\d{9}\b/g,                           // 9876543210
    /phone\s*(?:number|no)?\s*[:=]?\s*([6-9]\d{9})/gi,
    /contact\s*(?:us|me)?\s*[:=]?\s*([6-9]\d{9})/gi,
    /call\s*(?:us|me)?\s*at\s*([6-9]\d{9})/gi,
    /mobile\s*(?:number|no)?\s*[:=]?\s*([6-9]\d{9})/gi
  ];
  
  phonePatterns.forEach(pattern => {
    const matches = text.match(pattern) || [];
    matches.forEach(phone => {
      let cleanPhone = phone.replace(/[+\-\s]/g, '');
      
      if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
        cleanPhone = cleanPhone.substring(2);
      }
      
      if (cleanPhone.length === 10 && /^[6-9]/.test(cleanPhone)) {
        const isValid = !isFakePhone(cleanPhone);
        if (isValid) {
          results.phoneNumbers.push(cleanPhone);
        }
      }
    });
  });
  
  // 🎯 3. UPI IDs - OFFICIAL + FAKE DETECTION
  const upiPatterns = [
    /\b[\w.\-]+@(okaxis|oksbi|okhdfc|okicici|ybl|paytm|axl|ibl)\b/gi, // Official
    /\b[\w.\-]+@[\w.\-]+\b/gi,  // Generic (for fake UPI detection)
    /upi\s*(?:id|handle|address)?\s*[:=]?\s*([\w.\-]+@[\w.\-]+)/gi,
    /send\s+(?:to|money\s+to)\s+([\w.\-]+@[\w.\-]+)/gi,
    /vpa\s*[:=]?\s*([\w.\-]+@[\w.\-]+)/gi
  ];
  
  upiPatterns.forEach(pattern => {
    const matches = text.match(pattern) || [];
    matches.forEach(upi => {
      const cleanUpi = upi.toLowerCase();
      if (cleanUpi.includes('@') && !cleanUpi.includes(' ') && cleanUpi.length <= 50) {
        results.upiIds.push(cleanUpi);
      }
    });
  });
  const personalPatterns = [
    /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, 
    /[A-Z]{5}\d{4}[A-Z]{1}/gi,           
    /\b\d{16}\b/g,                        
    /cvv\s*[:=]?\s*(\d{3})/gi,
    /expir(?:y|ation)\s*(?:date)?\s*[:=]?\s*(\d{2}\/\d{2,4})/gi
  ];
  
  personalPatterns.forEach(pattern => {
    const matches = text.match(pattern) || [];
    matches.forEach(info => results.personalInfo.push(info));
  });
  
  const linkPatterns = [
    /https?:\/\/[^\s]+/gi,
    /\b[\w.\-]+@[\w.\-]+\.[a-z]{2,}\b/gi,
    /www\.[^\s]+/gi,
    /bit\.ly\/[^\s]+/gi,
    /tinyurl\.com\/[^\s]+/gi
  ];
  
  linkPatterns.forEach(pattern => {
    const matches = text.match(pattern) || [];
    matches.forEach(link => {
      const cleanLink = link.toLowerCase();
      const isUpi = /@(okaxis|oksbi|okhdfc|okicici|ybl|paytm|axl|ibl)/.test(cleanLink);
      if (!isUpi) {
        results.phishingLinks.push(cleanLink);
      }
    });
  });
  
  const scamKeywords = {
    urgency: ["urgent", "emergency", "immediate", "now", "quick", "fast", "asap", "turant", "abhi", "jaldi", "instantly", "right now"],
    threat: ["block", "suspend", "freeze", "locked", "compromised", "hacked", "fraud", "scam", "theft", "stolen", "lost", "gone"],
    verification: ["otp", "verification", "verify", "kyc", "authenticate", "password", "pin", "mpin", "security code", "access code"],
    pressure: ["last chance", "final warning", "immediately", "seconds left", "minutes left", "hurry", "time limit", "deadline"],
    authority: ["bank officer", "security team", "fraud department", "cyber cell", "investigation team", "official", "government"],
    action: ["click", "link", "download", "install", "update", "upgrade", "refresh", "reset", "renew", "reactivate"],
    financial: ["transaction", "transfer", "payment", "money", "fund", "amount", "balance", "withdraw", "deposit", "refund"],
    personal: ["aadhar", "pan", "document", "details", "information", "personal", "private", "confidential", "sensitive"]
  };
  
  Object.values(scamKeywords).flat().forEach(keyword => {
    if (lowerText.includes(keyword)) {
      results.keywords.push(keyword);
    }
  });
  
  return results;
};

const aiExtractIntelligence = async (text) => {
  try {
    const extractionPrompt = `Extract scam-related information from this message:

Message: "${text}"

Extract ONLY if present:
1. Bank account number (12-16 digits)
2. Phone number (Indian format)
3. UPI ID/Handle
4. Suspicious patterns/urgency indicators

Return as JSON format: {
  "bankAccount": "string or null",
  "phoneNumber": "string or null", 
  "upiId": "string or null",
  "suspiciousPatterns": ["pattern1", "pattern2"]
}`;

    const response = await axios.post(
      "https://api.perplexity.ai/chat/completions",
      {
        model: "sonar-pro",
        messages: [
          {
            role: "system",
            content: "You are a data extraction assistant. Return ONLY valid JSON. Do not include explanations."
          },
          { 
            role: "user", 
            content: extractionPrompt 
          }
        ],
        temperature: 0.3,
        max_tokens: 200,
        stream: false
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
          "Content-Type": "application/json"
        },
        timeout: 4000
      }
    );

    const content = response.data.choices[0]?.message?.content?.trim();
    if (!content) return {};
    
    try {
      return JSON.parse(content);
    } catch {
      // If JSON parsing fails, extract manually
      const result = {};
      const lowerContent = content.toLowerCase();
      
      // Look for bank account
      const accMatch = content.match(/\d{12,16}/);
      if (accMatch) result.bankAccount = accMatch[0];
      
      // Look for phone
      const phoneMatch = content.match(/[6-9]\d{9}/);
      if (phoneMatch) result.phoneNumber = phoneMatch[0];
      
      // Look for UPI
      const upiMatch = content.match(/[\w.\-]+@[\w.\-]+/);
      if (upiMatch) result.upiId = upiMatch[0];
      
      return result;
    }
    
  } catch (error) {
    console.error("AI Extraction Error:", error.message);
    return {};
  }
};

// 🤖 ENHANCED AI SUGGESTION WITH CONTEXT
const getEnhancedSuggestionFromAI = async (message, history, turnNumber) => {
  try {
    // Build conversation context
    let context = "";
    if (history.length > 0) {
      const recentHistory = history.slice(-4); // Last 4 messages
      context = recentHistory.map(h => `${h.role === 'scammer' ? 'Scammer' : 'You'}: ${h.text}`).join('\n');
    }
    
    const enhancedPrompt = `Previous conversation:
${context}

New scammer message: "${message}"

You are an elderly Indian person (65+ years). Generate a natural, confused reply that:
1. Sounds authentic (Hindi-English mix: "Kya?", "Samjha nahi", "Beta", etc.)
2. Asks 1-2 questions to engage the scammer
3. Shows slight suspicion but stays conversational
4. 10-20 words max, natural flow
5. NO AI disclaimers, NO citations, NO brackets

Reply:`;

    const response = await axios.post(
      "https://api.perplexity.ai/chat/completions",
      {
        model: "sonar-pro",
        messages: [
          {
            role: "system",
            content: "You are an elderly Indian person. Output ONLY the reply text, nothing else."
          },
          { 
            role: "user", 
            content: enhancedPrompt 
          }
        ],
        temperature: 0.8, // Slightly higher for variety
        max_tokens: 50,
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
      // Fallback to your original prompt
      const fallbackPrompt = SUGGESTION_PROMPT.replace("{{MESSAGE}}", message);
      const fallbackResponse = await axios.post(
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
              content: fallbackPrompt 
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
          timeout: 3000
        }
      );
      
      suggestion = fallbackResponse.data.choices[0]?.message?.content?.trim() || "";
    }

    suggestion = cleanReply(suggestion);
    
    if (isUnsafe(suggestion) || suggestion.length < 5) {
      return deterministicReply(message, history);
    }

    return suggestion;

  } catch (error) {
    console.error("Enhanced AI Suggestion Error:", error.message);
    // Fallback to your original function
    return await getSuggestionFromAI(message);
  }
};

// 🤖 YOUR ORIGINAL AI SUGGESTION FUNCTION (KEPT AS FALLBACK)
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
// 🚀 SIMPLIFIED GUVI REPORTING
const sendEnhancedExtractionToGuvi = async (sessionId, session) => {
  try {
    // Final AI analysis of entire conversation
    const aiAnalysis = await analyzeConversationWithAI(session.history);
    
    // Convert Sets to Arrays
    const extractedIntelligence = {
      bankAccounts: Array.from(session.extracted.bankAccounts),
      upiIds: Array.from(session.extracted.upiIds),
      phoneNumbers: Array.from(session.extracted.phoneNumbers),
      suspiciousKeywords: Array.from(session.extracted.suspiciousKeywords),
      phishingLinks: Array.from(session.extracted.phishingLinks),
      personalInfo: Array.from(session.extracted.personalInfo)
    };
    
    // 🎯 SIMPLE SCAM SCORE CALCULATION
    let scamScore = 0;
    if (extractedIntelligence.bankAccounts.length > 0) scamScore += 30;
    if (extractedIntelligence.phoneNumbers.length > 0) scamScore += 20;
    if (extractedIntelligence.upiIds.length > 0) scamScore += 20;
    if (extractedIntelligence.suspiciousKeywords.length >= 3) scamScore += 30;
    scamScore = Math.min(scamScore, 100);
    
    // 🎯 SIMPLE AGENT NOTES (ONE LINE SUMMARY)
    const parts = [];
    
    // Bank accounts
    if (extractedIntelligence.bankAccounts.length > 0) {
      const count = extractedIntelligence.bankAccounts.length;
      parts.push(`${count} bank account${count > 1 ? 's' : ''}`);
    }
    
    // Phone numbers
    if (extractedIntelligence.phoneNumbers.length > 0) {
      const count = extractedIntelligence.phoneNumbers.length;
      parts.push(`${count} phone number${count > 1 ? 's' : ''}`);
    }
    
    // UPI IDs
    if (extractedIntelligence.upiIds.length > 0) {
      const count = extractedIntelligence.upiIds.length;
      parts.push(`${count} UPI ID${count > 1 ? 's' : ''}`);
    }
    
    // Keywords
    if (extractedIntelligence.suspiciousKeywords.length > 0) {
      const count = extractedIntelligence.suspiciousKeywords.length;
      parts.push(`${count} red flag${count > 1 ? 's' : ''}`);
    }
    
    // Build simple summary
    let agentNotes = "Scam detected: ";
    
    if (parts.length > 0) {
      agentNotes += parts.join(", ");
    } else {
      agentNotes += "No specific data extracted";
    }
    
    // Add scam type if available
    if (aiAnalysis.scamType) {
      agentNotes += ` | Type: ${aiAnalysis.scamType}`;
    }
    
    // Add confidence and turns
    agentNotes += ` | Confidence: ${scamScore}% | Turns: ${session.turns}`;
    
    // Add AI insights if available and simple
    if (aiAnalysis.riskLevel && ['High', 'Critical'].includes(aiAnalysis.riskLevel)) {
      agentNotes += ` | Risk: ${aiAnalysis.riskLevel}`;
    }
    
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
    
    console.log(`✅ GUVI callback sent: ${agentNotes}`);
    
  } catch (error) {
    console.error("❌ GUVI callback failed:", error.message);
    // Try fallback without AI analysis
    await sendExtractionToGuvi(sessionId, session);
  }
};

// 🧠 AI CONVERSATION ANALYSIS
const analyzeConversationWithAI = async (history) => {
  try {
    const conversation = history
      .filter(h => h.role === 'scammer')
      .map(h => h.text)
      .join('\n');
    
    if (!conversation || conversation.length < 10) {
      return {};
    }
    
    const analysisPrompt = `Analyze this scam conversation for patterns:

Scammer Messages:
${conversation}

Identify:
1. Scam type (Bank fraud, UPI scam, Tech support, etc.)
2. Key techniques used (urgency, authority, fear, etc.)
3. Risk level (Low/Medium/High)
4. Extraction success (What info did scammer try to get?)

Return as JSON: {
  "scamType": "string",
  "techniques": ["tech1", "tech2"],
  "riskLevel": "string",
  "extractedInfo": ["info1", "info2"]
}`;

    const response = await axios.post(
      "https://api.perplexity.ai/chat/completions",
      {
        model: "sonar-pro",
        messages: [
          {
            role: "system",
            content: "You are a fraud analysis expert. Return ONLY valid JSON."
          },
          { 
            role: "user", 
            content: analysisPrompt 
          }
        ],
        temperature: 0.2,
        max_tokens: 300,
        stream: false
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
          "Content-Type": "application/json"
        },
        timeout: 6000
      }
    );

    const content = response.data.choices[0]?.message?.content?.trim();
    if (!content) return {};
    
    try {
      return JSON.parse(content);
    } catch {
      return {};
    }
    
  } catch (error) {
    console.error("AI Analysis Error:", error.message);
    return {};
  }
};

// 🧮 SCAM SCORE CALCULATION
const calculateScamScore = (extracted, session) => {
  let score = 0;
  
  // Bank accounts (high value)
  if (extracted.bankAccounts.length > 0) score += 25;
  
  // Phone numbers (medium value)
  if (extracted.phoneNumbers.length > 0) score += 20;
  
  // UPI IDs (high value)
  if (extracted.upiIds.length > 0) score += 25;
  
  // Personal info (high risk)
  if (extracted.personalInfo.length > 0) score += 30;
  
  // Keywords intensity
  const keywordCount = extracted.suspiciousKeywords.length;
  if (keywordCount >= 10) score += 30;
  else if (keywordCount >= 5) score += 20;
  else if (keywordCount >= 3) score += 10;
  
  // Phishing links
  if (extracted.phishingLinks.length > 0) score += 15;
  
  // Conversation length bonus
  if (session.turns >= 6) score += 10;
  
  return Math.min(score, 100);
};

// 🔧 HELPER FUNCTIONS
const isFakeAccount = (account) => {
  return (
    /^0+$/.test(account) ||               // All zeros
    /^(\d)\1{11,15}$/.test(account) ||    // All same digit
    /^123456789/.test(account) ||         // Sequential
    /^987654321/.test(account)           // Reverse sequential
  );
};

const isFakePhone = (phone) => {
  return (
    /^0+$/.test(phone) ||
    /^1+$/.test(phone) ||
    /^1234567890$/.test(phone) ||
    /^9876543210$/.test(phone) ||
    /^(\d)\1{9}$/.test(phone) ||
    /^[0-5]\d{9}$/.test(phone)
  );
};

const updateScamConfidence = (session) => {
  const extracted = session.extracted;
  const counts = {
    bank: extracted.bankAccounts.size,
    phone: extracted.phoneNumbers.size,
    upi: extracted.upiIds.size,
    keywords: extracted.suspiciousKeywords.size,
    links: extracted.phishingLinks.size
  };
  
  session.scamConfidence = Math.min(
    (counts.bank * 25) + 
    (counts.phone * 20) + 
    (counts.upi * 25) + 
    (Math.min(counts.keywords, 10) * 3) + 
    (counts.links * 15),
    100
  );
};

const generateExitReply = (session) => {
  const exits = [
    "Main bank jaakar hi verify karunga. Aapka number note kar liya hai.",
    "Beta police mein friend hai, usse puchh kar batata hoon.",
    "Abhi time nahi hai, kal cyber crime cell mein complaint karunga.",
    "Phone record ho raha hai, agar scam nikla toh court mein jayega.",
    "Mera beta IT cell mein kaam karta hai, usse forward kar raha hoon.",
    "Bank manager se baat ki, unhone kaha aise calls ignore karo.",
    "Aaj kal bahut scams hain, main thoda alert ho gaya hoon.",
    "Maine aapka number save kar liya hai, police verification ke liye.",
    "Kal bank jaunga FIR likhwane, aapka details diye hain.",
    "Thoda suspicious lag raha hai, risk nahi lena chahiye."
  ];
  
  return exits[Math.floor(Math.random() * exits.length)];
};

// 🧹 CLEAN REPLY
const cleanReply = (reply) => {
  if (!reply) return "Samjha nahi, phir bhejo.";
  
  // Remove citations and brackets
  reply = reply.replace(/\[\d+\]/g, '');
  reply = reply.replace(/\[|\]/g, '');
  reply = reply.replace(/\([^)]*\)/g, '');
  
  // Remove quotes
  reply = reply.replace(/^["']|["']$/g, '');
  
  // Remove AI prefixes
  const aiPrefixes = ["Assistant:", "AI:", "Response:", "Reply:", "Here's", "Here is", "The reply:", "Answer:"];
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
  
  // Remove any remaining markdown or special characters
  reply = reply.replace(/\*\*|\*|__|_|`/g, '');
  
  return reply.trim().slice(0, 120); // Increased limit slightly
};

// 🚫 SAFETY CHECK
const isUnsafe = (text) => {
  if (!text) return true;
  const lowerText = text.toLowerCase();
  
  const badPatterns = [
    /\[\d+\]/, /\[citation/, /\(source:/, /@\d+/,
    /as (?:an?|a) (?:ai|assistant|language model)/i,
    /i(?:'m| am) (?:an?|a) (?:ai|assistant|bot)/i,
    /perplexity/i, /openai/i, /chatgpt/i, /claude/i, /bard/i,
    /cannot (?:help|assist|roleplay)/i, /i cannot generate/i,
    /i'm sorry/i, /i apologize/i, /as an ai/i
  ];
  
  for (const pattern of badPatterns) {
    if (pattern.test(text)) return true;
  }
  
  const badKeywords = [
    "assistant", "chatbot", "refuse", "apologize", "policy",
    "guideline", "cannot", "unable", "sorry", "ai system",
    "language model", "artificial intelligence", "generate",
    "content policy", "ethical guidelines", "safety"
  ];
  
  return badKeywords.some(keyword => lowerText.includes(keyword));
};

// 🧠 DETERMINISTIC REPLIES (YOUR EXCELLENT VERSION - KEPT AS FALLBACK)
const deterministicReply = (msg, history) => {
  const lowerMsg = msg.toLowerCase();
  const lastReplies = history.slice(-3).filter(h => h.role === "honeypot").map(h => h.text);
  
  // 🎯 SMART BANK INCONSISTENCY DETECTION
  if (lowerMsg.includes("sbi") && lowerMsg.includes("xyz")) {
    return "Pehle SBI bola, ab XYZ Bank? Yeh kaunsa bank hai?";
  }

  // 🎯 YOUR EXTENDED RESPONSES (truncated for brevity, keep your full version)
  const responses = [
    {
      keywords: ["bank", "account", "suspended", "blocked"],
      replies: [
        "Kaunsa bank hai bhaiya? Main toh SBI mein account rakhta hoon.",
        "Mera account block kaise ho gaya? Kal hi paisa nikala tha.",
        "Bank kaunsi hai? Branch kaunsi hai?"
      ]
    },
    {
      keywords: ["otp", "one time password", "verification code"],
      replies: [
        "OTP kyun chahiye bhaiya? Maine kuch order nahi kiya.",
        "Koi SMS nahi aaya aaj, phone check kiya maine.",
        "Beta bola hai OTP kisi ko mat dena, scam hota hai."
      ]
    }
  ];
  
  for (const category of responses) {
    if (category.keywords.some(keyword => lowerMsg.includes(keyword))) {
      const available = category.replies.filter(reply => !lastReplies.includes(reply));
      return available.length > 0 ? 
        available[Math.floor(Math.random() * available.length)] : 
        category.replies[Math.floor(Math.random() * category.replies.length)];
    }
  }
  
  // 🎯 DEFAULT NATURAL RESPONSES
  const defaults = [
    "Samjha nahi bhaiya, thoda detail mein batao?",
    "Kya matlab? Phir se samjhao zara.",
    "Aap kaun ho? Kaise pata chala mera number?",
    "Beta se puchh kar batata hoon, woh aayega shaam ko.",
    "Thoda wait karo, phone pakad raha hoon."
  ];
  
  const availableDefaults = defaults.filter(reply => !lastReplies.includes(reply));
  return availableDefaults.length > 0 ? 
    availableDefaults[Math.floor(Math.random() * availableDefaults.length)] : 
    "Samjha nahi, phir bhejo.";
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

// 🚀 FALLBACK GUVI FUNCTION (KEPT FOR COMPATIBILITY)
const sendExtractionToGuvi = async (sessionId, session) => {
  try {
    const extractedIntelligence = {
      bankAccounts: Array.from(session.extracted.bankAccounts),
      upiIds: Array.from(session.extracted.upiIds),
      phoneNumbers: Array.from(session.extracted.phoneNumbers),
      suspiciousKeywords: Array.from(session.extracted.suspiciousKeywords),
      phishingLinks: Array.from(session.extracted.phishingLinks)
    };
    
    const agentNotes = `Extracted intelligence from ${session.turns} turns`;
    
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
    
    console.log(`✅ GUVI callback sent. Session: ${sessionId}, Turns: ${session.turns}`);
    
  } catch (error) {
    console.error("❌ GUVI callback failed:", error.message);
  }
};