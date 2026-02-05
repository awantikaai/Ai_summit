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

    // 🔍 EXTRACT INTELLIGENCE (FIXED - WORKS NOW!)
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
    
    // 🎯 CALCULATE SCAM CONFIDENCE
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

// 🔍 FIXED EXTRACTION FUNCTION - ACTUALLY WORKS!
const extractIntelligence = (text, store) => {
  const lowerText = text.toLowerCase();
  
  // 🎯 1. BANK ACCOUNTS - SIMPLE & EFFECTIVE
  // Match any 12-16 digit number
  const accountPattern = /\d{12,16}/g;
  const accounts = text.match(accountPattern) || [];
  
  accounts.forEach(account => {
    if (account.length >= 12 && account.length <= 16) {
      store.bankAccounts.add(account);
    }
  });
  
  // Also look for "account number X" pattern
  const accountContextPattern = /account\s*number\s*[:=]?\s*(\d{12,16})/gi;
  let accMatch;
  while ((accMatch = accountContextPattern.exec(text)) !== null) {
    store.bankAccounts.add(accMatch[1]);
  }
  
  // 🎯 2. PHONE NUMBERS - FIXED! ACTUALLY EXTRACTS NUMBERS
  // Method 1: Find all 10-digit numbers starting with 6-9
  const allNumbers = text.match(/\d+/g) || [];
  allNumbers.forEach(num => {
    if (num.length === 10 && /^[6-9]/.test(num)) {
      store.phoneNumbers.add(num);
    }
  });
  
  // Method 2: Match +91-9876543210 format
  const plus91Pattern = /\+91[-\s]?\d{10}/g;
  const plus91Matches = text.match(plus91Pattern) || [];
  plus91Matches.forEach(num => {
    const clean = num.replace(/[+\-\s]/g, '');
    if (clean.startsWith('91') && clean.length === 12) {
      const phone = clean.substring(2);
      if (phone.length === 10 && /^[6-9]/.test(phone)) {
        store.phoneNumbers.add(phone);
      }
    }
  });
  
  // Method 3: Match patterns like "98765-43210"
  const hyphenPattern = /[6-9]\d{2}[-]?\d{3}[-]?\d{4}/g;
  const hyphenMatches = text.match(hyphenPattern) || [];
  hyphenMatches.forEach(num => {
    const phone = num.replace(/-/g, '');
    if (phone.length === 10 && /^[6-9]/.test(phone)) {
      store.phoneNumbers.add(phone);
    }
  });
  
  // 🎯 3. UPI IDs - REAL NPCI HANDLES
  const upiPattern = /[\w.\-]+@(okaxis|oksbi|okhdfc|okicici|ybl|paytm|axl|ibl)/gi;
  const upis = text.match(upiPattern) || [];
  upis.forEach(upi => {
    store.upiIds.add(upi.toLowerCase());
  });
  
  // 🎯 4. CONTEXT-AWARE UPI (when scammer calls something UPI)
  const contextPatterns = [
    /(?:upi\s*(?:id|handle|address)?|vpa)[\s:]*([a-zA-Z0-9.\-_]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi,
    /confirm\s+(?:your\s+)?upi\s+(?:id|handle)?\s+([a-zA-Z0-9.\-_]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi
  ];
  
  contextPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const potentialUpi = match[1].toLowerCase();
      store.upiIds.add(potentialUpi);
    }
  });
  
  // 🎯 5. PHISHING LINKS / EMAILS
  const emailPattern = /[\w.\-]+@[\w.\-]+\.[a-z]{2,}/gi;
  const emails = text.match(emailPattern) || [];
  emails.forEach(email => {
    const lowerEmail = email.toLowerCase();
    // Only add to phishingLinks if not a UPI
    const isUpi = /@(okaxis|oksbi|okhdfc|okicici|ybl|paytm|axl|ibl)/.test(lowerEmail);
    if (!isUpi) {
      store.phishingLinks.add(lowerEmail);
    }
  });
  
  // 🎯 6. SUSPICIOUS KEYWORDS - EXPANDED
  const keywords = [
    "urgent", "immediate", "emergency", "block", "suspend", "locked",
    "freeze", "verify", "kyc", "otp", "upi pin", "password", "pin",
    "compromised", "fraud", "hack", "hacked", "security", "alert",
    "team", "officer", "department", "sir", "madam", "customer",
    "chala jayega", "paise", "paisa", "money", "transaction",
    "transfer", "send", "payment", "beneficiary", "unblock",
    "turant", "abhi", "now", "quick", "fast", "threat", "risk",
    "danger", "lost", "stolen", "gone", "disappear"
  ];
  
  keywords.forEach(keyword => {
    if (lowerText.includes(keyword)) {
      store.suspiciousKeywords.add(keyword);
    }
  });
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
    keywords: ["bank", "account", "suspended", "blocked", "compromised", "freeze", "locked", "kyc"],
    replies: [
      "Kaunsa bank? Branch kaunsi hai?",
      "Mera account block kaise ho gaya? Abhi toh paisa nikala tha.",
      "Bank ka number do, main call karta hoon verify karne.",
      "Account number already diya, phir kyun puchh rahe ho?",
      "SBI hai ya HDFC? Maine dono mein account hai.",
      "Pension account hai mera, usme kya problem hai?",
      "Kal hi branch gaya tha, kuch nahi bola unhone.",
      "Mera beta bank mein kaam karta hai, usse puchhunga.",
      "Passbook update karwana tha, uski wajah se kya?",
      "Bank manager ka naam batao, main jaanta hoon sabko.",
      "Mobile banking nahi use karta main, to kaise hack hua?",
      "Meri wife ka account bhi safe hai na?",
      "Fixed deposit ka kya hua? Woh bhi block ho gaya?",
      "Credit card bhi hai usi bank se, uspe bhi problem hai kya?"
    ]
  },
  {
    keywords: ["otp", "one time password", "verification code", "6 digit", "sms code", "verification"],
    replies: [
      "OTP kyun chahiye? Bank toh branch mein verify karta hai.",
      "OTP nahi bhej sakta, beta bola hai kisi ko mat dena.",
      "Konsa OTP? Message aaya hi nahi aaj.",
      "OTP sirf bank ke official number se aata hai, aapka number toh personal hai.",
      "Phone purana hai, SMS late se aate hain.",
      "Do baar OTP aaya tha, konsa bheju?",
      "Eyesight kamjor hai, chhote number padh nahi sakta.",
      "Beta aata hai shaam ko, usse puchh kar bhejta hoon.",
      "OTP se paise transfer hote hain kya? Main toh cheque deta hoon.",
      "Aaj kal bahut scams hain OTP ke naam pe, dar lag raha hai.",
      "Meri beti doctor hai, usne mana kiya hai OTP dena.",
      "Bank wale bole the OTP kisi ko mat batana, aap kaun ho?",
      "Phone charging pe hai, 5 minute baad check karta hoon.",
      "Glasses ghar pe reh gaye, number clear nahi dikh raha."
    ]
  },
  {
    keywords: ["upi", "payment", "transfer", "vpa", "upi pin", "mpin", "google pay", "phonepe", "paytm"],
    replies: [
      "UPI kaise karte hain? Main toh cash hi deta hoon dukaan pe.",
      "UPI ID kya hota hai? Samjhao thoda.",
      "UPI PIN nahi de sakta, beta manage karta hai sab.",
      "Mobile payment risky hai, cash better hai mere liye.",
      "Beta ne install kiya hai UPI par kabhi use nahi kiya.",
      "Internet slow hai ghar pe, UPI nahi chalta.",
      "Smartphone naya lena hai, abhi wala 5 saal purana hai.",
      "Meri beti ne kaha tha UPI mat karna, fraud hota hai.",
      "Bank se direct transfer karte hain, UPI nahi aata.",
      "Password bhool gaya hoon UPI ka, beta jaanta hai.",
      "Fingerprint se kholna hai kya? Meri ungliyan kamjor hain.",
      "Aaj kal sab UPI hi karte hain, main purane zamane ka aadmi hoon.",
      "Ration dukaan wala bhi UPI maangta hai, main cash deta hoon.",
      "Beta Bangalore mein hai, woh Sunday ko aayega tab puchhunga."
    ]
  },
  {
    keywords: ["urgent", "immediate", "emergency", "now", "quick", "turant", "abhi", "fast", "asap", "jaldi"],
    replies: [
      "Itni jaldi kya hai? Kal office jaunga.",
      "Thoda time do, sochta hoon.",
      "Emergency mein police ko call karna chahiye.",
      "Abhi busy hoon, 10 minute baad.",
      "Subah 10 baje tak baat karte hain, abhi sone ja raha hoon.",
      "Blood pressure ki medicine lena hai pehle.",
      "Grandson aa gaya hai, uske baad baat karte hain.",
      "TV serial chal raha hai, uske baad.",
      "Doctor ke paas jaana hai 4 baje, uske baad free hoon.",
      "Wife ghar pe nahi hai, woh aayegi tab puchhunga.",
      "Aaj Wednesday hai, main bank jaata hoon Thursday ko.",
      "Headache ho raha hai, kal subah fresh hoke baat karte hain.",
      "Phone battery 10% hai, charge karna padega.",
      "Ration lene jaana hai, wapas aake baat karta hoon."
    ]
  },
  {
    keywords: ["fraud", "team", "officer", "security", "department", "prevention", "investigation", "official"],
    replies: [
      "Kaun ho aap? Pehchan nahi hai.",
      "Aapka ID card bhejo pehle photo ke saath.",
      "Official proof dikhao tab baat karenge.",
      "Maine pehle kabhi aapka call nahi liya.",
      "Bank ka official email bhejo, main check karta hoon.",
      "Aapka accent different hai, kaunse state se ho?",
      "Meri beti SBI mein hai, usse puchh kar batata hoon.",
      "Cyber crime wale number pe call karna chahiye kya?",
      "Aapka naam kya hai? Employee ID batao.",
      "Maine koi complaint nahi ki, toh aap kaise aaye?",
      "Last month bhi aisa call aaya tha, woh bhi fraud nikla.",
      "Police station mein complaint karni chahiye kya?",
      "Beta IT mein hai, usse puchhunga aap genuine ho ya nahi.",
      "Aapki voice recording kar raha hoon, police ko dunga agar fraud nikle."
    ]
  },
  {
    keywords: ["money", "paise", "paisa", "amount", "transaction", "transfer", "send", "payment", "rupees", "₹"],
    replies: [
      "Kitna paisa chahiye? Maine toh kuch transfer nahi kiya.",
      "Pension aaya hai bas, usme se kya len den?",
      "Beta har mahine paise bhejta hai, usme se kya?",
      "Fixed deposit hai, woh toh 3 saal baad khulega.",
      "Medical bill bharna hai is month, paise nahi hai extra.",
      "Credit card bill aaya hai, uspe focus kar raha hoon.",
      "Grandson ka school fee dena hai, paise tight hain.",
      "Kya rate hai? Kitna paisa bhejna hai?",
      "Cash hai ghar pe, bank mein bahut nahi hai.",
      "Wife paise manage karti hai, usse puchhunga.",
      "Ration card ka paisa aaya hai, usse kya karna hai?",
      "Insurance premium bharna hai, uske baad dekhunga.",
      "Aaj kal sab online hota hai, main cheque deta hoon.",
      "Bank passbook update karni hai, tab pata chalega kitna paisa hai."
    ]
  },
  {
    keywords: ["link", "click", "website", "portal", "http", "www", "online", "login", "portal"],
    replies: [
      "Link nahi khol sakta, phone slow ho jata hai.",
      "Beta ne mana kiya hai links click karne se.",
      "Website kaunsi hai? Pehchan nahi.",
      "Link pe click karna safe hai kya?",
      "Internet package khatam ho gaya hai, link nahi khul raha.",
      "Virus aa jayega kya link se?",
      "WhatsApp pe aaya tha link, main delete kar diya.",
      "Eyesight kamjor hai, chhota text padh nahi sakta.",
      "Beta Sunday ko aayega, usse link check karaunga.",
      "Bank ka official website kaunsa hai? Google pe search karna padega.",
      "Password bhool gaya hoon login ka, beta yaad rakhta hai.",
      "Mouse nahi chal raha, touchscreen se click nahi ho raha.",
      "Link copy karke bhejo, grandson ko forward kar dunga.",
      "Aaj kal bahut fake websites hain, dar lag raha hai."
    ]
  },
  {
    keywords: ["won", "lottery", "prize", "reward", "jackpot", "crorepati", "lucky", "winner", "contest"],
    replies: [
      "Lottery? Maine toh kabhi ticket nahi liya.",
      "Galat number hai, maine nahi khela kabhi.",
      "Itna paisa achanak kaise? Scam lag raha.",
      "Konsi lottery? Details bhejo.",
      "TV pe aata hai yeh sab, main nahi manta.",
      "Pensioner hoon, lottery khelne ka time nahi hai.",
      "Beta bola tha lottery mat khelo, time waste hai.",
      "Tax dena padega prize pe? Kitna percent?",
      "Agar sach mein prize hai toh bank draft bhejo.",
      "Maine toh sirf chhota savings certificate liya hai.",
      "Aaj tak kuch nahi jeeta, ab achanak kaise?",
      "Form fill karna hai kya? Main nahi kar sakta.",
      "Notary karna padega kya? Bahut pareshani hai.",
      "Grandson ke liye gift mang rahe ho kya? Uske birthday pe diya maine."
    ]
  },
  {
    keywords: ["personal", "details", "information", "aadhar", "pan", "document", "id proof"],
    replies: [
      "Personal details nahi de sakta, risky hai.",
      "Aadhar card photo bhejna hai kya? Woh confidential hai.",
      "PAN card bank ke paas hai, main nahi rakhta.",
      "Beta ne kaha hai kisi ko documents mat bhejna.",
      "Last time documents bheje the, spam calls aane lage.",
      "Original documents ghar pe nahi hain, locker mein hain.",
      "Photo kheench ke bhejna hai kya? Camera nahi aata.",
      "Digital signature kya hota hai? Main toh hath se sign karta hoon.",
      "Notary karvana padega kya? 500 rupee lagte hain.",
      "Documents verify karne bank jaana padega.",
      "Meri age 65 hai, retirement ho gaya.",
      "Address change hua hai, abhi update nahi kiya.",
      "Biometric nahi hai mere paas, fingerprint fail ho gaya.",
      "Passport hai par expire ho gaya hai, renew karna hai."
    ]
  },
  {
    keywords: ["call", "phone", "number", "contact", "ring", "dial", "mobile"],
    replies: [
      "Call kar do? Par aapka number private aa raha hai.",
      "Landline pe baat karte hain, mobile mein network nahi hai.",
      "Beta ka number do, usse baat karta hoon.",
      "Bank ka toll-free number batao, main wahan call karta hoon.",
      "Hearing aid lagana hai pehle, sunai nahi deta.",
      "Voice message bhej do, baad mein sunta hoon.",
      "Roaming charge lagte hain, paise nahi hain.",
      "Phone mein balance nahi hai, incoming free hai bas.",
      "WhatsApp call karo, normal call expensive hai.",
      "Evening 7 baje tak call karna, abhi bahar hoon.",
      "Wife phone utha legi, main driving sik raha hoon.",
      "Grandson ne naya number diya hai, woh try karo.",
      "Phone service center mein hai, repair kar rahe hain.",
      "Dual SIM phone hai, konsi SIM pe call aaya?"
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