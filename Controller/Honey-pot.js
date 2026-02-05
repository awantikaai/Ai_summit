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
    keywords: ["bank", "account", "suspended", "blocked", "compromised", "freeze", "locked"],
    replies: [
      "Kaunsa bank? Branch kaunsi hai?",
      "Mera account block kaise ho gaya? Abhi subah toh theek tha.",
      "Account number toh pehle hi diya, phir kyun puchh rahe ho?",
      "SBI hai ya koi aur bank? Maine toh sirf SBI mein account hai.",
      "Pension account hai mera, usme kya problem aayi?",
      "Kal hi bank gaya tha, kisi ne kuch nahi bola.",
      "Account mein kitna paisa hai abhi? Passbook update nahi ki.",
      "Mobile banking activate nahi kiya maine, toh kaise compromise hua?",
      "Credit card bhi block ho gaya kya? Uspe bhi transaction hua hai?",
      "Bank manager ka naam batao, main jaanta hoon branch wale ko.",
      "Kya transaction hua hai jo account block kar rahe ho?",
      "Mera beta SBI mein kaam karta hai, usse puchh kar batata hoon.",
      "Account ka last transaction kab hua? Maine toh kuch nahi kiya.",
      "Kya mere naam se koi dusra account open hua hai?"
    ]
  },
  {
    keywords: ["otp", "one time password", "verification code", "6 digit"],
    replies: [
      "OTP kyun chahiye? Bank toh signature se verify karta hai.",
      "OTP nahi aaya aaj, koi SMS nahi aaya phone pe.",
      "Konsa OTP? Transaction OTP ya login OTP?",
      "OTP sirf bank ke 567676 number se aata hai, aapka number different hai.",
      "Beta bola hai OTP kisi ko mat dena, scam hota hai.",
      "Phone purana hai, SMS delay se aate hain.",
      "Agar OTP de diya toh paise transfer ho jayenge kya?",
      "Maine koi transaction start nahi ki, toh OTP kaise aayega?",
      "Ek minute, phone check karta hoon, SMS aaya hai ya nahi.",
      "OTP 6 digit ka hota hai na? Message aaya hai par padh nahi sakta chhota hai.",
      "Aaj kal OTP scams bahut hain, aap genuine ho iska proof do.",
      "Bank ne kaha tha OTP sirf mobile pe aayega, SMS forward nahi karna.",
      "OTP ka time limit kya hai? 2 minute mein expire ho jata hai na?",
      "Meri beti ne mana kiya hai OTP share karne se."
    ]
  },
  {
    keywords: ["upi", "payment", "transfer", "vpa", "upi pin", "mpin"],
    replies: [
      "UPI kaise karte hain? Maine toh kabhi use nahi kiya.",
      "UPI ID kya hota hai? Mera mobile number hi UPI ID hai kya?",
      "UPI PIN bhool gaya hoon, beta jaanta hai woh.",
      "Mobile payment risky hai, cheque book se transfer karta hoon.",
      "Beta ne install kiya tha UPI par password bhool gaya.",
      "Internet banking activate nahi hai, UPI kaise chalega?",
      "Mere paas toh feature phone hai, UPI nahi chalta ispe.",
      "Agar UPI PIN de diya toh paise nikal jayenge kya?",
      "Kis account se UPI link karna hai? Savings ya current?",
      "UPI se kitna paisa transfer ho sakta hai ek din mein?",
      "Beta ne kaha tha UPI secure nahi hai, uski jagah NEFT karo.",
      "Meri UPI ID kya hai? Mobile number @oksbi hai kya?",
      "Aaj kal UPI fraud bahut hai, isliye main use nahi karta.",
      "Bank wale bole the UPI activate karne branch mein aana padega."
    ]
  },
  {
    keywords: ["urgent", "immediate", "emergency", "now", "quick", "turant", "abhi"],
    replies: [
      "Itni jaldi kya hai? Bank 10 baje khulta hai, wahan jaunga.",
      "Emergency hai toh police ko call karo, main kya kar sakta hoon?",
      "Beta office se aa raha hai, uske aane tak wait karo.",
      "Agar itna urgent hai toh bank manager ko call karo.",
      "Main retire ho gaya hoon, office ka koi urgent kaam nahi hai.",
      "Doctor ke paas jaana hai 4 baje, uske baad free hoon.",
      "Aaj bank holiday hai kya? Kal chala jaunga branch mein.",
      "Phone pe itna urgent kaam nahi karta, bank jaake settle karta hoon.",
      "Meri age 65 hai, heart patient hoon, tension mat do.",
      "Agar paise transfer karne hain toh 24 hour bhi time hai.",
      "Beta IT mein hai, woh 6 baje aayega tab puchhunga.",
      "Bank ka toll-free number batao, main wahan se puchhunga.",
      "Agar account block hona hai toh block ho jaye, kal jaunga bank.",
      "Aapka tone bahut aggressive hai, politely baat karo."
    ]
  },
  {
    keywords: ["fraud", "team", "officer", "security", "department"],
    replies: [
      "Kaun ho aap? Employee ID batao.",
      "Aapka naam kya hai? Department konsa hai?",
      "Maine koi complaint nahi ki, toh aap kaunse fraud se baat kar rahe ho?",
      "Bank ka official email ID kya hai? Wahan se mail bhejo.",
      "Aapki call recording kar raha hoon, police complaint ke liye.",
      "Meri beti bank officer hai, usse verify kar leta hoon.",
      "Last month bhi aisa call aaya tha, police complaint ki thi maine.",
      "Aapka accent different hai, Delhi se ho ya Mumbai se?",
      "Agar fraud prevention team se ho toh verification code bhejo.",
      "Mera beta cyber security mein kaam karta hai, usse puchhunga.",
      "Aapka contact number konsa hai? Call back karta hoon.",
      "Bank ki website pe aapka naam search kar raha hoon.",
      "Agar sach mein fraud team se ho toh branch manager se baat karwao.",
      "Maine CIBIL score check kiya tha, usme koi problem nahi thi."
    ]
  },
  {
    keywords: ["link", "click", "website", "portal", "http"],
    replies: [
      "Link nahi khol sakta, phone pe virus aa jayega.",
      "Beta bola hai bank ki link sirf official app se open karo.",
      "Kaunsa website hai? SBI.in ya sbi.co.in?",
      "Link pe click karne se kya hoga? Account open ho jayega?",
      "Internet slow hai, link load nahi hoga.",
      "Agar link fake nikla toh mera account hack ho jayega.",
      "WhatsApp pe link aaya tha, main delete kar diya.",
      "Eyesight kamzor hai, chhota text padh nahi sakta.",
      "Bank ki official website ka URL kya hai? Google pe check karta hoon.",
      "Link forward karo, beta ko bhejta hoon woh check karega.",
      "Aaj kal phishing links bahut hain, verify karke batao.",
      "Mouse nahi chal raha, touchscreen se click nahi ho raha.",
      "Bank ne SMS bheja hai kya link? Maine toh koi SMS nahi dekha.",
      "SSL certificate hai kya website pe? Safe hai ya nahi?"
    ]
  },
  {
    keywords: ["personal", "details", "information", "aadhar", "pan"],
    replies: [
      "Personal details nahi de sakta, privacy policy hai.",
      "Aadhar number confidential hai, kisi ko nahi batana chahiye.",
      "PAN card bank ke paas hai, copy nahi hai mere paas.",
      "Last time details diye the, spam calls aane lage.",
      "Beta ne kaha hai kisi ko documents mat bhejna WhatsApp pe.",
      "Original documents locker mein hain, ghar pe nahi hain.",
      "Digital signature kya hota hai? Main toh physical sign karta hoon.",
      "Documents verify karne notary ke paas jaana padega.",
      "Aadhar linked hai bank account se, kya problem hai?",
      "KYC already complete hai, phir kyun details maang rahe ho?",
      "Bank ne kaha tha documents update karne 5 saal baad aana.",
      "Photo kheench ke bhejna hai kya? Camera quality achi nahi hai.",
      "Address proof kya chahiye? Electricity bill ya ration card?",
      "Agar details chahiye toh bank application form bhejo."
    ]
  },
  {
    keywords: ["call", "phone", "number", "contact"],
    replies: [
      "Call kar do? Par aapka number private aa raha hai.",
      "Bank ka official number konsa hai? Main wahan call karta hoon.",
      "Beta ka number do, usse baat karta hoon.",
      "Landline pe baat karo, mobile pe network nahi hai.",
      "Hearing problem hai, zor se bolo.",
      "Roaming charge lag rahe hain, incoming free hai na?",
      "Phone balance nahi hai, main call back karta hoon.",
      "Agar important hai toh WhatsApp call karo.",
      "Evening 7 baje call karna, abhi bahar hoon.",
      "Wife phone utha legi, main driving seekh raha hoon.",
      "Grandson ne naya number save kiya hai, woh try karo.",
      "Dual SIM phone hai, konsi SIM pe call karna hai?",
      "Call recording start kiya hai, aage bolo.",
      "Network switching hai, call drop ho jayega."
    ]
  },
  {
    keywords: ["transaction", "payment", "transfer", "money"],
    replies: [
      "Kisne transaction kiya? Main toh kuch nahi kiya.",
      "Transaction amount kitna hai? 10,000 ya 1 lakh?",
      "Kahan transfer hua paisa? Account number batao.",
      "Maine koi NEFT ya RTGS nahi kiya aaj.",
      "Transaction date kab hai? Aaj ya kal?",
      "Cash withdrawal hua hai ya online transfer?",
      "Mera passbook update nahi hai, transaction verify kaise karoon?",
      "Beta ne kuch transfer kiya hai kya? Usse puchhunga.",
      "Agar fraud transaction hai toh FIR karni padegi.",
      "Transaction ID kya hai? SMS mein bhejo.",
      "Bank reversal kar sakta hai kya fraud transaction ka?",
      "3D secure password diya tha kya transaction ke liye?",
      "Mera account savings hai, daily limit 50,000 hai.",
      "Overseas transaction hua hai kya? Main toh India mein hoon."
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