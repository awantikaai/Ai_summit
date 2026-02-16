// utils/ultimateReplyGenerator.js
import { REPLIES } from "./replies.js";
import { PerplexityService } from "../service/perplexity.js";
import { CONFIG } from "./config.js";

export class ReplyGenerator {

  static async generateReply(detected, session, messageText, conversationHistory) {
    
    // ============ INITIALIZE SESSION MEMORY ============
    this.initializeMemory(session);
    
    // ============ 10 SECOND DELAY (Evaluation Requirement) ============
    await this.delay(10000);
    
    // ============ UPDATE SESSION STATE ============
    this.updateSessionState(detected, session, messageText);
    
    // ============ DETECT SCAM TYPE & PHASE ============
    const scamType = this.detectScamType(detected, session);
    const phase = this.determinePhase(session);
    
    console.log(`🎯 Turn: ${session.turnCount}, Phase: ${phase}, Scam: ${scamType}`);
    
    // ============ CHECK FOR EARLY EXIT CONDITIONS ============
    if (this.shouldExitImmediately(session)) {
      return this.getExitResponse(session);
    }
    
    // ============ AMBIGUOUS MESSAGE HANDLING ============
    if (this.isAmbiguousMessage(detected, session) && CONFIG.USE_PERPLEXITY) {
      const reply = await this.handleAmbiguousMessage(messageText, conversationHistory, session);
      if (reply) return reply;
    }
    
    // ============ GREETING HANDLING ============
    if (this.isGreetingOnly(detected, messageText, session)) {
      return this.getUniqueReply("greeting_response", session);
    }
    
    // ============ REPETITION DETECTION ============
    if (session.repetitionCount >= 2) {
      return this.handleRepetition(session);
    }
    
    // ============ THREAT RESPONSES (HIGHEST PRIORITY) ============
    if (detected.hasThreat || detected.hasPermanent || detected.hasFine) {
      return this.handleThreat(detected, session);
    }
    
    // ============ SCAM-TYPE SPECIFIC RESPONSES ============
    
    // BANK FRAUD
    if (scamType === 'bank' || detected.hasBank || detected.hasAccount) {
      return this.handleBankFraud(detected, session, phase);
    }
    
    // UPI FRAUD
    if (scamType === 'upi' || detected.hasUPI) {
      return this.handleUPIFraud(detected, session, phase);
    }
    
    // PHISHING/LINK SCAM
    if (scamType === 'link' || detected.hasLink) {
      return this.handlePhishing(detected, session, phase);
    }
    
    // LOTTERY/GIFT SCAM
    if (scamType === 'lottery' || detected.hasFakeOffer || detected.hasLottery) {
      return this.handleLottery(detected, session, phase);
    }
    
    // INVESTMENT SCAM
    if (scamType === 'investment' || detected.hasInvestment) {
      return this.handleInvestment(detected, session, phase);
    }
    
    // JOB SCAM
    if (scamType === 'job' || detected.hasJob) {
      return this.handleJob(detected, session, phase);
    }
    
    // LOAN SCAM
    if (scamType === 'loan' || detected.hasLoan) {
      return this.handleLoan(detected, session, phase);
    }
    
    // KYC SCAM
    if (scamType === 'kyc' || detected.hasKYC) {
      return this.handleKYC(detected, session, phase);
    }
    
    // ============ INTELLIGENCE EXTRACTION (Cross-scam) ============
    
    // ASK FOR SCAMMER'S NAME
    if (!session.memory.askedName && this.canAskName(session)) {
      session.memory.askedName = true;
      return this.getUniqueReply("ask_scammer_name", session);
    }
    
    // ASK FOR SCAMMER'S PHONE
    if (!session.memory.askedPhone && this.canAskPhone(session)) {
      session.memory.askedPhone = true;
      return this.getUniqueReply("ask_scammer_phone", session);
    }
    
    // ASK FOR SCAMMER'S EMAIL
    if (!session.memory.askedEmail && this.canAskEmail(detected, session)) {
      session.memory.askedEmail = true;
      return this.getUniqueReply("email_send_request", session);
    }
    
    // ASK FOR EMPLOYEE ID (Bank/Authority claims)
    if ((scamType === 'bank' || detected.hasAuthority) && !session.memory.askedEmployeeID) {
      session.memory.askedEmployeeID = true;
      return this.getUniqueReply("ask_employee_id", session);
    }
    
    // ASK FOR BRANCH CODE (Bank-related)
    if ((scamType === 'bank' || detected.hasBank) && !session.memory.askedBranchCode) {
      session.memory.askedBranchCode = true;
      return this.getUniqueReply("ask_branch_code", session);
    }
    
    // ASK FOR REFERENCE ID (Threat-related)
    if ((detected.hasThreat || session.threatCount > 1) && !session.memory.askedReferenceID) {
      session.memory.askedReferenceID = true;
      return this.getUniqueReply("ask_reference_id", session);
    }
    
    // ASK FOR OFFICIAL NUMBER
    if (!session.memory.askedOfficialNumber && session.turnCount >= 3) {
      session.memory.askedOfficialNumber = true;
      return this.getUniqueReply("ask_official_number", session);
    }
    
    // ============ OTP HANDLING (Universal) ============
    if (detected.hasOTP) {
      return this.handleOTP(detected, session, scamType);
    }
    
    // ============ PHONE NUMBER HANDLING ============
    if (detected.hasPhone && detected.phoneNumber) {
      return this.handlePhoneNumber(detected, session);
    }
    
    // ============ EMAIL HANDLING ============
    if (detected.hasEmail && detected.extractedEmail) {
      return this.handleEmail(detected, session);
    }
    
    // ============ LINK HANDLING ============
    if (detected.hasLink) {
      return this.handleLink(detected, session);
    }
    
    // ============ TOLL-FREE COMPARISON ============
    if (detected.hasTollfree) {
      return this.getUniqueReply("tollfree_curious", session);
    }
    
    // ============ FAMILY MENTION ============
    if (detected.hasFamily) {
      return this.getUniqueReply("family_worried", session);
    }
    
    // ============ CYBER THREAT ============
    if (detected.hasCyber) {
      session.memory.exitImminent = true;
      return this.getUniqueReply("cyber_threat", session);
    }
    
    // ============ PHASE-BASED PROGRESSION ============
    return this.getPhaseBasedResponse(phase, scamType, session);
  }

  // ===============================
  // INITIALIZATION & STATE MANAGEMENT
  // ===============================
  static initializeMemory(session) {
    if (!session.memory) {
      session.memory = {
        // What we've asked
        askedName: false,
        askedPhone: false,
        askedEmail: false,
        askedEmployeeID: false,
        askedBranchCode: false,
        askedIFSC: false,
        askedAddress: false,
        askedReferenceID: false,
        askedUPI: false,
        askedAccount: false,
        askedProof: false,
        askedOfficialNumber: false,
        
        // What scammer gave us
        extractedInfo: {
          name: null,
          phone: null,
          email: null,
          employeeID: null,
          branchCode: null,
          ifsc: null,
          upi: null,
          account: null,
          referenceID: null
        },
        
        // Scam type tracking
        detectedScamType: null,
        scamConfidence: {},
        
        // State tracking
        phase: 1,
        threatCount: 0,
        otpRequests: 0,
        urgencyCount: 0,
        repetitionCount: 0,
        lastMessage: '',
        lastTopics: [],
        
        // Used replies tracker (MAX 5 per category)
        usedReplies: {},
        
        // Exit flags
        exitImminent: false,
        extractedEnough: false
      };
    }
    
    // Initialize usedReplies categories
    if (!session.memory.usedReplies) session.memory.usedReplies = {};
  }

  static updateSessionState(detected, session, messageText) {
    // Update counters
    if (detected.hasThreat) session.memory.threatCount++;
    if (detected.hasOTP) session.memory.otpRequests += detected.otpRequestCount || 1;
    if (detected.hasUrgency) session.memory.urgencyCount++;
    
    // Track repetition
    if (session.memory.lastMessage === messageText) {
      session.memory.repetitionCount++;
    } else {
      session.memory.repetitionCount = 0;
    }
    session.memory.lastMessage = messageText;
    
    // Store extracted info
    if (detected.extractedName && !session.memory.extractedInfo.name) {
      session.memory.extractedInfo.name = detected.extractedName;
    }
    if (detected.phoneNumber && !session.memory.extractedInfo.phone) {
      session.memory.extractedInfo.phone = detected.phoneNumber;
    }
    if (detected.extractedEmail && !session.memory.extractedInfo.email) {
      session.memory.extractedInfo.email = detected.extractedEmail;
    }
    if (detected.employeeID && !session.memory.extractedInfo.employeeID) {
      session.memory.extractedInfo.employeeID = detected.employeeID;
    }
    if (detected.branchCode && !session.memory.extractedInfo.branchCode) {
      session.memory.extractedInfo.branchCode = detected.branchCode;
    }
    if (detected.ifscCode && !session.memory.extractedInfo.ifsc) {
      session.memory.extractedInfo.ifsc = detected.ifscCode;
    }
    if (detected.upiId && !session.memory.extractedInfo.upi) {
      session.memory.extractedInfo.upi = detected.upiId;
    }
    if (detected.accountNumber && !session.memory.extractedInfo.account) {
      session.memory.extractedInfo.account = detected.accountNumber;
    }
  }

  // ===============================
  // SCAM TYPE DETECTION
  // ===============================
  static detectScamType(detected, session) {
    const confidence = session.memory.scamConfidence;
    
    // Update confidence scores
    if (detected.hasBank || detected.hasAccount) confidence.bank = (confidence.bank || 0) + 2;
    if (detected.hasOTP && detected.hasBank) confidence.bank = (confidence.bank || 0) + 3;
    if (detected.hasUPI) confidence.upi = (confidence.upi || 0) + 3;
    if (detected.hasLink) confidence.link = (confidence.link || 0) + 3;
    if (detected.hasFakeOffer || detected.hasLottery) confidence.lottery = (confidence.lottery || 0) + 3;
    if (detected.hasInvestment) confidence.investment = (confidence.investment || 0) + 3;
    if (detected.hasJob) confidence.job = (confidence.job || 0) + 3;
    if (detected.hasLoan) confidence.loan = (confidence.loan || 0) + 3;
    if (detected.hasKYC) confidence.kyc = (confidence.kyc || 0) + 3;
    
    // Find highest confidence
    let maxConfidence = 0;
    let detectedType = session.memory.detectedScamType || 'generic';
    
    for (const [type, score] of Object.entries(confidence)) {
      if (score > maxConfidence) {
        maxConfidence = score;
        detectedType = type;
      }
    }
    
    session.memory.detectedScamType = detectedType;
    return detectedType;
  }

  // ===============================
  // PHASE DETERMINATION (5 Psychological Phases)
  // ===============================
  static determinePhase(session) {
    const turn = session.turnCount || 0;
    const memory = session.memory;
    
    // Phase 5: Panic/Exit (Turns 9+)
    if (turn >= 9 || memory.exitImminent) return 5;
    
    // Phase 4: Scared (Turns 7-8)
    if (turn >= 7) return 4;
    
    // Phase 3: Confused (Turns 5-6)
    if (turn >= 5) return 3;
    
    // Phase 2: Interested (Turns 3-4)
    if (turn >= 3) return 2;
    
    // Phase 1: Curious (Turns 1-2)
    return 1;
  }

  // ===============================
  // SCAM-SPECIFIC HANDLERS
  // ===============================
  
  static handleBankFraud(detected, session, phase) {
    const memory = session.memory;
    
    // Phase-specific responses
    if (phase === 1) {
      return this.getUniqueReply("victim_confused", session);
    }
    if (phase === 2) {
      if (!memory.askedAccount && detected.hasAccount) {
        memory.askedAccount = true;
        return this.getReplyWithParam("account_shocked", "{account}", detected.accountNumber, session);
      }
      return this.getUniqueReply("victim_asking", session);
    }
    if (phase === 3) {
      return this.getUniqueReply("policy_confused", session);
    }
    if (phase === 4) {
      if (detected.hasThreat) return this.getUniqueReply("permanent_scared", session);
      return this.getUniqueReply("victim_scared", session);
    }
    return this.getUniqueReply("branch_visit", session);
  }

  static handleUPIFraud(detected, session, phase) {
    const memory = session.memory;
    
    if (phase === 1) {
      return this.getUniqueReply("upi_initial", session);
    }
    if (phase === 2) {
      if (detected.upiId && !memory.askedUPI) {
        memory.askedUPI = true;
        return this.getReplyWithParam("upi_confirm", "{upi}", detected.upiId, session);
      }
      return this.getUniqueReply("upi_request_first", session);
    }
    if (phase === 3) {
      return this.getUniqueReply("upi_scared", session);
    }
    if (phase === 4) {
      return this.getUniqueReply("upi_request_third", session);
    }
    return this.getUniqueReply("branch_visit", session);
  }

  static handlePhishing(detected, session, phase) {
    if (phase === 1) {
      return this.getUniqueReply("link_initial", session);
    }
    if (phase === 2) {
      if (detected.link) {
        return this.getReplyWithParam("link_first", "{link}", detected.link, session);
      }
      return this.getUniqueReply("link_curious", session);
    }
    if (phase === 3) {
      return this.getUniqueReply("link_second", session);
    }
    if (phase === 4) {
      return this.getUniqueReply("link_third", session);
    }
    return this.getUniqueReply("cyber_complaint", session);
  }

  static handleLottery(detected, session, phase) {
    if (phase === 1) {
      return this.getUniqueReply("lottery_initial", session);
    }
    if (phase === 2) {
      return this.getUniqueReply("lottery_first", session);
    }
    if (phase === 3) {
      return this.getUniqueReply("lottery_second", session);
    }
    if (phase === 4) {
      return this.getUniqueReply("lottery_third", session);
    }
    return this.getUniqueReply("final_goodbye", session);
  }

  static handleInvestment(detected, session, phase) {
    if (phase === 1) {
      return this.getUniqueReply("investment_initial", session);
    }
    if (phase === 2) {
      return this.getUniqueReply("investment_first", session);
    }
    if (phase === 3) {
      return this.getUniqueReply("investment_second", session);
    }
    if (phase === 4) {
      return this.getUniqueReply("investment_third", session);
    }
    return this.getUniqueReply("policy_confused", session);
  }

  static handleJob(detected, session, phase) {
    if (phase === 1) {
      return this.getUniqueReply("job_initial", session);
    }
    if (phase === 2) {
      return this.getUniqueReply("job_first", session);
    }
    if (phase === 3) {
      return this.getUniqueReply("job_second", session);
    }
    if (phase === 4) {
      if (detected.hasFee) return this.getUniqueReply("job_fee_question", session);
      return this.getUniqueReply("job_third", session);
    }
    return this.getUniqueReply("cyber_threat", session);
  }

  static handleLoan(detected, session, phase) {
    if (phase === 1) {
      return this.getUniqueReply("loan_initial", session);
    }
    if (phase === 2) {
      return this.getUniqueReply("loan_first", session);
    }
    if (phase === 3) {
      return this.getUniqueReply("loan_second", session);
    }
    if (phase === 4) {
      if (detected.hasFee) return this.getUniqueReply("loan_advance_fee", session);
      return this.getUniqueReply("loan_third", session);
    }
    return this.getUniqueReply("policy_confused", session);
  }

  static handleKYC(detected, session, phase) {
    if (phase === 1) {
      return this.getUniqueReply("kyc_initial", session);
    }
    if (phase === 2) {
      return this.getUniqueReply("kyc_first", session);
    }
    if (phase === 3) {
      return this.getUniqueReply("kyc_second", session);
    }
    if (phase === 4) {
      return this.getUniqueReply("kyc_third", session);
    }
    return this.getUniqueReply("branch_visit", session);
  }

  // ===============================
  // UNIVERSAL HANDLERS
  // ===============================
  
  static handleThreat(detected, session) {
    if (detected.hasPermanent) {
      return this.getUniqueReply("permanent_scared", session);
    }
    if (detected.hasFine) {
      return this.getUniqueReply("fine_worried", session);
    }
    return this.getUniqueReply("victim_scared", session);
  }

  static handleOTP(detected, session, scamType) {
    const count = session.memory.otpRequests;
    
    // Progressive OTP responses
    if (count === 1) {
      if (scamType === 'bank') return this.getUniqueReply("bank_otp_first", session);
      if (scamType === 'upi') return this.getUniqueReply("upi_pin_request", session);
      return this.getUniqueReply("otp_first", session);
    }
    if (count === 2) {
      if (scamType === 'bank') return this.getUniqueReply("bank_otp_second", session);
      return this.getUniqueReply("otp_second", session);
    }
    if (count === 3) {
      if (scamType === 'bank') return this.getUniqueReply("bank_otp_third", session);
      return this.getUniqueReply("otp_third", session);
    }
    if (count === 4) {
      if (scamType === 'bank') return this.getUniqueReply("bank_otp_fourth", session);
      return this.getUniqueReply("otp_fourth", session);
    }
    
    session.memory.exitImminent = true;
    return this.getUniqueReply("otp_fifth", session);
  }

  static handlePhoneNumber(detected, session) {
    const phone = detected.phoneNumber;
    const context = this.determinePhoneContext(detected, session);
    
    if (context === 'victim') {
      if (session.memory.otpRequests > 0) {
        return this.getReplyWithParam("phone_victim_wait", "{phone}", phone, session);
      }
      return this.getReplyWithParam("phone_victim_confirm", "{phone}", phone, session);
    }
    if (context === 'scammer') {
      if (session.turnCount >= 4) {
        return this.getReplyWithParam("phone_scammer_compare", "{phone}", phone, session);
      }
      return this.getReplyWithParam("phone_scammer_curious", "{phone}", phone, session);
    }
    return this.getReplyWithParam("phone_ambiguous", "{phone}", phone, session);
  }

  static handleEmail(detected, session) {
    const email = detected.extractedEmail;
    
    if (email.includes('gmail.com') || email.includes('yahoo.com')) {
      return this.getReplyWithParam("email_suspicious", "{email}", email, session);
    }
    if (session.turnCount >= 4) {
      return this.getReplyWithParam("email_check_request", "{email}", email, session);
    }
    return this.getReplyWithParam("email_provided", "{email}", email, session);
  }

  static handleLink(detected, session) {
    if (detected.link) {
      return this.getReplyWithParam("link_first", "{link}", detected.link, session);
    }
    return this.getUniqueReply("link_curious", session);
  }

  static handleRepetition(session) {
    if (session.memory.repetitionCount === 2) {
      return this.getUniqueReply("repetition_mild", session);
    }
    if (session.memory.repetitionCount === 3) {
      return this.getUniqueReply("repetition_annoyed", session);
    }
    if (session.memory.repetitionCount >= 4) {
      session.memory.exitImminent = true;
      return this.getUniqueReply("repetition_frustrated", session);
    }
    return this.getUniqueReply("victim_confused", session);
  }

  // ===============================
  // PHASE-BASED FALLBACK
  // ===============================
  static getPhaseBasedResponse(phase, scamType, session) {
    if (phase === 1) {
      if (scamType === 'bank') return this.getUniqueReply("victim_confused", session);
      return this.getUniqueReply("victim_confused", session);
    }
    if (phase === 2) {
      return this.getUniqueReply("victim_asking", session);
    }
    if (phase === 3) {
      return this.getUniqueReply("policy_confused", session);
    }
    if (phase === 4) {
      return this.getUniqueReply("victim_scared", session);
    }
    return this.getUniqueReply("branch_visit", session);
  }

  // ===============================
  // EXIT HANDLING
  // ===============================
  static shouldExitImmediately(session) {
    const memory = session.memory;
    
    // Exit conditions
    if (session.turnCount >= 9) return true;
    if (memory.exitImminent) return true;
    if (memory.otpRequests >= 5) return true;
    if (memory.threatCount >= 4 && session.turnCount >= 6) return true;
    
    // Check if we've extracted enough (2+ unique data types)
    const extracted = memory.extractedInfo;
    let extractedCount = 0;
    if (extracted.name) extractedCount++;
    if (extracted.phone) extractedCount++;
    if (extracted.email) extractedCount++;
    if (extracted.employeeID) extractedCount++;
    if (extracted.upi) extractedCount++;
    if (extracted.account) extractedCount++;
    
    if (extractedCount >= 2 && session.turnCount >= 5) {
      memory.extractedEnough = true;
      return true;
    }
    
    return false;
  }

  static getExitResponse(session) {
    const memory = session.memory;
    
    if (memory.extractedEnough) {
      return this.getUniqueReply("final_goodbye", session);
    }
    if (memory.threatCount > 2) {
      return this.getUniqueReply("cyber_threat", session);
    }
    return this.getUniqueReply("branch_visit", session);
  }

  // ===============================
  // AMBIGUOUS MESSAGE HANDLING
  // ===============================
  static isAmbiguousMessage(detected, session) {
    // No scam indicators
    if (!this.hasScamIndicators(detected)) return true;
    
    // Very short message
    if (session.lastMessage?.length < 10) return true;
    
    // First turn greeting
    if (session.turnCount === 0 && this.isGreetingOnly(detected, session.lastMessage, session)) {
      return true;
    }
    
    return false;
  }

  static async handleAmbiguousMessage(messageText, conversationHistory, session) {
    try {
      const category = await PerplexityService.selectCategory(messageText, conversationHistory, CONFIG);
      return PerplexityService.getReply(category, session);
    } catch (e) {
      return this.getUniqueReply("greeting_response", session);
    }
  }

  // ===============================
  // HELPER METHODS
  // ===============================
  static hasScamIndicators(detected) {
    return detected.hasOTP || detected.hasPIN || detected.hasAccount || 
           detected.hasUPI || detected.hasPhone || detected.hasThreat ||
           detected.hasUrgency || detected.hasLink || detected.hasBank ||
           detected.hasFakeOffer || detected.hasInvestment || detected.hasLottery ||
           detected.hasEmployeeID || detected.hasEmail || detected.hasKYC ||
           detected.hasJob || detected.hasLoan;
  }

  static isGreetingOnly(detected, message, session) {
    if (!message) return false;
    const lowerMsg = message.toLowerCase();
    const greetings = ['hi', 'hello', 'hey', 'namaste', 'नमस्ते', 'kaise ho', 'kya haal'];
    const isGreeting = greetings.some(g => lowerMsg.includes(g));
    return isGreeting && !this.hasScamIndicators(detected) && session.turnCount === 0;
  }

  static canAskName(session) {
    return session.turnCount >= 1 && session.turnCount <= 3;
  }

  static canAskPhone(session) {
    return session.turnCount >= 2 && session.turnCount <= 4;
  }

  static canAskEmail(detected, session) {
    return detected.hasEmail && session.turnCount >= 2;
  }

  static determinePhoneContext(detected, session) {
    // If scammer just gave a phone number
    if (detected.hasPhone && detected.phoneNumber) {
      // If we've been waiting for OTP, likely victim's number
      if (session.memory.otpRequests > 0) return 'victim';
      // Otherwise likely scammer's number
      return 'scammer';
    }
    return 'ambiguous';
  }

  // ===============================
  // UNIQUE REPLY SELECTOR (NEVER REPEATS)
  // ===============================
  static getUniqueReply(key, session) {
    const replies = REPLIES[key];
    if (!replies || replies.length === 0) {
      return this.getContextualFallback(session);
    }
    
    // Initialize used replies for this category
    if (!session.memory.usedReplies[key]) {
      session.memory.usedReplies[key] = [];
    }
    
    // Find unused replies
    const availableReplies = replies.filter(r => !session.memory.usedReplies[key].includes(r));
    
    // If all used or more than 5 used, reset (keep last 2 for context)
    if (availableReplies.length === 0 || session.memory.usedReplies[key].length >= 5) {
      // Keep only the most recent 2 for context
      const recent = session.memory.usedReplies[key].slice(-2);
      session.memory.usedReplies[key] = recent;
      
      // Get fresh available excluding recent
      const freshAvailable = replies.filter(r => !recent.includes(r));
      if (freshAvailable.length > 0) {
        const selected = freshAvailable[Math.floor(Math.random() * freshAvailable.length)];
        session.memory.usedReplies[key].push(selected);
        return selected;
      }
    }
    
    // Pick random from available
    if (availableReplies.length > 0) {
      const selected = availableReplies[Math.floor(Math.random() * availableReplies.length)];
      session.memory.usedReplies[key].push(selected);
      return selected;
    }
    
    // Ultimate fallback
    return replies[0];
  }

  static getReplyWithParam(key, placeholder, value, session) {
    const reply = this.getUniqueReply(key, session);
    return reply.replace(placeholder, value);
  }

  static getContextualFallback(session) {
    const phase = this.determinePhase(session);
    
    if (phase === 1) return "Mujhe samajh nahi aaya. Thoda explain karo.";
    if (phase === 2) return "Main confuse hoon. Aap hi batao kya karna hai?";
    if (phase === 3) return "Kya karna hai? Batao na, main dar gaya hoon.";
    if (phase === 4) return "Main aapke bharose hoon. Jo kaho karunga.";
    return "Main branch ja raha hoon. Baad mein baat karte hain.";
  }

  static delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}