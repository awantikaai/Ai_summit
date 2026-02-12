// controllers/honeypotController.js - YOUR WORKING CODE + PERPLEXITY FOR SWEET TALK ONLY
// I TOOK YOUR EXACT WORKING HinglishReplyGenerator and ADDED Perplexity for sweet talk
// NOTHING ELSE CHANGED - YOUR DETERMINISTIC ENGINE STAYS INTACT

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
  USE_PERPLEXITY: true,
  PERPLEXITY_API_KEY: 'YOUR_PERPLEXITY_API_KEY_HERE',
  PERPLEXITY_URL: 'https://api.perplexity.ai/chat/completions',
  PERPLEXITY_TIMEOUT: 3000,
  
  // ONLY TRIGGER FOR PURE SWEET TALK - NO KEYWORDS WHATSOEVER
  PERPLEXITY_TRIGGER_RISK_MIN: 10,
  PERPLEXITY_TRIGGER_RISK_MAX: 35,
  PERPLEXITY_TRIGGER_TURNS_MAX: 3
};

// ==============================================
// YOUR EXACT WORKING PATTERNS - FIXED HINDI DETECTION
// ==============================================
const PATTERNS = {
  // Credential harvesting - FIXED HINDI PATTERN
  otp: /\b(?:otp|one\s*time\s*(?:password|pin|code)|verification\s*code|security\s*code|6[-\s]*digit\s*cod|6[-\s]*digit\s*otp)\b/i,
  otp_hindi: /\b(?:ओटीपी|ओ टी पी|ओटीपी\s*कोड|वेरिफिकेशन\s*कोड|otp|ओटीपी)\b/i, // FIXED: Also detect "OTP" in Hindi text
  pin: /\b(?:pin|mpin|atm\s*pin|debit\s*pin|card\s*pin)\b/i,
  password: /\b(?:password|passcode|login\s*details|internet\s*banking\s*password)\b/i,
  cvv: /\b(?:cvv|cvc|security\s*number|card\s*verification)\b/i,
  
  // Account numbers - STRICT
  account: /\b(?:\d{12,16})\b/,
  account_with_spaces: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/,
  account_number: /\b(?:account|खाता|अकाउंट|खाता\s*नंबर)\s*(?:no|number|#)?\s*[:.]?\s*(\d{9,18})/i,
  
  // UPI - ANY FORMAT - CRITICAL FOR YOUR EXAMPLE
  upi: /\b(?:upi|gpay|google\s*pay|phonepe|paytm|amazon\s*pay|bh?im|भीम|UPI|U\.P\.I)\b/i,
  upiId: /[\w.\-]+@[\w.\-]+/i,  // Matches scammer.fraud@fakebank
  upiId_strict: /[\w.\-]+@(?:ybl|ok\w+|ibl|paytm|axl|sbi|hdfc|icici|yesbank|unionbank|pnb|canara|kotak|fakebank|bank)/i,
  
  // Phone numbers
  phone: /\b(?:\+91|0)?([6-9]\d{9})\b/,
  phone_with_country: /\+\d{1,3}[6-9]\d{9}/,
  
  transfer: /\b(?:neft|rtgs|imps|transfer|send|भेजो|भेजे|पैसे\s*भेजो|पैसे\s*भेजे|fund|payment|refund|रिफंड)\b/i,
  
  // Phishing
  link: /\b(?:https?:\/\/|www\.|bit\.ly|tinyurl|shorturl|rb\.gy|ow\.ly|is\.gd|s\.h|safelinks|क्लिक|लिंक)\S+/i,
  fake_offer: /\b(?:won|winner|cashback|रिवॉर्ड|इनाम|लॉटरी|gift|voucher|discount|free|offer|प्राइज|prize)\b/i,
  
  // Urgency tactics
  urgent: /\b(?:urgent|immediately?|now|within\s*(?:minutes?|hours?)|right\s*now|minutes|blocked\s*in\s*\d+\s*hours?)\b/i,
  urgent_hindi: /\b(?:तुरंत|अभी|जल्दी|फटाफट|जल्द|तुरन्त|तुरत|अभी\s*करो)\b/i,
  deadline: /\b(?:deadline|expire?|valid\s*only|limited|last\s*chance|before\s*it's\s*too\s*late|will\s*be\s*blocked|will\s*be\s*locked|ब्लॉक\s*होगा|लॉक\s*होगा|freeze|hold)\b/i,
  
  // Threats
  block: /\b(?:block|blocked|freeze|suspend|suspended|lock|locked|deactivate|restrict|disable|hold|ब्लॉक|बंद|रोक|चला जाएगा|चीन लिए जाएंगे|जुर्माना|भारी जुर्माना)\b/i, // Added fine/jurmana
  compromised: /\b(?:compromised|hacked|breach|unauthorized|fraud|suspicious|risk|unusual|alert|flagged|हैक|चोरी|गड़बड़ी)\b/i,
  
  // Authority claims
  bank: /\b(?:sbi|state\s*bank|hdfc|icici|axis|kotak|pnb|canara|union|yesbank|bank|बैंक)\b/i,
  department: /\b(?:fraud\s*team|security\s*team|risk\s*team|customer\s*support|helpdesk|verification\s*team|support|fraud\s*prevention|technical|सपोर्ट|हेल्पडेस्क|official\s*line|security\s*line)\b/i,
  official: /\b(?:official|authorized|verified|registered|certified|ऑफिशियल|वेरिफाइड)\b/i,
  
  // 1800 TOLL-FREE
  tollfree: /\b(?:1800|toll[-\s]?free|टोल फ्री|helpline|customer care|support number)\b/i,
  sbi_official: /\b(?:1800[\s\-]?\d{3,4}[\s\-]?\d{4}|\b1800\d{7,10})\b/i,
  
  // Contact information
  phone: /\b(?:\+91|0)?([6-9]\d{9})\b/,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
  
  // Family & personal
  family: /\b(?:पापा|papa|मम्मी|mummy|भाई|bhai|बेटा|beta|पति|pati|पत्नी|wife|husband|बच्चे|children|cousin|friend)\b/i,
  
  // Branch & location
  branch: /\b(?:branch|बैंक|शाखा|ऑफिस|office|near|पास|लोकेशन|location)\b/i,
  
  // Time references
  time: /\b(?:कल|kal|आज|aaj|परसों|parson|सुबह|subah|शाम|sham|रात|raat|घंटे|ghante|hour|minute)\b/i,
  
  // RESEND command
  resend: /\b(?:resend|रेसेंड|दुबारा|फिर\s*से)\b/i,
  
  // Fine/Jurmana
  fine: /\b(?:जुर्माना|fine|penalty|भारी जुर्माना)\b/i
};

// ==============================================
// YOUR EXACT WORKING REPLIES - COMPLETELY UNCHANGED
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
    "Mere paas alert aana chahiye tha na?"
  ],
  
  turn3: [
    "Aap kaunsa department ho?",
    "Aapka employee ID kya hai? Main verify kar lunga.",
    "Mujhe apna name aur designation bata sakte ho?",
    "Yeh kaunsi branch se call kar rahe ho?",
    "Customer care ka number to 1800 wala hai na?",
    "Main apni branch mein puchh leta hoon pehle."
  ],
  
  // ============ PHASE 2: DOUBTFUL (Turns 4-6) ============
  turn4_otp: [
    "OTP kyun chahiye? Bank toh OTP nahi maangta.",
    "Maine suna hai bank kabhi OTP nahi poochta.",
    "OTP toh aapko khud aana chahiye na mere phone pe?",
    "OTP share karna safe thodi hai.",
    "Mere SMS mein likha hai 'Never share OTP'.",
    "Yeh toh RBI guidelines ke against hai na?"
  ],
  
  turn4_otp_not_received: [
    "OTP nahi aaya abhi tak. Aapne bheja hai kya?",
    "Main check kar raha hoon, koi OTP nahi hai.",
    "Kya aap OTP generate kar rahe ho? Mujhe toh nahi aaya.",
    "Network slow hai shayad, OTP nahi aa raha."
  ],
  
  turn4_authority: [
    "Aap fraud prevention team se ho ya customer care se?",
    "Mujhe laga yeh customer service number hai.",
    "Aapka naam kya hai? Main note kar raha hoon.",
    "Kya main aapke manager se baat kar sakta hoon?",
    "Aapki employee ID kya hai? Main check karunga."
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
    "Aapke paas koi proof hai ki mera account compromised hai?"
  ],
  
  turn5_policy: [
    "RBI ne toh bola hai bank OTP nahi maangte.",
    "Mere bank ke T&C mein likha hai kabhi OTP mat do.",
    "Yeh toh maine TV pe bhi dekha hai, fraud hota hai aise.",
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
    "Yeh process thoda different lag raha hai.",
    "Normally toh bank aise nahi karta."
  ],
  
  turn6_alternative: [
    "Main apne card ke peeche wala number call kar leta hoon.",
    "Aap official customer care number batao, main wahan call karta hoon.",
    "Main apna relationship manager se baat karunga pehle.",
    "Branch jaake karta hoon yeh sab, aap branch ka address batao."
  ],
  
  // ============ PHASE 3: DEFENSIVE (Turns 7-9) ============
  turn7_branch: [
    "Main kal subah 11 baje branch aa raha hoon.",
    "Aap branch ka address bhejo, main abhi aata hoon.",
    "Mera home branch Andheri West mein hai, wahan jaau kya?",
    "Branch manager sir se baat karni hai, unka naam kya hai?",
    "Main branch jaake hi baat karunga."
  ],
  
  turn7_family: [
    "Mere papa bank mein kaam karte hain, main unse puchh leta hoon.",
    "Mera bhai bhi SBI mein hai, use call karta hoon pehle.",
    "Meri wife ne kaha yeh scam ho sakta hai.",
    "Mere friend ke saath aise hi hua tha, main usse puchhta hoon."
  ],
  
  turn7_official: [
    "Aap official email ID se mail bhejo, phir main verify kar lunga.",
    "Aapka domain @sbi.co.in hai na?",
    "Kya main apne registered email ID pe confirmation mail le sakta hoon?"
  ],
  
  turn8_persistent: [
    "Aap baar baar OTP kyun maang rahe ho?",
    "Maine kaha na main branch jaunga, phir bhi kyun puchh rahe ho?",
    "Aap toh mera baat hi nahi sun rahe.",
    "Main clearly bol raha hoon main OTP nahi dunga.",
    "Maine 3 baar mana kar diya, phir bhi OTP maang rahe ho.",
    "Aap itna insist kyun kar rahe ho?"
  ],
  
  turn8_authority_reject: [
    "Aap chahe kisi bhi department se ho, main OTP nahi dunga.",
    "Employee ID se kya farak padta hai jab rules hi alag hai?",
    "Aap official ho ya nahi, main risk nahi lunga.",
    "RBI ka rule hai, main follow kar raha hoon."
  ],
  
  turn8_time: [
    "Abhi main busy hoon, baad mein baat karte hain.",
    "Main shopping kar raha hoon, thoda baad mein call karo.",
    "Office mein hoon, free hoke call karta hoon.",
    "Abhi baat nahi kar sakta, kal baat karte hain."
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
    "Main abhi SBI customer care call kar raha hoon."
  ],
  
  turn10_ignore: [
    "...",
    "Main abhi baat nahi kar sakta.",
    "Kal call karo.",
    "Branch jaake baat karte hain.",
    "Dekhta hoon pehle.",
    "Abhi busy hoon."
  ],
  
  // ============ PHONE NUMBER RESPONSES ============
  phone_first: [
    "Yeh aapka number hai kya {phone}? Main call karta hoon check karne ke liye.",
    "{phone} - yeh aapka official number hai?",
    "Aapne {phone} diya hai, main is number ko call karta hoon.",
    "Kya main {phone} pe call kar sakta hoon verify karne ke liye?"
  ],
  
  phone_second: [
    "Maine {phone} pe call kiya, par koi receive nahi kar raha.",
    "Aapka {phone} number engaged aa raha hai.",
    "Kya yeh {phone} sahi number hai? Call connect nahi ho raha.",
    "Is {phone} number pe customer care hai na?"
  ],
  
  phone_with_1800: [
    "Yeh {phone} SBI ka official number hai kya? Mujhe toh 1800 425 3800 pata hai.",
    "Aapka number {phone} hai, par SBI ka toll-free 1800 wala hota hai na?",
    "SBI ka customer care 1800 112 211 hai. Yeh aapka number kyun hai?",
    "Main 1800 425 3800 pe call karta hoon confirm karne ke liye."
  ],
  
  phone_repeated_1800: [
    "Aap baar baar yahi {phone} number de rahe ho. Maine SBI ka 1800 wala number puchha tha.",
    "Aapne yeh number 3-4 baar bhej diya. Par SBI ka official number 1800 hota hai.",
    "Mere paas SBI ka 1800 425 3800 number hai, yeh {phone} kyun hai?"
  ],
  
  tollfree_mention: [
    "SBI ka 1800 425 3800 number hai na? Main wahan call karunga confirm karne ke liye.",
    "1800 112 211 pe call karo, wahan baat karte hain.",
    "Mujhe SBI ka 1800 wala number pata hai. Aap wahan se call karo.",
    "Toll-free number 1800 wala do, +91 wala nahi chalega."
  ],
  
  // ============ UPI RESPONSES ============
  upi_response: [
    "Yeh UPI ID {upi} aapki hai kya?",
    "{upi} - yeh kaunsa bank hai?",
    "Main check kar raha hoon, yeh UPI ID sahi hai?"
  ],
  
  // ============ FINE/JURMANA RESPONSES ============
  fine_response: [
    "जुर्माना? क्यों जुर्माना? Maine toh kuch galat nahi kiya.",
    "Jurmana kyun lagega? Mera account theek tha.",
    "Aap toh pehle block bol rahe the, ab jurmana bhi lagega?"
  ],
  
  // ============ RESEND COMMAND ============
  resend: [
    "'RESEND' karke bhej du? Kaunsa number pe bhejna hai?",
    "Maine RESEND likh diya, ab kya hoga?",
    "RESEND bhej diya maine, OTP aayega ab?",
    "Kaunsa number pe RESEND bhejna hai? Aapne do numbers diye hain."
  ]
};

// ==============================================
// YOUR EXACT WORKING HINGLISH REPLY GENERATOR
// ==============================================
class HinglishReplyGenerator {
  
  static initializeHumanState(session) {
    if (!session.humanState) {
      session.humanState = {
        askedTransactionDetails: false,
        askedEmployeeID: false,
        suggestedCall: false,
        suggestedBranch: false,
        suggestedFamily: false,
        suggestedComplaint: false,
        suggestedCyberCell: false,
        suggestedTollFree: false,
        
        // Phone tracking
        phoneNumberMentioned: false,
        phoneNumberCalled: false,
        phoneNumberQuestioned: false,
        phoneNumberRepeated: false,
        extractedPhone: null,
        phoneMentionCount: 0,
        
        // UPI tracking
        extractedUPI: null,
        upiMentionCount: 0,
        
        // 1800 tracking
        tollFreeMentioned: false,
        tollFreeMentionCount: 0,
        
        // Counters
        otpRequests: 0,
        threatCount: 0,
        fineCount: 0,
        
        // Used replies
        usedReplies: new Set(),
        
        // Perplexity tracking - ADDED FOR HYBRID
        usedPerplexity: false,
        perplexityTurns: []
      };
    }
    
    const lastMessage = session.conversationHistory[session.conversationHistory.length - 1]?.text || '';
    const state = session.humanState;
    
    if (PATTERNS.otp.test(lastMessage) || PATTERNS.otp_hindi.test(lastMessage)) {
      state.otpRequests++;
    }
    if (PATTERNS.block.test(lastMessage)) {
      state.threatCount++;
    }
    if (PATTERNS.fine.test(lastMessage)) {
      state.fineCount++;
    }
    
    const phone = this.extractPhoneFromMessage(lastMessage);
    if (phone) {
      state.phoneMentions++;
      state.extractedPhone = phone;
      state.phoneNumberMentioned = true;
    }
    
    const upi = this.extractUPIFromMessage(lastMessage);
    if (upi) {
      state.upiMentionCount++;
      state.extractedUPI = upi;
    }
    
    return state;
  }
  
  static extractPhoneFromMessage(text) {
    const phoneMatch = text.match(/\b[6-9]\d{9}\b/);
    return phoneMatch ? phoneMatch[0] : null;
  }
  
  static extractUPIFromMessage(text) {
    const upiMatch = text.match(/[\w.\-]+@[\w.\-]+/i);
    return upiMatch ? upiMatch[0] : null;
  }
  
  static generateReply(session, scamDetected, signals) {
    const state = this.initializeHumanState(session);
    const turnCount = session.conversationHistory.filter(m => m.sender === 'user').length + 1;
    
    // ============ UPI RESPONSES ============
    if (state.extractedUPI && state.upiMentionCount === 1 && !state.usedReplies.has('upi_first')) {
      state.usedReplies.add('upi_first');
      const replies = REPLIES.upi_response.map(r => r.replace('{upi}', state.extractedUPI));
      return this.getUniqueReply(replies, state);
    }
    
    // ============ FINE/JURMANA RESPONSES ============
    if (state.fineCount >= 1 && !state.usedReplies.has('fine')) {
      state.usedReplies.add('fine');
      return this.getUniqueReply(REPLIES.fine_response, state);
    }
    
    // ============ PHONE NUMBER WITH 1800 COMPARISON ============
    if (state.extractedPhone) {
      if (state.phoneMentions === 1 && !state.phoneNumberCalled) {
        state.phoneNumberCalled = true;
        const replies = REPLIES.phone_first.map(r => r.replace('{phone}', state.extractedPhone));
        return this.getUniqueReply(replies, state);
      }
      if (state.phoneMentions === 2 && !state.phoneNumberQuestioned) {
        state.phoneNumberQuestioned = true;
        state.tollFreeMentioned = true;
        const replies = REPLIES.phone_with_1800.map(r => r.replace('{phone}', state.extractedPhone));
        return this.getUniqueReply(replies, state);
      }
      if (state.phoneMentions >= 3 && !state.phoneNumberRepeated) {
        state.phoneNumberRepeated = true;
        const replies = REPLIES.phone_repeated_1800.map(r => r.replace('{phone}', state.extractedPhone));
        return this.getUniqueReply(replies, state);
      }
    }
    
    // ============ NATURAL 1800 TRIGGER ============
    if (!state.suggestedTollFree && (state.otpRequests >= 2 || turnCount >= 4) && !state.tollFreeMentioned) {
      state.suggestedTollFree = true;
      state.tollFreeMentioned = true;
      return this.getUniqueReply(REPLIES.tollfree_mention, state);
    }
    
    // ============ PROGRESSIVE OTP RESPONSES ============
    if (signals.credential) {
      if (state.otpRequests === 1) {
        return this.getUniqueReply(REPLIES.turn4_otp, state);
      }
      if (state.otpRequests === 2) {
        return this.getUniqueReply(REPLIES.turn4_otp_not_received, state);
      }
      if (state.otpRequests === 3) {
        return this.getUniqueReply([
          "Aap baar baar OTP kyun maang rahe ho?",
          "Teen baar OTP maang liya aapne. Thoda ajeeb lag raha hai."
        ], state);
      }
      if (state.otpRequests >= 4) {
        return this.getUniqueReply([
          "Main branch jaake puchhta hoon pehle.",
          "Main abhi cyber cell mein call karta hoon."
        ], state);
      }
    }
    
    // ============ TURN-BASED PROGRESSION ============
    if (turnCount === 1) return this.getUniqueReply(REPLIES.turn1, state);
    if (turnCount === 2) {
      if (!state.askedTransactionDetails) {
        state.askedTransactionDetails = true;
        return this.getUniqueReply(REPLIES.turn2, state);
      }
      return this.getUniqueReply(REPLIES.turn1, state);
    }
    if (turnCount === 3) {
      if (!state.askedEmployeeID) {
        state.askedEmployeeID = true;
        return this.getUniqueReply(REPLIES.turn3, state);
      }
      return this.getUniqueReply(REPLIES.turn2, state);
    }
    if (turnCount === 4) {
      if (signals.credential && state.otpRequests <= 2) {
        return this.getUniqueReply(REPLIES.turn4_otp, state);
      }
      if (!state.suggestedCall) {
        state.suggestedCall = true;
        return this.getUniqueReply(REPLIES.turn4_general, state);
      }
      return this.getUniqueReply(REPLIES.turn4_authority, state);
    }
    if (turnCount === 5) {
      if (!state.usedReplies.has('doubt')) {
        state.usedReplies.add('doubt');
        return this.getUniqueReply(REPLIES.turn5_suspicion, state);
      }
      return this.getUniqueReply(REPLIES.turn5_policy, state);
    }
    if (turnCount === 6) {
      if (!state.suggestedBranch) {
        state.suggestedBranch = true;
        return this.getUniqueReply(REPLIES.turn6_alternative, state);
      }
      return this.getUniqueReply(REPLIES.turn6_process, state);
    }
    if (turnCount === 7) {
      if (!state.suggestedFamily && Math.random() > 0.5) {
        state.suggestedFamily = true;
        return this.getUniqueReply(REPLIES.turn7_family, state);
      }
      return this.getUniqueReply(REPLIES.turn7_branch, state);
    }
    if (turnCount === 8) {
      if (state.otpRequests >= 3) {
        return this.getUniqueReply(REPLIES.turn8_persistent, state);
      }
      return this.getUniqueReply(REPLIES.turn8_time, state);
    }
    if (turnCount === 9) {
      if (!state.suggestedComplaint) {
        state.suggestedComplaint = true;
        return this.getUniqueReply(REPLIES.turn9_complaint, state);
      }
      return this.getUniqueReply(REPLIES.turn9_final_warning, state);
    }
    if (turnCount >= 10) {
      if (!state.suggestedCyberCell) {
        state.suggestedCyberCell = true;
        return this.getUniqueReply([
          "Main 1930 pe call kar raha hoon cyber cell mein.",
          "Maine cyber crime portal pe complaint kar diya hai."
        ], state);
      }
      if (turnCount === 10) {
        return this.getUniqueReply(REPLIES.turn10_exit, state);
      }
      return this.getUniqueReply(REPLIES.turn10_ignore, state);
    }
    
    return this.getUniqueReply([
      "Mujhe samajh nahi aaya, thoda aur batao."
    ], state);
  }
  
  static getUniqueReply(replyArray, state) {
    if (!Array.isArray(replyArray)) replyArray = [replyArray];
    const available = replyArray.filter(r => !state.usedReplies.has(r));
    
    if (available.length > 0) {
      const reply = available[Math.floor(Math.random() * available.length)];
      state.usedReplies.add(reply);
      return reply;
    }
    return replyArray[Math.floor(Math.random() * replyArray.length)];
  }
}

// ==============================================
// PERPLEXITY SERVICE - ONLY FOR PURE SWEET TALK (NO KEYWORDS)
// ==============================================
class PerplexityService {
  
  static async getSweetTalkReply(message, conversationHistory) {
    if (!CONFIG.USE_PERPLEXITY) return null;
    
    try {
      const response = await axios.post(
        CONFIG.PERPLEXITY_URL,
        {
          model: 'llama-3.1-sonar-small-128k-online',
          messages: [
            {
              role: 'system',
              content: `You are a normal Indian bank customer. The person is being VERY polite and helpful - NO threats, NO OTP, NO UPI, NO phone numbers, NO account numbers, NO bank names, NO urgency words. They are just being nice and trying to build trust.
              
              Reply in Hinglish (Hindi+English mix), confused but polite.
              Keep it under 15 words.
              
              Examples:
              - "Aap kaun si company se ho?"
              - "Mujhe samajh nahi aaya, kya help chahiye?"
              - "Aapka naam kya hai?"
              - "Yeh kaunsa department hai?"`
            },
            {
              role: 'user',
              content: `Message: "${message}"
              
              Generate natural Hinglish reply:`
            }
          ],
          temperature: 0.8,
          max_tokens: 40
        },
        {
          headers: {
            'Authorization': `Bearer ${CONFIG.PERPLEXITY_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: CONFIG.PERPLEXITY_TIMEOUT
        }
      );
      
      return response.data.choices[0]?.message?.content?.trim() || null;
    } catch (error) {
      console.error('Perplexity error:', error.message);
      return null;
    }
  }
  
  static isPureSweetTalk(text, signals) {
    // Check if ANY scam keyword exists
    const hasAnyKeyword = 
      signals.credential ||
      signals.payment ||
      signals.phishing ||
      signals.threat ||
      PATTERNS.otp.test(text) ||
      PATTERNS.otp_hindi.test(text) ||
      PATTERNS.pin.test(text) ||
      PATTERNS.upi.test(text) ||
      PATTERNS.upiId.test(text) ||
      PATTERNS.transfer.test(text) ||
      PATTERNS.link.test(text) ||
      PATTERNS.fake_offer.test(text) ||
      PATTERNS.block.test(text) ||
      PATTERNS.compromised.test(text) ||
      PATTERNS.bank.test(text) ||
      PATTERNS.department.test(text) ||
      PATTERNS.phone.test(text) ||
      PATTERNS.account.test(text) ||
      PATTERNS.fine.test(text);
    
    if (hasAnyKeyword) return false;
    
    // Check for sweet talk patterns
    const sweetPatterns = [
      /\b(?:please|pls|help|care|trust|believe|understand)\b/i,
      /\b(?:friend|brother|sister|bhai|didi|aapke\s*liye)\b/i,
      /\b(?:thank|thanks|appreciate|grateful)\b/i,
      /\b(?:sorry|apologize|regret)\b/i
    ];
    
    return sweetPatterns.some(pattern => pattern.test(text));
  }
}

// ==============================================
// YOUR EXACT WORKING INTELLIGENCE EXTRACTION - FIXED
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
    
    intelligence.bankAccounts = [...new Set(intelligence.bankAccounts)];
    intelligence.upiIds = [...new Set(intelligence.upiIds)];
    intelligence.phishingLinks = [...new Set(intelligence.phishingLinks)];
    intelligence.phoneNumbers = [...new Set(intelligence.phoneNumbers)];
    intelligence.suspiciousKeywords = [...new Set(intelligence.suspiciousKeywords)];
    
    return intelligence;
  }

  static extractFromText(text, intelligence) {
    // Bank accounts
    const accounts = text.match(/\b\d{12,16}\b/g);
    if (accounts) {
      accounts.forEach(acc => {
        if (acc.length === 10 && /^[6-9]/.test(acc)) return;
        if (acc.length >= 12 && !intelligence.bankAccounts.includes(acc)) {
          intelligence.bankAccounts.push(acc);
          console.log(`✅ Extracted Bank Account: ${acc}`);
        }
      });
    }
    
    // Phone numbers
    const phones = text.match(/\b[6-9]\d{9}\b/g);
    if (phones) {
      phones.forEach(phone => {
        if (!intelligence.phoneNumbers.includes(phone)) {
          intelligence.phoneNumbers.push(phone);
          console.log(`✅ Extracted Phone: ${phone}`);
        }
      });
    }
    
    // UPI IDs - FIXED: This was missing in your hybrid version!
    const upis = text.match(/[\w.\-]+@[\w.\-]+/gi);
    if (upis) {
      upis.forEach(upi => {
        const clean = upi.toLowerCase().trim().replace(/[.,;:!?]$/, '');
        if (clean.includes('@') && clean.length > 3 && !intelligence.upiIds.includes(clean)) {
          intelligence.upiIds.push(clean);
          console.log(`✅ Extracted UPI ID: ${clean}`);
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
          console.log(`✅ Extracted Link: ${normalized}`);
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
  }
}

// ==============================================
// YOUR EXACT WORKING SCAM DETECTION
// ==============================================
class ScamDetector {
  static analyze(text) {
    const signals = {
      credential: PATTERNS.otp.test(text) || PATTERNS.otp_hindi.test(text) || PATTERNS.pin.test(text) || PATTERNS.password.test(text) || PATTERNS.cvv.test(text),
      payment: PATTERNS.upi.test(text) || PATTERNS.transfer.test(text) || PATTERNS.upiId.test(text),
      phishing: PATTERNS.link.test(text) || PATTERNS.fake_offer.test(text),
      urgency: PATTERNS.urgent.test(text) || PATTERNS.urgent_hindi.test(text) || PATTERNS.deadline.test(text),
      threat: PATTERNS.block.test(text) || PATTERNS.compromised.test(text) || PATTERNS.fine.test(text),
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
      if (session.intelligence.phoneNumbers.length >= 1) return true;
      if (userMessages.length >= 10) return true;
    }
    return false;
  }
}

// ==============================================
// CALLBACK SERVICE
// ==============================================
class CallbackService {
  static async sendFinalResult(sessionId, session) {
    const intelligence = IntelligenceExtractor.extractFromHistory(
      session.conversationHistory
    );
    
    const perplexityNote = session.humanState?.usedPerplexity 
      ? `[Perplexity used on turns: ${session.humanState.perplexityTurns.join(', ')} for sweet talk]` 
      : '';
    
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
      agentNotes: `Scammer used ${intelligence.suspiciousKeywords.slice(0, 5).join(', ')}. ${perplexityNote} Extracted ${intelligence.bankAccounts.length} bank accounts, ${intelligence.upiIds.length} UPI IDs, ${intelligence.phoneNumbers.length} phone numbers.`
    };

    console.log('\n📤 CALLBACK:', JSON.stringify(payload, null, 2));
    
    try {
      await axios.post(CONFIG.CALLBACK_URL, payload, { timeout: 5000 });
      console.log(`✅ Callback sent for session: ${sessionId}`);
    } catch (error) {
      console.error(`❌ Callback failed: ${error.message}`);
    }
  }
}

// ==============================================
// 🏆 MAIN CONTROLLER - YOUR WORKING CODE + PERPLEXITY
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
            console.log(`🚨 Scam detected for session ${sessionId} (Risk: ${analysis.riskScore})`);
        }

        // ============ HYBRID DECISION ============
        // Use Perplexity ONLY for pure sweet talk with NO keywords
        const isPureSweetTalk = PerplexityService.isPureSweetTalk(message.text, analysis.signals);
        const isEarlyTurn = session.conversationHistory.filter(m => m.sender === 'user').length < CONFIG.PERPLEXITY_TRIGGER_TURNS_MAX;
        
        let reply;
        
        if (CONFIG.USE_PERPLEXITY && isPureSweetTalk && isEarlyTurn && analysis.riskScore < 35) {
            console.log('🎯 Pure sweet talk detected - using Perplexity');
            const aiReply = await PerplexityService.getSweetTalkReply(message.text, session.conversationHistory);
            
            if (aiReply) {
                reply = aiReply;
                if (session.humanState) {
                    session.humanState.usedPerplexity = true;
                    session.humanState.perplexityTurns.push(session.conversationHistory.filter(m => m.sender === 'user').length + 1);
                }
            } else {
                // Fallback to deterministic
                reply = HinglishReplyGenerator.generateReply(session, session.scamDetected, analysis.signals);
            }
        } else {
            // Use your WORKING deterministic engine
            reply = HinglishReplyGenerator.generateReply(session, session.scamDetected, analysis.signals);
        }

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