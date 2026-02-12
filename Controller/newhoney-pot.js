// controllers/honeypotController.js - FIXED INTELLIGENCE EXTRACTION & HUMANIZED REPLIES

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
  CALLBACK_URL: 'https://hackathon.guvi.in/api/updateHoneyPotFinalResult'
};

// ==============================================
// FIXED: COMPREHENSIVE HINGLISH PATTERNS
// ==============================================
const PATTERNS = {
  // Credential harvesting - HINGLISH
  otp: /\b(?:otp|one\s*time\s*(?:password|pin|code)|verification\s*code|security\s*code|6[-\s]*digit\s*cod|6[-\s]*digit\s*otp)\b/i,
  otp_hindi: /\b(?:ओटीपी|ओ टी पी|ओटीपी\s*कोड|वेरिफिकेशन\s*कोड)\b/i,
  pin: /\b(?:pin|mpin|atm\s*pin|debit\s*pin|card\s*pin)\b/i,
  password: /\b(?:password|passcode|login\s*details|internet\s*banking\s*password)\b/i,
  cvv: /\b(?:cvv|cvc|security\s*number|card\s*verification)\b/i,
  
  // ============ FIXED: Account numbers - STRICTER VALIDATION ============
  account: /\b(?:\d{12,16})\b/,  // EXACT 12-16 digits, no spaces/dashes
  account_with_spaces: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // For formatted numbers
  account_number: /\b(?:account|खाता|अकाउंट|खाता\s*नंबर)\s*(?:no|number|#)?\s*[:.]?\s*(\d{9,18})/i,
  
  // ============ FIXED: UPI - ANY FORMAT ============
  upi: /\b(?:upi|gpay|google\s*pay|phonepe|paytm|amazon\s*pay|bh?im|भीम|UPI|U\.P\.I)\b/i,
  upiId: /[\w.\-]+@[\w.\-]+/i,  // Matches ANY UPI ID
  
  // ============ FIXED: Phone numbers - STRICT VALIDATION ============
  phone: /\b(?:\+91|0)?([6-9]\d{9})\b/,
  phone_with_country: /\+\d{1,3}[6-9]\d{9}/,
  
  transfer: /\b(?:neft|rtgs|imps|transfer|send|भेजो|भेजे|पैसे\s*भेजो|पैसे\s*भेजे|fund|payment|refund|रिफंड)\b/i,
  
  // Phishing
  link: /\b(?:https?:\/\/|www\.|bit\.ly|tinyurl|shorturl|rb\.gy|ow\.ly|is\.gd|s\.h|safelinks|क्लिक|लिंक)\S+/i,
  fake_offer: /\b(?:won|winner|cashback|रिवॉर्ड|इनाम|लॉटरी|gift|voucher|discount|free|offer|प्राइज|prize)\b/i,
  
  // Urgency tactics - HINGLISH
  urgent: /\b(?:urgent|immediately?|now|within\s*(?:minutes?|hours?)|right\s*now|minutes|blocked\s*in\s*\d+\s*hours?)\b/i,
  urgent_hindi: /\b(?:तुरंत|अभी|जल्दी|फटाफट|जल्द|तुरन्त|तुरत|अभी\s*करो)\b/i,
  deadline: /\b(?:deadline|expire?|valid\s*only|limited|last\s*chance|before\s*it's\s*too\s*late|will\s*be\s*blocked|will\s*be\s*locked|ब्लॉक\s*होगा|लॉक\s*होगा|freeze|hold)\b/i,
  
  // Threats & fear tactics - HINGLISH
  block: /\b(?:block|blocked|freeze|suspend|suspended|lock|locked|deactivate|restrict|disable|hold|ब्लॉक|बंद|रोक|चला जाएगा|चीन लिए जाएंगे|hold)\b/i,
  compromised: /\b(?:compromised|hacked|breach|unauthorized|fraud|suspicious|risk|unusual|alert|flagged|हैक|चोरी|गड़बड़ी)\b/i,
  
  // Authority claims - HINGLISH
  bank: /\b(?:sbi|state\s*bank|hdfc|icici|axis|kotak|pnb|canara|union|yesbank|bank|बैंक)\b/i,
  department: /\b(?:fraud\s*team|security\s*team|risk\s*team|customer\s*support|helpdesk|verification\s*team|support|fraud\s*prevention|technical|सपोर्ट|हेल्पडेस्क|official\s*line|security\s*line)\b/i,
  official: /\b(?:official|authorized|verified|registered|certified|ऑफिशियल|वेरिफाइड)\b/i,
  
  // Contact information
  phone: /\b(?:\+91|0)?([6-9]\d{9})\b/,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
  
  // Family & personal - HINGLISH
  family: /\b(?:पापा|papa|मम्मी|mummy|भाई|bhai|बेटा|beta|पति|pati|पत्नी|wife|husband|बच्चे|children|cousin|friend)\b/i,
  
  // Branch & location - HINGLISH
  branch: /\b(?:branch|बैंक|शाखा|ऑफिस|office|near|पास|लोकेशन|location)\b/i,
  
  // Time references - HINGLISH
  time: /\b(?:कल|kal|आज|aaj|परसों|parson|सुबह|subah|शाम|sham|रात|raat|घंटे|ghante|hour|minute)\b/i,
  
  // RESEND command
  resend: /\b(?:resend|रेसेंड|दुबारा|फिर\s*से)\b/i
};

// ==============================================
// EXPANDED HINGLISH REPLY DATABASE - NO REPETITION
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
    "Achanak block kyun? Maine toh koi galat kaam nahi kiya.",
    "Mera account kaise compromise hua? Main toh alert nahi aaya."
  ],
  
  turn2: [
    "Kaunsa transaction? Kitne paise ka tha?",
    "Kahan se kiya transaction? Mumbai ya Delhi?",
    "Mujhe toh koi OTP nahi aaya us transaction ke liye.",
    "Kab hua ye transaction? Main toh ghar tha.",
    "Kya time tha transaction ka? Main check kar leta hoon.",
    "Mere paas alert aana chahiye tha na?",
    "Transaction successful tha ya failed?",
    "Maine toh koi transaction kiya hi nahi aaj kal.",
    "Kaunsa account? Savings ya current?"
  ],
  
  turn3: [
    "Aap kaunsa department ho?",
    "Aapka employee ID kya hai? Main verify kar lunga.",
    "Mujhe apna name aur designation bata sakte ho?",
    "Yeh kaunsi branch se call kar rahe ho?",
    "Aapki location kya hai? Main wahan jaanta hoon kisi ko.",
    "Customer care ka number to 1800 wala hai na?",
    "Main apni branch mein puchh leta hoon pehle.",
    "Aap SBI se ho ya kisi aur bank se?",
    "Aapka official email ID kya hai?"
  ],
  
  // ============ PHASE 2: DOUBTFUL (Turns 4-6) ============
  turn4_otp: [
    "OTP kyun chahiye? Bank toh OTP nahi maangta.",
    "Maine suna hai bank kabhi OTP nahi poochta.",
    "OTP toh aapko khud aana chahiye na mere phone pe?",
    "Aapko OTP dikh raha hai kya? Mujhe toh nahi aaya.",
    "OTP share karna safe thodi hai.",
    "Mere SMS mein likha hai 'Never share OTP'.",
    "Yeh toh RBI guidelines ke against hai na?",
    "Bank wale OTP nahi maangte, maine TV pe dekha hai."
  ],
  
  turn4_otp_not_received: [
    "OTP nahi aaya abhi tak. Aapne bheja hai kya?",
    "Main check kar raha hoon, koi OTP nahi hai.",
    "Kya aap OTP generate kar rahe ho? Mujhe toh nahi aaya.",
    "Network slow hai shayad, OTP nahi aa raha.",
    "Aapka OTP kab bheja? Maine toh dekha nahi."
  ],
  
  turn4_authority: [
    "Aap fraud prevention team se ho ya customer care se?",
    "Mujhe laga yeh customer service number hai.",
    "Aapka naam kya hai? Main note kar raha hoon.",
    "Kya main aapke manager se baat kar sakta hoon?",
    "Aapki employee ID kya hai? Main check karunga.",
    "Aapka extension number batao, main call back karta hoon.",
    "Aapka designation kya hai bank mein?",
    "Team leader ka naam batao."
  ],
  
  turn4_general: [
    "Main pehle customer care pe call kar leta hoon confirm karne ke liye.",
    "Mere card ke peeche jo number hai wahan call karu kya?",
    "Aap mujhe email bhej sakte ho official domain se?",
    "Main apni branch jaake puchhta hoon kal subah.",
    "Mera cousin bhi SBI mein kaam karta hai, main puchh leta hoon.",
    "Mere papa ne kaha aise calls pe trust mat karo.",
    "Main apne friend se puchhta hoon jo bank mein hai."
  ],
  
  turn5_verification: [
    "Main net banking check kar raha hoon, koi alert nahi hai.",
    "Mobile app mein bhi koi notification nahi aaya.",
    "Maine apna passbook check kiya, sab normal hai.",
    "Kyunki maine toh koi transaction kiya hi nahi.",
    "Aapke paas koi proof hai ki mera account compromised hai?",
    "Mujhe laga alert aana chahiye tha.",
    "Main SBI app mein login hua, sab theek hai.",
    "Mera balance bhi same hai, koi transaction nahi hui."
  ],
  
  turn5_policy: [
    "RBI ne toh bola hai bank OTP nahi maangte.",
    "Mere bank ke T&C mein likha hai kabhi OTP mat do.",
    "Yeh toh maine TV pe bhi dekha hai, fraud hota hai aise.",
    "SBI ka official message aata hai 'Never share OTP'.",
    "Main toh kabhi kisi ko OTP nahi deta.",
    "Yeh RBI guidelines ke against hai.",
    "Bank wale aise nahi karte."
  ],
  
  turn5_suspicion: [
    "Thoda ajeeb lag raha hai yeh conversation.",
    "Pata nahi, mujhe trust nahi ho raha.",
    "Main confuse hoon, aap kaun ho actually?",
    "Yeh sahi hai kya? Main soch raha hoon.",
    "Kyunki pichle hafte mere ek friend ke saath hua tha aise hi.",
    "Mujhe scam lag raha hai honestly.",
    "Aapka number kaise mila mujhe?"
  ],
  
  turn6_process: [
    "Chat pe aise details kyun maang rahe ho?",
    "Phone pe bhi kar sakte ho na verify?",
    "Main branch aa jaata hoon kal, kitne baje aana hai?",
    "Kya main apne home branch mein aa sakta hoon?",
    "Yeh process thoda different lag raha hai.",
    "Normally toh bank aise nahi karta.",
    "Mujhe aise verify nahi karna, main branch aa jaata hoon."
  ],
  
  turn6_alternative: [
    "Main apne card ke peeche wala number call kar leta hoon.",
    "Aap official customer care number batao, main wahan call karta hoon.",
    "Main apna relationship manager se baat karunga pehle.",
    "Branch jaake karta hoon yeh sab, aap branch ka address batao.",
    "Koi branch near by hai kya? Main abhi jaata hoon.",
    "Aap nearest branch ka address bhejo."
  ],
  
  // ============ PHASE 3: DEFENSIVE (Turns 7-9) ============
  turn7_branch: [
    "Main kal subah 11 baje branch aa raha hoon.",
    "Aap branch ka address bhejo, main abhi aata hoon.",
    "Mera home branch Andheri West mein hai, wahan jaau kya?",
    "Branch manager sir se baat karni hai, unka naam kya hai?",
    "Main apne ghar ke paas wali branch mein chala jaata hoon.",
    "Meri branch Borivali mein hai, wahan call karo.",
    "Main branch jaake hi baat karunga."
  ],
  
  turn7_family: [
    "Mere papa bank mein kaam karte hain, main unse puchh leta hoon.",
    "Mera bhai bhi SBI mein hai, use call karta hoon pehle.",
    "Meri wife ne kaha yeh scam ho sakta hai.",
    "Mere friend ke saath aise hi hua tha, main usse puchhta hoon.",
    "Mama ne kaha kabhi OTP share mat karo.",
    "Mere cousin ne bola aise calls ignore karne ka.",
    "Papa bol rahe hain aise nahi karte bank wale."
  ],
  
  turn7_official: [
    "Aap official email ID se mail bhejo, phir main verify kar lunga.",
    "Aapka domain @sbi.co.in hai na?",
    "Kya main apne registered email ID pe confirmation mail le sakta hoon?",
    "Aap apna official letterhead bhejo, main check karunga.",
    "Branch se koi document bhejo, main uske baad hi kuch karunga.",
    "Aap apna visiting card bhejo pehle."
  ],
  
  turn8_persistent: [
    "Aap baar baar OTP kyun maang rahe ho?",
    "Maine kaha na main branch jaunga, phir bhi kyun puchh rahe ho?",
    "Aap toh mera baat hi nahi sun rahe.",
    "Main clearly bol raha hoon main OTP nahi dunga.",
    "Yeh aap kya kar rahe ho? Main samajh nahi pa raha.",
    "Aap meri baat kyun ignore kar rahe ho?",
    "Maine 3 baar mana kar diya, phir bhi OTP maang rahe ho.",
    "Aap itna insist kyun kar rahe ho?"
  ],
  
  turn8_authority_reject: [
    "Aap chahe kisi bhi department se ho, main OTP nahi dunga.",
    "Employee ID se kya farak padta hai jab rules hi alag hai?",
    "Aap official ho ya nahi, main risk nahi lunga.",
    "Manager bhi aayega toh OTP nahi dunga.",
    "RBI ka rule hai, main follow kar raha hoon.",
    "Aap RBI ke rules nahi jaante kya?"
  ],
  
  turn8_time: [
    "Abhi main busy hoon, baad mein baat karte hain.",
    "Main shopping kar raha hoon, thoda baad mein call karo.",
    "Office mein hoon, free hoke call karta hoon.",
    "Abhi baat nahi kar sakta, kal baat karte hain.",
    "Main drive kar raha hoon, baad mein call karo.",
    "Abhi meeting chal rahi hai, baad mein call karta hoon."
  ],
  
  turn9_final_warning: [
    "Aapne phir OTP maanga. Main abhi branch ja raha hoon.",
    "Main ab call kar raha hoon apne bank ko.",
    "Mera decision final hai, main kuch share nahi karunga.",
    "Aap aise force kar rahe ho, yeh theek nahi hai.",
    "Main ab phone rakh raha hoon, kal branch jaunga.",
    "Main aur nahi kar sakta baat, bye."
  ],
  
  turn9_complaint: [
    "Main cyber crime mein complaint file kar dunga.",
    "1930 pe call karta hoon abhi, yeh number hai na cyber cell ka?",
    "Maine aapka number note kar liya hai.",
    "Main apni branch mein jaake complaint likhwa dunga.",
    "Aapka number main report kar dunga.",
    "Main police complaint kar dunga."
  ],
  
  // ============ PHASE 4: EXIT (Turns 10+) ============
  turn10_exit: [
    "Main ab branch ja raha hoon. Aap apna kaam karo.",
    "Maine apni branch ko inform kar diya hai. Woh aapse contact karega.",
    "Cyber cell ne kaha hai aise calls report karo. Main kar dunga.",
    "Aapka number main block kar raha hoon. Bye.",
    "Main kuch nahi kar sakta bina branch verification ke. Sorry.",
    "Jab tak main branch nahi jaata, tab tak main kuch nahi karunga.",
    "Aap apna official channel use karo, main wahan available hoon.",
    "Main abhi SBI customer care call kar raha hoon."
  ],
  
  turn10_ignore: [
    "...",
    "Main abhi baat nahi kar sakta.",
    "Kal call karo.",
    "Branch jaake baat karte hain.",
    "Dekhta hoon pehle.",
    "Abhi busy hoon.",
    "Baad mein karte hain."
  ],
  
  // ============ PHONE NUMBER RESPONSES - TRACKED ============
  phone_first: [
    "Yeh aapka number hai kya {phone}? Main call karta hoon check karne ke liye.",
    "{phone} - yeh aapka official number hai?",
    "Aapne {phone} diya hai, main is number ko call karta hoon.",
    "Kya main {phone} pe call kar sakta hoon verify karne ke liye?",
    "Yeh {phone} SBI ka official number hai kya?"
  ],
  
  phone_second: [
    "Maine {phone} pe call kiya, par koi receive nahi kar raha.",
    "Aapka {phone} number engaged aa raha hai.",
    "Kya yeh {phone} sahi number hai? Call connect nahi ho raha.",
    "Main {phone} pe baat karna chahta tha, par koi utha nahi.",
    "Is {phone} number pe customer care hai na?"
  ],
  
  phone_third: [
    "Aap bar bar yahi {phone} number de rahe ho.",
    "Maine {phone} pe call kiya tha, abhi tak koi response nahi aaya.",
    "Yeh {phone} number toh mere paas SBI ke official number ke as nahi hai.",
    "Mere pass SBI ka 1800 wala number hai, yeh {phone} kyun hai?"
  ],
  
  // ============ RESEND COMMAND RESPONSES ============
  resend: [
    "'RESEND' karke bhej du? Kaunsa number pe bhejna hai?",
    "Maine RESEND likh diya, ab kya hoga?",
    "RESEND bhej diya maine, OTP aayega ab?",
    "RESEND kar diya, ab wait karta hoon OTP ke liye.",
    "Kaunsa number pe RESEND bhejna hai? Aapne do numbers diye hain."
  ]
};

// ==============================================
// FIXED: INTELLIGENCE EXTRACTION - PROPER VALIDATION
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

  // ============ FIXED: BANK ACCOUNT EXTRACTION - STRICT VALIDATION ============
  static extractBankAccounts(text, intelligence) {
    // Method 1: Look for 12-16 digit numbers (no spaces, no dashes)
    const exactMatches = text.match(/\b\d{12,16}\b/g);
    if (exactMatches) {
      exactMatches.forEach(acc => {
        // Phone numbers start with 6,7,8,9 and are 10 digits - exclude them
        if (acc.length === 10 && /^[6-9]/.test(acc)) {
          // This is a phone number, not bank account
          return;
        }
        // Bank accounts are typically 12-16 digits and don't start with 6-9 if length 10
        if (acc.length >= 12) {
          if (!intelligence.bankAccounts.includes(acc)) {
            intelligence.bankAccounts.push(acc);
            console.log(`✅ Extracted Bank Account: ${acc}`);
          }
        }
      });
    }
    
    // Method 2: Look for formatted numbers (XXXX-XXXX-XXXX)
    const formattedMatches = text.match(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g);
    if (formattedMatches) {
      formattedMatches.forEach(acc => {
        const clean = acc.replace(/[\s-]/g, '');
        // Ensure it's not a phone number (10 digits starting with 6-9)
        if (clean.length === 10 && /^[6-9]/.test(clean)) {
          return;
        }
        if (clean.length >= 12 && !intelligence.bankAccounts.includes(clean)) {
          intelligence.bankAccounts.push(clean);
          console.log(`✅ Extracted Bank Account (formatted): ${clean}`);
        }
      });
    }
    
    // Method 3: Look for account number after "account" keyword
    const accountKeywordMatches = text.match(/account\s*(?:no|number|#)?\s*[:.]?\s*(\d{9,18})/i);
    if (accountKeywordMatches) {
      const acc = accountKeywordMatches[1];
      // Skip if it's a phone number
      if (!(acc.length === 10 && /^[6-9]/.test(acc))) {
        if (!intelligence.bankAccounts.includes(acc)) {
          intelligence.bankAccounts.push(acc);
          console.log(`✅ Extracted Bank Account (keyword): ${acc}`);
        }
      }
    }
  }

  // ============ FIXED: PHONE NUMBER EXTRACTION - STRICT VALIDATION ============
  static extractPhoneNumbers(text, intelligence) {
    // Method 1: Indian mobile numbers (10 digits starting with 6-9)
    const phoneMatches = text.match(/\b[6-9]\d{9}\b/g);
    if (phoneMatches) {
      phoneMatches.forEach(phone => {
        if (!intelligence.phoneNumbers.includes(phone)) {
          intelligence.phoneNumbers.push(phone);
          console.log(`✅ Extracted Phone Number: ${phone}`);
        }
      });
    }
    
    // Method 2: Numbers with +91 prefix
    const withCountryCode = text.match(/\+91\s*([6-9]\d{9})\b/g);
    if (withCountryCode) {
      withCountryCode.forEach(phone => {
        const clean = phone.replace('+91', '').replace(/\s/g, '');
        if (!intelligence.phoneNumbers.includes(clean)) {
          intelligence.phoneNumbers.push(clean);
          console.log(`✅ Extracted Phone Number (with +91): ${clean}`);
        }
      });
    }
    
    // Method 3: Numbers with 0 prefix
    const withZero = text.match(/0([6-9]\d{9})\b/g);
    if (withZero) {
      withZero.forEach(phone => {
        const clean = phone.slice(1);
        if (!intelligence.phoneNumbers.includes(clean)) {
          intelligence.phoneNumbers.push(clean);
          console.log(`✅ Extracted Phone Number (with 0): ${clean}`);
        }
      });
    }
  }

  // ============ FIXED: UPI EXTRACTION ============
  static extractUPIIds(text, intelligence) {
    const upiRegex = /[\w.\-]+@[\w.\-]+/gi;
    const matches = text.match(upiRegex);
    
    if (matches) {
      matches.forEach(upi => {
        const clean = upi.toLowerCase().trim().replace(/[.,;:!?]$/, '');
        if (clean.includes('@') && clean.length > 3) {
          if (!intelligence.upiIds.includes(clean)) {
            intelligence.upiIds.push(clean);
            console.log(`✅ Extracted UPI ID: ${clean}`);
          }
        }
      });
    }
  }

  static extractFromText(text, intelligence) {
    const lower = text.toLowerCase();
    
    // Extract bank accounts - FIXED
    this.extractBankAccounts(text, intelligence);
    
    // Extract UPI IDs
    this.extractUPIIds(text, intelligence);
    
    // Extract phone numbers - FIXED
    this.extractPhoneNumbers(text, intelligence);
    
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
    
    // ============ EXTRACT KEYWORDS ============
    if (PATTERNS.otp.test(text) || PATTERNS.otp_hindi.test(text) || PATTERNS.resend.test(text)) 
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
    
    if (PATTERNS.block.test(text)) 
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
// CHAMPIONSHIP HINGLISH REPLY GENERATOR - NO REPETITION
// ==============================================
class HinglishReplyGenerator {
  
  static initializeHumanState(session) {
    if (!session.humanState) {
      session.humanState = {
        // Track what's been asked
        askedWhyBlocked: false,
        askedTransactionDetails: false,
        askedLocation: false,
        askedTime: false,
        askedAmount: false,
        askedEmployeeID: false,
        askedBranch: false,
        askedDepartment: false,
        askedEmail: false,
        askedOfficialLetter: false,
        
        // Track what's been suggested
        suggestedCall: false,
        suggestedBranch: false,
        suggestedNetbanking: false,
        suggestedApp: false,
        suggestedFamily: false,
        suggestedComplaint: false,
        suggestedCyberCell: false,
        
        // ============ FIXED: Track phone number interactions ============
        phoneNumberMentioned: false,
        phoneNumberCalled: false,
        phoneNumberQuestioned: false,
        phoneNumberRepeated: false,
        extractedPhone: null,
        phoneMentionCount: 0,
        
        // Track RESEND command
        resendUsed: false,
        
        // Counters
        otpRequests: 0,
        threatCount: 0,
        urgencyCount: 0,
        accountMentions: 0,
        phoneMentions: 0,
        
        // Track used replies
        usedReplies: new Set(),
        lastReplyType: null,
        lastReplyTurn: 0,
        
        // Mood
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
    if (PATTERNS.resend.test(lastMessage)) {
      state.resendUsed = true;
    }
    
    // Extract and track phone number
    const phone = this.extractPhoneFromMessage(lastMessage);
    if (phone) {
      state.phoneMentions++;
      state.extractedPhone = phone;
      
      if (state.phoneMentions === 1) {
        state.phoneNumberMentioned = true;
      } else if (state.phoneMentions >= 2) {
        state.phoneNumberRepeated = true;
      }
    }
    
    return state;
  }
  
  static extractPhoneFromMessage(text) {
    const phoneMatch = text.match(/\b[6-9]\d{9}\b/);
    return phoneMatch ? phoneMatch[0] : null;
  }
  
  // ==============================================
  // MAIN REPLY GENERATOR - NO REPETITION
  // ==============================================
  static generateReply(session, scamDetected, signals) {
    const state = this.initializeHumanState(session);
    const turnCount = session.conversationHistory.filter(m => m.sender === 'user').length + 1;
    
    // ============ FIXED: PHONE NUMBER RESPONSES - PROGRESSIVE ============
    if (state.extractedPhone) {
      // First time phone is mentioned
      if (state.phoneMentions === 1 && !state.phoneNumberCalled) {
        state.phoneNumberCalled = true;
        const replies = REPLIES.phone_first.map(r => r.replace('{phone}', state.extractedPhone));
        return this.getUniqueReply(replies, 'phone_first', state);
      }
      
      // Second time phone is mentioned - different response
      if (state.phoneMentions === 2 && !state.phoneNumberQuestioned) {
        state.phoneNumberQuestioned = true;
        const replies = REPLIES.phone_second.map(r => r.replace('{phone}', state.extractedPhone));
        return this.getUniqueReply(replies, 'phone_second', state);
      }
      
      // Third+ time phone is mentioned - call out repetition
      if (state.phoneMentions >= 3 && !state.phoneNumberRepeated) {
        state.phoneNumberRepeated = true;
        const replies = REPLIES.phone_third.map(r => r.replace('{phone}', state.extractedPhone));
        return this.getUniqueReply(replies, 'phone_third', state);
      }
    }
    
    // ============ RESEND COMMAND RESPONSE ============
    if (state.resendUsed && !state.usedReplies.has('resend')) {
      state.usedReplies.add('resend');
      return this.getUniqueReply(REPLIES.resend, 'resend', state);
    }
    
    // ============ PROGRESSIVE OTP RESPONSES ============
    if (signals.credential) {
      if (state.otpRequests === 1) {
        return this.getUniqueReply(REPLIES.turn4_otp, 'otp_1', state);
      }
      if (state.otpRequests === 2) {
        return this.getUniqueReply(REPLIES.turn4_otp_not_received, 'otp_2', state);
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
    
    // ============ PHASE 1: Turns 1-3 ============
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
    
    // ============ PHASE 2: Turns 4-6 ============
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
    
    // ============ PHASE 3: Turns 7-9 ============
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
      if (!state.suggestedComplaint) {
        state.suggestedComplaint = true;
        return this.getUniqueReply(REPLIES.turn9_complaint, 'turn9_complaint', state);
      }
      return this.getUniqueReply(REPLIES.turn9_final_warning, 'turn9_final', state);
    }
    
    // ============ PHASE 4: Turns 10+ ============
    if (turnCount >= 10) {
      if (!state.suggestedCyberCell) {
        state.suggestedCyberCell = true;
        return this.getUniqueReply([
          "Main 1930 pe call kar raha hoon cyber cell mein.",
          "Maine cyber crime portal pe complaint kar diya hai.",
          "Aapka number main cyber cell ko de dunga."
        ], 'cyber', state);
      }
      if (turnCount === 10) {
        return this.getUniqueReply(REPLIES.turn10_exit, 'turn10_exit', state);
      }
      return this.getUniqueReply(REPLIES.turn10_ignore, 'turn10_ignore', state);
    }
    
    // ============ FALLBACK ============
    return this.getNaturalFallback(state);
  }
  
  static getNaturalFallback(state) {
    const fallbacks = [
      "Mujhe samajh nahi aaya, thoda aur batao.",
      "Aap kaunsa bank bol rahe ho pehle yeh batao.",
      "Main thoda confuse hoon, kya exact problem hai?",
      "Yeh sab theek hai na? Main soch raha hoon.",
      "Maine toh kuch kiya nahi, phir bhi block?",
      "Kya main apni branch aa sakta hoon iske liye?"
    ];
    return this.getUniqueReply(fallbacks, 'fallback', state);
  }
  
  static getUniqueReply(replyArray, category, state) {
    if (!Array.isArray(replyArray)) {
      replyArray = [replyArray];
    }
    
    const available = replyArray.filter(r => !state.usedReplies.has(r));
    
    if (available.length > 0) {
      const reply = available[Math.floor(Math.random() * available.length)];
      state.usedReplies.add(reply);
      state.lastReplyType = category;
      return reply;
    }
    
    return replyArray[Math.floor(Math.random() * replyArray.length)];
  }
}

// ==============================================
// SCAM DETECTION ENGINE
// ==============================================
class ScamDetector {
  static analyze(text) {
    const signals = {
      credential: PATTERNS.otp.test(text) || PATTERNS.otp_hindi.test(text) || PATTERNS.resend.test(text),
      payment: PATTERNS.upi.test(text) || PATTERNS.transfer.test(text) || PATTERNS.upiId.test(text),
      phishing: PATTERNS.link.test(text) || PATTERNS.fake_offer.test(text),
      urgency: PATTERNS.urgent.test(text) || PATTERNS.urgent_hindi.test(text) || PATTERNS.deadline.test(text),
      threat: PATTERNS.block.test(text) || PATTERNS.compromised.test(text),
      authority: PATTERNS.bank.test(text) || PATTERNS.department.test(text) || PATTERNS.official.test(text)
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
// CALLBACK SERVICE - FIXED PAYLOAD
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
      agentNotes: `Scammer used ${intelligence.suspiciousKeywords.slice(0, 5).join(', ')}... Extracted ${intelligence.bankAccounts.length} bank accounts, ${intelligence.upiIds.length} UPI IDs, ${intelligence.phoneNumbers.length} phone numbers.`
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
// 🏆 MAIN CONTROLLER - FIXED
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

        session.conversationHistory.push({
            sender: 'scammer',
            text: message.text,
            timestamp: message.timestamp || Date.now()
        });

        const analysis = ScamDetector.analyze(message.text);
        IntelligenceExtractor.extractFromText(message.text, session.intelligence);
        
        if (!session.scamDetected && analysis.isScam) {
            session.scamDetected = true;
            console.log(`🚨 Scam detected for session ${sessionId}`);
        }

        const reply = HinglishReplyGenerator.generateReply(
            session,
            session.scamDetected,
            analysis.signals
        );

        session.conversationHistory.push({
            sender: 'user',
            text: reply,
            timestamp: Date.now()
        });

        if (ScamDetector.shouldExit(session)) {
            await CallbackService.sendFinalResult(sessionId, session);
            sessions.delete(sessionId);
        }

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