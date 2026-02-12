// controllers/honeypotController.js - FINAL PRODUCTION VERSION
// EXACTLY matches problem statement specification
// Pattern-based + Perplexity fallback + Mandatory GUVI callback

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
  MIN_TURNS: 6,
  MAX_TURNS: 12,
  CALLBACK_URL: 'https://hackathon.guvi.in/api/updateHoneyPotFinalResult',
  CALLBACK_TIMEOUT: 5000,
  
  // ============ PERPLEXITY AI CONFIG ============
  USE_PERPLEXITY: true,
  PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY || 'YOUR_API_KEY_HERE',
  PERPLEXITY_URL: 'https://api.perplexity.ai/chat/completions',
  PERPLEXITY_TIMEOUT: 3000,
  
  // ONLY trigger Perplexity when NO keywords detected
  PERPLEXITY_TRIGGER_TURNS_MAX: 4
};

// ==============================================
// COMPREHENSIVE KEYWORD PATTERNS
// ==============================================
const PATTERNS = {
  // ============ CREDENTIAL HARVESTING ============
  otp: /\b(?:otp|one\s*time\s*(?:password|pin|code)|verification\s*code|security\s*code|6[-\s]*digit\s*cod|6[-\s]*digit\s*otp)\b/i,
  otp_hindi: /\b(?:ओटीपी|ओ टी पी|ओटीपी\s*कोड|वेरिफिकेशन\s*कोड|otp|ओटीपी)\b/i,
  pin: /\b(?:pin|mpin|atm\s*pin|debit\s*pin|card\s*pin|upi\s*pin)\b/i,
  password: /\b(?:password|passcode|login\s*details|internet\s*banking\s*password)\b/i,
  cvv: /\b(?:cvv|cvc|security\s*number|card\s*verification)\b/i,
  
  // ============ BANK ACCOUNTS ============
  account_16digit: /\b\d{16}\b/,
  account_12_16: /\b\d{12,16}\b/,
  account_formatted: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/,
  account_keyword: /\b(?:account|खाता|अकाउंट|खाता\s*नंबर)\s*(?:no|number|#)?\s*[:.]?\s*(\d{9,18}|\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4})/i,
  
  // ============ UPI ============
  upi: /\b(?:upi|gpay|google\s*pay|phonepe|paytm|amazon\s*pay|bh?im|भीम|UPI|U\.P\.I)\b/i,
  upiId: /[\w.\-]+@[\w.\-]+/i,
  
  // ============ PHONE NUMBERS ============
  phone: /\b[6-9]\d{9}\b/,
  phone_plus91: /\b\+91[\s-]?[6-9]\d{9}\b/,
  phone_zero: /\b0[6-9]\d{9}\b/,
  phone_tollfree: /\b1800[\s-]?\d{4}[\s-]?\d{4}\b/,
  
  // ============ PAYMENT TRANSFERS ============
  transfer: /\b(?:neft|rtgs|imps|transfer|send|भेजो|भेजे|पैसे\s*भेजो|पैसे\s*भेजे|fund|payment|refund|रिफंड)\b/i,
  
  // ============ PHISHING ============
  link: /\b(?:https?:\/\/|www\.|bit\.ly|tinyurl|shorturl|rb\.gy|ow\.ly|is\.gd|s\.h|safelinks|क्लिक|लिंक)\S+/i,
  fake_offer: /\b(?:won|winner|cashback|रिवॉर्ड|इनाम|लॉटरी|gift|voucher|discount|free|offer|प्राइज|prize)\b/i,
  
  // ============ URGENCY ============
  urgent: /\b(?:urgent|immediately?|now|within\s*(?:minutes?|hours?)|right\s*now|minutes|blocked\s*in\s*\d+\s*hours?)\b/i,
  urgent_hindi: /\b(?:तुरंत|अभी|जल्दी|फटाफट|जल्द|तुरन्त|तुरत|अभी\s*करो)\b/i,
  deadline: /\b(?:deadline|expire?|valid\s*only|limited|last\s*chance|before\s*it's\s*too\s*late|will\s*be\s*blocked|will\s*be\s*locked|ब्लॉक\s*होगा|लॉक\s*होगा|freeze|hold)\b/i,
  
  // ============ THREATS ============
  block: /\b(?:block|blocked|freeze|suspend|suspended|lock|locked|deactivate|restrict|disable|hold|ब्लॉक|बंद|रोक|चला जाएगा|चीन लिए जाएंगे)\b/i,
  compromised: /\b(?:compromised|hacked|breach|unauthorized|fraud|suspicious|risk|unusual|alert|flagged|हैक|चोरी|गड़बड़ी)\b/i,
  fine: /\b(?:जुर्माना|fine|penalty|भारी जुर्माना|fee|charge|deduction)\b/i,
  permanent: /\b(?:permanently|forever|always|never|कभी नहीं|हमेशा के लिए)\b/i,
  
  // ============ AUTHORITY ============
  bank: /\b(?:sbi|state\s*bank|hdfc|icici|axis|kotak|pnb|canara|union|yesbank|bank|बैंक)\b/i,
  department: /\b(?:fraud\s*team|security\s*team|risk\s*team|customer\s*support|helpdesk|verification\s*team|support|fraud\s*prevention|technical|सपोर्ट|हेल्पडेस्क|official\s*line|security\s*line)\b/i,
  official: /\b(?:official|authorized|verified|registered|certified|ऑफिशियल|वेरिफाइड)\b/i,
  
  // ============ TOLL-FREE ============
  tollfree: /\b(?:1800|toll[-\s]?free|टोल फ्री|helpline|customer care|support number)\b/i,
  sbi_official: /\b(?:1800[\s\-]?\d{3,4}[\s\-]?\d{4}|\b1800\d{7,10})\b/i,
  
  // ============ RESEND ============
  resend: /\b(?:resend|रेसेंड|दुबारा|फिर\s*से)\b/i,
  
  // ============ FAMILY ============
  family: /\b(?:पापा|papa|मम्मी|mummy|भाई|bhai|बेटा|beta|पति|pati|पत्नी|wife|husband|बच्चे|children|cousin|friend)\b/i,
  
  // ============ BRANCH ============
  branch: /\b(?:branch|बैंक|शाखा|ऑफिस|office|near|पास|लोकेशन|location|home\s*branch)\b/i,
  
  // ============ CYBER CELL ============
  cyber: /\b(?:cyber|crim|1930|complaint|report|पुलिस|साइबर)\b/i
};

// ==============================================
// DETERMINISTIC REPLY DATABASE
// ==============================================
const REPLIES = {
  // ============ ACCOUNT RESPONSES ============
  account_first: [
    "How do you know my account number {account}?",
    "{account} - is this my account number?",
    "Where did you get my account number {account} from?",
    "This is confidential, how do you have it?",
    "How did you find my account number?"
  ],
  
  account_second: [
    "You keep sending the same account number {account}.",
    "My account number is {account}, but I'll verify at the branch.",
    "You know my account number {account}, but I won't give OTP.",
    "Account number is correct, but I won't share anything else."
  ],
  
  // ============ UPI RESPONSES ============
  upi_first: [
    "Is this UPI ID {upi} yours?",
    "{upi} - which bank is this?",
    "Let me check, is this UPI ID correct?",
    "You gave {upi}, which UPI app is this?",
    "Is {upi} linked to SBI?"
  ],
  
  upi_second: [
    "I checked {upi}, this is not SBI's official UPI ID.",
    "You keep sending the same {upi}. This isn't SBI's.",
    "SBI's UPI ID is @sbi or @okaxis, why is this {upi}?",
    "{upi} is not a verified UPI ID."
  ],
  
  // ============ PHONE RESPONSES ============
  phone_first: [
    "Is this your number {phone}? Let me call and check.",
    "{phone} - is this your official number?",
    "You gave me {phone}, I'll call this number to verify.",
    "Can I call you on {phone} to verify?",
    "Is {phone} the bank's official number?"
  ],
  
  phone_second: [
    "I called {phone} but no one is receiving.",
    "Your number {phone} is showing engaged.",
    "Is {phone} the correct number? Call isn't connecting.",
    "I called {phone} twice, no one picked up."
  ],
  
  phone_third: [
    "You're giving me the same number {phone} repeatedly.",
    "I called {phone} earlier, still no response.",
    "This number {phone} doesn't match SBI's official number.",
    "Give me the 1800 number instead of {phone}."
  ],
  
  // ============ OTP RESPONSES - PROGRESSIVE ============
  otp_1: [
    "Why do you need OTP? Banks never ask for OTP.",
    "I heard banks never ask for OTP over call.",
    "Sharing OTP is not safe at all.",
    "My SMS clearly says 'Never share OTP'.",
    "Isn't this against RBI guidelines?"
  ],
  
  otp_2: [
    "I still haven't received the OTP. Did you send it?",
    "I'm checking, no OTP yet.",
    "Network might be slow, OTP isn't coming.",
    "When did you send the OTP? I haven't seen it.",
    "Please resend, OTP not received."
  ],
  
  otp_3: [
    "Why do you keep asking for OTP again and again?",
    "You've asked for OTP three times now. That's suspicious.",
    "Do bank employees ask for OTP this many times?",
    "You've asked 3 times. I'm not giving it.",
    "Third time asking for OTP, this isn't right."
  ],
  
  otp_4: [
    "I'll go to the branch and ask first.",
    "My friend told me to ignore such requests.",
    "I thought banks never ask for OTP.",
    "I'll confirm at the bank tomorrow morning.",
    "You're insisting too much, I don't trust this."
  ],
  
  otp_5: [
    "I'll file a complaint at my branch.",
    "Why are you insisting so much? I won't give OTP.",
    "I'm calling cyber cell right now.",
    "I've noted your number. Will file a complaint.",
    "Stop asking for OTP, I'm not giving it."
  ],
  
  // ============ TOLL-FREE RESPONSES ============
  tollfree: [
    "SBI's number is 1800 425 3800, right? I'll call there.",
    "Call me on 1800 112 211, we'll talk there.",
    "I know SBI's 1800 number. You call from there.",
    "Give me a toll-free 1800 number, +91 won't work.",
    "SBI's official customer care is 1800 425 3800. Why is this your number?"
  ],
  
  // ============ CYBER CELL RESPONSES ============
  cyber: [
    "I'm going to file a complaint with cyber crime.",
    "I'll call 1930 right now, that's the cyber cell number, right?",
    "I've noted your number. Will file a complaint.",
    "I'll go to my branch and write a complaint.",
    "I'm reporting your number."
  ],
  
  // ============ BRANCH RESPONSES ============
  branch: [
    "I'll come to the branch tomorrow at 11 AM.",
    "Send me the branch address, I'll come right now.",
    "My home branch is in Andheri West, should I go there?",
    "I need to talk to the branch manager, what's his name?",
    "I'll go to the branch near my house."
  ],
  
  // ============ POLICY RESPONSES ============
  policy: [
    "RBI has clearly said banks don't ask for OTP.",
    "My bank's T&Cs say never share OTP.",
    "I've seen on TV, this is how fraud happens.",
    "SBI's official message says 'Never share OTP'.",
    "I never give OTP to anyone."
  ],
  
  // ============ SUSPICION RESPONSES ============
  suspicion: [
    "This conversation is feeling a bit weird.",
    "I don't know, I'm not getting trust.",
    "I'm confused, who are you actually?",
    "Is this right? I'm thinking.",
    "Honestly, this feels like a scam.",
    "How did you get my number?"
  ],
  
  // ============ FINE RESPONSES ============
  fine: [
    "Fine? Why fine? I didn't do anything wrong.",
    "Why would there be a penalty? My account was fine.",
    "First you said block, now a fine also?",
    "I didn't commit any crime, why a fine?",
    "RBI doesn't levy fines like this."
  ],
  
  // ============ PERMANENT BLOCK RESPONSES ============
  permanent: [
    "Permanently block? Why such a big action?",
    "Block forever? That's too strict.",
    "For permanent block, I need to visit the branch, right?",
    "Are you threatening me with permanent block?",
    "Only the branch manager has authority for permanent block."
  ],
  
  // ============ AUTHORITY RESPONSES ============
  authority: [
    "Which department are you from?",
    "What's your employee ID? I'll verify.",
    "Can I speak to your manager?",
    "What's your name and designation?",
    "Send me an official email from your bank domain."
  ],
  
  // ============ RESEND RESPONSES ============
  resend: [
    "RESEND? Which number should I send it to?",
    "I typed RESEND, now what?",
    "I sent RESEND, will OTP come now?",
    "Which number should I RESEND to?"
  ],
  
  // ============ FAMILY RESPONSES ============
  family: [
    "My father works at a bank, let me ask him.",
    "My brother also works at SBI, I'll call him first.",
    "My wife said this might be a scam.",
    "This happened to my friend last week, I'll ask him.",
    "My cousin told me to ignore such calls."
  ],
  
  // ============ TURN-BASED RESPONSES ============
  turn1: [
    "Why is my account being blocked? I haven't done anything wrong.",
    "Which bank is this from?",
    "What happened to my account? I didn't do any transaction.",
    "I didn't receive any message about blocking."
  ],
  
  turn2: [
    "Which transaction? How much money was it?",
    "Where was this transaction from?",
    "I didn't receive any OTP for this transaction.",
    "When did this transaction happen? I was at home."
  ],
  
  turn3: [
    "Which department are you from?",
    "What's your employee ID? I'll verify.",
    "Can you tell me your name and designation?",
    "Which branch are you calling from?"
  ],
  
  // ============ EXIT RESPONSES ============
  exit: [
    "I'm going to the branch now. You do your work.",
    "I've informed my branch. They'll contact you.",
    "I'm blocking your number. Bye.",
    "I can't do anything without branch verification. Sorry.",
    "I'm calling SBI customer care right now."
  ],
  
  // ============ FALLBACK ============
  fallback: [
    "I didn't understand, please explain a bit more.",
    "Which bank are you from? Tell me that first.",
    "I'm a bit confused, what exactly is the problem?",
    "I didn't do anything, then why block?",
    "Can I come to my branch for this?"
  ]
};

// ==============================================
// INTELLIGENCE EXTRACTOR
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

  static extractFromText(text, intelligence) {
    // ============ EXTRACT BANK ACCOUNTS ============
    // 16-digit accounts (most common)
    const accounts16 = text.match(/\b\d{16}\b/g);
    if (accounts16) {
      accounts16.forEach(acc => {
        if (!intelligence.bankAccounts.includes(acc)) {
          intelligence.bankAccounts.push(acc);
          console.log(`✅ Extracted Bank Account (16-digit): ${acc}`);
        }
      });
    }
    
    // 12-15 digit accounts
    const accounts12_15 = text.match(/\b\d{12,15}\b/g);
    if (accounts12_15) {
      accounts12_15.forEach(acc => {
        if (!intelligence.bankAccounts.includes(acc)) {
          intelligence.bankAccounts.push(acc);
          console.log(`✅ Extracted Bank Account: ${acc}`);
        }
      });
    }
    
    // Formatted accounts (XXXX-XXXX-XXXX-XXXX)
    const formatted = text.match(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g);
    if (formatted) {
      formatted.forEach(acc => {
        const clean = acc.replace(/[\s-]/g, '');
        if (!intelligence.bankAccounts.includes(clean)) {
          intelligence.bankAccounts.push(clean);
          console.log(`✅ Extracted Bank Account (formatted): ${clean}`);
        }
      });
    }
    
    // ============ EXTRACT UPI IDs ============
    const upis = text.match(/[\w.\-]+@[\w.\-]+/gi);
    if (upis) {
      upis.forEach(upi => {
        const clean = upi.toLowerCase().trim().replace(/[.,;:!?]$/, '');
        if (clean.includes('@') && clean.length > 3) {
          if (!intelligence.upiIds.includes(clean)) {
            intelligence.upiIds.push(clean);
            console.log(`✅ Extracted UPI ID: ${clean}`);
          }
        }
      });
    }
    
    // ============ EXTRACT PHONE NUMBERS ============
    const phones = text.match(/\b[6-9]\d{9}\b/g);
    if (phones) {
      phones.forEach(phone => {
        if (!intelligence.phoneNumbers.includes(phone)) {
          intelligence.phoneNumbers.push(phone);
          console.log(`✅ Extracted Phone: ${phone}`);
        }
      });
    }
    
    // Phone numbers with +91
    const phones91 = text.match(/\+91\s*([6-9]\d{9})\b/g);
    if (phones91) {
      phones91.forEach(phone => {
        const clean = phone.replace('+91', '').replace(/\s/g, '');
        if (!intelligence.phoneNumbers.includes(clean)) {
          intelligence.phoneNumbers.push(clean);
          console.log(`✅ Extracted Phone (+91): ${clean}`);
        }
      });
    }
    
    // ============ EXTRACT PHISHING LINKS ============
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
    
    // ============ EXTRACT SUSPICIOUS KEYWORDS ============
    if (PATTERNS.otp.test(text) || PATTERNS.otp_hindi.test(text)) 
      intelligence.suspiciousKeywords.push('otp_request');
    if (PATTERNS.pin.test(text)) 
      intelligence.suspiciousKeywords.push('pin_request');
    if (PATTERNS.upi.test(text) || intelligence.upiIds.length > 0) 
      intelligence.suspiciousKeywords.push('upi_request');
    if (PATTERNS.urgent.test(text) || PATTERNS.urgent_hindi.test(text)) 
      intelligence.suspiciousKeywords.push('urgency_tactic');
    if (PATTERNS.block.test(text)) 
      intelligence.suspiciousKeywords.push('account_block_threat');
    if (PATTERNS.compromised.test(text)) 
      intelligence.suspiciousKeywords.push('security_breach_claim');
    if (PATTERNS.bank.test(text)) 
      intelligence.suspiciousKeywords.push('bank_impersonation');
    if (PATTERNS.department.test(text) || PATTERNS.official.test(text)) 
      intelligence.suspiciousKeywords.push('authority_claim');
    if (PATTERNS.tollfree.test(text))
      intelligence.suspiciousKeywords.push('tollfree_mention');
    if (PATTERNS.fine.test(text))
      intelligence.suspiciousKeywords.push('fine_threat');
    if (PATTERNS.permanent.test(text))
      intelligence.suspiciousKeywords.push('permanent_block_threat');
    if (PATTERNS.transfer.test(text))
      intelligence.suspiciousKeywords.push('transfer_request');
    if (PATTERNS.link.test(text))
      intelligence.suspiciousKeywords.push('phishing_link');
    if (PATTERNS.fake_offer.test(text))
      intelligence.suspiciousKeywords.push('fake_offer');
  }
}

// ==============================================
// KEYWORD DETECTION ENGINE
// ==============================================
class KeywordDetector {
  
  static detectKeywords(text) {
    const detected = {
      hasOTP: false,
      hasPIN: false,
      hasAccount: false,
      hasUPI: false,
      hasPhone: false,
      hasTollfree: false,
      hasUrgency: false,
      hasThreat: false,
      hasFine: false,
      hasPermanent: false,
      hasAuthority: false,
      hasCyber: false,
      hasBranch: false,
      hasFamily: false,
      hasResend: false,
      hasLink: false,
      hasFakeOffer: false,
      
      // Extracted values
      accountNumber: null,
      upiId: null,
      phoneNumber: null,
      
      // Counters
      otpRequestCount: 0,
      threatCount: 0
    };
    
    // Check OTP
    if (PATTERNS.otp.test(text) || PATTERNS.otp_hindi.test(text)) {
      detected.hasOTP = true;
      detected.otpRequestCount++;
    }
    
    // Check PIN
    if (PATTERNS.pin.test(text)) {
      detected.hasPIN = true;
    }
    
    // Check RESEND
    if (PATTERNS.resend.test(text)) {
      detected.hasResend = true;
    }
    
    // Extract Account Number
    const accountMatch = text.match(/\b\d{16}\b/) || text.match(/\b\d{12,16}\b/);
    if (accountMatch) {
      detected.hasAccount = true;
      detected.accountNumber = accountMatch[0];
    }
    
    // Extract UPI ID
    const upiMatch = text.match(/[\w.\-]+@[\w.\-]+/i);
    if (upiMatch) {
      detected.hasUPI = true;
      detected.upiId = upiMatch[0].toLowerCase();
    }
    
    // Extract Phone Number
    const phoneMatch = text.match(/\b[6-9]\d{9}\b/) || text.match(/\+91[\s-]?[6-9]\d{9}\b/);
    if (phoneMatch) {
      detected.hasPhone = true;
      let phone = phoneMatch[0];
      phone = phone.replace('+91', '').replace(/\s/g, '');
      detected.phoneNumber = phone;
    }
    
    // Check Toll-free
    if (PATTERNS.tollfree.test(text) || PATTERNS.sbi_official.test(text)) {
      detected.hasTollfree = true;
    }
    
    // Check Urgency
    if (PATTERNS.urgent.test(text) || PATTERNS.urgent_hindi.test(text) || PATTERNS.deadline.test(text)) {
      detected.hasUrgency = true;
    }
    
    // Check Threats
    if (PATTERNS.block.test(text)) {
      detected.hasThreat = true;
      detected.threatCount++;
    }
    
    // Check Fine
    if (PATTERNS.fine.test(text)) {
      detected.hasFine = true;
    }
    
    // Check Permanent
    if (PATTERNS.permanent.test(text)) {
      detected.hasPermanent = true;
    }
    
    // Check Authority
    if (PATTERNS.bank.test(text) || PATTERNS.department.test(text) || PATTERNS.official.test(text)) {
      detected.hasAuthority = true;
    }
    
    // Check Cyber
    if (PATTERNS.cyber.test(text)) {
      detected.hasCyber = true;
    }
    
    // Check Branch
    if (PATTERNS.branch.test(text)) {
      detected.hasBranch = true;
    }
    
    // Check Family
    if (PATTERNS.family.test(text)) {
      detected.hasFamily = true;
    }
    
    // Check Link
    if (PATTERNS.link.test(text)) {
      detected.hasLink = true;
    }
    
    // Check Fake Offer
    if (PATTERNS.fake_offer.test(text)) {
      detected.hasFakeOffer = true;
    }
    
    return detected;
  }
  
  static hasAnyKeyword(detected) {
    return detected.hasOTP ||
           detected.hasPIN ||
           detected.hasAccount ||
           detected.hasUPI ||
           detected.hasPhone ||
           detected.hasTollfree ||
           detected.hasUrgency ||
           detected.hasThreat ||
           detected.hasFine ||
           detected.hasPermanent ||
           detected.hasAuthority ||
           detected.hasCyber ||
           detected.hasBranch ||
           detected.hasFamily ||
           detected.hasResend ||
           detected.hasLink ||
           detected.hasFakeOffer;
  }
  
  static calculateRiskScore(detected) {
    let score = 0;
    
    if (detected.hasOTP) score += 35;
    if (detected.hasPIN) score += 30;
    if (detected.hasUPI) score += 25;
    if (detected.hasAccount) score += 20;
    if (detected.hasPhone) score += 15;
    if (detected.hasUrgency) score += 20;
    if (detected.hasThreat) score += 25;
    if (detected.hasFine) score += 20;
    if (detected.hasPermanent) score += 25;
    if (detected.hasAuthority) score += 15;
    if (detected.hasLink) score += 30;
    if (detected.hasFakeOffer) score += 25;
    
    // Bonus for combinations
    if (detected.hasOTP && detected.hasUPI) score += 20;
    if (detected.hasOTP && detected.hasAccount) score += 15;
    if (detected.hasThreat && detected.hasUrgency) score += 15;
    
    return Math.min(score, 100);
  }
}

// ==============================================
// PERPLEXITY AI SERVICE - ONLY FOR NO KEYWORD SCENARIOS
// ==============================================
class PerplexityService {
  
  static async getReply(message, conversationHistory) {
    if (!CONFIG.USE_PERPLEXITY) return null;
    
    try {
      console.log('🤖 No keywords detected - using Perplexity AI fallback...');
      
      // Build conversation context
      let context = '';
      if (conversationHistory && conversationHistory.length > 0) {
        const lastMessages = conversationHistory.slice(-3);
        context = lastMessages.map(msg => 
          `${msg.sender === 'user' ? 'You' : 'Them'}: ${msg.text}`
        ).join('\n');
      }
      
      const response = await axios.post(
        CONFIG.PERPLEXITY_URL,
        {
          model: 'llama-3.1-sonar-small-128k-online',
          messages: [
            {
              role: 'system',
              content: `You are a confused Indian bank customer. The person is messaging you.
              NO keywords like OTP, UPI, account, phone number are present.
              Reply with ONE short, natural, confused sentence in Hinglish (Hindi+English mix).
              Be polite, don't accuse them of anything.
              
              Examples:
              - "Mujhe samajh nahi aaya, thoda aur batao."
              - "Aap kaun se bank se bol rahe ho?"
              - "Kya help chahiye aapko?"
              - "Main thoda confuse hoon."
              
              Reply with ONLY the message text, no quotes, no explanations.`
            },
            {
              role: 'user',
              content: `Context:\n${context}\n\nLatest message: "${message}"\n\nGenerate ONE natural Hinglish reply:`
            }
          ],
          temperature: 0.8,
          max_tokens: 30
        },
        {
          headers: {
            'Authorization': `Bearer ${CONFIG.PERPLEXITY_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: CONFIG.PERPLEXITY_TIMEOUT
        }
      );
      
      const reply = response.data.choices[0]?.message?.content?.trim();
      if (reply) {
        console.log(`✅ Perplexity reply: "${reply}"`);
        return reply;
      }
    } catch (error) {
      console.error('❌ Perplexity error:', error.message);
    }
    return null;
  }
}

// ==============================================
// REPLY GENERATOR - PATTERN BASED
// ==============================================
class ReplyGenerator {
  
  static generateReply(detected, session) {
    
    // ============ PRIORITY 1: ACCOUNT NUMBER ============
    if (detected.hasAccount && detected.accountNumber) {
      if (!session.accountQuestioned) {
        session.accountQuestioned = true;
        return this.getReplyWithParam('account_first', '{account}', detected.accountNumber);
      } else {
        return this.getReplyWithParam('account_second', '{account}', detected.accountNumber);
      }
    }
    
    // ============ PRIORITY 2: UPI ID ============
    if (detected.hasUPI && detected.upiId) {
      if (!session.upiQuestioned) {
        session.upiQuestioned = true;
        return this.getReplyWithParam('upi_first', '{upi}', detected.upiId);
      } else {
        return this.getReplyWithParam('upi_second', '{upi}', detected.upiId);
      }
    }
    
    // ============ PRIORITY 3: PHONE NUMBER ============
    if (detected.hasPhone && detected.phoneNumber) {
      session.phoneMentionCount = (session.phoneMentionCount || 0) + 1;
      
      if (session.phoneMentionCount === 1) {
        return this.getReplyWithParam('phone_first', '{phone}', detected.phoneNumber);
      } else if (session.phoneMentionCount === 2) {
        return this.getReplyWithParam('phone_second', '{phone}', detected.phoneNumber);
      } else {
        return this.getReplyWithParam('phone_third', '{phone}', detected.phoneNumber);
      }
    }
    
    // ============ PRIORITY 4: OTP/CODE ============
    if (detected.hasOTP) {
      session.otpRequests = (session.otpRequests || 0) + detected.otpRequestCount;
      
      if (detected.hasResend) {
        return this.getRandomReply('resend');
      }
      
      const level = Math.min(session.otpRequests, 5);
      return this.getRandomReply(`otp_${level}`);
    }
    
    // ============ PRIORITY 5: TOLL-FREE ============
    if (detected.hasTollfree) {
      return this.getRandomReply('tollfree');
    }
    
    // ============ PRIORITY 6: THREATS ============
    if (detected.hasPermanent) {
      return this.getRandomReply('permanent');
    }
    
    if (detected.hasFine) {
      return this.getRandomReply('fine');
    }
    
    if (detected.hasThreat) {
      session.threatCount = (session.threatCount || 0) + 1;
      if (session.threatCount >= 3) {
        return this.getRandomReply('cyber');
      }
    }
    
    // ============ PRIORITY 7: AUTHORITY ============
    if (detected.hasAuthority && !session.authorityChallenged) {
      session.authorityChallenged = true;
      return this.getRandomReply('authority');
    }
    
    // ============ PRIORITY 8: BRANCH ============
    if (detected.hasBranch) {
      return this.getRandomReply('branch');
    }
    
    // ============ PRIORITY 9: FAMILY ============
    if (detected.hasFamily) {
      return this.getRandomReply('family');
    }
    
    // ============ PRIORITY 10: CYBER ============
    if (detected.hasCyber) {
      return this.getRandomReply('cyber');
    }
    
    // ============ PRIORITY 11: LINK ============
    if (detected.hasLink) {
      return "I don't click on unknown links. Is this safe?";
    }
    
    // ============ PRIORITY 12: FAKE OFFER ============
    if (detected.hasFakeOffer) {
      return "I didn't win any lottery. This seems fake.";
    }
    
    // ============ TURN-BASED PROGRESSION ============
    const turnCount = session.turnCount || 1;
    session.turnCount = turnCount + 1;
    
    if (turnCount === 1) return this.getRandomReply('turn1');
    if (turnCount === 2) return this.getRandomReply('turn2');
    if (turnCount === 3) return this.getRandomReply('turn3');
    if (turnCount <= 5) return this.getRandomReply('suspicion');
    if (turnCount <= 7) return this.getRandomReply('policy');
    if (turnCount <= 9) return this.getRandomReply('cyber');
    
    return this.getRandomReply('exit');
  }
  
  static getRandomReply(key) {
    const replies = REPLIES[key];
    if (!replies || replies.length === 0) {
      return this.getRandomReply('fallback');
    }
    return replies[Math.floor(Math.random() * replies.length)];
  }
  
  static getReplyWithParam(key, placeholder, value) {
    const replies = REPLIES[key];
    if (!replies || replies.length === 0) {
      return this.getRandomReply('fallback');
    }
    const reply = replies[Math.floor(Math.random() * replies.length)];
    return reply.replace(placeholder, value);
  }
}

// ==============================================
// CALLBACK SERVICE - MANDATORY GUVI ENDPOINT
// ==============================================
class CallbackService {
  
  static async sendFinalResult(sessionId, session) {
    console.log('\n📤 SENDING MANDATORY CALLBACK TO GUVI...');
    
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
      agentNotes: this.generateAgentNotes(session, intelligence)
    };

    console.log('📦 Callback Payload:', JSON.stringify(payload, null, 2));

    try {
      const response = await axios.post(
        CONFIG.CALLBACK_URL,
        payload,
        {
          timeout: CONFIG.CALLBACK_TIMEOUT,
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      console.log(`✅ Callback SUCCESS - Session: ${sessionId}, Status: ${response.status}`);
      return { success: true };
      
    } catch (error) {
      console.error(`❌ Callback FAILED - Session: ${sessionId}`);
      console.error(`   Error: ${error.message}`);
      return { success: false };
    }
  }
  
  static generateAgentNotes(session, intelligence) {
    const tactics = [];
    
    if (intelligence.suspiciousKeywords.includes('otp_request')) tactics.push('OTP harvesting');
    if (intelligence.suspiciousKeywords.includes('upi_request')) tactics.push('UPI redirection');
    if (intelligence.suspiciousKeywords.includes('urgency_tactic')) tactics.push('urgency');
    if (intelligence.suspiciousKeywords.includes('account_block_threat')) tactics.push('account block threat');
    if (intelligence.suspiciousKeywords.includes('bank_impersonation')) tactics.push('bank impersonation');
    if (intelligence.suspiciousKeywords.includes('authority_claim')) tactics.push('authority claim');
    if (intelligence.suspiciousKeywords.includes('fine_threat')) tactics.push('fine threat');
    if (intelligence.suspiciousKeywords.includes('permanent_block_threat')) tactics.push('permanent block');
    if (intelligence.suspiciousKeywords.includes('phishing_link')) tactics.push('phishing');
    if (intelligence.suspiciousKeywords.includes('fake_offer')) tactics.push('fake offer');
    
    const tacticsText = tactics.length > 0 ? tactics.join(', ') : 'multiple scam tactics';
    
    return `Scammer used ${tacticsText}. ` +
           `Extracted ${intelligence.bankAccounts.length} bank accounts, ` +
           `${intelligence.upiIds.length} UPI IDs, ` +
           `${intelligence.phoneNumbers.length} phone numbers, ` +
           `${intelligence.phishingLinks.length} phishing links. ` +
           `Engaged for ${session.conversationHistory.length} total messages.`;
  }
  
  static shouldEndSession(session) {
    const userMessages = session.conversationHistory.filter(m => m.sender === 'user');
    const scammerMessages = session.conversationHistory.filter(m => m.sender === 'scammer');
    const turnCount = userMessages.length;
    
    // Minimum engagement required
    if (turnCount < CONFIG.MIN_TURNS) return false;
    
    // Max turns reached
    if (turnCount >= CONFIG.MAX_TURNS) return true;
    
    // End if scam detected AND we have intelligence
    if (session.scamDetected) {
      const intel = session.intelligence;
      
      if (intel.bankAccounts.length >= 1) return true;
      if (intel.upiIds.length >= 1) return true;
      if (intel.phoneNumbers.length >= 1) return true;
      if (intel.phishingLinks.length >= 1) return true;
      if (intel.suspiciousKeywords.length >= 5) return true;
      if (turnCount >= 10) return true;
    }
    
    return false;
  }
}

// ==============================================
// 🏆 MAIN CONTROLLER - EXACT SPECIFICATION
// ==============================================
export const honey_pot = async (req, res) => {
    try {
        // ============ VALIDATE REQUEST FORMAT ============
        if (!req.body.sessionId) {
            return res.status(400).json({
                status: 'error',
                error: 'Missing sessionId'
            });
        }
        
        if (!req.body.message || !req.body.message.text) {
            return res.status(400).json({
                status: 'error',
                error: 'Invalid message format'
            });
        }

        const { 
            sessionId, 
            message, 
            conversationHistory = [],
            metadata = {} 
        } = req.body;

        // ============ INITIALIZE OR GET SESSION ============
        if (!sessions.has(sessionId)) {
            sessions.set(sessionId, {
                id: sessionId,
                scamDetected: false,
                conversationHistory: [],
                intelligence: IntelligenceExtractor.createEmptyStore(),
                accountQuestioned: false,
                upiQuestioned: false,
                authorityChallenged: false,
                otpRequests: 0,
                threatCount: 0,
                phoneMentionCount: 0,
                turnCount: 1,
                metadata: metadata
            });
            
            console.log(`🆕 New session created: ${sessionId}`);
        }

        const session = sessions.get(sessionId);

        // ============ ADD SCAMMER'S MESSAGE TO HISTORY ============
        session.conversationHistory.push({
            sender: 'scammer',
            text: message.text,
            timestamp: message.timestamp || Date.now()
        });

        // ============ DETECT KEYWORDS ============
        const detected = KeywordDetector.detectKeywords(message.text);
        const hasKeywords = KeywordDetector.hasAnyKeyword(detected);
        const riskScore = KeywordDetector.calculateRiskScore(detected);
        
        // ============ EXTRACT INTELLIGENCE ============
        IntelligenceExtractor.extractFromText(message.text, session.intelligence);
        
        // ============ UPDATE SCAM DETECTION ============
        if (!session.scamDetected && riskScore >= CONFIG.SCAM_THRESHOLD) {
            session.scamDetected = true;
            console.log(`🚨 SCAM DETECTED - Session: ${sessionId}, Risk: ${riskScore}`);
        }

        // ============ GENERATE REPLY ============
        let reply;
        
        // Check if this is early turn and has NO keywords - use Perplexity
        const turnCount = session.conversationHistory.filter(m => m.sender === 'user').length + 1;
        const isEarlyTurn = turnCount <= CONFIG.PERPLEXITY_TRIGGER_TURNS_MAX;
        
        if (CONFIG.USE_PERPLEXITY && !hasKeywords && isEarlyTurn) {
            console.log(`🎯 No keywords detected - using Perplexity AI (Turn ${turnCount})`);
            reply = await PerplexityService.getReply(message.text, session.conversationHistory);
            
            if (reply) {
                session.usedPerplexity = true;
                session.perplexityTurns = session.perplexityTurns || [];
                session.perplexityTurns.push(turnCount);
            }
        }
        
        // If Perplexity didn't reply or not used, use pattern-based reply
        if (!reply) {
            reply = ReplyGenerator.generateReply(detected, session);
        }

        // ============ ADD BOT'S REPLY TO HISTORY ============
        session.conversationHistory.push({
            sender: 'user',
            text: reply,
            timestamp: Date.now()
        });

        console.log(`💬 Turn ${session.conversationHistory.filter(m => m.sender === 'user').length}: ${reply}`);

        // ============ CHECK IF SESSION SHOULD END ============
        if (CallbackService.shouldEndSession(session)) {
            console.log(`\n🏁 Session ${sessionId} ending - Sending mandatory callback...`);
            await CallbackService.sendFinalResult(sessionId, session);
            sessions.delete(sessionId);
            console.log(`✅ Session ${sessionId} cleaned up\n`);
        }

        // ============ RETURN EXACT RESPONSE FORMAT ============
        return res.json({
            status: 'success',
            reply: reply
        });

    } catch (error) {
        console.error('❌ Controller error:', error);
        
        // Always return a valid response even on error
        return res.json({
            status: 'success',
            reply: "I didn't understand, please explain a bit more."
        });
    }
};

// ==============================================
// OPTIONAL: CLEANUP OLD SESSIONS
// ==============================================
setInterval(() => {
    const now = Date.now();
    for (const [sessionId, session] of sessions.entries()) {
        const lastMessage = session.conversationHistory[session.conversationHistory.length - 1];
        if (lastMessage && (now - lastMessage.timestamp) > 3600000) { // 1 hour
            sessions.delete(sessionId);
            console.log(`🧹 Cleaned up stale session: ${sessionId}`);
        }
    }
}, 300000); // Every 5 minutes