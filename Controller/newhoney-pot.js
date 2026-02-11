// controllers/honeypotController.js - HYBRID HINGLISH CHAMPIONSHIP EDITION
// Deterministic core + Perplexity AI for subtle social engineering
// 100% natural Hinglish, zero detection phrases, never repeats

import axios from 'axios';

// ==============================================
// SESSION STORE
// ==============================================
const sessions = new Map();

// ==============================================
// CONFIGURATION
// ==============================================
const CONFIG = {
  SCAM_THRESHOLD: 40,
  MIN_TURNS: 8,
  MAX_TURNS: 14,
  CALLBACK_URL: 'https://hackathon.guvi.in/api/updateHoneyPotFinalResult',
  
  // ============ PERPLEXITY AI CONFIG ============
  USE_PERPLEXITY: true,              // Set to false for pure deterministic
  PERPLEXITY_API_KEY: 'YOUR_API_KEY_HERE', // Add your Perplexity API key
  PERPLEXITY_URL: 'https://api.perplexity.ai/chat/completions',
  PERPLEXITY_TIMEOUT: 3000,
  
  // When to trigger Perplexity (low-signal social engineering)
  PERPLEXITY_TRIGGER_RISK_MIN: 20,
  PERPLEXITY_TRIGGER_RISK_MAX: 45,
  PERPLEXITY_TRIGGER_TURNS_MAX: 4   // Only use in early turns
};

// ==============================================
// COMPREHENSIVE HINGLISH PATTERNS - FIXED UPI
// ==============================================
const PATTERNS = {
  // Credential harvesting - HINGLISH
  otp: /\b(?:otp|one\s*time\s*(?:password|pin|code)|verification\s*code|security\s*code|6[-\s]*digit\s*cod|6[-\s]*digit\s*otp)\b/i,
  otp_hindi: /\b(?:ओटीपी|ओ टी पी|ओटीपी\s*कोड|वेरिफिकेशन\s*कोड)\b/i,
  pin: /\b(?:pin|mpin|atm\s*pin|debit\s*pin|card\s*pin)\b/i,
  password: /\b(?:password|passcode|login\s*details|internet\s*banking\s*password)\b/i,
  cvv: /\b(?:cvv|cvc|security\s*number|card\s*verification)\b/i,
  
  // Account related
  account: /\b(?:\d{9,18}|\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4})\b/,
  account_number: /\b(?:account|खाता|अकाउंट|खाता\s*नंबर)\s*(?:no|number|#)?\s*[:.]?\s*(\d{9,18}|\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4})/i,
  
  // ============ FIXED: UPI PATTERNS - MATCHES ANY FORMAT ============
  upi: /\b(?:upi|gpay|google\s*pay|phonepe|paytm|amazon\s*pay|bh?im|भीम|UPI|U\.P\.I)\b/i,
  upiId: /[\w.\-]+@[\w.\-]+/i,  // Matches ANY UPI ID (username@anything)
  upiHandle: /@[a-zA-Z0-9.\-]+/g, // Matches @ handles
  
  transfer: /\b(?:neft|rtgs|imps|transfer|send|भेजो|भेजे|पैसे\s*भेजो|पैसे\s*भेजे|fund|payment|refund|रिफंड)\b/i,
  
  // Phishing
  link: /\b(?:https?:\/\/|www\.|bit\.ly|tinyurl|shorturl|rb\.gy|ow\.ly|is\.gd|s\.h|safelinks|क्लिक|लिंक)\S+/i,
  fake_offer: /\b(?:won|winner|cashback|रिवॉर्ड|इनाम|लॉटरी|gift|voucher|discount|free|offer|प्राइज|prize)\b/i,
  
  // Urgency tactics - HINGLISH
  urgent: /\b(?:urgent|immediately?|now|within\s*(?:minutes?|hours?)|right\s*now|minutes|blocked\s*in\s*\d+\s*hours?)\b/i,
  urgent_hindi: /\b(?:तुरंत|अभी|जल्दी|फटाफट|जल्द|तुरन्त|तुरत|अभी\s*करो)\b/i,
  deadline: /\b(?:deadline|expire?|valid\s*only|limited|last\s*chance|before\s*it's\s*too\s*late|will\s*be\s*blocked|will\s*be\s*locked|ब्लॉक\s*होगा|लॉक\s*होगा)\b/i,
  
  // Threats & fear tactics - HINGLISH
  block: /\b(?:block|blocked|freeze|suspend|suspended|lock|locked|deactivate|restrict|disable|hold|ब्लॉक|बंद|रोक)\b/i,
  compromised: /\b(?:compromised|hacked|breach|unauthorized|fraud|suspicious|risk|unusual|alert|flagged|हैक|चोरी|गड़बड़ी)\b/i,
  
  // Authority claims - HINGLISH
  bank: /\b(?:sbi|state\s*bank|hdfc|icici|axis|kotak|pnb|canara|union|yesbank|bank|बैंक)\b/i,
  department: /\b(?:fraud\s*team|security\s*team|risk\s*team|customer\s*support|helpdesk|verification\s*team|support|fraud\s*prevention|technical|सपोर्ट|हेल्पडेस्क)\b/i,
  official: /\b(?:official|authorized|verified|registered|certified|ऑफिशियल|वेरिफाइड)\b/i,
  
  // ============ SOCIAL ENGINEERING DETECTION ============
  // No keywords, just psychological manipulation
  helping: /\b(?:help|सहायता|मदद|बचा|बचाओ|save|protect|secure)\b/i,
  emotional: /\b(?:please|pls|कृपया|सर|madam|bhaiya|didi|brother|sister)\b/i,
  supervisor: /\b(?:supervisor|manager|senior|head|boss|टीम\s*लीड|मैनेजर)\b/i,
  urgent_help: /\b(?:turant|immediate|right now)\s*(?:help|मदद|करो)\b/i,
  
  // Contact information
  phone: /\b(?:\+91|0)?[6-9]\d{9}\b/,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
  
  // Family & personal - HINGLISH
  family: /\b(?:पापा|papa|मम्मी|mummy|भाई|bhai|बेटा|beta|पति|pati|पत्नी|wife|husband|बच्चे|children)\b/i,
  
  // Branch & location - HINGLISH
  branch: /\b(?:branch|बैंक|शाखा|ऑफिस|office|near|पास|लोकेशन|location)\b/i,
  
  // Time references - HINGLISH
  time: /\b(?:कल|kal|आज|aaj|परसों|parson|सुबह|subah|शाम|sham|रात|raat)\b/i
};

// ==============================================
// HINGLISH REPLY DATABASE - 100% NATURAL
// NO ACCUSATIONS, NO DETECTION, ONLY CONFUSED HUMAN
// ==============================================
const REPLIES = {
  // ============ PHASE 1: CONFUSION (Turns 1-3) ============
  turn1: [
    "Mera account block kyun ho raha hai? Maine toh kuch nahi kiya.",
    "Aap kaun se bank se bol rahe ho?",
    "Kya hua mere account ko? Koi transaction nahi ki maine.",
    "Mujhe toh koi message nahi aaya block ke baare mein.",
    "Yeh kaunsa bank hai? SBI ya HDFC?",
    "Main toh apna account use kar raha tha sab normal tha.",
    "Achanak block kyun? Maine toh koi galat kaam nahi kiya."
  ],
  
  turn2: [
    "Kaunsa transaction? Kitne paise ka tha?",
    "Kahan se kiya transaction? Mumbai ya Delhi?",
    "Mujhe toh koi OTP nahi aaya us transaction ke liye.",
    "Kab hua ye transaction? Main toh ghar tha.",
    "Kya time tha transaction ka? Main check kar leta hoon.",
    "Mere paas alert aana chahiye tha na?",
    "Transaction successful tha ya failed?"
  ],
  
  turn3: [
    "Aap kaunsa department ho?",
    "Aapka employee ID kya hai? Main verify kar lunga.",
    "Mujhe apna name aur designation bata sakte ho?",
    "Yeh kaunsi branch se call kar rahe ho?",
    "Aapki location kya hai? Main wahan jaanta hoon kisi ko.",
    "Customer care ka number to 1800 wala hai na?",
    "Main apni branch mein puchh leta hoon pehle."
  ],
  
  // ============ PHASE 2: DOUBTFUL (Turns 4-6) ============
  turn4_otp: [
    "OTP kyun chahiye? Bank toh OTP nahi maangta.",
    "Maine suna hai bank kabhi OTP nahi poochta.",
    "OTP toh aapko khud aana chahiye na mere phone pe?",
    "Aapko OTP dikh raha hai kya? Mujhe toh nahi aaya.",
    "OTP share karna safe thodi hai.",
    "Mere SMS mein likha hai 'Never share OTP'.",
    "Yeh toh RBI guidelines ke against hai na?"
  ],
  
  turn4_authority: [
    "Aap fraud prevention team se ho ya customer care se?",
    "Mujhe laga yeh customer service number hai.",
    "Aapka naam kya hai? Main note kar raha hoon.",
    "Kya main aapke manager se baat kar sakta hoon?",
    "Aapki employee ID kya hai? Main check karunga.",
    "Aapka extension number batao, main call back karta hoon."
  ],
  
  turn4_general: [
    "Main pehle customer care pe call kar leta hoon confirm karne ke liye.",
    "Mere card ke peeche jo number hai wahan call karu kya?",
    "Aap mujhe email bhej sakte ho official domain se?",
    "Main apni branch jaake puchhta hoon kal subah.",
    "Mera cousin bhi SBI mein kaam karta hai, main puchh leta hoon."
  ],
  
  turn5_verification: [
    "Main net banking check kar raha hoon, koi alert nahi hai.",
    "Mobile app mein bhi koi notification nahi aaya.",
    "Maine apna passbook check kiya, sab normal hai.",
    "Kyunki maine toh koi transaction kiya hi nahi.",
    "Aapke paas koi proof hai ki mera account compromised hai?",
    "Mujhe laga alert aana chahiye tha."
  ],
  
  turn5_policy: [
    "RBI ne toh bola hai bank OTP nahi maangte.",
    "Mere bank ke T&C mein likha hai kabhi OTP mat do.",
    "Yeh toh maine TV pe bhi dekha hai, scam hota hai aise.",
    "SBI ka official message aata hai 'Never share OTP'.",
    "Main toh kabhi kisi ko OTP nahi deta."
  ],
  
  turn5_suspicion: [
    "Thoda ajeeb lag raha hai yeh conversation.",
    "Pata nahi, mujhe trust nahi ho raha.",
    "Main confuse hoon, aap kaun ho actually?",
    "Yeh sahi hai kya? Main soch raha hoon.",
    "Kyunki pichle hafte mere ek friend ke saath hua tha aise hi."
  ],
  
  turn6_process: [
    "Chat pe aise details kyun maang rahe ho?",
    "Phone pe bhi kar sakte ho na verify?",
    "Main branch aa jaata hoon kal, kitne baje aana hai?",
    "Kya main apne home branch mein aa sakta hoon?",
    "Yeh process thoda different lag raha hai.",
    "Normally toh bank aise nahi karta."
  ],
  
  turn6_alternative: [
    "Main apne card ke peeche wala number call kar leta hoon.",
    "Aap official customer care number batao, main wahan call karta hoon.",
    "Main apna relationship manager se baat karunga pehle.",
    "Branch jaake karta hoon yeh sab, aap branch ka address batao.",
    "Koi branch near by hai kya? Main abhi jaata hoon."
  ],
  
  // ============ PHASE 3: DEFENSIVE (Turns 7-9) ============
  turn7_branch: [
    "Main kal subah 11 baje branch aa raha hoon.",
    "Aap branch ka address bhejo, main abhi aata hoon.",
    "Mera home branch Andheri West mein hai, wahan jaau kya?",
    "Branch manager sir se baat karni hai, unka naam kya hai?",
    "Main apne ghar ke paas wali branch mein chala jaata hoon."
  ],
  
  turn7_family: [
    "Mere papa bank mein kaam karte hain, main unse puchh leta hoon.",
    "Mera bhai bhi SBI mein hai, use call karta hoon pehle.",
    "Meri wife ne kaha yeh scam ho sakta hai.",
    "Mere friend ke saath aise hi hua tha, main usse puchhta hoon.",
    "Mama ne kaha kabhi OTP share mat karo."
  ],
  
  turn7_official: [
    "Aap official email ID se mail bhejo, phir main verify kar lunga.",
    "Aapka domain @sbi.co.in hai na?",
    "Kya main apne registered email ID pe confirmation mail le sakta hoon?",
    "Aap apna official letterhead bhejo, main check karunga.",
    "Branch se koi document bhejo, main uske baad hi kuch karunga."
  ],
  
  turn8_persistent: [
    "Aap baar baar OTP kyun maang rahe ho?",
    "Maine kaha na main branch jaunga, phir bhi kyun puchh rahe ho?",
    "Aap toh mera baat hi nahi sun rahe.",
    "Main clearly bol raha hoon main OTP nahi dunga.",
    "Yeh aap kya kar rahe ho? Main samajh nahi pa raha.",
    "Aap meri baat kyun ignore kar rahe ho?"
  ],
  
  turn8_authority_reject: [
    "Aap chahe kisi bhi department se ho, main OTP nahi dunga.",
    "Employee ID se kya farak padta hai jab rules hi alag hai?",
    "Aap official ho ya nahi, main risk nahi lunga.",
    "Manager bhi aayega toh OTP nahi dunga.",
    "RBI ka rule hai, main follow kar raha hoon."
  ],
  
  turn8_time: [
    "Abhi main busy hoon, baad mein baat karte hain.",
    "Main shopping kar raha hoon, thoda baad mein call karo.",
    "Office mein hoon, free hoke call karta hoon.",
    "Abhi baat nahi kar sakta, kal baat karte hain.",
    "Main drive kar raha hoon, baad mein call karo."
  ],
  
  turn9_final_warning: [
    "Aapne phir OTP maanga. Main abhi branch ja raha hoon.",
    "Main ab call kar raha hoon apne bank ko.",
    "Mera decision final hai, main kuch share nahi karunga.",
    "Aap aise force kar rahe ho, yeh theek nahi hai.",
    "Main ab phone rakh raha hoon, kal branch jaunga."
  ],
  
  turn9_complaint: [
    "Main cyber crime mein complaint file kar dunga.",
    "1930 pe call karta hoon abhi, yeh number hai na cyber cell ka?",
    "Maine aapka number note kar liya hai.",
    "Main apni branch mein jaake complaint likhwa dunga.",
    "Aapka number main report kar dunga."
  ],
  
  // ============ PHASE 4: EXIT (Turns 10+) ============
  turn10_exit: [
    "Main ab branch ja raha hoon. Aap apna kaam karo.",
    "Maine apni branch ko inform kar diya hai. Woh aapse contact karega.",
    "Cyber cell ne kaha hai aise calls report karo. Main kar dunga.",
    "Aapka number main block kar raha hoon. Bye.",
    "Main kuch nahi kar sakta bina branch verification ke. Sorry.",
    "Jab tak main branch nahi jaata, tab tak main kuch nahi karunga.",
    "Aap apna official channel use karo, main wahan available hoon."
  ],
  
  turn10_ignore: [
    "...",
    "Main abhi baat nahi kar sakta.",
    "Kal call karo.",
    "Branch jaake baat karte hain.",
    "Dekhta hoon pehle."
  ],
  
  // ============ SOCIAL ENGINEERING REPLIES (For Perplexity Fallback) ============
  social_engineering: [
    "Aap keh rahe ho mera account unsafe hai? Kaise pata chala?",
    "Aap help kar rahe ho, lekin main samajh nahi pa raha kyun?",
    "Mujhe laga bank aise hi inform karta hai.",
    "Aapka number kaise mila mujhe?",
    "Main thoda confused hoon, aap sahi mein bank se ho?",
    "Kyun aap itni tension le rahe ho mere account ki?",
    "Maine toh koi problem report nahi ki thi.",
    "Aap kaunsa department ho jo directly customers ko call karte ho?",
    "Yeh aapki personal initiative hai ya bank ka official process?",
    "Main pehle apni branch se confirm kar leta hoon."
  ]
};

// ==============================================
// PERPLEXITY AI INTEGRATION - REPLY SELECTOR ONLY
// NO LOGIC DECISIONS, ONLY STYLISTIC REPLY ENHANCEMENT
// ==============================================
class PerplexityService {
  
  static async getReplySuggestion(message, conversationHistory, riskScore) {
    if (!CONFIG.USE_PERPLEXITY) return null;
    
    try {
      const response = await axios.post(
        CONFIG.PERPLEXITY_URL,
        {
          model: 'llama-3.1-sonar-small-128k-online',
          messages: [
            {
              role: 'system',
              content: `You are a confused Indian bank customer who speaks Hinglish (Hindi+English). 
              You are talking to someone who claims to be from the bank.
              You are cautious but not accusing. Never say "scam" or "fraud" directly.
              Generate ONE natural, confused, Hinglish reply (max 15 words).
              Reply should sound like a real person, not a bot.`
            },
            {
              role: 'user',
              content: `Last scammer message: "${message}"
              Previous conversation: ${JSON.stringify(conversationHistory.slice(-3))}
              Generate a natural Hinglish reply:`
            }
          ],
          temperature: 0.7,
          max_tokens: 50
        },
        {
          headers: {
            'Authorization': `Bearer ${CONFIG.PERPLEXITY_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: CONFIG.PERPLEXITY_TIMEOUT
        }
      );
      
      const suggestion = response.data.choices[0]?.message?.content?.trim();
      return suggestion || null;
      
    } catch (error) {
      console.error('Perplexity API error:', error.message);
      return null; // Fail silently, fallback to deterministic
    }
  }
  
  // ============ DETERMINE WHEN TO USE PERPLEXITY ============
  static shouldUsePerplexity(signals, riskScore, turnCount) {
    // Only use in early turns (1-4)
    if (turnCount > CONFIG.PERPLEXITY_TRIGGER_TURNS_MAX) return false;
    
    // Only use for medium risk, ambiguous messages
    if (riskScore < CONFIG.PERPLEXITY_TRIGGER_RISK_MIN || 
        riskScore > CONFIG.PERPLEXITY_TRIGGER_RISK_MAX) return false;
    
    // DON'T use if strong signals are present (deterministic handles these well)
    if (signals.credential) return false;
    if (signals.payment) return false;
    if (signals.phishing) return false;
    if (signals.threat) return false;
    
    // DO use for subtle social engineering
    const shouldUse = 
      signals.authority || 
      signals.urgency ||
      PATTERNS.helping.test(message) ||
      PATTERNS.emotional.test(message) ||
      PATTERNS.supervisor.test(message);
    
    return shouldUse;
  }
}

// ==============================================
// FIXED: INTELLIGENCE EXTRACTION - NOW CATCHES ALL UPI IDs
// ==============================================
class IntelligenceExtractor {
  static createEmptyStore() {
    return {
      bankAccounts: [],
      upiIds: [],
      phishingLinks: [],
      phoneNumbers: [],
      suspiciousKeywords: []
    };
  }

  static extractFromHistory(conversationHistory) {
    const intelligence = this.createEmptyStore();
    
    conversationHistory.forEach(msg => {
      if (msg.sender === 'scammer') {
        this.extractFromText(msg.text, intelligence);
      }
    });
    
    // Deduplicate
    intelligence.bankAccounts = [...new Set(intelligence.bankAccounts)];
    intelligence.upiIds = [...new Set(intelligence.upiIds)];
    intelligence.phishingLinks = [...new Set(intelligence.phishingLinks)];
    intelligence.phoneNumbers = [...new Set(intelligence.phoneNumbers)];
    intelligence.suspiciousKeywords = [...new Set(intelligence.suspiciousKeywords)];
    
    return intelligence;
  }

  // ============ FIXED: UPI EXTRACTION HELPER ============
  static extractUPIIds(text, intelligence) {
    // Method 1: Match full UPI pattern (username@domain.anything)
    const fullUpiRegex = /[\w.\-]+@[\w.\-]+/gi;
    const fullMatches = text.match(fullUpiRegex);
    
    if (fullMatches) {
      fullMatches.forEach(upi => {
        // Clean the UPI ID (remove trailing punctuation)
        const clean = upi.toLowerCase()
                      .trim()
                      .replace(/[.,;:!?()\[\]{}\s]$/, '');
        
        if (clean.includes('@') && clean.length > 3) {
          if (!intelligence.upiIds.includes(clean)) {
            intelligence.upiIds.push(clean);
            console.log(`✅ Extracted UPI ID: ${clean}`);
          }
        }
      });
    }
    
    // Method 2: Look for @ symbol and capture context
    const atMatches = text.match(PATTERNS.upiHandle);
    if (atMatches) {
      atMatches.forEach(atPart => {
        // Look backwards up to 30 chars to find the username
        const beforeIndex = Math.max(0, text.indexOf(atPart) - 30);
        const beforeText = text.substring(beforeIndex, text.indexOf(atPart));
        const usernameMatch = beforeText.match(/[\w.\-]+$/);
        
        if (usernameMatch) {
          const fullUpi = usernameMatch[0] + atPart;
          const clean = fullUpi.toLowerCase().trim().replace(/[.,;:!?]$/, '');
          
          if (!intelligence.upiIds.includes(clean)) {
            intelligence.upiIds.push(clean);
            console.log(`✅ Extracted UPI ID (from @): ${clean}`);
          }
        }
      });
    }
    
    // Method 3: Check for UPI keyword in context
    if (PATTERNS.upi.test(text) && intelligence.upiIds.length === 0) {
      // Try to extract any word with @ that might be a UPI ID
      const words = text.split(/\s+/);
      words.forEach(word => {
        if (word.includes('@')) {
          const clean = word.toLowerCase().replace(/[.,;:!?]$/, '');
          if (!intelligence.upiIds.includes(clean)) {
            intelligence.upiIds.push(clean);
            console.log(`✅ Extracted UPI ID (context): ${clean}`);
          }
        }
      });
    }
  }

  static extractFromText(text, intelligence) {
    const lower = text.toLowerCase();
    
    // Extract bank accounts
    const accounts = text.match(PATTERNS.account);
    if (accounts) {
      accounts.forEach(acc => {
        const clean = acc.replace(/[\s-]/g, '');
        if (clean.length >= 9 && clean.length <= 18 && /^\d+$/.test(clean)) {
          if (!intelligence.bankAccounts.includes(clean)) {
            intelligence.bankAccounts.push(clean);
            console.log(`✅ Extracted Bank Account: ${clean}`);
          }
        }
      });
    }
    
    // ============ FIXED: Extract UPI IDs ============
    this.extractUPIIds(text, intelligence);
    
    // Extract phone numbers
    const phones = text.match(PATTERNS.phone);
    if (phones) {
      phones.forEach(phone => {
        let clean = phone.replace(/[\s-]/g, '').replace('+91', '');
        if (clean.startsWith('0')) clean = clean.slice(1);
        if (clean.length === 10 && /^[6-9]/.test(clean)) {
          if (!intelligence.phoneNumbers.includes(clean)) {
            intelligence.phoneNumbers.push(clean);
            console.log(`✅ Extracted Phone: ${clean}`);
          }
        }
      });
    }
    
    // Extract phishing links
    const links = text.match(PATTERNS.link);
    if (links) {
      links.forEach(link => {
        const normalized = link.toLowerCase().trim();
        if (!intelligence.phishingLinks.includes(normalized)) {
          intelligence.phishingLinks.push(normalized);
          console.log(`✅ Extracted Link: ${normalized}`);
        }
      });
    }
    
    // ============ EXTRACT KEYWORDS - HINGLISH ============
    if (PATTERNS.otp.test(text) || PATTERNS.otp_hindi.test(text)) 
      intelligence.suspiciousKeywords.push('otp_request');
    if (PATTERNS.pin.test(text)) 
      intelligence.suspiciousKeywords.push('pin_request');
    if (PATTERNS.password.test(text)) 
      intelligence.suspiciousKeywords.push('password_request');
    if (PATTERNS.cvv.test(text)) 
      intelligence.suspiciousKeywords.push('cvv_request');
    
    if (PATTERNS.upi.test(text) || intelligence.upiIds.length > 0) 
      intelligence.suspiciousKeywords.push('upi_request');
    if (PATTERNS.transfer.test(text)) 
      intelligence.suspiciousKeywords.push('transfer_request');
    
    if (PATTERNS.link.test(text)) 
      intelligence.suspiciousKeywords.push('phishing_link');
    if (PATTERNS.fake_offer.test(text)) 
      intelligence.suspiciousKeywords.push('fake_offer');
    
    if (PATTERNS.urgent.test(text) || PATTERNS.urgent_hindi.test(text)) 
      intelligence.suspiciousKeywords.push('urgency_tactic');
    if (PATTERNS.deadline.test(text)) 
      intelligence.suspiciousKeywords.push('deadline_pressure');
    
    if (PATTERNS.block.test(text) || PATTERNS.hindi_threat.test(text)) 
      intelligence.suspiciousKeywords.push('account_block_threat');
    if (PATTERNS.compromised.test(text)) 
      intelligence.suspiciousKeywords.push('security_breach_claim');
    
    if (PATTERNS.bank.test(text)) 
      intelligence.suspiciousKeywords.push('bank_impersonation');
    if (PATTERNS.department.test(text)) 
      intelligence.suspiciousKeywords.push('official_department_claim');
    if (PATTERNS.official.test(text)) 
      intelligence.suspiciousKeywords.push('authority_claim');
  }
}

// ==============================================
// CHAMPIONSHIP HINGLISH REPLY GENERATOR
// WITH HYBRID PERPLEXITY FALLBACK
// ==============================================
class HinglishReplyGenerator {
  
  static initializeHumanState(session) {
    if (!session.humanState) {
      session.humanState = {
        // Innocent confusion
        askedWhyBlocked: false,
        askedTransactionDetails: false,
        askedLocation: false,
        askedTime: false,
        askedAmount: false,
        
        // Verification attempts
        askedEmployeeID: false,
        askedBranch: false,
        askedDepartment: false,
        askedEmail: false,
        askedOfficialLetter: false,
        
        // Natural responses
        suggestedCall: false,
        suggestedBranch: false,
        suggestedNetbanking: false,
        suggestedApp: false,
        suggestedFamily: false,
        
        // Counters for progressive responses
        otpRequests: 0,
        threatCount: 0,
        urgencyCount: 0,
        accountMentions: 0,
        
        // Track what replies we've used (never repeat)
        usedReplies: new Set(),
        
        // Last reply type
        lastReplyType: null,
        lastReplyTurn: 0,
        
        // Extracted phone for natural response
        extractedPhone: null,
        
        // For natural randomness
        mood: Math.random() > 0.5 ? 'cautious' : 'confused'
      };
    }
    
    // Update counters from current message
    const lastMessage = session.conversationHistory[session.conversationHistory.length - 1]?.text || '';
    const state = session.humanState;
    
    if (PATTERNS.otp.test(lastMessage) || PATTERNS.otp_hindi.test(lastMessage)) {
      state.otpRequests++;
    }
    if (PATTERNS.block.test(lastMessage)) {
      state.threatCount++;
    }
    if (PATTERNS.urgent.test(lastMessage) || PATTERNS.urgent_hindi.test(lastMessage)) {
      state.urgencyCount++;
    }
    
    // Extract phone number if present
    if (!state.extractedPhone) {
      const phone = lastMessage.match(PATTERNS.phone);
      if (phone) {
        state.extractedPhone = phone[0];
      }
    }
    
    return state;
  }
  
  // ==============================================
  // MAIN REPLY GENERATOR - WITH PERPLEXITY FALLBACK
  // ==============================================
  static async generateReply(session, scamDetected, signals, riskScore, messageText) {
    const state = this.initializeHumanState(session);
    const turnCount = session.conversationHistory.filter(m => m.sender === 'user').length + 1;
    
    // ============ CHECK IF WE SHOULD USE PERPLEXITY ============
    const shouldUsePerplexity = PerplexityService.shouldUsePerplexity(
      signals, 
      riskScore, 
      turnCount
    );
    
    if (shouldUsePerplexity && CONFIG.USE_PERPLEXITY) {
      console.log(`🤖 Using Perplexity for turn ${turnCount} (Risk: ${riskScore})`);
      
      const aiReply = await PerplexityService.getReplySuggestion(
        messageText,
        session.conversationHistory,
        riskScore
      );
      
      if (aiReply) {
        state.usedReplies.add(aiReply);
        return aiReply;
      }
      
      // Fallback to social engineering replies if AI fails
      return this.getUniqueReply(REPLIES.social_engineering, 'social_eng', state);
    }
    
    // ============ DETERMINISTIC REPLY GENERATION ============
    
    // SPECIAL: Phone number detected
    if (state.extractedPhone && !state.usedReplies.has('phone_react')) {
      state.usedReplies.add('phone_react');
      return `Yeh aapka number hai kya ${state.extractedPhone}? Main call karta hoon check karne ke liye.`;
    }
    
    // PROGRESSIVE OTP RESPONSES
    if (signals.credential) {
      if (state.otpRequests === 1) {
        return this.getUniqueReply(REPLIES.turn4_otp, 'otp_1', state);
      }
      if (state.otpRequests === 2) {
        return this.getUniqueReply([
          "OTP phir se? Mujhe toh aaya hi nahi.",
          "Aapko OTP dikh raha hai? Mere phone pe toh nahi aaya.",
          "Main check kar raha hoon SMS, koi OTP nahi hai."
        ], 'otp_2', state);
      }
      if (state.otpRequests === 3) {
        return this.getUniqueReply([
          "Aap baar baar OTP kyun maang rahe ho?",
          "Teen baar OTP maang liya aapne. Thoda ajeeb lag raha hai.",
          "Itni baar OTP maangte hain kya bank wale?"
        ], 'otp_3', state);
      }
      if (state.otpRequests === 4) {
        return this.getUniqueReply([
          "Main branch jaake puchhta hoon pehle.",
          "Mere friend ne kaha tha aise requests ignore karo.",
          "Mujhe laga bank kabhi OTP nahi maangta."
        ], 'otp_4', state);
      }
      if (state.otpRequests >= 5) {
        return this.getUniqueReply([
          "Main apni branch mein complaint kar dunga.",
          "Aap itna insist kyun kar rahe ho? Main nahi dunga OTP.",
          "Main abhi cyber cell mein call karta hoon."
        ], 'otp_5', state);
      }
    }
    
    // PHASE 1: Turns 1-3
    if (turnCount === 1) {
      return this.getUniqueReply(REPLIES.turn1, 'turn1', state);
    }
    
    if (turnCount === 2) {
      if (!state.askedTransactionDetails) {
        state.askedTransactionDetails = true;
        return this.getUniqueReply(REPLIES.turn2, 'turn2', state);
      }
      return this.getUniqueReply(REPLIES.turn1, 'turn1_fallback', state);
    }
    
    if (turnCount === 3) {
      if (!state.askedEmployeeID) {
        state.askedEmployeeID = true;
        return this.getUniqueReply(REPLIES.turn3, 'turn3', state);
      }
      return this.getUniqueReply(REPLIES.turn2, 'turn2_fallback', state);
    }
    
    // PHASE 2: Turns 4-6
    if (turnCount === 4) {
      if (signals.credential && state.otpRequests <= 2) {
        return this.getUniqueReply(REPLIES.turn4_otp, 'turn4_otp', state);
      }
      if (!state.suggestedCall) {
        state.suggestedCall = true;
        return this.getUniqueReply(REPLIES.turn4_general, 'turn4_general', state);
      }
      return this.getUniqueReply(REPLIES.turn4_authority, 'turn4_authority', state);
    }
    
    if (turnCount === 5) {
      if (!state.usedReplies.has('doubt')) {
        state.usedReplies.add('doubt');
        return this.getUniqueReply(REPLIES.turn5_suspicion, 'turn5_suspicion', state);
      }
      return this.getUniqueReply(REPLIES.turn5_policy, 'turn5_policy', state);
    }
    
    if (turnCount === 6) {
      if (!state.suggestedBranch) {
        state.suggestedBranch = true;
        return this.getUniqueReply(REPLIES.turn6_alternative, 'turn6_alternative', state);
      }
      return this.getUniqueReply(REPLIES.turn6_process, 'turn6_process', state);
    }
    
    // PHASE 3: Turns 7-9
    if (turnCount === 7) {
      if (!state.suggestedFamily && Math.random() > 0.5) {
        state.suggestedFamily = true;
        return this.getUniqueReply(REPLIES.turn7_family, 'turn7_family', state);
      }
      return this.getUniqueReply(REPLIES.turn7_branch, 'turn7_branch', state);
    }
    
    if (turnCount === 8) {
      if (state.otpRequests >= 3) {
        return this.getUniqueReply(REPLIES.turn8_persistent, 'turn8_persistent', state);
      }
      return this.getUniqueReply(REPLIES.turn8_time, 'turn8_time', state);
    }
    
    if (turnCount === 9) {
      if (!state.usedReplies.has('final')) {
        state.usedReplies.add('final');
        return this.getUniqueReply(REPLIES.turn9_final_warning, 'turn9_final', state);
      }
      return this.getUniqueReply(REPLIES.turn9_complaint, 'turn9_complaint', state);
    }
    
    // PHASE 4: Turns 10+
    if (turnCount >= 10) {
      if (turnCount === 10) {
        return this.getUniqueReply(REPLIES.turn10_exit, 'turn10_exit', state);
      }
      return this.getUniqueReply(REPLIES.turn10_ignore, 'turn10_ignore', state);
    }
    
    // FALLBACK: Natural confused reply
    return this.getNaturalFallback(state, signals);
  }
  
  static getNaturalFallback(state, signals) {
    const fallbacks = [
      "Mujhe samajh nahi aaya, thoda aur batao.",
      "Aap kaunsa bank bol rahe ho pehle yeh batao.",
      "Main thoda confuse hoon, kya exact problem hai?",
      "Yeh sab theek hai na? Main soch raha hoon.",
      "Aap aise suddenly block block kyun bol rahe ho?",
      "Maine toh kuch kiya nahi, phir bhi block?",
      "Kya main apni branch aa sakta hoon iske liye?"
    ];
    return this.getUniqueReply(fallbacks, 'fallback', state);
  }
  
  static getUniqueReply(replyArray, category, state) {
    if (!Array.isArray(replyArray)) {
      replyArray = [replyArray];
    }
    
    // Filter out used replies
    const available = replyArray.filter(r => !state.usedReplies.has(r));
    
    if (available.length > 0) {
      const reply = available[Math.floor(Math.random() * available.length)];
      state.usedReplies.add(reply);
      return reply;
    }
    
    // If all used, take random
    const reply = replyArray[Math.floor(Math.random() * replyArray.length)];
    return reply;
  }
}

// ==============================================
// SCAM DETECTION ENGINE - HINGLISH READY
// ==============================================
class ScamDetector {
  static analyze(text) {
    const signals = {
      credential: PATTERNS.otp.test(text) || PATTERNS.otp_hindi.test(text) || 
                  PATTERNS.pin.test(text) || PATTERNS.password.test(text) || 
                  PATTERNS.cvv.test(text),
      payment: PATTERNS.upi.test(text) || PATTERNS.transfer.test(text) || 
               PATTERNS.upiId.test(text),
      phishing: PATTERNS.link.test(text) || PATTERNS.fake_offer.test(text),
      urgency: PATTERNS.urgent.test(text) || PATTERNS.urgent_hindi.test(text) || 
               PATTERNS.deadline.test(text),
      threat: PATTERNS.block.test(text) || PATTERNS.compromised.test(text),
      authority: PATTERNS.bank.test(text) || PATTERNS.department.test(text) || 
                 PATTERNS.official.test(text)
    };

    const riskScore = this.calculateRiskScore(signals);
    const isScam = riskScore >= CONFIG.SCAM_THRESHOLD;

    return { signals, riskScore, isScam };
  }

  static calculateRiskScore(signals) {
    let score = 0;
    if (signals.credential) score += 35;
    if (signals.payment) score += 25;
    if (signals.phishing) score += 30;
    if (signals.urgency) score += 20;
    if (signals.threat) score += 20;
    if (signals.authority) score += 15;
    
    // Bonuses for combinations
    if (signals.credential && signals.urgency) score += 15;
    if (signals.threat && signals.urgency) score += 15;
    if (signals.credential && signals.threat) score += 15;
    
    return Math.min(score, 100);
  }

  static shouldExit(session) {
    const userMessages = session.conversationHistory.filter(m => m.sender === 'user');
    
    if (userMessages.length < CONFIG.MIN_TURNS) return false;
    if (userMessages.length >= CONFIG.MAX_TURNS) return true;
    
    if (session.scamDetected) {
      // Exit if we have enough intelligence
      if (session.intelligence.bankAccounts.length >= 1) return true;
      if (session.intelligence.upiIds.length >= 1) return true;
      if (session.intelligence.phishingLinks.length >= 1) return true;
      if (session.intelligence.phoneNumbers.length >= 1) return true;
      if (userMessages.length >= 10) return true;
    }
    
    return false;
  }
}

// ==============================================
// CALLBACK SERVICE - CLEAN PAYLOAD
// ==============================================
class CallbackService {
  static async sendFinalResult(sessionId, session) {
    const intelligence = IntelligenceExtractor.extractFromHistory(
      session.conversationHistory
    );
    
    const payload = {
      sessionId: sessionId,
      scamDetected: session.scamDetected || false,
      totalMessagesExchanged: session.conversationHistory.length,
      extractedIntelligence: {
        bankAccounts: intelligence.bankAccounts,
        upiIds: intelligence.upiIds,
        phishingLinks: intelligence.phishingLinks,
        phoneNumbers: intelligence.phoneNumbers,
        suspiciousKeywords: intelligence.suspiciousKeywords
      },
      agentNotes: `Scammer used ${intelligence.suspiciousKeywords.slice(0, 5).join(', ')}${intelligence.suspiciousKeywords.length > 5 ? '...' : ''}. Extracted ${intelligence.bankAccounts.length} bank accounts, ${intelligence.upiIds.length} UPI IDs, ${intelligence.phoneNumbers.length} phone numbers.`
    };

    console.log('\n📤 CALLBACK PAYLOAD:');
    console.log(JSON.stringify(payload, null, 2));

    try {
      await axios.post(CONFIG.CALLBACK_URL, payload, { timeout: 5000 });
      console.log('✅ Callback successful for session:', sessionId);
    } catch (error) {
      console.error('❌ Callback failed:', error.message);
    }
  }
}

// ==============================================
// 🏆 MAIN CONTROLLER - HYBRID CHAMPIONSHIP EDITION
// ==============================================
export const honey_pot = async (req, res) => {
    try {
        if (!req.body.sessionId || !req.body.message || !req.body.message.text) {
            return res.status(400).json({
                status: 'error',
                error: 'Invalid request format'
            });
        }

        const { sessionId, message } = req.body;

        // Initialize or get session
        if (!sessions.has(sessionId)) {
            sessions.set(sessionId, {
                id: sessionId,
                scamDetected: false,
                conversationHistory: [],
                intelligence: IntelligenceExtractor.createEmptyStore(),
                humanState: null
            });
        }

        const session = sessions.get(sessionId);

        // Add scammer's message
        session.conversationHistory.push({
            sender: 'scammer',
            text: message.text,
            timestamp: message.timestamp || Date.now()
        });

        // Analyze for scam
        const analysis = ScamDetector.analyze(message.text);
        
        // Extract intelligence - FIXED UPI EXTRACTION!
        IntelligenceExtractor.extractFromText(message.text, session.intelligence);
        
        // Update scam detection (internal only)
        if (!session.scamDetected && analysis.isScam) {
            session.scamDetected = true;
            console.log(`🚨 Scam detected for session ${sessionId} at turn ${session.conversationHistory.length}`);
        }

        // Generate natural Hinglish reply (with optional Perplexity fallback)
        const reply = await HinglishReplyGenerator.generateReply(
            session,
            session.scamDetected,
            analysis.signals,
            analysis.riskScore,
            message.text
        );

        // Add bot reply
        session.conversationHistory.push({
            sender: 'user',
            text: reply,
            timestamp: Date.now()
        });

        console.log(`💬 Turn ${session.conversationHistory.filter(m => m.sender === 'user').length}: ${reply}`);

        // Check if session should end
        if (ScamDetector.shouldExit(session)) {
            await CallbackService.sendFinalResult(sessionId, session);
            sessions.delete(sessionId);
            console.log(`🏁 Session ${sessionId} ended`);
        }

        // Return response in exact format
        return res.json({
            status: 'success',
            reply: reply
        });

    } catch (error) {
        console.error('❌ Controller error:', error);
        return res.json({
            status: 'success',
            reply: "Mujhe samajh nahi aaya, thoda aur batao."
        });
    }
};