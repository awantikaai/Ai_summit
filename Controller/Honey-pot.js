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
    
    // 🎯 ADD SCAMMER MESSAGE TO HISTORY
    session.history.push({ role: "scammer", text: text });

    // 🔍 EXTRACT INTELLIGENCE FROM ENTIRE CONVERSATION HISTORY
    extractIntelligenceFromHistory(session.history, session.extracted);

    let reply;

    // 🚨 HARD STOP AT MAX_TURNS
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
    
    if (extractedIntelligence.bankAccounts.length > 0) {
      notes.push(`Bank accounts: ${extractedIntelligence.bankAccounts.join(', ')}`);
    }
    
    if (extractedIntelligence.phoneNumbers.length > 0) {
      notes.push(`Phone numbers: ${extractedIntelligence.phoneNumbers.join(', ')}`);
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
    
    console.log(`✅ GUVI callback sent. Session: ${sessionId}, Turns: ${session.turns}`);
    
  } catch (error) {
    console.error("❌ GUVI callback failed:", error.message);
  }
};

// 🔍 EXTRACT FROM ENTIRE CONVERSATION HISTORY
const extractIntelligenceFromHistory = (history, store) => {
  // Clear previous extraction to avoid duplicates
  store.bankAccounts.clear();
  store.phoneNumbers.clear();
  store.upiIds.clear();
  store.phishingLinks.clear();
  store.suspiciousKeywords.clear();
  
  // Extract intelligence from ALL scammer messages
  history.forEach((item) => {
    if (item.role === "scammer") {
      extractIntelligence(item.text, store);
    }
  });
};

// 🔍 SINGLE MESSAGE EXTRACTION
const extractIntelligence = (text, store) => {
  // 🎯 1. BANK ACCOUNTS
  const accountRegex = /\b\d{12,16}\b/g;
  const accountMatches = text.match(accountRegex) || [];
  accountMatches.forEach(account => {
    if (!/^0+$/.test(account) && !/^1234567890/.test(account)) {
      store.bankAccounts.add(account);
    }
  });
  
  // 🎯 2. PHONE NUMBERS - IMPROVED REGEX
  const phoneRegex = /\b(?:\+91[-\s]?)?[6-9]\d{9}\b/g;
  const phoneMatches = text.match(phoneRegex) || [];
  
  phoneMatches.forEach(phone => {
    let cleanPhone = phone.replace(/[+\-\s]/g, '');
    
    if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
      cleanPhone = cleanPhone.substring(2);
    }
    
    if (cleanPhone.length === 10 && /^[6-9]/.test(cleanPhone)) {
      const invalidPatterns = [
        /^0+$/, /^1+$/, /^1234567890$/, /^9876543210$/, /^(\d)\1{9}$/
      ];
      
      const isValid = !invalidPatterns.some(pattern => pattern.test(cleanPhone));
      if (isValid) {
        store.phoneNumbers.add(cleanPhone);
      }
    }
  });
  
  // 🎯 3. UPI IDs
  const upiRegex = /\b[a-zA-Z0-9.\-_]+@(okaxis|oksbi|okhdfc|okicici|ybl|paytm|axl|ibl)\b/gi;
  const upiMatches = text.match(upiRegex) || [];
  upiMatches.forEach(upi => {
    store.upiIds.add(upi.toLowerCase());
  });
  
  // 🎯 4. CONTEXT-AWARE UPI
  if (text.toLowerCase().includes("upi id") || text.toLowerCase().includes("upi handle")) {
    const contextPattern = /upi\s+(?:id|handle)[\s:]*([a-zA-Z0-9.\-_]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
    let match;
    while ((match = contextPattern.exec(text)) !== null) {
      const potentialUpi = match[1].toLowerCase();
      store.upiIds.add(potentialUpi);
    }
  }
  
  // 🎯 5. EMAILS / PHISHING LINKS
  const emailRegex = /\b[a-zA-Z0-9.\-_]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/gi;
  const emailMatches = text.match(emailRegex) || [];
  emailMatches.forEach(email => {
    const cleanEmail = email.toLowerCase();
    const isUpi = /@(okaxis|oksbi|okhdfc|okicici|ybl|paytm|axl|ibl)/i.test(cleanEmail);
    if (!isUpi) {
      store.phishingLinks.add(cleanEmail);
    }
  });
  
  // 🎯 6. SUSPICIOUS KEYWORDS
  const keywords = [
    "urgent", "emergency", "immediate", "now", "quick",
    "block", "suspend", "freeze", "locked", "compromised",
    "otp", "verification", "verify", "kyc", "authentication",
    "fraud", "scam", "hack", "security", "alert",
    "transaction", "transfer", "payment", "money",
    "turant", "abhi", "chala jayega", "paise", "paisa"
  ];
  
  const lowerText = text.toLowerCase();
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

// 🧠 DETERMINISTIC REPLIES - MORE NATURAL & HUMAN-LIKE
const deterministicReply = (msg, history) => {
  const lowerMsg = msg.toLowerCase();
  const lastReplies = history.slice(-3).filter(h => h.role === "honeypot").map(h => h.text);
  
  // 🎯 SMART BANK INCONSISTENCY DETECTION
  if (lowerMsg.includes("sbi") && lowerMsg.includes("xyz")) {
    return "Pehle SBI bola, ab XYZ Bank? Yeh kaunsa bank hai?";
  }

  // 🎯 EXTENDED NATURAL RESPONSES
  const responses = [
    {
      keywords: ["bank", "account", "suspended", "blocked", "compromised", "freeze", "locked", "kyc", "pension"],
      replies: [
        "Kaunsa bank hai bhaiya? Main toh SBI mein account rakhta hoon.",
        "Mera account block kaise ho gaya? Kal hi paisa nikala tha.",
        "Bank kaunsi hai? Branch kaunsi hai?",
        "Account number toh pehle hi diya tha, phir se kyun puchh rahe ho?",
        "Mera pension account hai, usme kya problem aa gayi?",
        "Kal hi bank gaya tha, kisi ne kuch nahi bola.",
        "Passbook update nahi ki maine, balance pata nahi kitna hai.",
        "Mobile banking activate nahi kiya maine, toh hack kaise hua?",
        "Beta bank mein kaam karta hai, usse puchhunga.",
        "Bank manager ka naam batao, main jaanta hoon sabko.",
        "Meri wife ka account bhi safe hai na?",
        "Credit card bhi block ho gaya kya?",
        "Fixed deposit ka kya hua? Woh toh 3 saal baad khulta hai.",
        "Aaj subah check kiya tha, sab theek tha.",
        "Kya transaction hua hai jo block kar rahe ho?",
        "Maine koi loan nahi liya hai, toh problem kya hai?",
        "Account mein sirf pension aata hai, usme se kya nikalna hai?",
        "Last month bhi aisa hi hua tha, phir theek ho gaya.",
        "Kal daughter aayegi, uske saath bank chala jaunga.",
        "Bank wale number pe call karna chahiye kya?"
      ]
    },
    {
      keywords: ["otp", "one time password", "verification code", "6 digit", "sms", "code"],
      replies: [
        "OTP kyun chahiye bhaiya? Maine kuch order nahi kiya.",
        "Koi SMS nahi aaya aaj, phone check kiya maine.",
        "Beta bola hai OTP kisi ko mat dena, scam hota hai.",
        "OTP sirf bank ke official number se aata hai, aapka number alag hai.",
        "Transaction OTP hai ya login OTP? Main toh login bhi nahi kiya.",
        "Phone charging pe hai, 5 minute baad check karta hoon.",
        "Eyesight kamjor hai, chhota number padh nahi sakta.",
        "Do baar OTP aaya tha, konsa sahi hai?",
        "Agar OTP de diya toh paise transfer ho jayenge kya?",
        "Bank wale bole the OTP kabhi share mat karna.",
        "Meri beti doctor hai, usne mana kiya hai OTP dena.",
        "Aaj kal bahut scams chal rahe hain OTP ke naam pe.",
        "OTP ka time limit 2 minute hota hai, expire ho gaya hoga.",
        "Maine koi online shopping nahi ki, OTP kahan se aayega?",
        "Phone purana hai, SMS late se aate hain.",
        "Glasses ghar pe reh gaye, number clear nahi dikh raha.",
        "Beta Bangalore mein hai, usse puchhunga.",
        "Aapka tone thoda suspicious lag raha hai.",
        "Police ko complaint karni chahiye kya aisa hone pe?",
        "Recorded kar raha hoon baat, agar scam nikla toh police ko dunga."
      ]
    },
    {
      keywords: ["upi", "upi pin", "mpin", "vpa", "payment", "transfer", "google pay", "phonepe", "paytm"],
      replies: [
        "UPI PIN nahi de sakta bhaiya, beta manage karta hai sab.",
        "UPI kaise karte hain? Main toh cash hi deta hoon dukaan pe.",
        "Mera UPI ID kya hai? Mobile number @oksbi hai kya?",
        "Agar PIN de diya toh paise nikal jayenge mera account se.",
        "Beta ne kaha tha UPI scams bahut hain, isliye use nahi karta.",
        "Mere paas feature phone hai, UPI nahi chalta.",
        "Internet banking activate nahi hai, UPI kaise chalega?",
        "Password bhool gaya hoon UPI ka, beta jaanta hai.",
        "Smartphone naya lena hai, abhi wala 5 saal purana hai.",
        "Fingerprint se kholna hai kya? Meri ungliyan kamjor hain.",
        "Aaj kal sab UPI hi karte hain, main purane zamane ka aadmi hoon.",
        "Beta ne install kiya tha par kabhi use nahi kiya.",
        "Internet slow hai ghar pe, UPI nahi chalta.",
        "Bank se direct transfer karte hain, UPI nahi aata.",
        "Ration dukaan wala bhi UPI maangta hai, main cash deta hoon.",
        "UPI se daily limit kitna hai? Main 10,000 se jyada ka transaction nahi karta.",
        "Aapka UPI ID konsa hai? Official bank ID hona chahiye.",
        "Bank ne UPI activate karne branch mein bulaya tha, main nahi gaya.",
        "Meri beti ne kaha tha UPI mat karna, fraud hota hai.",
        "Cash better hai mere liye, online sab complicated hai."
      ]
    },
    {
      keywords: ["urgent", "immediate", "emergency", "now", "quick", "turant", "abhi", "fast", "jaldi", "asap"],
      replies: [
        "Itni jaldi kya hai bhaiya? Bank 10 baje khulta hai.",
        "Emergency hai toh police ko call karo, main retire ho gaya hoon.",
        "Beta office se aa raha hai, uske baad decide karenge.",
        "Agar account block hona hai toh block ho jaye, kal jaunga bank.",
        "Phone pe itna urgent kaam nahi karta, face-to-face baat karni chahiye.",
        "Meri age 65 hai, tension se blood pressure badh jayega.",
        "Aapka tone bahut aggressive hai, politely baat karo.",
        "Agar paise transfer karne hain toh 24 hours bhi time hai.",
        "Doctor ke paas jaana hai, uske baad free hoon.",
        "Bank holiday hai kya aaj? Kal subah jaunga.",
        "TV serial chal raha hai, uske baad baat karte hain.",
        "Grandson aa gaya hai, uske baad free hoon.",
        "Headache ho raha hai, kal fresh hoke baat karte hain.",
        "Ration lene jaana hai, wapas aake baat karta hoon.",
        "Blood pressure ki medicine lena hai pehle.",
        "Wife ghar pe nahi hai, woh aayegi tab puchhunga.",
        "Phone battery 10% hai, charge karna padega.",
        "Network issue aa raha hai, call drop ho jayega.",
        "Aaj Wednesday hai, main bank jaata hoon Thursday ko.",
        "Thoda time do, sochta hoon."
      ]
    },
    {
      keywords: ["fraud", "team", "officer", "security", "department", "prevention", "investigation", "official", "cyber"],
      replies: [
        "Kaun ho aap bhaiya? Employee ID batao.",
        "Aapka naam kya hai? Department konsa hai?",
        "Maine koi complaint nahi ki, toh aap kaise aaye?",
        "Bank ka official email ID kya hai? Wahan se mail aana chahiye.",
        "Call recording start kar raha hoon, police complaint ke liye.",
        "Meri beti bank officer hai, usse verify kar leta hoon.",
        "Last month bhi aisa call aaya tha, maine police ko complaint ki thi.",
        "Aapka accent different hai, kaunse state se ho?",
        "Agar fraud prevention team se ho toh verification code bhejo.",
        "Mera beta cyber security mein kaam karta hai, usse puchhunga.",
        "Aapka contact number konsa hai? Call back karta hoon.",
        "Bank ki website pe aapka naam search kar raha hoon.",
        "Agar sach mein fraud team se ho toh branch manager se baat karwao.",
        "Maine CIBIL score check kiya tha, usme koi problem nahi thi.",
        "Police station mein complaint karni chahiye kya?",
        "Aapki voice recording kar raha hoon, agar fraud nikla toh court mein jayega.",
        "Maine pehle kabhi aapka call nahi liya.",
        "Official proof dikhao tab baat karenge.",
        "Bank ka toll-free number batao, main wahan se puchhunga.",
        "Aapka ID card photo bhejo pehle."
      ]
    },
    {
      keywords: ["link", "click", "website", "portal", "http", "www", "online", "login"],
      replies: [
        "Link nahi khol sakta beta, virus aa jayega.",
        "Beta bola hai bank ki link sirf official app se open karo.",
        "Website kaunsi hai? SBI.in ya sbi.co.in?",
        "Link pe click karne se kya hoga? Account secure ho jayega?",
        "Eyesight kamzor hai, chhota text padh nahi sakta.",
        "WhatsApp pe aaya tha link, main delete kar diya.",
        "Beta ne mana kiya hai links click karne se.",
        "Internet slow hai, link load nahi hoga.",
        "Agar link fake nikla toh mera account hack ho jayega.",
        "Bank ki official website ka URL kya hai? Google pe check karta hoon.",
        "Link forward karo, beta ko bhejta hoon woh check karega.",
        "Aaj kal phishing links bahut hain, verify karke batao.",
        "Mouse nahi chal raha, touchscreen se click nahi ho raha.",
        "Bank ne SMS bheja hai kya link? Maine toh koi SMS nahi dekha.",
        "SSL certificate hai kya website pe? Safe hai ya nahi?",
        "Link copy karke bhejo, grandson ko forward kar dunga.",
        "Virus protection software install nahi hai phone pe.",
        "Beta Sunday ko aayega, usse link check karaunga.",
        "Password bhool gaya hoon login ka.",
        "Screenshot bhej do, main dekhta hoon."
      ]
    },
    {
      keywords: ["personal", "details", "information", "aadhar", "pan", "document", "id proof", "photo", "signature"],
      replies: [
        "Personal details nahi de sakta bhaiya, risky hai.",
        "Aadhar number confidential hai, bank ke alawa kisi ko nahi batana.",
        "PAN card copy bank ke paas hai, maine ghar pe nahi rakhi.",
        "Last time details diye the, spam calls aane lage.",
        "Beta ne kaha hai kisi ko documents mat bhejna WhatsApp pe.",
        "Original documents locker mein hain, ghar pe nahi hain.",
        "Digital signature kya hota hai? Main toh hath se sign karta hoon.",
        "Documents verify karne notary ke paas jaana padega.",
        "Aadhar linked hai bank account se, kya problem hai?",
        "KYC already complete hai, phir kyun details maang rahe ho?",
        "Bank ne kaha tha documents update karne 5 saal baad aana.",
        "Photo kheench ke bhejna hai kya? Camera quality achi nahi hai.",
        "Address proof kya chahiye? Electricity bill ya ration card?",
        "Agar details chahiye toh bank application form bhejo.",
        "Meri age 65 hai, retirement ho gaya.",
        "Address change hua hai, abhi update nahi kiya.",
        "Biometric nahi hai mere paas, fingerprint fail ho gaya.",
        "Passport hai par expire ho gaya hai, renew karna hai.",
        "Notary karvana padega kya? 500 rupee lagte hain.",
        "Beta manage karta hai sab documents, usse puchhunga."
      ]
    },
    {
      keywords: ["transaction", "payment", "transfer", "money", "paise", "paisa", "amount", "rupees", "₹"],
      replies: [
        "Kisne transaction kiya? Main toh kuch nahi kiya aaj.",
        "Transaction amount kitna hai? 50,000 ya 1 lakh?",
        "Kahan transfer hua paisa? Account number batao.",
        "Maine koi NEFT nahi kiya, cash withdrawal bhi nahi kiya.",
        "Transaction date kab hai? Aaj subah ya raat ko?",
        "Mera passbook update nahi hai, transaction verify kaise karoon?",
        "Beta ne kuch transfer kiya hai kya? Usse puchhunga.",
        "Agar fraud transaction hai toh FIR karni padegi.",
        "Transaction ID kya hai? SMS mein bhejo.",
        "Bank reversal kar sakta hai kya fraud transaction ka?",
        "3D secure password diya tha kya transaction ke liye?",
        "Mera account savings hai, daily limit 50,000 hai.",
        "Overseas transaction hua hai kya? Main toh India mein hoon.",
        "Pension aaya hai bas, usme se kya len den?",
        "Credit card bill aaya hai, uspe focus kar raha hoon.",
        "Grandson ka school fee dena hai, paise tight hain.",
        "Cash hai ghar pe, bank mein bahut nahi hai.",
        "Wife paise manage karti hai, usse puchhunga.",
        "Fixed deposit hai, woh toh 3 saal baad khulega.",
        "Medical bill bharna hai is month, paise nahi hai extra."
      ]
    },
    {
      keywords: ["call", "phone", "number", "contact", "ring", "dial", "mobile", "whatsapp", "message"],
      replies: [
        "Call kar do? Par aapka number private aa raha hai.",
        "Bank ka official number konsa hai? 1800-1234 wala?",
        "Beta ka number do, usse baat karwa do.",
        "Landline pe baat karo, mobile pe network nahi hai.",
        "Hearing problem hai, zor se bolo ya WhatsApp message bhejo.",
        "Phone balance nahi hai, main call back karta hoon.",
        "Agar important hai toh WhatsApp call karo.",
        "Evening 7 baje call karna, abhi busy hoon.",
        "Call recording kar raha hoon, aage bolo.",
        "Network problem hai, baat saaf sunai nahi de rahi.",
        "Roaming charge lag rahe hain, incoming free hai na?",
        "Phone service center mein hai, repair kar rahe hain.",
        "Dual SIM phone hai, konsi SIM pe call aaya?",
        "Voice message bhej do, baad mein sunta hoon.",
        "Wife phone utha legi, main driving sik raha hoon.",
        "Grandson ne naya number diya hai, woh try karo.",
        "WhatsApp pe message bhej do, call expensive hai.",
        "Hearing aid lagana hai pehle, sunai nahi deta.",
        "Aaj kal spam calls bahut aate hain, verify karo pehle.",
        "Beta IT mein hai, usse technical help leni padegi."
      ]
    },
    {
      keywords: ["verify", "confirm", "authenticate", "secure", "validate", "check", "proof"],
      replies: [
        "Kaise verify karoon? Aapka proof kya hai?",
        "Employee ID bhejo, main bank se confirm kar leta hoon.",
        "Verification code bhejo official email ya SMS se.",
        "Maine koi verification request nahi ki, toh aap kaise aaye?",
        "Face-to-face verify karna chahiye, phone pe nahi.",
        "Beta se puchh kar verify karta hoon, woh IT mein hai.",
        "Bank manager se baat karwao, main unse verify kar leta hoon.",
        "Agar account secure karna hai toh branch mein jaana padega.",
        "Verification ke liye biometrics lena padega na?",
        "Meri signature verify karni hai kya? Original sign branch mein hai.",
        "Aapka ID card photo bhejo pehle.",
        "Bank ka official stamp hona chahiye verification pe.",
        "Meri beti SBI mein hai, usse puchh kar batata hoon.",
        "Cyber crime wale number pe call karna chahiye kya?",
        "Police verification karni padegi kya?",
        "Aapka accent verify nahi ho raha, konsi branch se ho?",
        "Video call karo, face verify kar leta hoon.",
        "Notary verify karna padega kya?",
        "Bank statement bhejo verification ke liye.",
        "Maine CIBIL score check kiya tha, sab theek tha."
      ]
    }
  ];
  
  for (const category of responses) {
    if (category.keywords.some(keyword => lowerMsg.includes(keyword))) {
      const available = category.replies.filter(reply => !lastReplies.includes(reply));
      return available.length > 0 ? available[Math.floor(Math.random() * available.length)] : category.replies[Math.floor(Math.random() * category.replies.length)];
    }
  }
  
  // 🎯 DEFAULT NATURAL RESPONSES
  const defaults = [
    "Samjha nahi bhaiya, thoda detail mein batao?",
    "Kya matlab? Phir se samjhao zara.",
    "Aap kaun ho? Kaise pata chala mera number?",
    "Beta se puchh kar batata hoon, woh aayega shaam ko.",
    "Thoda wait karo, phone pakad raha hoon.",
    "Ye technical baat hai, main nahi samjhta.",
    "Mujhe lagta hai galat number hai.",
    "Phone thik se sunai nahi de raha, phir bolo.",
    "Aaj kal bahut aise calls aate hain, verify karna padega.",
    "Maine aisa pehle kabhi nahi suna.",
    "Kya problem hai batao?",
    "Main retire ho gaya hoon, ye sab samajh nahi aata.",
    "Daughter aayegi usse puchhunga.",
    "TV serial chal raha hai, uske baad baat karte hain.",
    "Headache ho raha hai, kal baat karte hain.",
    "Network issue aa raha hai, message bhej do.",
    "Phone charging pe hai, baad mein call karta hoon.",
    "Ration lene jaana hai, 10 minute baad.",
    "Doctor ke paas jaana hai, time nahi hai abhi.",
    "Meri age 65 hai, ye sab dimaag mein nahi jaata."
  ];
  
  const availableDefaults = defaults.filter(reply => !lastReplies.includes(reply));
  return availableDefaults.length > 0 ? availableDefaults[Math.floor(Math.random() * availableDefaults.length)] : "Samjha nahi, phir bhejo.";
};

// 🚪 EXIT REPLY
const exitReply = () => {
  const exits = [
    "Main bank jaakar hi verify karunga.",
    "Beta aa gaya hai, woh baat karega.",
    "Abhi time nahi hai, kal subah baat karenge.",
    "Doctor ke paas jaana hai, baad mein.",
    "Network issue aa raha hai, phone band karna padega.",
    "Phone battery low hai, charge karna hai.",
    "Mujhe lagta hai galat number hai, bye.",
    "TV serial shuru ho gaya hai, baad mein.",
    "Grandson aa gaya hai, uske saath busy hoon.",
    "Headache ho raha hai, rest karna hai."
  ];
  return exits[Math.floor(Math.random() * exits.length)];
};
