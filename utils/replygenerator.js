import { REPLIES } from "./replies.js";
import { PerplexityService } from "../service/perplexity.js";
import { CONFIG } from "./config.js";

export class ReplyGenerator {

  static async generateReply(detected, session, messageText, conversationHistory) {
        await this.delay(10000); // 60,000 milliseconds = 60 seconds
    // Initialize memory tracking if not exists
    if (!session.memory) {
      session.memory = {
        // What we've asked scammer
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
        
        // What scammer has given us
        extractedInfo: {
          scammerName: null,
          scammerPhone: null,
          scammerEmail: null,
          scammerID: null,
          scammerBranch: null,
          scammerIFSC: null,
          scammerAddress: null,
          scammerUPI: null,
          scammerAccount: null,
          scammerReference: null
        },
        
        // Trap state
        currentPhase: 1, // 1:Curious, 2:Interested, 3:Confused, 4:Scared, 5:Panicking
        threatCount: 0,
        otpRequests: 0,
        lastTopics: [],
        
        // Track used replies to avoid repetition
        usedReplies: new Set(),
        
        // Track scam type for context
        detectedScamType: null,
        
        // Trap flags
        fellForTrap: false,
        providedInfo: false
      };
    }

    // ============ DETECT SCAM TYPE ============
    const scamType = this.detectScamType(detected);
    if (scamType && !session.memory.detectedScamType) {
      session.memory.detectedScamType = scamType;
      console.log(`🎯 Scam type detected: ${scamType}`);
    }

    // ============ CHECK FOR AMBIGUOUS MESSAGES ============
    const hasClearScamIndicators = this.hasScamIndicators(detected);
    const isAmbiguous = !hasClearScamIndicators && session.turnCount < CONFIG.PERPLEXITY_TRIGGER_TURNS_MAX;
    
    if (isAmbiguous && CONFIG.USE_PERPLEXITY) {
      console.log('🤔 Ambiguous message detected - using Perplexity');
      const category = await PerplexityService.selectCategory(messageText, conversationHistory, CONFIG);
      const reply = PerplexityService.getReply(category, session);
      if (reply) {
        session.memory.usedReplies.add(reply);
        return reply;
      }
    }

    // ============ GREETING HANDLING ============
    const isGreeting = this.isGreetingOnly(detected, session.lastScammerMessage);
    if (isGreeting && session.turnCount === 0) {
      const reply = this.getUniqueReply("greeting_response", session);
      session.memory.usedReplies.add(reply);
      return reply;
    }

    // Update counters and extract info
    this.updateCountersAndExtract(detected, session);

    // ============ PHASE-BASED RESPONSES ============
    
    // PHASE 1: CURIOUS VICTIM (Turns 1-2)
    if (session.turnCount <= 2) {
      const reply = this.getPhase1CuriousResponse(detected, session);
      session.memory.usedReplies.add(reply);
      return reply;
    }
    
    // PHASE 2: INTERESTED VICTIM (Turns 3-4)
    if (session.turnCount <= 4) {
      const reply = this.getPhase2InterestedResponse(detected, session);
      session.memory.usedReplies.add(reply);
      return reply;
    }
    
    // PHASE 3: CONFUSED VICTIM (Turns 5-6)
    if (session.turnCount <= 6) {
      const reply = this.getPhase3ConfusedResponse(detected, session);
      session.memory.usedReplies.add(reply);
      return reply;
    }
    
    // PHASE 4: SCARED VICTIM (Turns 7-8)
    if (session.turnCount <= 8) {
      const reply = this.getPhase4ScaredResponse(detected, session);
      session.memory.usedReplies.add(reply);
      return reply;
    }
    
    // PHASE 5: PANICKING VICTIM (Turns 9-10)
    const reply = this.getPhase5PanickingResponse(detected, session);
    session.memory.usedReplies.add(reply);
    return reply;
  }

  // ===============================
  // Detect Scam Type
  // ===============================
  static detectScamType(detected) {
    if (detected.hasBank || detected.hasAccount || detected.hasOTP) return 'bank';
    if (detected.hasUPI || detected.hasPaymentRequest) return 'upi';
    if (detected.hasLink || detected.hasSuspiciousDomain) return 'link';
    if (detected.hasLottery || detected.hasFakeOffer) return 'lottery';
    if (detected.hasInvestment) return 'investment';
    if (detected.hasJob) return 'job';
    if (detected.hasLoan) return 'loan';
    if (detected.hasKYC) return 'kyc';
    return null;
  }

  // ===============================
  // PHASE 1: CURIOUS VICTIM
  // ===============================
  static getPhase1CuriousResponse(detected, session) {
    const scamType = session.memory.detectedScamType;
    
    // Use scam-specific responses if available
    if (scamType === 'bank') {
      return this.getUniqueReply("victim_confused", session);
    }
    if (scamType === 'upi') {
      return this.getUniqueReply("upi_initial", session);
    }
    if (scamType === 'link') {
      return this.getUniqueReply("link_initial", session);
    }
    if (scamType === 'lottery') {
      return this.getUniqueReply("lottery_initial", session);
    }
    if (scamType === 'investment') {
      return this.getUniqueReply("investment_initial", session);
    }
    if (scamType === 'job') {
      return this.getUniqueReply("job_initial", session);
    }
    if (scamType === 'loan') {
      return this.getUniqueReply("loan_initial", session);
    }
    if (scamType === 'kyc') {
      return this.getUniqueReply("kyc_initial", session);
    }
    
    // Generic responses based on detected keywords
    if (detected.hasFakeOffer || detected.hasLottery) {
      return this.getUniqueReply("lottery_initial", session);
    }
    if (detected.hasBank || detected.hasAccount) {
      return this.getUniqueReply("victim_confused", session);
    }
    if (detected.hasInvestment) {
      return this.getUniqueReply("investment_initial", session);
    }
    if (detected.hasJob) {
      return this.getUniqueReply("job_initial", session);
    }
    if (detected.hasLoan) {
      return this.getUniqueReply("loan_initial", session);
    }
    
    return this.getUniqueReply("victim_confused", session);
  }

  // ===============================
  // PHASE 2: INTERESTED VICTIM - Ask for scammer's details
  // ===============================
  static getPhase2InterestedResponse(detected, session) {
    const memory = session.memory;
    
    // PRIORITY 1: Ask for their name
    if (!memory.askedName && !memory.extractedInfo.scammerName) {
      memory.askedName = true;
      return this.getUniqueReply("ask_scammer_name", session);
    }
    
    // PRIORITY 2: Ask for their phone
    if (!memory.askedPhone && !memory.extractedInfo.scammerPhone) {
      memory.askedPhone = true;
      return this.getUniqueReply("ask_scammer_phone", session);
    }
    
    // PRIORITY 3: Ask for their email
    if (!memory.askedEmail && !memory.extractedInfo.scammerEmail && detected.hasEmail) {
      memory.askedEmail = true;
      return this.getUniqueReply("email_send_request", session);
    }
    
    // PRIORITY 4: Ask for employee ID (bank-related)
    if ((detected.hasBank || memory.detectedScamType === 'bank') && !memory.askedEmployeeID) {
      memory.askedEmployeeID = true;
      return this.getUniqueReply("ask_employee_id", session);
    }
    
    // PRIORITY 5: Ask for UPI ID (payment-related)
    if ((detected.hasUPI || memory.detectedScamType === 'upi') && !memory.askedUPI) {
      memory.askedUPI = true;
      return this.getUniqueReply("upi_confirm", session);
    }
    
    // PRIORITY 6: Ask for reference ID
    if (!memory.askedReferenceID && (detected.hasReference || memory.threatCount > 1)) {
      memory.askedReferenceID = true;
      return this.getUniqueReply("ask_reference_id", session);
    }
    
    return this.getUniqueReply("victim_asking", session);
  }

  // ===============================
  // PHASE 3: CONFUSED VICTIM
  // ===============================
  static getPhase3ConfusedResponse(detected, session) {
    const memory = session.memory;
    const scamType = memory.detectedScamType;
    
    // Ask for branch details (bank)
    if ((scamType === 'bank' || detected.hasBank) && !memory.askedBranchCode) {
      memory.askedBranchCode = true;
      return this.getUniqueReply("ask_branch_code", session);
    }
    
    // Ask for IFSC
    if ((scamType === 'bank' || detected.hasBank) && !memory.askedIFSC) {
      memory.askedIFSC = true;
      return this.getUniqueReply("ask_branch_code", session); // Using branch code for IFSC too
    }
    
    // Ask for address
    if (!memory.askedAddress) {
      memory.askedAddress = true;
      return this.getUniqueReply("ask_branch_code", session); // Using branch code for address too
    }
    
    // Ask for proof
    if (!memory.askedProof && memory.threatCount > 1) {
      memory.askedProof = true;
      return this.getUniqueReply("ask_proof", session);
    }
    
    // Progressive OTP responses based on scam type
    if (detected.hasOTP) {
      return this.getProgressiveOTPResponse(detected, session);
    }
    
    // Scam-specific confused responses
    if (scamType === 'bank') {
      return this.getUniqueReply("bank_otp_third", session);
    }
    if (scamType === 'upi') {
      return this.getUniqueReply("upi_request_third", session);
    }
    if (scamType === 'link') {
      return this.getUniqueReply("link_third", session);
    }
    if (scamType === 'lottery') {
      return this.getUniqueReply("lottery_third", session);
    }
    if (scamType === 'investment') {
      return this.getUniqueReply("investment_third", session);
    }
    if (scamType === 'job') {
      return this.getUniqueReply("job_third", session);
    }
    if (scamType === 'loan') {
      return this.getUniqueReply("loan_third", session);
    }
    
    return this.getUniqueReply("victim_confused", session);
  }

  // ===============================
  // PHASE 4: SCARED VICTIM
  // ===============================
  static getPhase4ScaredResponse(detected, session) {
    const memory = session.memory;
    
    if (detected.hasThreat) {
      return this.getUniqueReply("permanent_scared", session);
    }
    
    if (detected.hasFine) {
      return this.getUniqueReply("fine_worried", session);
    }
    
    if (detected.hasPermanent) {
      return this.getUniqueReply("permanent_scared", session);
    }
    
    // Progressive OTP responses for scared phase
    if (detected.hasOTP && memory.otpRequests >= 3) {
      return this.getProgressiveOTPResponse(detected, session);
    }
    
    return this.getUniqueReply("victim_scared", session);
  }

  // ===============================
  // PHASE 5: PANICKING VICTIM
  // ===============================
  static getPhase5PanickingResponse(detected, session) {
    const memory = session.memory;
    
    if (!memory.providedInfo) {
      memory.providedInfo = true;
      memory.fellForTrap = true;
      return this.getUniqueReply("victim_desperate", session);
    }
    
    // Final OTP responses
    if (detected.hasOTP && memory.otpRequests >= 4) {
      return this.getUniqueReply("otp_fifth", session);
    }
    
    return this.getUniqueReply("victim_compliant", session);
  }

  // ===============================
  // Progressive OTP Responses by Scam Type
  // ===============================
  static getProgressiveOTPResponse(detected, session) {
    const memory = session.memory;
    const scamType = memory.detectedScamType;
    
    // Update OTP counter
    if (detected.hasOTP) {
      memory.otpRequests++;
    }
    
    // Return appropriate OTP level based on count and scam type
    if (memory.otpRequests === 1) {
      if (scamType === 'bank') return this.getUniqueReply("bank_otp_first", session);
      if (scamType === 'upi') return this.getUniqueReply("upi_pin_request", session);
      return this.getUniqueReply("otp_first", session);
    }
    else if (memory.otpRequests === 2) {
      if (scamType === 'bank') return this.getUniqueReply("bank_otp_second", session);
      return this.getUniqueReply("otp_second", session);
    }
    else if (memory.otpRequests === 3) {
      if (scamType === 'bank') return this.getUniqueReply("bank_otp_third", session);
      if (scamType === 'upi') return this.getUniqueReply("upi_request_third", session);
      return this.getUniqueReply("otp_third", session);
    }
    else if (memory.otpRequests === 4) {
      if (scamType === 'bank') return this.getUniqueReply("bank_otp_fourth", session);
      return this.getUniqueReply("otp_fourth", session);
    }
    else {
      return this.getUniqueReply("otp_fifth", session);
    }
  }

  // ===============================
  // Handle Extracted Information
  // ===============================
  static updateCountersAndExtract(detected, session) {
    const memory = session.memory;
    
    // Store scammer's info
    if (detected.extractedName && !memory.extractedInfo.scammerName) {
      memory.extractedInfo.scammerName = detected.extractedName;
      console.log(`📝 Got scammer's name: ${detected.extractedName}`);
    }
    
    if (detected.phoneNumber && !memory.extractedInfo.scammerPhone) {
      memory.extractedInfo.scammerPhone = detected.phoneNumber;
      console.log(`📞 Got scammer's phone: ${detected.phoneNumber}`);
    }
    
    if (detected.extractedEmail && !memory.extractedInfo.scammerEmail) {
      memory.extractedInfo.scammerEmail = detected.extractedEmail;
      console.log(`📧 Got scammer's email: ${detected.extractedEmail}`);
    }
    
    if (detected.hasEmployeeID && detected.employeeID && !memory.extractedInfo.scammerID) {
      memory.extractedInfo.scammerID = detected.employeeID;
      console.log(`🆔 Got scammer's employee ID: ${detected.employeeID}`);
    }
    
    if (detected.hasBranchCode && detected.branchCode && !memory.extractedInfo.scammerBranch) {
      memory.extractedInfo.scammerBranch = detected.branchCode;
      console.log(`🏢 Got scammer's branch code: ${detected.branchCode}`);
    }
    
    if (detected.hasIFSC && detected.ifscCode && !memory.extractedInfo.scammerIFSC) {
      memory.extractedInfo.scammerIFSC = detected.ifscCode;
      console.log(`🔢 Got scammer's IFSC: ${detected.ifscCode}`);
    }
    
    if (detected.hasUPI && detected.upiId && !memory.extractedInfo.scammerUPI) {
      memory.extractedInfo.scammerUPI = detected.upiId;
      console.log(`💳 Got scammer's UPI: ${detected.upiId}`);
    }
    
    if (detected.hasAccount && detected.accountNumber && !memory.extractedInfo.scammerAccount) {
      memory.extractedInfo.scammerAccount = detected.accountNumber;
      console.log(`💰 Got scammer's account: ${detected.accountNumber}`);
    }
    
    // Update counters
    if (detected.hasThreat) memory.threatCount++;
    if (detected.hasOTP) memory.otpRequests++;
  }

  // ===============================
  // Get Unique Reply - NEVER REPEATS
  // ===============================
  static getUniqueReply(key, session) {
    const replies = REPLIES[key];
    if (!replies || replies.length === 0) {
      return this.getContextualFallback(session);
    }
    
    // Filter out already used replies
    const availableReplies = replies.filter(reply => !session.memory.usedReplies.has(reply));
    
    // If all replies are used, reset the usedReplies for this category
    if (availableReplies.length === 0) {
      // Remove this category's replies from usedReplies
      replies.forEach(reply => session.memory.usedReplies.delete(reply));
      // Now all replies are available again
      const freshReply = replies[Math.floor(Math.random() * replies.length)];
      session.memory.usedReplies.add(freshReply);
      return freshReply;
    }
    
    // Pick random from available
    const randomIndex = Math.floor(Math.random() * availableReplies.length);
    const selectedReply = availableReplies[randomIndex];
    
    // Mark as used
    session.memory.usedReplies.add(selectedReply);
    
    return selectedReply;
  }

  // ===============================
  // Helper Methods
  // ===============================
  static hasScamIndicators(detected) {
    return detected.hasOTP || detected.hasPIN || detected.hasAccount || 
           detected.hasUPI || detected.hasPhone || detected.hasThreat ||
           detected.hasUrgency || detected.hasLink || detected.hasBank ||
           detected.hasFakeOffer || detected.hasInvestment || detected.hasLottery ||
           detected.hasEmployeeID || detected.hasEmail || detected.hasKYC ||
           detected.hasJob || detected.hasLoan;
  }

  static isGreetingOnly(detected, message) {
    if (!message) return false;
    const lowerMsg = message.toLowerCase();
    const isGreeting = /^(hi|hello|hey|namaste|नमस्ते|kaise ho|kya haal|good morning|good evening|good afternoon)/i.test(lowerMsg);
    const hasScamIndicators = this.hasScamIndicators(detected);
    return isGreeting && !hasScamIndicators;
  }

  static getContextualFallback(session) {
    const fallbacks = [
      "Mujhe samajh nahi aaya. Aap hi batao kya karna hai?",
      "Main confuse hoon. Thoda explain karo.",
      "Kya karna hai? Batao na.",
      "Main aapke bharose hoon. Jo kaho karunga.",
      "Aap guide karo, main follow karunga."
    ];
    
    // Filter out used fallbacks
    const available = fallbacks.filter(f => !session.memory.usedReplies.has(f));
    
    if (available.length > 0) {
      const reply = available[Math.floor(Math.random() * available.length)];
      session.memory.usedReplies.add(reply);
      return reply;
    }
    
    // If all used, reset and use first
    session.memory.usedReplies.clear();
    return fallbacks[0];
  }
}