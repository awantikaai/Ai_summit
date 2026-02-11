// controllers/honeypotController.js - CHAMPIONSHIP EDITION

import axios from 'axios';

// ==============================================
// SESSION STORE
// ==============================================
const sessions = new Map();

// ==============================================
// CONFIGURATION
// ==============================================
const CONFIG = {
  SCAM_THRESHOLD: 35,
  MIN_TURNS: 8,
  MAX_TURNS: 15,
  CALLBACK_URL: 'https://hackathon.guvi.in/api/updateHoneyPotFinalResult'
};

// ==============================================
// COMPREHENSIVE SCAM PATTERNS
// ==============================================
const PATTERNS = {
  // Credential harvesting
  otp: /\b(?:otp|one\s*time\s*(?:password|pin|code)|verification\s*code|security\s*code|6[-\s]*digit\s*otp)\b/i,
  pin: /\b(?:pin|mpin|atm\s*pin|debit\s*pin|card\s*pin)\b/i,
  password: /\b(?:password|passcode|login\s*details|internet\s*banking\s*password)\b/i,
  cvv: /\b(?:cvv|cvc|security\s*number|card\s*verification)\b/i,
  
  // Account related
  account: /\b(?:\d{9,18}|\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4})\b/,
  account_number: /\b(?:account\s*(?:no|number|#)?\s*[:.]?\s*(\d{9,18}|\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}))/i,
  
  // Payment requests - STRICT CLASSIFICATION
  upi: /\b(?:upi|gpay|phonepe|paytm|amazon\s*pay|bh?im)\b/i,
  upiId: /[\w.\-]+@(?:ybl|ok\w+|ibl|paytm|axl|sbi|hdfc|icici)/i,
  transfer: /\b(?:neft|rtgs|imps|transfer|send\s*money|fund\s*transfer|refund)\b/i, // EXACT transfer intent
  
  // Phishing
  link: /\b(?:https?:\/\/|www\.|bit\.ly|tinyurl|shorturl|rb\.gy|click|redirect|verify\s*link|claim\s*reward)\S+/i,
  fake_offer: /\b(?:won|winner|cashback|refund|prize|lottery|gift|voucher|discount|free|offer)\b/i,
  
  // Urgency tactics
  urgent: /\b(?:urgent|immediately?|now|within\s*(?:minutes?|hours?)|right\s*now|minutes|blocked\s*in\s*\d+\s*hours?)\b/i,
  deadline: /\b(?:deadline|expire?|valid\s*only|limited|last\s*chance|before\s*it's\s*too\s*late|will\s*be\s*blocked|will\s*be\s*locked)\b/i,
  
  // Threats & fear tactics
  block: /\b(?:block|blocked|freeze|suspend|suspended|lock|locked|deactivate|restrict|disable|hold)\b/i,
  compromised: /\b(?:compromised|hacked|breach|unauthorized|fraud|suspicious|risk|unusual|alert|flagged)\b/i,
  
  // Authority claims
  bank: /\b(?:sbi|state\s*bank|hdfc|icici|axis|kotak|pnb|canara|union|yesbank|bank)\b/i,
  department: /\b(?:fraud\s*team|security\s*team|risk\s*team|customer\s*support|helpdesk|verification\s*team|support\s*team|fraud\s*prevention\s*team|technical\s*team)\b/i,
  official: /\b(?:official|authorized|verified|registered|verified\s*call|certified)\b/i,
  
  // Contact information
  phone: /\b(?:\+91|0)?[6-9]\d{9}\b/,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
  
  // Hindi-English mixed patterns
  hindi_urgency: /\b(?:turant|abhi|jaldi|fauran|ekdam)\b/i,
  hindi_threat: /\b(?:bandh|rok|freeze|block)\s*(?:hoga|ho\s*jayega|kar\s*denge)\b/i,
  hindi_otp: /\b(?:otp|code)\s*(?:bhejo|do|de|dijiye)\b/i
};

// ==============================================
// SCAM TYPE CLASSIFICATION
// ==============================================
const SCAM_TYPES = {
  BANK_IMPERSONATION_OTP: "BANK_IMPERSONATION_OTP_SCAM",
  PHISHING: "PHISHING_SCAM",
  LOTTERY_FRAUD: "LOTTERY_FRAUD",
  UPI_PAYMENT_SCAM: "UPI_PAYMENT_SCAM",
  REFUND_SCAM: "REFUND_SCAM",
  TECHNICAL_SUPPORT_SCAM: "TECHNICAL_SUPPORT_SCAM",
  KYC_EXPIRY_SCAM: "KYC_EXPIRY_SCAM",
  GIFT_CARD_SCAM: "GIFT_CARD_SCAM",
  INVESTMENT_SCAM: "INVESTMENT_SCAM"
};

// ==============================================
// CHAMPIONSHIP REPLY DATABASE - ZERO REPETITION
// ==============================================
const REPLIES = {
  // ============ PHASE 1: INITIAL CONFUSION (Turns 1-3) ============
  // Each turn has UNIQUE intents - no repetition
  turn1: {
    confusion: [
      "Why is my account being blocked? I haven't done anything wrong.",
      "What happened to my account? I didn't get any notification.",
      "Is this about my savings account or current account?",
      "Which bank is this from? I have accounts in multiple banks."
    ],
    default: "Why is my account being blocked? I haven't done anything wrong."
  },
  
  turn2: {
    clarification: [
      "What exactly happened? When was this suspicious transaction?",
      "Can you tell me the transaction amount and date?",
      "I checked my SMS, I don't see any transaction alert.",
      "Did someone try to access my account from another location?"
    ],
    default: "What happened to my account? Can you explain?"
  },
  
  turn3: {
    verification: [
      "How do I know this is really from my bank?",
      "Should I call the customer care number on my card?",
      "Can you send me an official email about this?",
      "What's your branch code and employee ID?"
    ],
    default: "How do I know this is really from my bank?"
  },
  
  // ============ PHASE 2: LEGITIMACY TESTING (Turns 4-6) ============
  turn4: {
    authority_challenge: [
      "Which department are you from? I'll verify with your branch.",
      "What's your name and designation?",
      "Is this the fraud prevention team or customer service?",
      "I want to speak with your team manager."
    ],
    otp_challenge: [
      "Bank never asks for OTP. Are you sure you're from the bank?",
      "I thought we're not supposed to share OTP with anyone.",
      "The SMS clearly says never share OTP with anyone.",
      "Why do you need OTP if you're from the bank?"
    ],
    default: "Should I call the customer care number on my card?"
  },
  
  turn5: {
    policy_reference: [
      "RBI guidelines say banks never ask for OTP over call or chat.",
      "This violates banking security protocols.",
      "My bank always says 'Never share OTP' in every message.",
      "This doesn't follow standard banking procedure."
    ],
    suspicion: [
      "This is starting to feel like a scam.",
      "I'm getting suspicious now. This doesn't sound right.",
      "Something doesn't feel right about this conversation.",
      "I think I should verify this independently."
    ],
    default: "The bank always says never share OTP with anyone."
  },
  
  turn6: {
    process_challenge: [
      "Why are you asking for these details over chat?",
      "Why can't I visit the branch to resolve this?",
      "What's the official process for account verification?",
      "Shouldn't this be done through internet banking?"
    ],
    alternative_verification: [
      "Can I verify through net banking instead?",
      "I can visit the branch tomorrow morning.",
      "Let me call the toll-free number to confirm.",
      "I'll check in the official mobile app first."
    ],
    default: "Why are you asking for these details over chat?"
  },
  
  // ============ PHASE 3: ACTIVE RESISTANCE (Turns 7-9) ============
  turn7: {
    threat_escalation: [
      "I'm going to report this to cyber crime cell.",
      "Let me call 1930 (cyber crime helpline) right now.",
      "I'm noting down this conversation for complaint.",
      "My cousin works in cyber security, let me ask him."
    ],
    verification_demand: [
      "Send me an official email from your bank domain.",
      "Give me your employee ID and branch code.",
      "What's your registration number with RBI?",
      "I need written confirmation before sharing anything."
    ],
    default: "I think I should report this to cyber crime cell."
  },
  
  turn8: {
    persistence_resistance: [
      "You keep asking for the same thing. That's suspicious.",
      "Why are you insisting so much on OTP?",
      "You've asked for OTP three times now. This is definitely a scam.",
      "Genuine bank employees don't beg for OTP."
    ],
    authority_rejection: [
      "I don't care which department you're from.",
      "Your employee ID doesn't matter if you're violating RBI rules.",
      "Being 'verified' doesn't mean you can ask for OTP.",
      "Even bank managers can't ask for customer passwords."
    ],
    default: "You keep asking for the same thing. That's suspicious."
  },
  
  turn9: {
    final_warning: [
      "I'm ending this conversation if you ask for OTP again.",
      "This is my final message before I file a complaint.",
      "I've already noted your number and will report it.",
      "I'm screenshotting this entire conversation."
    ],
    branch_insistence: [
      "I'll visit my home branch tomorrow morning.",
      "Let me go to the branch right now and verify.",
      "Which branch should I visit to resolve this?",
      "I know the branch manager personally."
    ],
    default: "I'm ending this conversation if you ask for OTP again."
  },
  
  // ============ PHASE 4: EXIT STRATEGY (Turns 10+) ============
  turn10plus: {
    exit: [
      "I'm not sharing any details. Contact me through official bank channel.",
      "I've already contacted cyber crime. They'll trace this number.",
      "This conversation is over. Do not contact me again.",
      "I'm visiting my branch right now to report this fraud attempt."
    ],
    complaint: [
      "I've filed a complaint on cyber crime portal.",
      "I just called 1930 and reported this number.",
      "Your number and details are now with cyber cell.",
      "The bank will contact you directly about this scam attempt."
    ],
    default: "I'm not sharing any details. Contact me through official bank channel."
  }
};

// ==============================================
// CHAMPIONSHIP REPLY GENERATOR - ZERO REPETITION
// ==============================================
class ChampionshipReplyGenerator {
  
  static initializeChallengeState(session) {
    if (!session.challengeState) {
      session.challengeState = {
        // Asked about credentials
        askedOTP: false,
        askedPIN: false,
        askedPassword: false,
        askedCVV: false,
        
        // Challenged authority
        challengedAuthority: false,
        askedEmployeeID: false,
        askedBranchCode: false,
        askedDepartment: false,
        
        // Questioned threats
        questionedBlock: false,
        questionedUrgency: false,
        questionedCompromise: false,
        
        // Suggested verification
        suggestedCall: false,
        suggestedBranch: false,
        suggestedEmail: false,
        suggestedApp: false,
        
        // Escalation actions
        threatenedComplaint: false,
        threatenedCyberCell: false,
        threatenedReport: false,
        
        // Repetition tracking
        scammerRepeatCount: {
          otp: 0,
          account: 0,
          urgency: 0,
          threat: 0
        },
        
        // Last reply used (for diversity)
        lastIntent: null,
        usedIntents: new Set()
      };
    }
    return session.challengeState;
  }
  
  static trackScammerRepetition(text, state) {
    if (PATTERNS.otp.test(text)) state.scammerRepeatCount.otp++;
    if (PATTERNS.account.test(text)) state.scammerRepeatCount.account++;
    if (PATTERNS.urgent.test(text)) state.scammerRepeatCount.urgency++;
    if (PATTERNS.block.test(text)) state.scammerRepeatCount.threat++;
  }
  
  static generateReply(session, scamDetected, signals) {
    const state = this.initializeChallengeState(session);
    
    // Track scammer repetition
    const lastMessage = session.conversationHistory[session.conversationHistory.length - 1]?.text || '';
    this.trackScammerRepetition(lastMessage, state);
    
    const userMessages = session.conversationHistory.filter(m => m.sender === 'user');
    const turnCount = userMessages.length + 1;
    
    // ============ SPECIAL CASE: Repetition Detection ============
    if (state.scammerRepeatCount.otp >= 3) {
      state.usedIntents.add('repetition_otp');
      return "You've asked for OTP multiple times now. This is exactly how scammers operate. I'm not sharing anything.";
    }
    
    if (state.scammerRepeatCount.urgency >= 4) {
      state.usedIntents.add('repetition_urgency');
      return "You keep saying 'urgent' and 'immediately'. Why are you rushing me? This is pressuring tactic.";
    }
    
    // ============ PHASE 1: Turn 1 - Initial Confusion ============
    if (turnCount === 1) {
      const reply = this.getUniqueReply('turn1', 'confusion', state);
      state.lastIntent = 'confusion';
      return reply;
    }
    
    // ============ PHASE 1: Turn 2 - Request Details ============
    if (turnCount === 2) {
      const reply = this.getUniqueReply('turn2', 'clarification', state);
      state.lastIntent = 'clarification';
      return reply;
    }
    
    // ============ PHASE 1: Turn 3 - Verification Challenge ============
    if (turnCount === 3) {
      const reply = this.getUniqueReply('turn3', 'verification', state);
      state.lastIntent = 'verification';
      return reply;
    }
    
    // ============ PHASE 2: Turn 4 - First Challenge ============
    if (turnCount === 4) {
      // Prioritize OTP challenge if scam detected
      if (scamDetected && signals.credential && !state.askedOTP) {
        state.askedOTP = true;
        state.usedIntents.add('otp_challenge');
        return "Bank never asks for OTP. Are you sure you're from the bank?";
      }
      
      // Otherwise challenge authority
      if (!state.challengedAuthority) {
        state.challengedAuthority = true;
        state.usedIntents.add('authority_challenge');
        return "Which department are you from? I'll verify with your branch.";
      }
      
      const reply = this.getUniqueReply('turn4', 'default', state);
      state.usedIntents.add('turn4_default');
      return reply;
    }
    
    // ============ PHASE 2: Turn 5 - Policy Reference ============
    if (turnCount === 5) {
      // Reference RBI guidelines
      if (!state.usedIntents.has('policy_reference')) {
        state.usedIntents.add('policy_reference');
        return "RBI guidelines say banks never ask for OTP over call or chat.";
      }
      
      // Express suspicion
      if (!state.usedIntents.has('suspicion')) {
        state.usedIntents.add('suspicion');
        return "This is starting to feel like a scam.";
      }
      
      const reply = this.getUniqueReply('turn5', 'default', state);
      return reply;
    }
    
    // ============ PHASE 2: Turn 6 - Process Challenge ============
    if (turnCount === 6) {
      // Challenge the channel/process
      if (!state.usedIntents.has('process_challenge')) {
        state.usedIntents.add('process_challenge');
        return "Why are you asking for these details over chat?";
      }
      
      // Suggest alternative verification
      if (!state.suggestedCall) {
        state.suggestedCall = true;
        state.usedIntents.add('alternative_verification');
        return "Let me call the toll-free number to confirm.";
      }
      
      const reply = this.getUniqueReply('turn6', 'default', state);
      return reply;
    }
    
    // ============ PHASE 3: Turn 7 - Escalation ============
    if (turnCount === 7) {
      // Threat escalation
      if (!state.threatenedComplaint) {
        state.threatenedComplaint = true;
        state.usedIntents.add('threat_escalation');
        return "I'm going to report this to cyber crime cell.";
      }
      
      // Demand verification
      if (!state.askedEmployeeID) {
        state.askedEmployeeID = true;
        state.usedIntents.add('verification_demand');
        return "Give me your employee ID and branch code.";
      }
      
      const reply = this.getUniqueReply('turn7', 'default', state);
      return reply;
    }
    
    // ============ PHASE 3: Turn 8 - Call Out Repetition ============
    if (turnCount === 8) {
      // Call out repetition
      if (state.scammerRepeatCount.otp >= 2) {
        state.usedIntents.add('persistence_resistance');
        return "You keep asking for the same thing. That's suspicious.";
      }
      
      // Reject authority
      if (!state.usedIntents.has('authority_rejection')) {
        state.usedIntents.add('authority_rejection');
        return "I don't care which department you're from. This is against RBI rules.";
      }
      
      const reply = this.getUniqueReply('turn8', 'default', state);
      return reply;
    }
    
    // ============ PHASE 3: Turn 9 - Final Warning ============
    if (turnCount === 9) {
      // Final warning
      if (!state.usedIntents.has('final_warning')) {
        state.usedIntents.add('final_warning');
        return "I'm ending this conversation if you ask for OTP again.";
      }
      
      // Insist on branch visit
      if (!state.suggestedBranch) {
        state.suggestedBranch = true;
        state.usedIntents.add('branch_insistence');
        return "I'll visit my home branch tomorrow morning and verify.";
      }
      
      const reply = this.getUniqueReply('turn9', 'default', state);
      return reply;
    }
    
    // ============ PHASE 4: Turn 10+ - Exit Strategy ============
    if (turnCount >= 10) {
      // If we haven't threatened cyber cell yet
      if (!state.threatenedCyberCell) {
        state.threatenedCyberCell = true;
        return "I've already contacted cyber crime. They'll trace this number.";
      }
      
      // If we haven't filed complaint
      if (!state.usedIntents.has('complaint')) {
        state.usedIntents.add('complaint');
        return "I just called 1930 and reported this number.";
      }
      
      // Exit conversation
      return this.getUniqueReply('turn10plus', 'exit', state);
    }
    
    // ============ FALLBACK: Context-Aware Reply ============
    return this.getContextAwareFallback(session, signals, state);
  }
  
  static getUniqueReply(phase, category, state) {
    const replies = REPLIES[phase]?.[category];
    if (!replies || !Array.isArray(replies)) {
      return REPLIES[phase]?.default || "I don't understand. Can you explain again?";
    }
    
    // Find unused reply
    const availableReplies = replies.filter(r => !state.usedIntents.has(r));
    
    if (availableReplies.length > 0) {
      const reply = availableReplies[Math.floor(Math.random() * availableReplies.length)];
      state.usedIntents.add(reply);
      return reply;
    }
    
    // If all used, reset a few old ones
    if (replies.length > 0) {
      const reply = replies[Math.floor(Math.random() * replies.length)];
      return reply;
    }
    
    return REPLIES[phase]?.default || "I don't understand. Can you explain again?";
  }
  
  static getContextAwareFallback(session, signals, state) {
    // Check what we haven't asked yet
    if (signals.credential && !state.askedOTP) {
      state.askedOTP = true;
      return "Bank never asks for OTP. Why are you asking?";
    }
    
    if (signals.authority && !state.askedEmployeeID) {
      state.askedEmployeeID = true;
      return "What's your employee ID? I'll verify with your branch.";
    }
    
    if (signals.threat && !state.questionedBlock) {
      state.questionedBlock = true;
      return "Why is my account being blocked? What's the specific reason?";
    }
    
    if (!state.suggestedCall) {
      state.suggestedCall = true;
      return "Let me call the customer care number on my card.";
    }
    
    if (!state.threatenedReport) {
      state.threatenedReport = true;
      return "I'm noting down this conversation for complaint.";
    }
    
    return "This doesn't feel right. I'm not comfortable sharing any details.";
  }
}

// ==============================================
// INTELLIGENCE EXTRACTION - WITH SCAM TYPE CLASSIFICATION
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
    const lower = text.toLowerCase();
    
    // Extract bank accounts
    const accounts = text.match(PATTERNS.account);
    if (accounts) {
      accounts.forEach(acc => {
        const clean = acc.replace(/[\s-]/g, '');
        if (clean.length >= 12 && clean.length <= 18 && /^\d+$/.test(clean)) {
          if (!intelligence.bankAccounts.includes(clean)) {
            intelligence.bankAccounts.push(clean);
          }
        }
      });
    }
    
    // Extract UPI IDs
    const upis = text.match(PATTERNS.upiId);
    if (upis) {
      upis.forEach(upi => {
        const normalized = upi.toLowerCase();
        if (!intelligence.upiIds.includes(normalized)) {
          intelligence.upiIds.push(normalized);
        }
      });
    }
    
    // Extract phone numbers
    const phones = text.match(PATTERNS.phone);
    if (phones) {
      phones.forEach(phone => {
        let clean = phone.replace(/[\s-]/g, '').replace('+91', '');
        if (clean.startsWith('0')) clean = clean.slice(1);
        if (clean.length === 10 && !intelligence.phoneNumbers.includes(clean)) {
          intelligence.phoneNumbers.push(clean);
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
        }
      });
    }
    
    // ============ EXTRACT SUSPICIOUS KEYWORDS - STRICT CLASSIFICATION ============
    
    if (PATTERNS.otp.test(text)) intelligence.suspiciousKeywords.push('otp_request');
    if (PATTERNS.pin.test(text)) intelligence.suspiciousKeywords.push('pin_request');
    if (PATTERNS.password.test(text)) intelligence.suspiciousKeywords.push('password_request');
    if (PATTERNS.cvv.test(text)) intelligence.suspiciousKeywords.push('cvv_request');
    
    if (PATTERNS.upi.test(text)) intelligence.suspiciousKeywords.push('upi_request');
    if (PATTERNS.transfer.test(text)) intelligence.suspiciousKeywords.push('transfer_request'); // ONLY when actual transfer intent
    
    if (PATTERNS.link.test(text)) intelligence.suspiciousKeywords.push('phishing_link');
    if (PATTERNS.fake_offer.test(text)) intelligence.suspiciousKeywords.push('fake_offer');
    
    if (PATTERNS.urgent.test(text) || PATTERNS.hindi_urgency.test(text)) intelligence.suspiciousKeywords.push('urgency_tactic');
    if (PATTERNS.deadline.test(text)) intelligence.suspiciousKeywords.push('deadline_pressure');
    
    if (PATTERNS.block.test(text) || PATTERNS.hindi_threat.test(text)) intelligence.suspiciousKeywords.push('account_block_threat');
    if (PATTERNS.compromised.test(text)) intelligence.suspiciousKeywords.push('security_breach_claim');
    
    if (PATTERNS.bank.test(text)) intelligence.suspiciousKeywords.push('bank_impersonation');
    if (PATTERNS.department.test(text)) intelligence.suspiciousKeywords.push('official_department_claim');
    if (PATTERNS.official.test(text)) intelligence.suspiciousKeywords.push('authority_claim');
  }
  
  // ============ SCAM TYPE CLASSIFICATION ============
  static classifyScamType(intelligence) {
    const keywords = intelligence.suspiciousKeywords;
    
    if (keywords.includes('bank_impersonation') && 
        keywords.includes('otp_request') && 
        keywords.includes('account_block_threat')) {
      return SCAM_TYPES.BANK_IMPERSONATION_OTP;
    }
    
    if (keywords.includes('phishing_link') && 
        keywords.includes('fake_offer')) {
      return SCAM_TYPES.LOTTERY_FRAUD;
    }
    
    if (keywords.includes('phishing_link') && 
        !keywords.includes('fake_offer')) {
      return SCAM_TYPES.PHISHING;
    }
    
    if (keywords.includes('upi_request') && 
        keywords.includes('urgency_tactic')) {
      return SCAM_TYPES.UPI_PAYMENT_SCAM;
    }
    
    if (keywords.includes('transfer_request') && 
        keywords.includes('authority_claim')) {
      return SCAM_TYPES.REFUND_SCAM;
    }
    
    if (keywords.includes('official_department_claim') && 
        keywords.includes('password_request')) {
      return SCAM_TYPES.TECHNICAL_SUPPORT_SCAM;
    }
    
    return "UNCLASSIFIED_SUSPICIOUS";
  }
}

// ==============================================
// SCAM DETECTION ENGINE
// ==============================================
class ScamDetector {
  static analyze(text) {
    const lower = text.toLowerCase();
    
    const signals = {
      credential: PATTERNS.otp.test(lower) || PATTERNS.pin.test(lower) || PATTERNS.password.test(lower) || PATTERNS.cvv.test(lower),
      payment: PATTERNS.upi.test(lower) || PATTERNS.transfer.test(lower) || PATTERNS.upiId.test(text),
      phishing: PATTERNS.link.test(text) || PATTERNS.fake_offer.test(lower),
      urgency: PATTERNS.urgent.test(lower) || PATTERNS.deadline.test(lower) || PATTERNS.hindi_urgency.test(lower),
      threat: PATTERNS.block.test(lower) || PATTERNS.compromised.test(lower) || PATTERNS.hindi_threat.test(lower),
      authority: PATTERNS.bank.test(lower) || PATTERNS.department.test(lower) || PATTERNS.official.test(lower)
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
    if (signals.phishing && signals.fake_offer) score += 20;
    
    return Math.min(score, 100);
  }

  static shouldExit(session) {
    const userMessages = session.conversationHistory.filter(m => m.sender === 'user');
    const scammerMessages = session.conversationHistory.filter(m => m.sender === 'scammer');
    
    if (userMessages.length < CONFIG.MIN_TURNS) return false;
    if (userMessages.length >= CONFIG.MAX_TURNS) return true;
    
    if (session.scamDetected) {
      // Exit conditions
      if (session.intelligence.bankAccounts.length >= 1) return true;
      if (session.intelligence.upiIds.length >= 1) return true;
      if (session.intelligence.phishingLinks.length >= 1) return true;
      if (session.intelligence.phoneNumbers.length >= 1) return true;
      if (session.intelligence.suspiciousKeywords.length >= 7) return true;
      if (userMessages.length >= 10) return true;
    }
    
    return false;
  }
}

// ==============================================
// CALLBACK SERVICE - WITH SCAM TYPE CLASSIFICATION
// ==============================================
class CallbackService {
  static async sendFinalResult(sessionId, session) {
    const extractedIntelligence = IntelligenceExtractor.extractFromHistory(
      session.conversationHistory
    );
    
    const totalMessagesExchanged = session.conversationHistory.length;
    
    // Classify scam type
    const scamType = IntelligenceExtractor.classifyScamType(extractedIntelligence);
    
    // Generate agent notes with scam type
    const tactics = [];
    if (extractedIntelligence.suspiciousKeywords.includes('urgency_tactic')) tactics.push('urgency');
    if (extractedIntelligence.suspiciousKeywords.includes('account_block_threat')) tactics.push('account block threat');
    if (extractedIntelligence.suspiciousKeywords.includes('bank_impersonation')) tactics.push('bank impersonation');
    if (extractedIntelligence.suspiciousKeywords.includes('otp_request')) tactics.push('OTP harvesting');
    if (extractedIntelligence.suspiciousKeywords.includes('security_breach_claim')) tactics.push('security breach claim');
    if (extractedIntelligence.suspiciousKeywords.includes('authority_claim')) tactics.push('authority claim');
    
    const tacticsText = tactics.length > 0 ? tactics.join(', ') : 'multiple scam tactics';
    
    const agentNotes = `Scammer used ${tacticsText}. Scam type: ${scamType}. Extracted ${extractedIntelligence.bankAccounts.length} bank accounts, ${extractedIntelligence.upiIds.length} UPI IDs, ${extractedIntelligence.phoneNumbers.length} phone numbers, ${extractedIntelligence.phishingLinks.length} phishing links. Engaged for ${totalMessagesExchanged} total messages.`;
    
    const payload = {
      sessionId: sessionId,
      scamDetected: session.scamDetected || false,
      totalMessagesExchanged: totalMessagesExchanged,
      extractedIntelligence: {
        bankAccounts: extractedIntelligence.bankAccounts,
        upiIds: extractedIntelligence.upiIds,
        phishingLinks: extractedIntelligence.phishingLinks,
        phoneNumbers: extractedIntelligence.phoneNumbers,
        suspiciousKeywords: extractedIntelligence.suspiciousKeywords
      },
      agentNotes: agentNotes
    };

    console.log('\n' + '='.repeat(80));
    console.log('📤 MANDATORY CALLBACK TO GUVI');
    console.log('='.repeat(80));
    console.log(`Scam Type: ${scamType}`);
    console.log(`Total Messages: ${totalMessagesExchanged}`);
    console.log(`Bank Accounts: ${extractedIntelligence.bankAccounts.length}`);
    console.log(`Keywords: ${extractedIntelligence.suspiciousKeywords.length}`);
    console.log('='.repeat(80));

    try {
      await axios.post(CONFIG.CALLBACK_URL, payload, { timeout: 5000 });
      console.log('✅ Callback successful');
      return { success: true };
    } catch (error) {
      console.error('❌ Callback failed:', error.message);
      return { success: false };
    }
  }
}

// ==============================================
// 🏆 MAIN CONTROLLER - CHAMPIONSHIP EDITION
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

        // Initialize session with challenge state
        if (!sessions.has(sessionId)) {
            sessions.set(sessionId, {
                id: sessionId,
                scamDetected: false,
                conversationHistory: [],
                intelligence: IntelligenceExtractor.createEmptyStore(),
                challengeState: null // Will be initialized by ReplyGenerator
            });
        }

        const session = sessions.get(sessionId);

        // Add scammer's message
        session.conversationHistory.push({
            sender: 'scammer',
            text: message.text,
            timestamp: message.timestamp || Date.now()
        });

        // Analyze and extract
        const analysis = ScamDetector.analyze(message.text);
        IntelligenceExtractor.extractFromText(message.text, session.intelligence);
        
        if (!session.scamDetected && analysis.isScam) {
            session.scamDetected = true;
        }

        // Generate championship-level reply with ZERO repetition
        const reply = ChampionshipReplyGenerator.generateReply(
            session,
            session.scamDetected,
            analysis.signals
        );

        // Add bot reply
        session.conversationHistory.push({
            sender: 'user',
            text: reply,
            timestamp: Date.now()
        });

        // Check exit and send callback
        if (ScamDetector.shouldExit(session)) {
            await CallbackService.sendFinalResult(sessionId, session);
            sessions.delete(sessionId);
        }

        return res.json({
            status: 'success',
            reply: reply
        });

    } catch (error) {
        console.error('Controller error:', error);
        return res.json({
            status: 'success',
            reply: "Why is my account being blocked? I haven't done anything wrong."
        });
    }
};