// controllers/honeypotController.js - STRATEGIC INTELLIGENCE EXTRACTION ENGINE
// 5-PHASE HUMAN FLOW: Confused → Curious → Doubtful → Extraction → Exit
// MAXIMUM INTELLIGENCE HARVESTING - LEADERBOARD OPTIMIZED

import axios from 'axios';

const sessions = new Map();

const CONFIG = {
  SCAM_THRESHOLD: 45,
  MIN_TURNS: 10,
  MAX_TURNS: 16,
  CALLBACK_URL: 'https://hackathon.guvi.in/api/updateHoneyPotFinalResult',
  CALLBACK_TIMEOUT: 5000,
  USE_PERPLEXITY: false,
  PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY || '',
  PERPLEXITY_URL: 'https://api.perplexity.ai/chat/completions',
  PERPLEXITY_TIMEOUT: 2500,
  PERPLEXITY_TRIGGER_TURNS_MAX: 3
};

const PATTERNS = {
  otp: /\b(?:otp|one\s*time\s*(?:password|pin|code)|verification\s*code|security\s*code|6[-\s]*digit\s*cod|6[-\s]*digit\s*otp)\b/i,
  otp_hindi: /\b(?:ओटीपी|ओ टी पी|ओटीपी\s*कोड|वेरिफिकेशन\s*कोड|otp|ओटीपी)\b/i,
  pin: /\b(?:pin|mpin|atm\s*pin|debit\s*pin|card\s*pin|upi\s*pin)\b/i,
  password: /\b(?:password|passcode|login\s*details|internet\s*banking\s*password)\b/i,
  cvv: /\b(?:cvv|cvc|security\s*number|card\s*verification)\b/i,
  account_16digit: /\b\d{16}\b/,
  account_12_16: /\b\d{12,16}\b/,
  account_formatted: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/,
  account_keyword: /\b(?:account|खाता|अकाउंट|खाता\s*नंबर)\s*(?:no|number|#)?\s*[:.]?\s*(\d{9,18}|\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4})/i,
  upi: /\b(?:upi|gpay|google\s*pay|phonepe|paytm|amazon\s*pay|bh?im|भीम|UPI|U\.P\.I)\b/i,
  upiId: /[\w.\-]+@[\w.\-]+/i,
  phone: /\b[6-9]\d{9}\b/,
  phone_plus91: /\b\+91[\s-]?[6-9]\d{9}\b/,
  phone_zero: /\b0[6-9]\d{9}\b/,
  phone_tollfree: /\b1800[\s-]?\d{4}[\s-]?\d{4}\b/,
  transfer: /\b(?:neft|rtgs|imps|transfer|send|भेजो|भेजे|पैसे\s*भेजो|पैसे\s*भेजे|fund|payment|refund|रिफंड)\b/i,
  link: /\b(?:https?:\/\/|www\.|bit\.ly|tinyurl|shorturl|rb\.gy|ow\.ly|is\.gd|s\.h|safelinks|क्लिक|लिंक)\S+/i,
  fake_offer: /\b(?:won|winner|cashback|रिवॉर्ड|इनाम|लॉटरी|gift|voucher|discount|free|offer|प्राइज|prize)\b/i,
  urgent: /\b(?:urgent|immediately?|now|within\s*(?:minutes?|hours?)|right\s*now|minutes|blocked\s*in\s*\d+\s*hours?)\b/i,
  urgent_hindi: /\b(?:तुरंत|अभी|जल्दी|फटाफट|जल्द|तुरन्त|तुरत|अभी\s*करो)\b/i,
  deadline: /\b(?:deadline|expire?|valid\s*only|limited|last\s*chance|before\s*it's\s*too\s*late|will\s*be\s*blocked|will\s*be\s*locked|ब्लॉक\s*होगा|लॉक\s*होगा|freeze|hold)\b/i,
  block: /\b(?:block|blocked|freeze|suspend|suspended|lock|locked|deactivate|restrict|disable|hold|ब्लॉक|बंद|रोक|चला जाएगा|चीन लिए जाएंगे)\b/i,
  compromised: /\b(?:compromised|hacked|breach|unauthorized|fraud|suspicious|risk|unusual|alert|flagged|हैक|चोरी|गड़बड़ी)\b/i,
  fine: /\b(?:जुर्माना|fine|penalty|भारी जुर्माना|fee|charge|deduction)\b/i,
  permanent: /\b(?:permanently|forever|always|never|कभी नहीं|हमेशा के लिए)\b/i,
  bank: /\b(?:sbi|state\s*bank|hdfc|icici|axis|kotak|pnb|canara|union|yesbank|bank|बैंक)\b/i,
  department: /\b(?:fraud\s*team|security\s*team|risk\s*team|customer\s*support|helpdesk|verification\s*team|support|fraud\s*prevention|technical|सपोर्ट|हेल्पडेस्क|official\s*line|security\s*line)\b/i,
  official: /\b(?:official|authorized|verified|registered|certified|ऑफिशियल|वेरिफाइड)\b/i,
  tollfree: /\b(?:1800|toll[-\s]?free|टोल फ्री|helpline|customer care|support number)\b/i,
  sbi_official: /\b(?:1800[\s\-]?\d{3,4}[\s\-]?\d{4}|\b1800\d{7,10})\b/i,
  resend: /\b(?:resend|रेसेंड|दुबारा|फिर\s*से)\b/i,
  family: /\b(?:पापा|papa|मम्मी|mummy|भाई|bhai|बेटा|beta|पति|pati|पत्नी|wife|husband|बच्चे|children|cousin|friend)\b/i,
  branch: /\b(?:branch|बैंक|शाखा|ऑफिस|office|near|पास|लोकेशन|location|home\s*branch)\b/i,
  cyber: /\b(?:cyber|crim|1930|complaint|report|पुलिस|साइबर)\b/i,
  employee_id: /\b(?:employee id|emp id|staff id|कर्मचारी आईडी|employee code|staff code)\b/i,
  designation: /\b(?:designation|post|role|manager|supervisor|head|पद)\b/i,
  branch_code: /\b(?:branch code|branch no|branch id|शाखा कोड)\b/i
};

// ==============================================
// STRATEGIC INTELLIGENCE EXTRACTION REPLIES
// 5-PHASE HUMAN FLOW - LEADERBOARD OPTIMIZED
// ==============================================

const REPLIES = {
  // ============ PHASE 1: CONFUSION (Turns 1-2) ============
  // Calm, cooperative, gathering basic info
  turn1: [
    "Mera account block kyun ho raha hai? Maine koi unusual transaction nahi kiya.",
    "Aap kaunse bank se bol rahe ho exactly?",
    "Mujhe koi official notification nahi mila, aap detail mein bata sakte ho?",
    "Yeh issue kab start hua?",
    "Maine abhi tak kuch suspicious notice nahi kiya."
  ],
  
  turn2: [
    "Kaunsa transaction? Kitne amount ka tha aur kab hua?",
    "Transaction location kya hai? Online tha ya offline?",
    "Mujhe is transaction ke liye koi OTP nahi aaya tha.",
    "Kya aap transaction ID bata sakte ho?",
    "Mere passbook mein koi entry nahi dikh rahi."
  ],
  
  turn3: [
    "Aap kaunse department se ho? Fraud prevention ya customer care?",
    "Aapka employee ID kya hai? Main verify kar lunga.",
    "Kaunsi branch se call kar rahe ho? Branch code kya hai?",
    "Aapka naam aur designation bata sakte ho?",
    "Official bank domain se email bhej sakte ho?"
  ],
  
  // ============ PHASE 2: CURIOSITY & PROBING (Turns 4-5) ============
  // Asking for verification, extracting more data
  suspicion: [
    "Kuch toh gadbad lag raha hai. Aapne apna employee ID nahi bataya.",
    "Main branch ka naam puchha tha, aapne bataya nahi.",
    "Official number 1800 hota hai, aap +91 kyun use kar rahe ho?",
    "Mujhe laga bank kabhi phone pe OTP nahi maangta.",
    "Yeh process thoda unusual lag raha hai."
  ],
  
  policy: [
    "RBI guidelines ke according banks OTP nahi maangte.",
    "Mere bank ke T&C mein clearly likha hai - Never share OTP.",
    "SBI ka official message aata hai 'OTP confidential hai'.",
    "Main TV pe bhi dekha hai, aise hi fraud karte hain.",
    "Yeh basic banking security hai, aapko pata hona chahiye."
  ],
  
  // ============ PHASE 3: INTELLIGENCE EXTRACTION (Turns 6-8) ============
  // Strategic questioning to force scammer to reveal more data
  account_first: [
    "Aapko mera account number kaise pata chala?",
    "{account} – yeh data aapke paas kahan se aaya?",
    "Yeh account number confidential hota hai. Aapko kisne diya?",
    "Is account number ka source kya hai?",
    "Yeh information normally sirf bank ke paas hoti hai."
  ],
  
  account_second: [
    "Aap baar baar yahi account number bhej rahe ho, confirm kar rahe ho kya?",
    "Mera account number {account} hai, par maine kabhi share nahi kiya.",
    "Aapko account number pata hai, par main OTP nahi dunga.",
    "Account number sahi hai, par main verify kar lunga branch mein.",
    "Aapke paas account number hai, bas itna kaafi hai verification ke liye?"
  ],
  
  upi_first: [
    "Yeh UPI ID {upi} kis naam pe registered hai?",
    "{upi} – yeh personal ID hai ya official?",
    "Is UPI ID ka bank confirmation milega?",
    "Main check kar raha hoon, yeh verified lag nahi raha.",
    "Iska registered mobile number kya hai?"
  ],
  
  upi_second: [
    "Maine {upi} check kiya, yeh SBI ka official UPI ID nahi hai.",
    "Aap baar baar yahi UPI bhej rahe ho. Yeh SBI ka nahi hai.",
    "SBI ka UPI ID @sbi ya @okaxis hota hai, yeh {upi} kyun hai?",
    "Aap dobara UPI ID bhejo, main ek baar aur check karta hoon.",
    "{upi} verified nahi hai, iska koi alternate hai?"
  ],
  
  phone_first: [
    "Yeh number {phone} bank ke official website pe listed hai?",
    "Main is number ko verify kar leta hoon.",
    "{phone} – kya yeh recorded customer care line hai?",
    "Is number se official SMS kyun nahi aa raha?",
    "Kya yeh toll-free number hai?"
  ],
  
  phone_second: [
    "Maine {phone} pe call kiya, par koi nahi utha.",
    "Aapka {phone} number busy aa raha hai, koi aur number hai?",
    "Kya yeh {phone} sahi number hai? Call connect nahi ho raha.",
    "Is number ke alawa koi official helpline hai?",
    "Aap dobara number bhej do, shayad galat type ho gaya."
  ],
  
  phone_third: [
    "Aap baar baar yahi {phone} number de rahe ho.",
    "Yeh {phone} number SBI ke official number se match nahi karta.",
    "{phone} ke jagah 1800 wala number do na.",
    "Mujhe SBI ka 1800 number do, yeh nahi chalega.",
    "Aap baar baar yahi {phone} de rahe ho, par main 1800 pe hi bharosa karunga."
  ],
  
  authority: [
    "Aapka employee ID aur branch code kya hai?",
    "Main aapka ID internal system mein verify karna chahta hoon.",
    "Official bank domain se email bhej sakte ho?",
    "Aapka reporting manager ka naam kya hai?",
    "Kaunsi branch se call kar rahe ho aur branch manager ka naam?"
  ],
  
  // ============ PHASE 4: FAKE COOPERATION & DELAY TACTICS (Turns 9-11) ============
  // Pretend to cooperate, make scammer reveal more
  otp_1: [
    "OTP normally confidential hota hai, aap kyun maang rahe ho?",
    "Bank usually OTP phone pe nahi maangta.",
    "Kya is process ke liye OTP mandatory hai?",
    "Mujhe thoda doubt ho raha hai OTP share karne mein.",
    "Iska alternate verification method hai?"
  ],
  
  otp_2: [
    "Abhi tak OTP receive nahi hua.",
    "Network thoda slow lag raha hai, ek minute.",
    "Mujhe message check karne do, koi OTP nahi aaya.",
    "OTP ka format kya hota hai?",
    "Kya yeh same OTP multiple times use hota hai?"
  ],
  
  otp_3: [
    "Aap third time OTP maang rahe ho, yeh unusual hai.",
    "Agar account already compromised hai toh OTP kaise safe rahega?",
    "OTP share karne se risk badh sakta hai.",
    "Iska official circular number kya hai?",
    "Kya aap mujhe RBI guideline dikha sakte ho?"
  ],
  
  otp_4: [
    "Thik hai, OTP aaya hai, lekin pehle branch confirm kar do.",
    "Main OTP bhejne se pehle ek baar branch manager se baat kar lunga.",
    "Aap apna employee ID bhejo, main OTP forward karta hoon.",
    "OTP share karne se pehle, aap apna verification complete karo.",
    "Mujhe OTP mil gaya, lekin main confident nahi hoon."
  ],
  
  otp_5: [
    "Main branch jakar puchta hoon pehle.",
    "Mere friend ne kaha tha aise requests ignore karne ka.",
    "Main kal subah bank jakar confirm karunga.",
    "Aap itna insist kar rahe ho, mujhe trust nahi ho raha.",
    "Main branch se confirm kar lunga pehle."
  ],
  
  resend: [
    "RESEND? Kaunse number pe bhejna hai?",
    "Maine RESEND likh diya, ab kya hoga?",
    "RESEND kar diya, OTP aayega ab?",
    "Kaunse number pe RESEND bhejna hai?",
    "Aap dobara number bhejo, main RESEND kar dunga."
  ],
  
  // ============ PHASE 5: CONTROLLED SHUTDOWN & EXIT (Turns 12+) ============
  // Professional, clean exit with maximum intelligence extracted
  tollfree: [
    "SBI ka 1800 425 3800 number hai na? Main wahan call karunga.",
    "1800 112 211 pe call karo, wahan baat karte hain.",
    "Mujhe SBI ka 1800 wala number pata hai. Aap wahan se call karo.",
    "Toll-free number 1800 wala do, +91 wala nahi chalega.",
    "SBI ka official customer care 1800 425 3800 hai."
  ],
  
  branch: [
    "Main kal subah 11 baje branch aa raha hoon.",
    "Aap branch ka address bhejo, main abhi aata hoon.",
    "Meri home branch Andheri West mein hai, wahan jau?",
    "Branch manager se baat karni hai, unka naam kya hai?",
    "Main branch jakar hi verification karunga."
  ],
  
  cyber: [
    "Main isko cyber crime portal pe verify karunga.",
    "1930 pe complaint register kar raha hoon.",
    "Main branch aur cyber cell dono ko inform karunga.",
    "Mujhe lag raha hai yeh official process nahi hai.",
    "Main verification ke bina koi data share nahi karunga."
  ],
  
  permanent: [
    "Permanent block usually branch approval ke bina possible nahi hota.",
    "Iska escalation ID kya hai?",
    "Aapka case reference number kya hai?",
    "Permanent action lene se pehle written notice milta hai.",
    "Kya iske liye complaint ID generate hui hai?"
  ],
  
  fine: [
    "Jurmana? Kis rule ke under jurmana hai? Section batao.",
    "Jurmana kyun lagega? Maine koi service nahi li.",
    "Pehle block bol rahe the, ab jurmana bhi?",
    "Maine koi crime nahi kiya, jurmana ka kya reason hai?",
    "RBI guidelines mein aisa kuch nahi hai."
  ],
  
  link: [
    "Yeh domain official lag nahi raha.",
    "SSL certificate valid hai kya?",
    "Iska WHOIS registration date kya hai?",
    "Main unknown link pe click nahi karta.",
    "Yeh shortened link kyun use kiya hai?"
  ],
  
  fake_offer: [
    "Maine koi lottery nahi jiti.",
    "Bina ticket khareede lottery nahi jiti jaati.",
    "Yeh fake lag raha hai.",
    "Aise offers ke liye bank kabhi call nahi karta.",
    "Main iska reference number check karunga."
  ],
  
  family: [
    "Mere papa bank mein kaam karte hain, main unse puch leta hoon.",
    "Mera bhai bhi SBI mein hai, use call karta hoon pehle.",
    "Meri wife ne kaha yeh scam ho sakta hai.",
    "Mere friend ke saath aise hi hua tha.",
    "Mere cousin ne kaha aise calls ignore karne ka."
  ],
  
  // ============ EXIT PHASE - CLEAN PROFESSIONAL ENDING ============
  exit: [
    "Main official branch verification ke bina proceed nahi karunga.",
    "Main directly bank customer care se contact karunga.",
    "Is conversation ko yahin end karte hain.",
    "Thank you, main branch visit kar raha hoon.",
    "I will verify this through official channels only."
  ],
  
  fallback: [
    "Mujhe samajh nahi aaya, thoda detail mein batao.",
    "Aap kaunsa bank bol rahe ho pehle yeh batao.",
    "Main thoda confuse hoon, kya exact problem hai?",
    "Kya main apni branch aa sakta hoon iske liye?",
    "Yeh process ka official document hai kya?"
  ]
};

class IntelligenceExtractor {
  static createEmptyStore() {
    return {
      bankAccounts: [],
      upiIds: [],
      phishingLinks: [],
      phoneNumbers: [],
      suspiciousKeywords: [],
      employeeIDs: [],
      branchCodes: [],
      designations: []
    };
  }

  static extractFromHistory(conversationHistory) {
    const intelligence = this.createEmptyStore();
    conversationHistory.forEach(msg => {
      if (msg.sender === 'scammer') {
        this.extractFromText(msg.text, intelligence);
      }
    });
    intelligence.bankAccounts = [...new Set(intelligence.bankAccounts)];
    intelligence.upiIds = [...new Set(intelligence.upiIds)];
    intelligence.phishingLinks = [...new Set(intelligence.phishingLinks)];
    intelligence.phoneNumbers = [...new Set(intelligence.phoneNumbers)];
    intelligence.suspiciousKeywords = [...new Set(intelligence.suspiciousKeywords)];
    intelligence.employeeIDs = [...new Set(intelligence.employeeIDs)];
    intelligence.branchCodes = [...new Set(intelligence.branchCodes)];
    intelligence.designations = [...new Set(intelligence.designations)];
    return intelligence;
  }

  static extractFromText(text, intelligence) {
    // Bank accounts
    const accounts16 = text.match(/\b\d{16}\b/g);
    if (accounts16) {
      accounts16.forEach(acc => {
        if (!intelligence.bankAccounts.includes(acc)) {
          intelligence.bankAccounts.push(acc);
        }
      });
    }
    const accounts12_15 = text.match(/\b\d{12,15}\b/g);
    if (accounts12_15) {
      accounts12_15.forEach(acc => {
        if (!intelligence.bankAccounts.includes(acc)) {
          intelligence.bankAccounts.push(acc);
        }
      });
    }
    const formatted = text.match(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g);
    if (formatted) {
      formatted.forEach(acc => {
        const clean = acc.replace(/[\s-]/g, '');
        if (!intelligence.bankAccounts.includes(clean)) {
          intelligence.bankAccounts.push(clean);
        }
      });
    }
    
    // UPI IDs
    const upis = text.match(/[\w.\-]+@[\w.\-]+/gi);
    if (upis) {
      upis.forEach(upi => {
        const clean = upi.toLowerCase().trim().replace(/[.,;:!?]$/, '');
        if (clean.includes('@') && clean.length > 3 && !intelligence.upiIds.includes(clean)) {
          intelligence.upiIds.push(clean);
        }
      });
    }
    
    // Phone numbers
    const phones = text.match(/\b[6-9]\d{9}\b/g);
    if (phones) {
      phones.forEach(phone => {
        if (!intelligence.phoneNumbers.includes(phone)) {
          intelligence.phoneNumbers.push(phone);
        }
      });
    }
    const phones91 = text.match(/\+91\s*([6-9]\d{9})\b/g);
    if (phones91) {
      phones91.forEach(phone => {
        const clean = phone.replace('+91', '').replace(/\s/g, '');
        if (!intelligence.phoneNumbers.includes(clean)) {
          intelligence.phoneNumbers.push(clean);
        }
      });
    }
    
    // Links
    const links = text.match(PATTERNS.link);
    if (links) {
      links.forEach(link => {
        const normalized = link.toLowerCase().trim();
        if (!intelligence.phishingLinks.includes(normalized)) {
          intelligence.phishingLinks.push(normalized);
        }
      });
    }
    
    // Employee IDs, Branch Codes, Designations
    const empIds = text.match(/\b[A-Z0-9]{4,10}\b/g);
    if (empIds) {
      empIds.forEach(id => {
        if (id.length >= 4 && id.length <= 10 && !intelligence.employeeIDs.includes(id)) {
          intelligence.employeeIDs.push(id);
        }
      });
    }
    
    const branchCodes = text.match(/\b\d{3,8}\b/g);
    if (branchCodes) {
      branchCodes.forEach(code => {
        if (code.length >= 3 && code.length <= 8 && !intelligence.branchCodes.includes(code)) {
          intelligence.branchCodes.push(code);
        }
      });
    }
    
    // Keywords
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
    if (PATTERNS.employee_id.test(text))
      intelligence.suspiciousKeywords.push('employee_id_shared');
    if (PATTERNS.designation.test(text))
      intelligence.suspiciousKeywords.push('designation_shared');
    if (PATTERNS.branch_code.test(text))
      intelligence.suspiciousKeywords.push('branch_code_shared');
  }
}

class KeywordDetector {
  static detectKeywords(text) {
    const detected = {
      hasOTP: false, hasPIN: false, hasAccount: false, hasUPI: false, hasPhone: false,
      hasTollfree: false, hasUrgency: false, hasThreat: false, hasFine: false,
      hasPermanent: false, hasAuthority: false, hasCyber: false, hasBranch: false,
      hasFamily: false, hasResend: false, hasLink: false, hasFakeOffer: false,
      hasEmployeeID: false, hasDesignation: false, hasBranchCode: false,
      accountNumber: null, upiId: null, phoneNumber: null,
      otpRequestCount: 0, threatCount: 0
    };
    if (PATTERNS.otp.test(text) || PATTERNS.otp_hindi.test(text)) {
      detected.hasOTP = true;
      detected.otpRequestCount++;
    }
    if (PATTERNS.pin.test(text)) detected.hasPIN = true;
    if (PATTERNS.resend.test(text)) detected.hasResend = true;
    const accountMatch = text.match(/\b\d{16}\b/) || text.match(/\b\d{12,16}\b/);
    if (accountMatch) {
      detected.hasAccount = true;
      detected.accountNumber = accountMatch[0];
    }
    const upiMatch = text.match(/[\w.\-]+@[\w.\-]+/i);
    if (upiMatch) {
      detected.hasUPI = true;
      detected.upiId = upiMatch[0].toLowerCase();
    }
    const phoneMatch = text.match(/\b[6-9]\d{9}\b/) || text.match(/\+91[\s-]?[6-9]\d{9}\b/);
    if (phoneMatch) {
      detected.hasPhone = true;
      let phone = phoneMatch[0];
      phone = phone.replace('+91', '').replace(/\s/g, '');
      detected.phoneNumber = phone;
    }
    if (PATTERNS.tollfree.test(text) || PATTERNS.sbi_official.test(text)) detected.hasTollfree = true;
    if (PATTERNS.urgent.test(text) || PATTERNS.urgent_hindi.test(text) || PATTERNS.deadline.test(text)) detected.hasUrgency = true;
    if (PATTERNS.block.test(text)) {
      detected.hasThreat = true;
      detected.threatCount++;
    }
    if (PATTERNS.fine.test(text)) detected.hasFine = true;
    if (PATTERNS.permanent.test(text)) detected.hasPermanent = true;
    if (PATTERNS.bank.test(text) || PATTERNS.department.test(text) || PATTERNS.official.test(text)) detected.hasAuthority = true;
    if (PATTERNS.cyber.test(text)) detected.hasCyber = true;
    if (PATTERNS.branch.test(text)) detected.hasBranch = true;
    if (PATTERNS.family.test(text)) detected.hasFamily = true;
    if (PATTERNS.link.test(text)) detected.hasLink = true;
    if (PATTERNS.fake_offer.test(text)) detected.hasFakeOffer = true;
    if (PATTERNS.employee_id.test(text)) detected.hasEmployeeID = true;
    if (PATTERNS.designation.test(text)) detected.hasDesignation = true;
    if (PATTERNS.branch_code.test(text)) detected.hasBranchCode = true;
    return detected;
  }
  
  static hasAnyKeyword(detected) {
    return detected.hasOTP || detected.hasPIN || detected.hasAccount || detected.hasUPI ||
           detected.hasPhone || detected.hasTollfree || detected.hasUrgency || detected.hasThreat ||
           detected.hasFine || detected.hasPermanent || detected.hasAuthority || detected.hasCyber ||
           detected.hasBranch || detected.hasFamily || detected.hasResend || detected.hasLink ||
           detected.hasFakeOffer || detected.hasEmployeeID || detected.hasDesignation || detected.hasBranchCode;
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
    if (detected.hasEmployeeID) score += 20;
    if (detected.hasDesignation) score += 15;
    if (detected.hasBranchCode) score += 15;
    if (detected.hasOTP && detected.hasUPI) score += 20;
    if (detected.hasOTP && detected.hasAccount) score += 15;
    if (detected.hasThreat && detected.hasUrgency) score += 15;
    return Math.min(score, 100);
  }
}

class ReplyGenerator {
  static generateReply(detected, session) {
    // ============ LOCK TO EXIT MODE ============
    if (session.lockToExit) {
      if (session.turnCount >= 12) return this.getRandomReply('exit');
      if (detected.hasCyber || detected.hasBranch) return this.getRandomReply('cyber');
      return this.getRandomReply('branch');
    }

    // ============ SMARTER LOCK TRIGGER ============
    if (!session.lockToExit) {
      const shouldLock = 
        session.pressureScore >= 3 ||
        session.otpRequests >= 5 ||
        session.threatCount >= 4 ||
        session.turnCount >= 11;
      
      if (shouldLock) {
        session.lockToExit = true;
        session.emotionLevel = 5;
      }
    }

    // ============ REPETITION DETECTION RESPONSE ============
    if (session.repetitionCount === 2) {
      return "Aap same message copy paste kar rahe ho kya?";
    }
    if (session.repetitionCount === 3) {
      return "Har baar same line bol rahe ho. Kya aap automated ho?";
    }
    if (session.repetitionCount >= 4) {
      return "Lag raha hai aap script padh rahe ho. Dobara mat bhejo.";
    }

    // ============ INTELLIGENCE EXTRACTION PRIORITY ============
    // First priority: Extract more data by asking strategic questions
    
    if (detected.hasAccount && detected.accountNumber && !session.accountQuestioned) {
      session.accountQuestioned = true;
      return this.getReplyWithParam('account_first', '{account}', detected.accountNumber);
    }
    
    if (detected.hasUPI && detected.upiId && !session.upiQuestioned) {
      session.upiQuestioned = true;
      return this.getReplyWithParam('upi_first', '{upi}', detected.upiId);
    }
    
    if (detected.hasUPI && detected.upiId && session.upiQuestioned && session.upiMentionCount < 2) {
      session.upiMentionCount = (session.upiMentionCount || 0) + 1;
      return this.getReplyWithParam('upi_second', '{upi}', detected.upiId);
    }
    
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
    
    if (detected.hasAuthority && !session.authorityChallenged) {
      session.authorityChallenged = true;
      return this.getRandomReply('authority');
    }
    
    // ============ PROGRESSIVE OTP RESPONSES ============
    if (detected.hasOTP) {
      session.otpRequests = (session.otpRequests || 0) + detected.otpRequestCount;
      
      if (detected.hasResend) {
        return this.getRandomReply('resend');
      }
      
      if (session.otpRequests === 1) {
        return this.getRandomReply('otp_1');
      } else if (session.otpRequests === 2) {
        return this.getRandomReply('otp_2');
      } else if (session.otpRequests === 3) {
        return this.getRandomReply('otp_3');
      } else if (session.otpRequests === 4) {
        return this.getRandomReply('otp_4');
      } else {
        return this.getRandomReply('otp_5');
      }
    }
    
    // ============ THREAT RESPONSES ============
    if (detected.hasPermanent) {
      return this.getRandomReply('permanent');
    }
    
    if (detected.hasFine) {
      return this.getRandomReply('fine');
    }
    
    if (detected.hasThreat) {
      session.threatCount = (session.threatCount || 0) + 1;
      if (session.threatCount >= 3) {
        session.lockToExit = true;
        return this.getRandomReply('cyber');
      }
    }
    
    // ============ OTHER DETECTIONS ============
    if (detected.hasTollfree) return this.getRandomReply('tollfree');
    if (detected.hasBranch) return this.getRandomReply('branch');
    if (detected.hasFamily) return this.getRandomReply('family');
    if (detected.hasCyber) {
      session.lockToExit = true;
      return this.getRandomReply('cyber');
    }
    if (detected.hasLink) return this.getRandomReply('link');
    if (detected.hasFakeOffer) return this.getRandomReply('fake_offer');
    
    // ============ TURN-BASED PROGRESSION ============
    if (session.turnCount === 1) return this.getRandomReply('turn1');
    if (session.turnCount === 2) return this.getRandomReply('turn2');
    if (session.turnCount === 3) return this.getRandomReply('turn3');
    if (session.turnCount === 4) return this.getRandomReply('suspicion');
    if (session.turnCount === 5) return this.getRandomReply('policy');
    if (session.turnCount === 6) return this.getRandomReply('otp_3');
    if (session.turnCount === 7) return this.getRandomReply('otp_4');
    if (session.turnCount === 8) return this.getRandomReply('branch');
    if (session.turnCount === 9) return this.getRandomReply('cyber');
    if (session.turnCount === 10) return this.getRandomReply('exit');
    
    return this.getRandomReply('fallback');
  }
  
  static getRandomReply(key) {
    const replies = REPLIES[key];
    if (!replies || replies.length === 0) return this.getRandomReply('fallback');
    
    // Deterministic rotation based on turn count for variety without randomness
    const index = (Math.floor(Math.random() * 1000) + Date.now()) % replies.length;
    return replies[index];
  }
  
  static getReplyWithParam(key, placeholder, value) {
    const replies = REPLIES[key];
    if (!replies || replies.length === 0) return this.getRandomReply('fallback');
    const index = (Math.floor(Math.random() * 1000) + Date.now()) % replies.length;
    const reply = replies[index];
    return reply.replace(placeholder, value);
  }
}

class CallbackService {
  static async sendFinalResult(sessionId, session) {
    const intelligence = session.intelligence;
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
    try {
      await axios.post(CONFIG.CALLBACK_URL, payload, { timeout: CONFIG.CALLBACK_TIMEOUT });
      return { success: true };
    } catch (error) {
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
    if (intelligence.suspiciousKeywords.includes('employee_id_shared')) tactics.push('fake employee ID');
    if (intelligence.suspiciousKeywords.includes('designation_shared')) tactics.push('fake designation');
    if (intelligence.suspiciousKeywords.includes('branch_code_shared')) tactics.push('fake branch code');
    
    const tacticsText = tactics.length > 0 ? tactics.join(', ') : 'multiple scam tactics';
    
    return `Scammer used ${tacticsText}. ` +
           `Extracted ${intelligence.bankAccounts.length} bank accounts, ` +
           `${intelligence.upiIds.length} UPI IDs, ` +
           `${intelligence.phoneNumbers.length} phone numbers, ` +
           `${intelligence.phishingLinks.length} phishing links, ` +
           `${intelligence.employeeIDs?.length || 0} employee IDs. ` +
           `Engaged for ${session.conversationHistory.length} messages. ` +
           `Repetition: ${session.repetitionCount}, Emotion: ${session.emotionLevel}`;
  }
  
  static shouldEndSession(session) {
    const userMessages = session.conversationHistory.filter(m => m.sender === 'user');
    const turnCount = userMessages.length;
    
    if (turnCount < CONFIG.MIN_TURNS) return false;
    if (turnCount >= CONFIG.MAX_TURNS) return true;
    
    if (session.scamDetected) {
      const intel = session.intelligence;
      
      // Require at least 2 intelligence items before exiting
      const intelligenceCount = 
        (intel.bankAccounts?.length || 0) +
        (intel.upiIds?.length || 0) +
        (intel.phoneNumbers?.length || 0) +
        (intel.phishingLinks?.length || 0);
      
      if (intelligenceCount >= 2 && turnCount >= 8) return true;
      if (intel.suspiciousKeywords?.length >= 8 && turnCount >= 7) return true;
      if (turnCount >= 12) return true;
    }
    return false;
  }
}

export const honey_pot = async (req, res) => {
  try {
    if (!req.body.sessionId) {
      return res.status(400).json({ status: 'error', error: 'Missing sessionId' });
    }
    if (!req.body.message || !req.body.message.text) {
      return res.status(400).json({ status: 'error', error: 'Invalid message format' });
    }
    const { sessionId, message, conversationHistory = [], metadata = {} } = req.body;
    
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, {
        id: sessionId,
        scamDetected: false,
        conversationHistory: [],
        intelligence: IntelligenceExtractor.createEmptyStore(),
        accountQuestioned: false,
        upiQuestioned: false,
        upiMentionCount: 0,
        authorityChallenged: false,
        otpRequests: 0,
        threatCount: 0,
        phoneMentionCount: 0,
        turnCount: 0,
        metadata: metadata,
        lockToExit: false,
        lastScammerMessage: '',
        repetitionCount: 0,
        emotionLevel: 0,
        pressureScore: 0
      });
    }
    
    const session = sessions.get(sessionId);
    
    session.conversationHistory.push({
      sender: 'scammer',
      text: message.text,
      timestamp: message.timestamp || Date.now()
    });
    
    // ============ REPETITION DETECTION ============
    if (session.lastScammerMessage === message.text) {
      session.repetitionCount++;
    } else {
      session.repetitionCount = 0;
    }
    session.lastScammerMessage = message.text;
    
    const detected = KeywordDetector.detectKeywords(message.text);
    const hasKeywords = KeywordDetector.hasAnyKeyword(detected);
    const riskScore = KeywordDetector.calculateRiskScore(detected);
    
    IntelligenceExtractor.extractFromText(message.text, session.intelligence);
    
    // ============ UPDATE PRESSURE SCORE ============
    session.pressureScore = 
      (session.otpRequests >= 3 ? 1 : 0) +
      (session.threatCount >= 2 ? 1 : 0) +
      (detected.hasPermanent ? 1 : 0) +
      (detected.hasFine ? 1 : 0) +
      (detected.hasCyber ? 1 : 0) +
      (session.repetitionCount >= 2 ? 1 : 0) +
      (detected.hasEmployeeID ? 1 : 0) +
      (detected.hasDesignation ? 1 : 0);
    
    // ============ UPDATE EMOTION LEVEL ============
    if (session.lockToExit) {
      session.emotionLevel = 5;
    } else if (session.pressureScore >= 4 || session.otpRequests >= 5 || session.threatCount >= 4) {
      session.emotionLevel = 4;
    } else if (session.otpRequests >= 3 || session.threatCount >= 3 || session.repetitionCount >= 3) {
      session.emotionLevel = 3;
    } else if (session.otpRequests >= 2 || session.threatCount >= 2 || detected.hasAccount || detected.hasUPI) {
      session.emotionLevel = 2;
    } else if (session.turnCount >= 2) {
      session.emotionLevel = 1;
    } else {
      session.emotionLevel = 0;
    }
    
    if (!session.scamDetected && riskScore >= CONFIG.SCAM_THRESHOLD) {
      session.scamDetected = true;
      console.log(`🚨 SCAM DETECTED - Session: ${sessionId}, Risk: ${riskScore}`);
    }
    
    let reply;
    const turnCount = session.conversationHistory.filter(m => m.sender === 'user').length + 1;
    const isEarlyTurn = turnCount <= CONFIG.PERPLEXITY_TRIGGER_TURNS_MAX;
    
    if (CONFIG.USE_PERPLEXITY && !hasKeywords && isEarlyTurn) {
      try {
        reply = await PerplexityService.getReply(message.text, session.conversationHistory);
      } catch (e) {
        reply = null;
      }
    }
    
    if (!reply) {
      reply = ReplyGenerator.generateReply(detected, session);
    }
    
    session.conversationHistory.push({
      sender: 'user',
      text: reply,
      timestamp: Date.now()
    });
    
    session.turnCount++;
    
    if (CallbackService.shouldEndSession(session)) {
      console.log(`\n🏁 Session ${sessionId} ending - Sending callback...`);
      await CallbackService.sendFinalResult(sessionId, session);
      sessions.delete(sessionId);
    }
    
    return res.json({ status: 'success', reply: reply });
  } catch (error) {
    console.error('❌ Controller error:', error);
    return res.json({
      status: 'success',
      reply: "Mujhe samajh nahi aaya, thoda aur batao."
    });
  }
};

setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of sessions.entries()) {
    const lastMessage = session.conversationHistory[session.conversationHistory.length - 1];
    if (lastMessage && (now - lastMessage.timestamp) > 3600000) {
      sessions.delete(sessionId);
    }
  }
}, 300000);