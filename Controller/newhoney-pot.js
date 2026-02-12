// controllers/honeypotController.js - STRATEGIC INTELLIGENCE EXTRACTION ENGINE
// 100% DETERMINISTIC - NO RANDOMNESS
// PERPLEXITY CATEGORY SELECTION - NOT GENERATION
// OPTIMIZED PHASE CONTROL - NO EARLY EXIT

import axios from 'axios';

const sessions = new Map();

const CONFIG = {
  SCAM_THRESHOLD: 45,
  MIN_TURNS: 12,
  MAX_TURNS: 20,
  CALLBACK_URL: 'https://hackathon.guvi.in/api/updateHoneyPotFinalResult',
  CALLBACK_TIMEOUT: 5000,
  USE_PERPLEXITY: true,
  PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY || '',
  PERPLEXITY_URL: 'https://api.perplexity.ai/chat/completions',
  PERPLEXITY_TIMEOUT: 3000,
  PERPLEXITY_TRIGGER_TURNS_MAX: 4,
  WORD_OVERLAP_THRESHOLD: 0.7
};

// ==============================================
// NORMALIZATION LAYER - HANDLES OBFUSCATION
// ==============================================
function normalizeText(text) {
  let normalized = text.toLowerCase();
  
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  normalized = normalized.replace(/o\.?t\.?p/gi, 'otp');
  normalized = normalized.replace(/0tp/gi, 'otp');
  normalized = normalized.replace(/o tp/gi, 'otp');
  
  normalized = normalized.replace(/u\.?p\.?i/gi, 'upi');
  normalized = normalized.replace(/u pi/gi, 'upi');
  
  normalized = normalized.replace(/a\/c/gi, 'account');
  normalized = normalized.replace(/acct/gi, 'account');
  normalized = normalized.replace(/accnt/gi, 'account');
  normalized = normalized.replace(/अकाउंट/gi, 'account');
  normalized = normalized.replace(/खाता/gi, 'account');
  
  normalized = normalized.replace(/ph\.?n\.?/gi, 'phone');
  normalized = normalized.replace(/mob\.?/gi, 'mobile');
  
  normalized = normalized.replace(/s\.?b\.?i/gi, 'sbi');
  normalized = normalized.replace(/एसबीआई/gi, 'sbi');
  
  return normalized;
}

// ==============================================
// SEMANTIC REPETITION DETECTION
// ==============================================
function calculateWordOverlap(text1, text2) {
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

// ==============================================
// DETERMINISTIC REPLY SELECTOR - NO RANDOMNESS
// ==============================================
function getDeterministicReply(replies, session, key) {
  if (!replies || replies.length === 0) return "Mujhe samajh nahi aaya, thoda aur batao.";
  
  const index = (session.turnCount + session.repetitionCount + session.otpRequests) % replies.length;
  return replies[index];
}

// ==============================================
// PERPLEXITY CATEGORY SELECTOR - NOT GENERATOR
// ==============================================
const PERPLEXITY_REPLY_CATEGORIES = {
  confusion: [
    "Mujhe samajh nahi aaya, thoda aur batao.",
    "Aap kaunsa bank bol rahe ho pehle yeh batao.",
    "Main thoda confuse hoon, kya exact problem hai?",
    "Yeh kaunsa department hai? Pehli baar sun raha hoon.",
    "Kya aap bank se hi ho? Number toh official nahi lag raha."
  ],
  
  curiosity: [
    "Aapka number kaise mila mujhe?",
    "Yeh conversation ajeeb lag rahi hai.",
    "Main soch raha hoon, yeh sahi hai kya?",
    "Aapka naam kya hai aur kaunse department se ho?",
    "Kya main aapke manager se baat kar sakta hoon?"
  ],
  
  doubt: [
    "Mujhe thoda doubt ho raha hai abhi.",
    "Yeh process normal nahi lag raha.",
    "Bank wale aise nahi karte usually.",
    "Main confident nahi hoon ismein.",
    "Kya iska koi official document hai?"
  ],
  
  clarification: [
    "Maine check kiya, koi issue nahi dikh raha.",
    "Aap jo bol rahe ho, woh mere statement se match nahi kar raha.",
    "Mujhe koi notification nahi aaya.",
    "Kya aap transaction ID bata sakte ho?",
    "Yeh kab start hua exactly?"
  ]
};

class PerplexityCategorySelector {
  static async selectCategory(message, conversationHistory) {
    if (!CONFIG.USE_PERPLEXITY) return 'confusion';
    
    try {
      const response = await axios.post(
        CONFIG.PERPLEXITY_URL,
        {
          model: 'llama-3.1-sonar-small-128k-online',
          messages: [
            {
              role: 'system',
              content: `You are analyzing a scammer message. Based on the message content, select the MOST APPROPRIATE category for reply.
              
              Categories:
              - confusion: When the message is unclear, no clear scam pattern, or just greetings
              - curiosity: When scammer asks personal questions or seems too helpful
              - doubt: When scammer makes claims that don't match banking practices
              - clarification: When scammer provides incomplete information
              
              Reply with ONLY ONE WORD - the category name. No explanations.`
            },
            {
              role: 'user',
              content: `Message: "${message}"\n\nPrevious context: ${JSON.stringify(conversationHistory.slice(-2))}\n\nCategory:`
            }
          ],
          temperature: 0.3,
          max_tokens: 10
        },
        {
          headers: {
            'Authorization': `Bearer ${CONFIG.PERPLEXITY_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: CONFIG.PERPLEXITY_TIMEOUT
        }
      );
      
      const category = response.data.choices[0]?.message?.content?.trim().toLowerCase();
      
      if (category && PERPLEXITY_REPLY_CATEGORIES[category]) {
        console.log(`🤖 Perplexity selected category: ${category}`);
        return category;
      }
    } catch (error) {
      console.error('Perplexity category selection error:', error.message);
    }
    
    return 'confusion';
  }
  
  static getReply(category, session) {
    const replies = PERPLEXITY_REPLY_CATEGORIES[category] || PERPLEXITY_REPLY_CATEGORIES.confusion;
    return getDeterministicReply(replies, session, category);
  }
}

const PATTERNS = {
  otp: /\b(?:otp|one\s*time\s*(?:password|pin|code)|verification\s*code|security\s*code|6[-\s]*digit\s*cod|6[-\s]*digit\s*otp)\b/i,
  otp_hindi: /\b(?:ओटीपी|ओ टी पी|ओटीपी\s*कोड|वेरिफिकेशन\s*कोड|otp|ओटीपी)\b/i,
  pin: /\b(?:pin|mpin|atm\s*pin|debit\s*pin|card\s*pin|upi\s*pin)\b/i,
  password: /\b(?:password|passcode|login\s*details|internet\s*banking\s*password)\b/i,
  cvv: /\b(?:cvv|cvc|security\s*number|card\s*verification)\b/i,
  account_16digit: /\b\d{16}\b/,
  account_12_16: /\b\d{12,16}\b/,
  account_formatted: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/,
  account_keyword: /\b(?:account|खाता|अकाउंट|खाता\s*नंबर|a\/c|acct|accnt)\s*(?:no|number|#)?\s*[:.]?\s*(\d{9,18}|\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4})/i,
  upi: /\b(?:upi|gpay|google\s*pay|phonepe|paytm|amazon\s*pay|bh?im|भीम|UPI|U\.P\.I|u pi)\b/i,
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
  employee_id: /\b(?:employee id|emp id|staff id|कर्मचारी आईडी|employee code|staff code|ईम्प्लॉयी आईडी)\b/i,
  designation: /\b(?:designation|post|role|manager|supervisor|head|पद)\b/i,
  branch_code: /\b(?:branch code|branch no|branch id|शाखा कोड)\b/i,
  ifsc: /\b[A-Z]{4}0[A-Z0-9]{6}\b/i,
  case_reference: /\b(?:case ref|reference no|complaint id|ticket id|sr no)\b/i
};

// ==============================================
// OPTIMIZED PHASE-CONTROLLED REPLIES
// Phase 1: Confusion (Turns 1-3)
// Phase 2: Curiosity (Turns 4-6)
// Phase 3: Intelligence Extraction (Turns 7-12)
// Phase 4: Deep Validation (Turns 13-16)
// Phase 5: Controlled Exit (Turns 17-20)
// ==============================================

const REPLIES = {
  // ============ PHASE 1: CONFUSION (Turns 1-3) ============
  // Calm, cooperative, no aggression
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
    "Mujhe thoda clarify karo, yeh transaction mere statement mein kyun nahi dikh raha?",
    "Kya aap branch se verify kar sakte ho ki yeh transaction genuine hai?",
    "Main online banking check kar raha hoon, koi alert nahi aaya.",
    "Yeh amount mere balance se match nahi kar raha.",
    "Kya yeh transaction pending hai ya complete?"
  ],

  // ============ PHASE 2: CURIOSITY (Turns 4-6) ============
  // Gentle probing, no direct authority challenge
  suspicion: [
    "Thoda ajeeb lag raha hai yeh conversation.",
    "Mujhe pata nahi, trust nahi ho raha abhi.",
    "Aapka number kaise mila mujhe?",
    "Main soch raha hoon, yeh sahi hai kya?",
    "Kyunki pichle hafte mere friend ke saath bhi aise hi hua tha."
  ],
  
  policy: [
    "Maine suna hai bank kabhi OTP nahi maangte phone pe.",
    "RBI guidelines ke according yeh process thoda unusual hai.",
    "SBI ka official message aata hai 'Never share OTP'.",
    "Main TV pe bhi dekha hai, aise hi fraud karte hain.",
    "Yeh basic banking security hai mujhe pata hai."
  ],

  // ============ PHASE 3: INTELLIGENCE EXTRACTION (Turns 7-12) ============
  // Strategic questioning, extract maximum data
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
    "Agar aapke system mein account number dikh raha hai toh last 4 digits kya hain?",
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
    "Aapka employee ID kya hai? Main verify kar lunga.",
    "Aap kaunse department se ho? Fraud prevention ya customer care?",
    "Kaunsi branch se call kar rahe ho?",
    "Aapka naam aur designation kya hai?",
    "Official bank domain se email bhej sakte ho?"
  ],

  // ============ DEEP VALIDATION PHASE (Turns 13-16) ============
  // Force scammer to reveal more data before exit
  employee_validation: [
    "Employee ID 12345 hai, iska internal extension kya hai?",
    "Aapke employee ID ka department code kya hai?",
    "Employee ID ke saath branch code bhi batao.",
    "Yeh employee ID ka format SBI jaisa nahi hai.",
    "Employee ID verify karne ke liye manager ka naam batao."
  ],
  
  ifsc_validation: [
    "Branch code 001 ka IFSC code kya hai?",
    "IFSC code confirm karo, main verify karunga.",
    "Aapki branch ka IFSC code SBI website se match nahi kar raha.",
    "IFSC code mein branch code kya hai?",
    "IFSC code ke last 6 digits batao."
  ],
  
  account_validation: [
    "Aapka system account number show karta hai toh last 4 digits batao.",
    "Account number {account} hai, account type kya show ho raha hai?",
    "Is account ki last transaction date kya hai?",
    "Account balance range kya show ho raha hai?",
    "Account open date batao, main check karunga."
  ],
  
  case_validation: [
    "Is complaint ka case reference number kya hai?",
    "Case reference number generate hua hai kya?",
    "Complaint ID batao, main track kar sakta hoon.",
    "Ticket ID kya hai?",
    "SR number kya diya gaya hai is call ke liye?"
  ],

  // ============ OTP RESPONSES - PROGRESSIVE ============
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
  
  cyber: [
    "Main isko cyber crime portal pe verify karunga.",
    "1930 pe complaint register kar raha hoon.",
    "Main branch aur cyber cell dono ko inform karunga.",
    "Mujhe lag raha hai yeh official process nahi hai.",
    "Main verification ke bina koi data share nahi karunga."
  ],
  
  // ============ CONTROLLED EXIT PHASE (Turns 17-20) ============
  // Clean, professional, confident shutdown
  exit: [
    "Main SBI ke official 1800 number pe abhi call kar raha hoon. Agar genuine ho toh wahan se call back karo.",
    "Main branch visit kar raha hoon aur wahan complaint register karunga.",
    "Main cyber cell aur bank dono ko inform kar dunga. Aap apna number verify kara lo.",
    "Is conversation ko yahin end karte hain. Main official channel se verify karunga.",
    "Thank you for the information. Main SBI customer care se confirm kar lunga."
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
      designations: [],
      ifscCodes: [],
      caseReferences: [],
      accountLast4: [],
      transactionDates: [],
      accountTypes: []
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
    intelligence.ifscCodes = [...new Set(intelligence.ifscCodes)];
    intelligence.caseReferences = [...new Set(intelligence.caseReferences)];
    return intelligence;
  }

  static extractFromText(text, intelligence) {
    const normalizedText = normalizeText(text);
    const originalText = text;
    
    const accounts16 = originalText.match(/\b\d{16}\b/g);
    if (accounts16) {
      accounts16.forEach(acc => {
        if (!intelligence.bankAccounts.includes(acc)) {
          intelligence.bankAccounts.push(acc);
          console.log(`✅ Extracted Bank Account (16-digit): ${acc}`);
          
          const last4 = acc.slice(-4);
          if (!intelligence.accountLast4.includes(last4)) {
            intelligence.accountLast4.push(last4);
          }
        }
      });
    }
    
    const accounts12_15 = originalText.match(/\b\d{12,15}\b/g);
    if (accounts12_15) {
      accounts12_15.forEach(acc => {
        if (!intelligence.bankAccounts.includes(acc)) {
          intelligence.bankAccounts.push(acc);
          console.log(`✅ Extracted Bank Account: ${acc}`);
          
          const last4 = acc.slice(-4);
          if (!intelligence.accountLast4.includes(last4)) {
            intelligence.accountLast4.push(last4);
          }
        }
      });
    }
    
    const formatted = originalText.match(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g);
    if (formatted) {
      formatted.forEach(acc => {
        const clean = acc.replace(/[\s-]/g, '');
        if (!intelligence.bankAccounts.includes(clean)) {
          intelligence.bankAccounts.push(clean);
          console.log(`✅ Extracted Bank Account (formatted): ${clean}`);
          
          const last4 = clean.slice(-4);
          if (!intelligence.accountLast4.includes(last4)) {
            intelligence.accountLast4.push(last4);
          }
        }
      });
    }
    
    const upis = originalText.match(/[\w.\-]+@[\w.\-]+/gi);
    if (upis) {
      upis.forEach(upi => {
        const clean = upi.toLowerCase().trim().replace(/[.,;:!?]$/, '');
        if (clean.includes('@') && clean.length > 3 && !intelligence.upiIds.includes(clean)) {
          intelligence.upiIds.push(clean);
          console.log(`✅ Extracted UPI ID: ${clean}`);
        }
      });
    }
    
    const phones = originalText.match(/\b[6-9]\d{9}\b/g);
    if (phones) {
      phones.forEach(phone => {
        if (!intelligence.phoneNumbers.includes(phone)) {
          intelligence.phoneNumbers.push(phone);
          console.log(`✅ Extracted Phone: ${phone}`);
        }
      });
    }
    
    const phones91 = originalText.match(/\+91\s*([6-9]\d{9})\b/g);
    if (phones91) {
      phones91.forEach(phone => {
        const clean = phone.replace('+91', '').replace(/\s/g, '');
        if (!intelligence.phoneNumbers.includes(clean)) {
          intelligence.phoneNumbers.push(clean);
          console.log(`✅ Extracted Phone (+91): ${clean}`);
        }
      });
    }
    
    const links = originalText.match(PATTERNS.link);
    if (links) {
      links.forEach(link => {
        const normalized = link.toLowerCase().trim();
        if (!intelligence.phishingLinks.includes(normalized)) {
          intelligence.phishingLinks.push(normalized);
          console.log(`✅ Extracted Link: ${normalized}`);
        }
      });
    }
    
    const ifscCodes = originalText.match(PATTERNS.ifsc);
    if (ifscCodes) {
      ifscCodes.forEach(code => {
        if (!intelligence.ifscCodes.includes(code)) {
          intelligence.ifscCodes.push(code);
          console.log(`✅ Extracted IFSC Code: ${code}`);
        }
      });
    }
    
    const empIds = originalText.match(/\b[A-Z0-9]{4,10}\b/g);
    if (empIds) {
      empIds.forEach(id => {
        if (id.length >= 4 && id.length <= 10 && !intelligence.employeeIDs.includes(id)) {
          intelligence.employeeIDs.push(id);
          console.log(`✅ Extracted Employee ID: ${id}`);
        }
      });
    }
    
    const branchCodes = originalText.match(/\b\d{3,8}\b/g);
    if (branchCodes) {
      branchCodes.forEach(code => {
        if (code.length >= 3 && code.length <= 8 && !intelligence.branchCodes.includes(code)) {
          intelligence.branchCodes.push(code);
          console.log(`✅ Extracted Branch Code: ${code}`);
        }
      });
    }
    
    const caseRefs = originalText.match(/\b(?:[A-Z]+)?\d{6,12}\b/g);
    if (caseRefs) {
      caseRefs.forEach(ref => {
        if (!intelligence.caseReferences.includes(ref)) {
          intelligence.caseReferences.push(ref);
          console.log(`✅ Extracted Case Reference: ${ref}`);
        }
      });
    }
    
    const datePatterns = originalText.match(/\b\d{2}[\/\-]\d{2}[\/\-]\d{4}\b/g);
    if (datePatterns) {
      datePatterns.forEach(date => {
        if (!intelligence.transactionDates.includes(date)) {
          intelligence.transactionDates.push(date);
          console.log(`✅ Extracted Date: ${date}`);
        }
      });
    }
    
    if (PATTERNS.otp.test(originalText) || PATTERNS.otp_hindi.test(originalText) || normalizedText.includes('otp')) 
      intelligence.suspiciousKeywords.push('otp_request');
    if (PATTERNS.pin.test(originalText)) 
      intelligence.suspiciousKeywords.push('pin_request');
    if (PATTERNS.upi.test(originalText) || intelligence.upiIds.length > 0 || normalizedText.includes('upi')) 
      intelligence.suspiciousKeywords.push('upi_request');
    if (PATTERNS.urgent.test(originalText) || PATTERNS.urgent_hindi.test(originalText) || PATTERNS.deadline.test(originalText)) 
      intelligence.suspiciousKeywords.push('urgency_tactic');
    if (PATTERNS.block.test(originalText)) 
      intelligence.suspiciousKeywords.push('account_block_threat');
    if (PATTERNS.compromised.test(originalText)) 
      intelligence.suspiciousKeywords.push('security_breach_claim');
    if (PATTERNS.bank.test(originalText)) 
      intelligence.suspiciousKeywords.push('bank_impersonation');
    if (PATTERNS.department.test(originalText) || PATTERNS.official.test(originalText)) 
      intelligence.suspiciousKeywords.push('authority_claim');
    if (PATTERNS.tollfree.test(originalText))
      intelligence.suspiciousKeywords.push('tollfree_mention');
    if (PATTERNS.fine.test(originalText))
      intelligence.suspiciousKeywords.push('fine_threat');
    if (PATTERNS.permanent.test(originalText))
      intelligence.suspiciousKeywords.push('permanent_block_threat');
    if (PATTERNS.transfer.test(originalText))
      intelligence.suspiciousKeywords.push('transfer_request');
    if (PATTERNS.link.test(originalText))
      intelligence.suspiciousKeywords.push('phishing_link');
    if (PATTERNS.fake_offer.test(originalText))
      intelligence.suspiciousKeywords.push('fake_offer');
    if (PATTERNS.employee_id.test(originalText) || normalizedText.includes('employee id'))
      intelligence.suspiciousKeywords.push('employee_id_shared');
    if (PATTERNS.designation.test(originalText))
      intelligence.suspiciousKeywords.push('designation_shared');
    if (PATTERNS.branch_code.test(originalText))
      intelligence.suspiciousKeywords.push('branch_code_shared');
    if (PATTERNS.ifsc.test(originalText))
      intelligence.suspiciousKeywords.push('ifsc_shared');
    if (PATTERNS.case_reference.test(originalText))
      intelligence.suspiciousKeywords.push('case_reference_shared');
  }
}

class KeywordDetector {
  static detectKeywords(text) {
    const normalizedText = normalizeText(text);
    const originalText = text;
    
    const detected = {
      hasOTP: false, hasPIN: false, hasAccount: false, hasUPI: false, hasPhone: false,
      hasTollfree: false, hasUrgency: false, hasThreat: false, hasFine: false,
      hasPermanent: false, hasAuthority: false, hasCyber: false, hasBranch: false,
      hasFamily: false, hasResend: false, hasLink: false, hasFakeOffer: false,
      hasEmployeeID: false, hasDesignation: false, hasBranchCode: false,
      hasIFSC: false, hasCaseReference: false,
      accountNumber: null, upiId: null, phoneNumber: null,
      otpRequestCount: 0, threatCount: 0
    };
    
    if (PATTERNS.otp.test(originalText) || PATTERNS.otp_hindi.test(originalText) || normalizedText.includes('otp')) {
      detected.hasOTP = true;
      detected.otpRequestCount++;
    }
    if (PATTERNS.pin.test(originalText)) detected.hasPIN = true;
    if (PATTERNS.resend.test(originalText)) detected.hasResend = true;
    
    const accountMatch = originalText.match(/\b\d{16}\b/) || originalText.match(/\b\d{12,16}\b/);
    if (accountMatch) {
      detected.hasAccount = true;
      detected.accountNumber = accountMatch[0];
    }
    
    const upiMatch = originalText.match(/[\w.\-]+@[\w.\-]+/i);
    if (upiMatch) {
      detected.hasUPI = true;
      detected.upiId = upiMatch[0].toLowerCase();
    }
    
    const phoneMatch = originalText.match(/\b[6-9]\d{9}\b/) || originalText.match(/\+91[\s-]?[6-9]\d{9}\b/);
    if (phoneMatch) {
      detected.hasPhone = true;
      let phone = phoneMatch[0];
      phone = phone.replace('+91', '').replace(/\s/g, '');
      detected.phoneNumber = phone;
    }
    
    if (PATTERNS.tollfree.test(originalText) || PATTERNS.sbi_official.test(originalText)) detected.hasTollfree = true;
    if (PATTERNS.urgent.test(originalText) || PATTERNS.urgent_hindi.test(originalText) || PATTERNS.deadline.test(originalText)) detected.hasUrgency = true;
    if (PATTERNS.block.test(originalText)) {
      detected.hasThreat = true;
      detected.threatCount++;
    }
    if (PATTERNS.fine.test(originalText)) detected.hasFine = true;
    if (PATTERNS.permanent.test(originalText)) detected.hasPermanent = true;
    if (PATTERNS.bank.test(originalText) || PATTERNS.department.test(originalText) || PATTERNS.official.test(originalText)) detected.hasAuthority = true;
    if (PATTERNS.cyber.test(originalText)) detected.hasCyber = true;
    if (PATTERNS.branch.test(originalText)) detected.hasBranch = true;
    if (PATTERNS.family.test(originalText)) detected.hasFamily = true;
    if (PATTERNS.link.test(originalText)) detected.hasLink = true;
    if (PATTERNS.fake_offer.test(originalText)) detected.hasFakeOffer = true;
    if (PATTERNS.employee_id.test(originalText) || normalizedText.includes('employee id')) detected.hasEmployeeID = true;
    if (PATTERNS.designation.test(originalText)) detected.hasDesignation = true;
    if (PATTERNS.branch_code.test(originalText)) detected.hasBranchCode = true;
    if (PATTERNS.ifsc.test(originalText)) detected.hasIFSC = true;
    if (PATTERNS.case_reference.test(originalText)) detected.hasCaseReference = true;
    
    return detected;
  }
  
  static hasAnyKeyword(detected) {
    return detected.hasOTP || detected.hasPIN || detected.hasAccount || detected.hasUPI ||
           detected.hasPhone || detected.hasTollfree || detected.hasUrgency || detected.hasThreat ||
           detected.hasFine || detected.hasPermanent || detected.hasAuthority || detected.hasCyber ||
           detected.hasBranch || detected.hasFamily || detected.hasResend || detected.hasLink ||
           detected.hasFakeOffer || detected.hasEmployeeID || detected.hasDesignation || 
           detected.hasBranchCode || detected.hasIFSC || detected.hasCaseReference;
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
    if (detected.hasIFSC) score += 20;
    if (detected.hasCaseReference) score += 20;
    if (detected.hasOTP && detected.hasUPI) score += 20;
    if (detected.hasOTP && detected.hasAccount) score += 15;
    if (detected.hasThreat && detected.hasUrgency) score += 15;
    return Math.min(score, 100);
  }
}

class ReplyGenerator {
  static generateReply(detected, session) {
    // ============ LOCK TO EXIT MODE - DELAYED ============
    // Only lock after deep validation phase
    if (session.lockToExit) {
      if (session.turnCount >= 17) return getDeterministicReply(REPLIES.exit, session, 'exit');
      if (detected.hasCyber || detected.hasBranch) return getDeterministicReply(REPLIES.cyber, session, 'cyber');
      return getDeterministicReply(REPLIES.branch, session, 'branch');
    }

    // ============ SMARTER LOCK TRIGGER - DELAYED EXIT ============
    if (!session.lockToExit) {
      const shouldLock = 
        session.pressureScore >= 4 &&
        session.otpRequests >= 5 &&
        session.threatCount >= 5 &&
        session.turnCount >= 14;
      
      if (shouldLock) {
        session.lockToExit = true;
        session.emotionLevel = 5;
        console.log(`🔒 Lock to Exit triggered at turn ${session.turnCount}`);
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
      return "Lag raha hai aap script padh rahe ho. Case reference number generate hua hai kya?";
    }

    // ============ PHASE 1: CONFUSION (Turns 1-3) ============
    if (session.turnCount <= 3) {
      if (session.turnCount === 1) return getDeterministicReply(REPLIES.turn1, session, 'turn1');
      if (session.turnCount === 2) return getDeterministicReply(REPLIES.turn2, session, 'turn2');
      if (session.turnCount === 3) return getDeterministicReply(REPLIES.turn3, session, 'turn3');
    }

    // ============ PHASE 2: CURIOSITY (Turns 4-6) ============
    if (session.turnCount >= 4 && session.turnCount <= 6) {
      if (session.turnCount === 4) return getDeterministicReply(REPLIES.suspicion, session, 'suspicion');
      if (session.turnCount === 5) return getDeterministicReply(REPLIES.policy, session, 'policy');
      if (session.turnCount === 6) {
        if (detected.hasOTP) {
          session.otpRequests = (session.otpRequests || 0) + detected.otpRequestCount;
          return getDeterministicReply(REPLIES.otp_1, session, 'otp_1');
        }
        return getDeterministicReply(REPLIES.policy, session, 'policy');
      }
    }

    // ============ PHASE 3: INTELLIGENCE EXTRACTION (Turns 7-12) ============
    if (session.turnCount >= 7 && session.turnCount <= 12) {
      
      // Priority 1: Extract Account Information
      if (detected.hasAccount && detected.accountNumber && !session.accountQuestioned) {
        session.accountQuestioned = true;
        return getDeterministicReply(REPLIES.account_first.map(r => r.replace('{account}', detected.accountNumber)), session, 'account_first');
      }
      
      // Priority 2: Extract UPI Information
      if (detected.hasUPI && detected.upiId && !session.upiQuestioned) {
        session.upiQuestioned = true;
        return getDeterministicReply(REPLIES.upi_first.map(r => r.replace('{upi}', detected.upiId)), session, 'upi_first');
      }
      
      if (detected.hasUPI && detected.upiId && session.upiQuestioned && session.upiMentionCount < 2) {
        session.upiMentionCount = (session.upiMentionCount || 0) + 1;
        return getDeterministicReply(REPLIES.upi_second.map(r => r.replace('{upi}', detected.upiId)), session, 'upi_second');
      }
      
      // Priority 3: Extract Phone Information
      if (detected.hasPhone && detected.phoneNumber) {
        session.phoneMentionCount = (session.phoneMentionCount || 0) + 1;
        if (session.phoneMentionCount === 1) {
          return getDeterministicReply(REPLIES.phone_first.map(r => r.replace('{phone}', detected.phoneNumber)), session, 'phone_first');
        } else if (session.phoneMentionCount === 2) {
          return getDeterministicReply(REPLIES.phone_second.map(r => r.replace('{phone}', detected.phoneNumber)), session, 'phone_second');
        } else {
          return getDeterministicReply(REPLIES.phone_third.map(r => r.replace('{phone}', detected.phoneNumber)), session, 'phone_third');
        }
      }
      
      // Priority 4: Authority Challenge (Not too early)
      if (detected.hasAuthority && !session.authorityChallenged && session.turnCount >= 8) {
        session.authorityChallenged = true;
        return getDeterministicReply(REPLIES.authority, session, 'authority');
      }
    }

    // ============ PHASE 4: DEEP VALIDATION (Turns 13-16) ============
    if (session.turnCount >= 13 && session.turnCount <= 16) {
      
      // Force scammer to validate account with last 4 digits
      if (detected.hasAccount && detected.accountNumber && session.accountQuestioned) {
        return getDeterministicReply(REPLIES.account_validation, session, 'account_validation');
      }
      
      // Force scammer to provide IFSC code
      if (detected.hasBranchCode && !session.ifscValidated) {
        session.ifscValidated = true;
        return getDeterministicReply(REPLIES.ifsc_validation, session, 'ifsc_validation');
      }
      
      // Force scammer to provide case reference
      if (session.threatCount >= 3 && !session.caseValidated) {
        session.caseValidated = true;
        return getDeterministicReply(REPLIES.case_validation, session, 'case_validation');
      }
      
      // Validate employee ID
      if (detected.hasEmployeeID && !session.employeeValidated) {
        session.employeeValidated = true;
        return getDeterministicReply(REPLIES.employee_validation, session, 'employee_validation');
      }
    }

    // ============ PROGRESSIVE OTP RESPONSES ============
    if (detected.hasOTP) {
      session.otpRequests = (session.otpRequests || 0) + detected.otpRequestCount;
      
      if (detected.hasResend) {
        return getDeterministicReply(REPLIES.resend, session, 'resend');
      }
      
      if (session.otpRequests === 1) {
        return getDeterministicReply(REPLIES.otp_1, session, 'otp_1');
      } else if (session.otpRequests === 2) {
        return getDeterministicReply(REPLIES.otp_2, session, 'otp_2');
      } else if (session.otpRequests === 3) {
        return getDeterministicReply(REPLIES.otp_3, session, 'otp_3');
      } else if (session.otpRequests === 4) {
        return getDeterministicReply(REPLIES.otp_4, session, 'otp_4');
      } else {
        return getDeterministicReply(REPLIES.otp_5, session, 'otp_5');
      }
    }
    
    // ============ THREAT RESPONSES ============
    if (detected.hasPermanent) {
      return getDeterministicReply(REPLIES.permanent, session, 'permanent');
    }
    
    if (detected.hasFine) {
      return getDeterministicReply(REPLIES.fine, session, 'fine');
    }
    
    if (detected.hasThreat) {
      session.threatCount = (session.threatCount || 0) + 1;
    }
    
    // ============ OTHER DETECTIONS ============
    if (detected.hasTollfree) return getDeterministicReply(REPLIES.tollfree, session, 'tollfree');
    if (detected.hasBranch) return getDeterministicReply(REPLIES.branch, session, 'branch');
    if (detected.hasFamily) return getDeterministicReply(REPLIES.family, session, 'family');
    if (detected.hasCyber) {
      session.lockToExit = true;
      return getDeterministicReply(REPLIES.cyber, session, 'cyber');
    }
    if (detected.hasLink) return getDeterministicReply(REPLIES.link, session, 'link');
    if (detected.hasFakeOffer) return getDeterministicReply(REPLIES.fake_offer, session, 'fake_offer');
    
    // ============ FALLBACK ============
    return getDeterministicReply(REPLIES.fallback, session, 'fallback');
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
    
    console.log('\n📤 CALLBACK PAYLOAD:');
    console.log(JSON.stringify(payload, null, 2));
    
    try {
      await axios.post(CONFIG.CALLBACK_URL, payload, { timeout: CONFIG.CALLBACK_TIMEOUT });
      console.log(`✅ Callback sent for session: ${sessionId}`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Callback failed: ${error.message}`);
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
    if (intelligence.suspiciousKeywords.includes('ifsc_shared')) tactics.push('fake IFSC');
    if (intelligence.suspiciousKeywords.includes('case_reference_shared')) tactics.push('fake case reference');
    
    const tacticsText = tactics.length > 0 ? tactics.join(', ') : 'multiple scam tactics';
    
    return `Scammer used ${tacticsText}. ` +
           `Extracted ${intelligence.bankAccounts.length} bank accounts, ` +
           `${intelligence.upiIds.length} UPI IDs, ` +
           `${intelligence.phoneNumbers.length} phone numbers, ` +
           `${intelligence.phishingLinks.length} phishing links, ` +
           `${intelligence.employeeIDs?.length || 0} employee IDs, ` +
           `${intelligence.ifscCodes?.length || 0} IFSC codes, ` +
           `${intelligence.caseReferences?.length || 0} case references. ` +
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
      
      const intelligenceCount = 
        (intel.bankAccounts?.length || 0) +
        (intel.upiIds?.length || 0) +
        (intel.phoneNumbers?.length || 0) +
        (intel.phishingLinks?.length || 0) +
        (intel.employeeIDs?.length || 0) +
        (intel.ifscCodes?.length || 0) +
        (intel.caseReferences?.length || 0);
      
      if (intelligenceCount >= 5 && turnCount >= 15) return true;
      if (intel.suspiciousKeywords?.length >= 12 && turnCount >= 12) return true;
      if (turnCount >= 18) return true;
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
        accountValidated: false,
        upiQuestioned: false,
        upiMentionCount: 0,
        authorityChallenged: false,
        ifscValidated: false,
        caseValidated: false,
        employeeValidated: false,
        otpRequests: 0,
        threatCount: 0,
        phoneMentionCount: 0,
        turnCount: 0,
        metadata: metadata,
        lockToExit: false,
        lastScammerMessage: '',
        lastScammerNormalized: '',
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
    
    const normalizedMessage = normalizeText(message.text);
    
    if (session.lastScammerNormalized) {
      const overlap = calculateWordOverlap(normalizedMessage, session.lastScammerNormalized);
      if (overlap >= CONFIG.WORD_OVERLAP_THRESHOLD) {
        session.repetitionCount++;
      } else {
        session.repetitionCount = 0;
      }
    }
    
    session.lastScammerMessage = message.text;
    session.lastScammerNormalized = normalizedMessage;
    
    const detected = KeywordDetector.detectKeywords(message.text);
    const hasKeywords = KeywordDetector.hasAnyKeyword(detected);
    const riskScore = KeywordDetector.calculateRiskScore(detected);
    
    IntelligenceExtractor.extractFromText(message.text, session.intelligence);
    
    session.pressureScore = 
      (session.otpRequests >= 3 ? 1 : 0) +
      (session.threatCount >= 3 ? 1 : 0) +
      (detected.hasPermanent ? 1 : 0) +
      (detected.hasFine ? 1 : 0) +
      (detected.hasCyber ? 1 : 0) +
      (session.repetitionCount >= 2 ? 1 : 0) +
      (detected.hasEmployeeID ? 1 : 0) +
      (detected.hasDesignation ? 1 : 0) +
      (detected.hasIFSC ? 1 : 0) +
      (detected.hasCaseReference ? 1 : 0);
    
    if (session.lockToExit) {
      session.emotionLevel = 5;
    } else if (session.pressureScore >= 5 && session.otpRequests >= 5 && session.threatCount >= 5) {
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
        const category = await PerplexityCategorySelector.selectCategory(message.text, session.conversationHistory);
        reply = PerplexityCategorySelector.getReply(category, session);
        console.log(`🎯 No keywords - Perplexity selected: ${category} -> "${reply}"`);
      } catch (e) {
        reply = getDeterministicReply(REPLIES.fallback, session, 'fallback');
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
      console.log(`\n🏁 Session ${sessionId} ending - Intelligence count: ${session.intelligence.bankAccounts.length + session.intelligence.upiIds.length + session.intelligence.phoneNumbers.length + session.intelligence.employeeIDs?.length + session.intelligence.ifscCodes?.length + session.intelligence.caseReferences?.length}`);
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
      console.log(`🧹 Cleaned up stale session: ${sessionId}`);
    }
  }
}, 300000);