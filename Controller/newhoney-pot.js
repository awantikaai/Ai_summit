// controllers/honeypotController.js - HYBRID CHAMPIONSHIP EDITION
// Deterministic Core + Perplexity for Sweet Talk/Social Engineering
// NO KEYWORDS? NO PROBLEM - AI HANDLES THE SUBTLE SCAMS

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
  PERPLEXITY_API_KEY: 'YOUR_PERPLEXITY_API_KEY_HERE', // 🔑 Add your key
  PERPLEXITY_URL: 'https://api.perplexity.ai/chat/completions',
  PERPLEXITY_TIMEOUT: 3000,
  
  // TRIGGER CONDITIONS FOR PERPLEXITY - ONLY WHEN NO KEYWORDS
  PERPLEXITY_TRIGGER_RISK_MIN: 15,
  PERPLEXITY_TRIGGER_RISK_MAX: 40,
  PERPLEXITY_TRIGGER_TURNS_MAX: 5,
  
  // Sweet talk detection - NO keywords, just emotional manipulation
  SWEET_TALK_PATTERNS: {
    emotional: /\b(?:please|pls|help|save|protect|care|worried|concern|trust|believe|understand)\b/i,
    personal: /\b(?:friend|brother|sister|bhai|didi|family|aapke\s*liye|aapki\s*help)\b/i,
    urgency_soft: /\b(?:time|today|now|right now|immediately|soon)\b/i,
    authority_soft: /\b(?:manager|supervisor|senior|head|official|department)\b/i,
    gratitude: /\b(?:thank|thanks|appreciate|grateful|pleasure)\b/i,
    apology: /\b(?:sorry|apologize|regret|mistake|error|wrong)\b/i
  }
};

// ==============================================
// COMPREHENSIVE HINGLISH PATTERNS
// ==============================================
const PATTERNS = {
  // Credential harvesting - KEYWORD BASED
  otp: /\b(?:otp|one\s*time\s*(?:password|pin|code)|verification\s*code|security\s*code|6[-\s]*digit\s*cod|6[-\s]*digit\s*otp)\b/i,
  otp_hindi: /\b(?:ओटीपी|ओ टी पी|ओटीपी\s*कोड|वेरिफिकेशन\s*कोड)\b/i,
  pin: /\b(?:pin|mpin|atm\s*pin|debit\s*pin|card\s*pin)\b/i,
  password: /\b(?:password|passcode|login\s*details|internet\s*banking\s*password)\b/i,
  cvv: /\b(?:cvv|cvc|security\s*number|card\s*verification)\b/i,
  
  // Payment keywords
  upi: /\b(?:upi|gpay|google\s*pay|phonepe|paytm|amazon\s*pay|bh?im|भीम|UPI|U\.P\.I)\b/i,
  upiId: /[\w.\-]+@[\w.\-]+/i,
  transfer: /\b(?:neft|rtgs|imps|transfer|send|भेजो|भेजे|पैसे\s*भेजो|पैसे\s*भेजे|fund|payment|refund|रिफंड)\b/i,
  
  // Account numbers
  account: /\b(?:\d{12,16})\b/,
  account_with_spaces: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/,
  
  // Phone numbers
  phone: /\b(?:\+91|0)?([6-9]\d{9})\b/,
  
  // Phishing
  link: /\b(?:https?:\/\/|www\.|bit\.ly|tinyurl|shorturl|rb\.gy|ow\.ly|is\.gd|s\.h|safelinks|क्लिक|लिंक)\S+/i,
  fake_offer: /\b(?:won|winner|cashback|रिवॉर्ड|इनाम|लॉटरी|gift|voucher|discount|free|offer|प्राइज|prize)\b/i,
  
  // Urgency - HARD KEYWORDS
  urgent: /\b(?:urgent|immediately?|within\s*(?:minutes?|hours?)|blocked\s*in\s*\d+\s*hours?|turant|abhi|jaldi)\b/i,
  deadline: /\b(?:deadline|expire?|valid\s*only|limited|last\s*chance|will\s*be\s*blocked|will\s*be\s*locked|ब्लॉक\s*होगा|लॉक\s*होगा|freeze|hold)\b/i,
  
  // Threats - HARD KEYWORDS
  block: /\b(?:block|blocked|freeze|suspend|suspended|lock|locked|deactivate|restrict|disable|hold|ब्लॉक|बंद|रोक|चला जाएगा)\b/i,
  compromised: /\b(?:compromised|hacked|breach|unauthorized|fraud|suspicious|risk|unusual|alert|flagged|हैक|चोरी|गड़बड़ी)\b/i,
  
  // Authority - HARD KEYWORDS
  bank: /\b(?:sbi|state\s*bank|hdfc|icici|axis|kotak|pnb|canara|union|yesbank|bank|बैंक)\b/i,
  department: /\b(?:fraud\s*team|security\s*team|risk\s*team|customer\s*support|helpdesk|verification\s*team|support|fraud\s*prevention|technical)\b/i,
  official: /\b(?:official|authorized|verified|registered|certified|ऑफिशियल|वेरिफाइड)\b/i,
  
  // 1800 toll-free
  tollfree: /\b(?:1800|toll[-\s]?free|टोल फ्री|helpline|customer care|support number)\b/i,
  sbi_official: /\b(?:1800[\s\-]?\d{3,4}[\s\-]?\d{4}|\b1800\d{7,10})\b/i,
  
  // Branch
  branch: /\b(?:branch|बैंक|शाखा|ऑफिस|office|near|पास|लोकेशन|location)\b/i,
  
  // RESEND command
  resend: /\b(?:resend|रेसेंड|दुबारा|फिर\s*से)\b/i,
  
  // Family
  family: /\b(?:पापा|papa|मम्मी|mummy|भाई|bhai|बेटा|beta|पति|pati|पत्नी|wife|husband|बच्चे|children|cousin|friend)\b/i
};

// ==============================================
// PERPLEXITY AI SERVICE - ONLY FOR SWEET TALK
// ==============================================
class PerplexityService {
  
  static async getSweetTalkReply(message, conversationHistory, riskScore) {
    if (!CONFIG.USE_PERPLEXITY) return null;
    
    try {
      console.log('🤖 Perplexity triggered for sweet talk scam...');
      
      const response = await axios.post(
        CONFIG.PERPLEXITY_URL,
        {
          model: 'llama-3.1-sonar-small-128k-online',
          messages: [
            {
              role: 'system',
              content: `You are a normal Indian bank customer talking to someone on chat. 
              The person is being VERY nice, polite, and helpful - NO threats, NO urgency, NO OTP requests yet.
              They are trying to build trust through sweet talk and emotional manipulation.
              
              RULES:
              1. Reply in Hinglish (Hindi+English mix) like a real Indian user
              2. Sound confused but polite - don't accuse them of anything
              3. Ask natural questions about who they are and why they're calling
              4. NEVER say "scam", "fraud", "suspicious" - stay innocent
              5. Keep reply under 15 words, very natural
              6. Examples: "Aap kaun si company se ho?", "Mujhe samajh nahi aaya", "Kya help chahiye aapko?"
              
              Generate ONE natural reply:`
            },
            {
              role: 'user',
              content: `Scammer message: "${message}"
              Previous conversation: ${JSON.stringify(conversationHistory.slice(-2))}
              
              Generate natural Hinglish reply from confused customer:`
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
      
      const suggestion = response.data.choices[0]?.message?.content?.trim();
      console.log('✅ Perplexity reply:', suggestion);
      return suggestion || null;
      
    } catch (error) {
      console.error('❌ Perplexity error:', error.message);
      return null; // Fail silently, fallback to deterministic
    }
  }
  
  // ============ DETECT SWEET TALK - NO KEYWORDS ============
  static isSweetTalkScam(text, signals) {
    // FIRST: Check if ANY hard keywords are present
    const hasHardKeywords = 
      signals.credential || 
      signals.payment || 
      signals.phishing || 
      signals.threat ||
      PATTERNS.block.test(text) ||
      PATTERNS.otp.test(text) ||
      PATTERNS.upi.test(text) ||
      PATTERNS.link.test(text) ||
      PATTERNS.account.test(text) ||
      PATTERNS.phone.test(text);
    
    // If hard keywords exist, use deterministic engine
    if (hasHardKeywords) {
      return false;
    }
    
    // SECOND: Check for sweet talk patterns
    const isSweet = 
      (CONFIG.SWEET_TALK_PATTERNS.emotional.test(text) ||
       CONFIG.SWEET_TALK_PATTERNS.personal.test(text) ||
       CONFIG.SWEET_TALK_PATTERNS.gratitude.test(text) ||
       CONFIG.SWEET_TALK_PATTERNS.apology.test(text)) &&
      !hasHardKeywords; // Ensure NO hard keywords
    
    return isSweet;
  }
  
  static shouldUsePerplexity(signals, riskScore, turnCount, text) {
    // ONLY use Perplexity for sweet talk with NO keywords
    const isSweetTalk = this.isSweetTalkScam(text, signals);
    
    const conditions = {
      isSweetTalk,
      noHardKeywords: !signals.credential && !signals.payment && !signals.phishing && !signals.threat,
      riskInRange: riskScore >= CONFIG.PERPLEXITY_TRIGGER_RISK_MIN && 
                   riskScore <= CONFIG.PERPLEXITY_TRIGGER_RISK_MAX,
      earlyTurn: turnCount <= CONFIG.PERPLEXITY_TRIGGER_TURNS_MAX
    };
    
    // Log why we're triggering Perplexity
    if (isSweetTalk && conditions.noHardKeywords) {
      console.log('🎯 Sweet talk detected! No keywords, using Perplexity:', conditions);
      return true;
    }
    
    return false;
  }
}

// ==============================================
// DETERMINISTIC REPLIES - FOR KEYWORD-BASED SCAMS
// ==============================================
const DETERMINISTIC_REPLIES = {
  // PHASE 1: CONFUSION
  turn1: [
    "Mera account block kyun ho raha hai? Maine toh kuch nahi kiya.",
    "Aap kaun se bank se bol rahe ho?",
    "Kya hua mere account ko? Koi transaction nahi ki maine."
  ],
  
  turn2: [
    "Kaunsa transaction? Kitne paise ka tha?",
    "Kahan se kiya transaction? Mumbai ya Delhi?",
    "Mujhe toh koi OTP nahi aaya us transaction ke liye."
  ],
  
  turn3: [
    "Aap kaunsa department ho?",
    "Aapka employee ID kya hai? Main verify kar lunga.",
    "Customer care ka number to 1800 wala hai na?"
  ],
  
  // OTP RESPONSES
  otp_first: [
    "OTP kyun chahiye? Bank toh OTP nahi maangta.",
    "Mere SMS mein likha hai 'Never share OTP'.",
    "Yeh toh RBI guidelines ke against hai na?"
  ],
  
  otp_second: [
    "OTP nahi aaya abhi tak. Aapne bheja hai kya?",
    "Main check kar raha hoon, koi OTP nahi hai.",
    "Network slow hai shayad, OTP nahi aa raha."
  ],
  
  otp_third: [
    "Aap baar baar OTP kyun maang rahe ho?",
    "Teen baar OTP maang liya aapne. Thoda ajeeb lag raha hai."
  ],
  
  // PHONE RESPONSES
  phone_first: [
    "Yeh {phone} aapka number hai? Main call karta hoon check karne ke liye.",
    "{phone} - yeh aapka official number hai?"
  ],
  
  phone_with_1800: [
    "Yeh {phone} SBI ka official number hai kya? Mujhe toh 1800 425 3800 pata hai.",
    "SBI ka customer care 1800 112 211 hai. Yeh aapka number kyun hai?"
  ],
  
  // AUTHORITY
  authority: [
    "Aap fraud prevention team se ho ya customer care se?",
    "Aapki employee ID kya hai? Main check karunga."
  ],
  
  // BRANCH
  branch: [
    "Main kal subah 11 baje branch aa raha hoon.",
    "Aap branch ka address bhejo, main abhi aata hoon."
  ],
  
  // COMPLAINT
  complaint: [
    "Main cyber crime mein complaint file kar dunga.",
    "1930 pe call karta hoon abhi, yeh number hai na cyber cell ka?"
  ],
  
  // EXIT
  exit: [
    "Main ab branch ja raha hoon. Aap apna kaam karo.",
    "Aapka number main block kar raha hoon. Bye."
  ],
  
  exit_ignore: [
    "...",
    "Main abhi baat nahi kar sakta.",
    "Kal call karo."
  ]
};

// ==============================================
// SWEET TALK FALLBACK REPLIES - WHEN PERPLEXITY FAILS
// ==============================================
const SWEET_TALK_FALLBACKS = [
  "Aap kaun si company se bol rahe ho?",
  "Mujhe samajh nahi aaya, kya help chahiye aapko?",
  "Aapka naam kya hai? Main note kar raha hoon.",
  "Yeh kaunsa department hai? Pehli baar sun raha hoon.",
  "Aap mere bank se ho ya kahan se?",
  "Main thoda confuse hoon, aap please explain karo.",
  "Aap itna help kyun kar rahe ho?",
  "Maine toh koi problem report nahi ki thi.",
  "Aapka number kaise mila mujhe?",
  "Kya main apne beta se baat kar sakta hoon pehle?"
];

// ==============================================
// INTELLIGENCE EXTRACTION
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
  }
}

// ==============================================
// HYBRID REPLY GENERATOR
// ==============================================
class HybridReplyGenerator {
  
  static initializeState(session) {
    if (!session.hybridState) {
      session.hybridState = {
        // Tracking
        askedTransactionDetails: false,
        askedEmployeeID: false,
        suggestedCall: false,
        suggestedBranch: false,
        suggestedComplaint: false,
        suggestedCyberCell: false,
        suggestedTollFree: false,
        
        // Phone tracking
        extractedPhone: null,
        phoneMentionCount: 0,
        phoneNumberCalled: false,
        phoneNumberQuestioned: false,
        
        // Counters
        otpRequests: 0,
        threatCount: 0,
        
        // Perplexity tracking
        usedPerplexity: false,
        perplexityTurns: [],
        
        // Used replies
        usedReplies: new Set()
      };
    }
    
    // Update from last message
    const lastMessage = session.conversationHistory[session.conversationHistory.length - 1]?.text || '';
    const state = session.hybridState;
    
    if (PATTERNS.otp.test(lastMessage) || PATTERNS.otp_hindi.test(lastMessage)) {
      state.otpRequests++;
    }
    if (PATTERNS.block.test(lastMessage)) {
      state.threatCount++;
    }
    
    const phone = this.extractPhone(lastMessage);
    if (phone) {
      state.phoneMentions++;
      state.extractedPhone = phone;
    }
    
    return state;
  }
  
  static extractPhone(text) {
    const match = text.match(/\b[6-9]\d{9}\b/);
    return match ? match[0] : null;
  }
  
  static getDeterministicReply(type, state, phone = null) {
    let replies;
    
    switch(type) {
      case 'turn1':
        replies = DETERMINISTIC_REPLIES.turn1;
        break;
      case 'turn2':
        replies = DETERMINISTIC_REPLIES.turn2;
        break;
      case 'turn3':
        replies = DETERMINISTIC_REPLIES.turn3;
        break;
      case 'otp_first':
        replies = DETERMINISTIC_REPLIES.otp_first;
        break;
      case 'otp_second':
        replies = DETERMINISTIC_REPLIES.otp_second;
        break;
      case 'otp_third':
        replies = DETERMINISTIC_REPLIES.otp_third;
        break;
      case 'phone_first':
        replies = DETERMINISTIC_REPLIES.phone_first.map(r => r.replace('{phone}', phone));
        break;
      case 'phone_with_1800':
        replies = DETERMINISTIC_REPLIES.phone_with_1800.map(r => r.replace('{phone}', phone));
        break;
      case 'authority':
        replies = DETERMINISTIC_REPLIES.authority;
        break;
      case 'branch':
        replies = DETERMINISTIC_REPLIES.branch;
        break;
      case 'complaint':
        replies = DETERMINISTIC_REPLIES.complaint;
        break;
      case 'exit':
        replies = DETERMINISTIC_REPLIES.exit;
        break;
      case 'ignore':
        replies = DETERMINISTIC_REPLIES.exit_ignore;
        break;
      default:
        replies = ["Mujhe samajh nahi aaya, thoda aur batao."];
    }
    
    return this.getUniqueReply(replies, state);
  }
  
  static async generateReply(session, scamDetected, signals, riskScore, messageText) {
    const state = this.initializeState(session);
    const turnCount = session.conversationHistory.filter(m => m.sender === 'user').length + 1;
    
    // ============ STEP 1: CHECK FOR SWEET TALK - USE PERPLEXITY ============
    const shouldUsePerplexity = PerplexityService.shouldUsePerplexity(
      signals, riskScore, turnCount, messageText
    );
    
    if (shouldUsePerplexity && CONFIG.USE_PERPLEXITY) {
      console.log(`🎯 Perplexity triggered - Sweet talk detected (Turn ${turnCount}, Risk: ${riskScore})`);
      state.usedPerplexity = true;
      state.perplexityTurns.push(turnCount);
      
      // Get AI reply
      const aiReply = await PerplexityService.getSweetTalkReply(
        messageText,
        session.conversationHistory,
        riskScore
      );
      
      if (aiReply) {
        state.usedReplies.add(aiReply);
        return aiReply;
      }
      
      // Fallback if AI fails
      console.log('⚠️ Perplexity failed, using sweet talk fallback');
      return this.getUniqueReply(SWEET_TALK_FALLBACKS, state);
    }
    
    // ============ STEP 2: DETERMINISTIC ENGINE FOR KEYWORD SCAMS ============
    
    // Phone number responses
    if (state.extractedPhone) {
      if (state.phoneMentions === 1 && !state.phoneNumberCalled) {
        state.phoneNumberCalled = true;
        return this.getDeterministicReply('phone_first', state, state.extractedPhone);
      }
      if (state.phoneMentions === 2 && !state.phoneNumberQuestioned) {
        state.phoneNumberQuestioned = true;
        state.suggestedTollFree = true;
        return this.getDeterministicReply('phone_with_1800', state, state.extractedPhone);
      }
    }
    
    // OTP progressive responses
    if (signals.credential) {
      if (state.otpRequests === 1) {
        return this.getDeterministicReply('otp_first', state);
      }
      if (state.otpRequests === 2) {
        return this.getDeterministicReply('otp_second', state);
      }
      if (state.otpRequests >= 3) {
        return this.getDeterministicReply('otp_third', state);
      }
    }
    
    // Turn-based progression
    if (turnCount === 1) return this.getDeterministicReply('turn1', state);
    if (turnCount === 2) {
      if (!state.askedTransactionDetails) {
        state.askedTransactionDetails = true;
        return this.getDeterministicReply('turn2', state);
      }
      return this.getDeterministicReply('turn1', state);
    }
    if (turnCount === 3) {
      if (!state.askedEmployeeID) {
        state.askedEmployeeID = true;
        return this.getDeterministicReply('turn3', state);
      }
      return this.getDeterministicReply('turn2', state);
    }
    if (turnCount === 4) {
      if (!state.suggestedCall) {
        state.suggestedCall = true;
        return this.getDeterministicReply('authority', state);
      }
      return this.getDeterministicReply('turn3', state);
    }
    if (turnCount === 5) {
      if (!state.suggestedTollFree) {
        state.suggestedTollFree = true;
        return "SBI ka 1800 425 3800 number hai na? Main wahan call karunga confirm karne ke liye.";
      }
    }
    if (turnCount >= 6 && turnCount <= 8) {
      if (!state.suggestedBranch) {
        state.suggestedBranch = true;
        return this.getDeterministicReply('branch', state);
      }
    }
    if (turnCount >= 9 && !state.suggestedComplaint) {
      state.suggestedComplaint = true;
      return this.getDeterministicReply('complaint', state);
    }
    if (turnCount >= 10) {
      if (turnCount === 10) {
        return this.getDeterministicReply('exit', state);
      }
      return this.getDeterministicReply('ignore', state);
    }
    
    // Fallback
    return this.getUniqueReply(["Mujhe samajh nahi aaya, thoda aur batao."], state);
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
// SCAM DETECTION ENGINE
// ==============================================
class ScamDetector {
  static analyze(text) {
    const signals = {
      credential: PATTERNS.otp.test(text) || PATTERNS.otp_hindi.test(text) || PATTERNS.pin.test(text),
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
    
    return Math.min(score, 100);
  }

  static shouldExit(session) {
    const userMessages = session.conversationHistory.filter(m => m.sender === 'user');
    if (userMessages.length < CONFIG.MIN_TURNS) return false;
    if (userMessages.length >= CONFIG.MAX_TURNS) return true;
    
    if (session.scamDetected) {
      if (session.intelligence.bankAccounts.length >= 1) return true;
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
    
    // Add Perplexity usage to agent notes
    const perplexityNote = session.hybridState?.usedPerplexity 
      ? `[Perplexity used on turns: ${session.hybridState.perplexityTurns.join(', ')} for sweet talk]` 
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
      agentNotes: `Scammer used ${intelligence.suspiciousKeywords.slice(0, 5).join(', ')}. ${perplexityNote} Extracted ${intelligence.bankAccounts.length} bank accounts, ${intelligence.phoneNumbers.length} phone numbers.`
    };

    try {
      await axios.post(CONFIG.CALLBACK_URL, payload, { timeout: 5000 });
      console.log(`✅ Callback sent for session: ${sessionId}`);
    } catch (error) {
      console.error(`❌ Callback failed: ${error.message}`);
    }
  }
}

// ==============================================
// 🏆 MAIN CONTROLLER - HYBRID EDITION
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

        // Initialize session
        if (!sessions.has(sessionId)) {
            sessions.set(sessionId, {
                id: sessionId,
                scamDetected: false,
                conversationHistory: [],
                intelligence: IntelligenceExtractor.createEmptyStore(),
                hybridState: null
            });
        }

        const session = sessions.get(sessionId);

        // Add scammer message
        session.conversationHistory.push({
            sender: 'scammer',
            text: message.text,
            timestamp: message.timestamp || Date.now()
        });

        // Analyze
        const analysis = ScamDetector.analyze(message.text);
        
        // Extract intelligence
        IntelligenceExtractor.extractFromText(message.text, session.intelligence);
        
        // Update scam detection
        if (!session.scamDetected && analysis.isScam) {
            session.scamDetected = true;
        }

        // GENERATE HYBRID REPLY - Deterministic + Perplexity for sweet talk
        const reply = await HybridReplyGenerator.generateReply(
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

        // Exit if needed
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