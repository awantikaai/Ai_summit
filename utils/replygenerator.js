import { REPLIES } from "./replies.js";
import { PerplexityService } from "../service/perplexity.js";
import { CONFIG } from "./config.js";

export class ReplyGenerator {

  static async generateReply(detected, session, messageText, conversationHistory) {
    
    // ============ 60 SECOND DELAY FOR ENGAGEMENT POINTS ============
    console.log(`⏱️ Waiting 10 seconds before replying...`);
    await this.delay(10000); // 10 seconds delay
    console.log(`✅ Delay complete`);

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
        askedLink: false,
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
          scammerLink: null,
          scammerReference: null
        },
        
        // Trap state
        currentPhase: 1,
        threatCount: 0,
        otpRequests: 0,
        lastTopics: [],
        
        // Track used replies to avoid repetition
        usedReplies: new Set(),
        
        // Track scam type
        detectedScamType: null,
        
        // Trap flags
        fellForTrap: false,
        providedInfo: false
      };
    }

    // ============ DETECT SCAM TYPE ============
    const scamType = this.detectScamType(detected, messageText);
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

    // ============ CHECK IF WE SHOULD EXIT EARLY ============
    const extractionCount = this.getExtractionCount(session);
    
    // If we have 2+ data types and at least 5 turns, prepare for exit
    if (extractionCount >= 2 && session.turnCount >= 5) {
      console.log(`🎯 Collected ${extractionCount} data types - preparing exit`);
      return this.getExitReply(session);
    }

    // ============ PHASE-BASED RESPONSES ============
    
    // PHASE 1: CURIOUS VICTIM (Turns 1-2)
    if (session.turnCount <= 2) {
      const reply = this.getPhase1Response(detected, session, scamType);
      session.memory.usedReplies.add(reply);
      return reply;
    }
    
    // PHASE 2: INTERESTED VICTIM (Turns 3-4) - Ask for details
    if (session.turnCount <= 4) {
      const reply = this.getPhase2Response(detected, session, scamType);
      session.memory.usedReplies.add(reply);
      return reply;
    }
    
    // PHASE 3: EXTRACTION (Turns 5+) - Get remaining data
    const reply = this.getPhase3Response(detected, session, scamType);
    session.memory.usedReplies.add(reply);
    return reply;
  }

  // ===============================
  // Delay Function
  // ===============================
  static delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ===============================
  // Count Extracted Data Types
  // ===============================
  static getExtractionCount(session) {
    let count = 0;
    if (session.memory.extractedInfo.scammerPhone) count++;
    if (session.memory.extractedInfo.scammerAccount) count++;
    if (session.memory.extractedInfo.scammerUPI) count++;
    if (session.memory.extractedInfo.scammerEmail) count++;
    if (session.memory.extractedInfo.scammerLink) count++;
    if (session.memory.extractedInfo.scammerID) count++;
    return count;
  }

  // ===============================
  // Detect Scam Type
  // ===============================
  static detectScamType(detected, text) {
    const lowerText = text?.toLowerCase() || '';
    
    if (detected.hasBank || detected.hasAccount || detected.hasOTP || 
        /(bank|sbi|hdfc|icici|axis|account|otp|pin)/i.test(lowerText)) return 'bank';
    if (detected.hasUPI || /(upi|gpay|phonepe|paytm)/i.test(lowerText)) return 'upi';
    if (detected.hasLink || /(link|click|bit\.ly|tinyurl)/i.test(lowerText)) return 'phishing';
    if (detected.hasLottery || /(lottery|winner|prize|congratulations|gift|voucher)/i.test(lowerText)) return 'lottery';
    if (detected.hasInvestment || /(invest|profit|return|scheme|dividend)/i.test(lowerText)) return 'investment';
    if (detected.hasJob || /(job|work|salary|earning|hiring)/i.test(lowerText)) return 'job';
    if (detected.hasLoan || /(loan|interest|credit|emi|borrow)/i.test(lowerText)) return 'loan';
    if (detected.hasKYC || /(kyc|update|verify|aadhar|pan)/i.test(lowerText)) return 'kyc';
    
    return null;
  }

  // ===============================
  // PHASE 1: CURIOUS VICTIM
  // ===============================
  static getPhase1Response(detected, session, scamType) {
    // Turn 1: Initial confusion
    if (session.turnCount === 0) {
      if (scamType === 'bank') return this.getUniqueReply("victim_confused", session);
      if (scamType === 'lottery') return this.getUniqueReply("lottery_initial", session);
      if (scamType === 'investment') return this.getUniqueReply("investment_initial", session);
      if (scamType === 'job') return this.getUniqueReply("job_initial", session);
      if (scamType === 'loan') return this.getUniqueReply("loan_initial", session);
      if (scamType === 'kyc') return this.getUniqueReply("kyc_initial", session);
      if (scamType === 'upi') return this.getUniqueReply("upi_initial", session);
      if (scamType === 'phishing') return this.getUniqueReply("link_initial", session);
      
      return this.getUniqueReply("greeting_response", session);
    }
    
    // Turn 2: Show interest
    if (session.turnCount === 1) {
      return this.getUniqueReply("victim_worried", session);
    }
    
    return this.getUniqueReply("victim_confused", session);
  }

  // ===============================
  // PHASE 2: INTERESTED VICTIM - Ask for scammer's details
  // ===============================
  static getPhase2Response(detected, session, scamType) {
    const memory = session.memory;
    
    // PRIORITY 1: Ask for phone number (10 points)
    if (!memory.askedPhone && !memory.extractedInfo.scammerPhone) {
      memory.askedPhone = true;
      return this.getUniqueReply("ask_scammer_phone", session);
    }
    
    // PRIORITY 2: Ask for their name
    if (!memory.askedName && !memory.extractedInfo.scammerName) {
      memory.askedName = true;
      return this.getUniqueReply("ask_scammer_name", session);
    }
    
    // PRIORITY 3: Ask for scam-specific data
    if (scamType === 'bank' && !memory.askedAccount && !memory.extractedInfo.scammerAccount) {
      memory.askedAccount = true;
      return "Aapka account number kya hai? Main note kar leta hoon.";
    }
    
    if (scamType === 'upi' && !memory.askedUPI && !memory.extractedInfo.scammerUPI) {
      memory.askedUPI = true;
      return this.getUniqueReply("upi_confirm", session);
    }
    
    if (scamType === 'phishing' && !memory.askedLink && !memory.extractedInfo.scammerLink) {
      memory.askedLink = true;
      return "Link kya hai? Bhejo na, main check kar leta hoon.";
    }
    
    if (scamType === 'job' && !memory.askedEmployeeID && !memory.extractedInfo.scammerID) {
      memory.askedEmployeeID = true;
      return "Aapka employee ID kya hai?";
    }
    
    if (scamType === 'loan' && !memory.askedAccount && !memory.extractedInfo.scammerAccount) {
      memory.askedAccount = true;
      return "Loan ke liye account number kya hai?";
    }
    
    if (scamType === 'investment' && !memory.askedReferenceID) {
      memory.askedReferenceID = true;
      return "Scheme ka reference ID kya hai?";
    }
    
    return this.getUniqueReply("victim_asking", session);
  }

  // ===============================
  // PHASE 3: EXTRACTION - Get remaining data
  // ===============================
  static getPhase3Response(detected, session, scamType) {
    const memory = session.memory;
    
    // Check if we already have enough data
    const extractionCount = this.getExtractionCount(session);
    
    // If we have 1 data type, try to get another
    if (extractionCount === 1) {
      if (!memory.extractedInfo.scammerPhone && !memory.askedPhone) {
        memory.askedPhone = true;
        return "Aapka phone number kya tha? Phir se batao.";
      }
      if (!memory.extractedInfo.scammerAccount && !memory.askedAccount && scamType === 'bank') {
        memory.askedAccount = true;
        return "Account number dubara batao, note kar leta hoon.";
      }
      if (!memory.extractedInfo.scammerUPI && !memory.askedUPI && scamType === 'upi') {
        memory.askedUPI = true;
        return "UPI ID dobara bhejo, main check kar leta hoon.";
      }
      if (!memory.extractedInfo.scammerLink && !memory.askedLink && scamType === 'phishing') {
        memory.askedLink = true;
        return "Link dubara bhejo, shayad galat aaya.";
      }
    }
    
    // Generic extraction
    if (!memory.extractedInfo.scammerPhone && !memory.askedPhone) {
      memory.askedPhone = true;
      return "Aapka phone number kya hai? Main note kar leta hoon.";
    }
    
    if (!memory.extractedInfo.scammerName && !memory.askedName) {
      memory.askedName = true;
      return "Aapka naam kya hai?";
    }
    
    return this.getUniqueReply("victim_asking", session);
  }

  // ===============================
  // Exit Reply - Clean exit with collected data
  // ===============================
  static getExitReply(session) {
    const extractionCount = this.getExtractionCount(session);
    
    if (extractionCount === 1) {
      return "Main apna kaam check kar leta hoon. Baad mein baat karte hain.";
    } else {
      return "Thank you for the information. Main verify kar leta hoon.";
    }
  }

  // ===============================
  // Update Counters and Extract Info
  // ===============================
  static updateCountersAndExtract(detected, session) {
    const memory = session.memory;
    
    if (detected.extractedName && !memory.extractedInfo.scammerName) {
      memory.extractedInfo.scammerName = detected.extractedName;
      console.log(`📝 Got scammer's name: ${detected.extractedName}`);
    }
    
    if (detected.phoneNumber && !memory.extractedInfo.scammerPhone) {
      memory.extractedInfo.scammerPhone = detected.phoneNumber;
      if (!session.intelligence.phoneNumbers) session.intelligence.phoneNumbers = [];
      session.intelligence.phoneNumbers.push(detected.phoneNumber);
      console.log(`📞 Got phone: ${detected.phoneNumber}`);
    }
    
    if (detected.extractedEmail && !memory.extractedInfo.scammerEmail) {
      memory.extractedInfo.scammerEmail = detected.extractedEmail;
      if (!session.intelligence.emailAddresses) session.intelligence.emailAddresses = [];
      session.intelligence.emailAddresses.push(detected.extractedEmail);
      console.log(`📧 Got email: ${detected.extractedEmail}`);
    }
    
    if (detected.hasAccount && detected.accountNumber && !memory.extractedInfo.scammerAccount) {
      memory.extractedInfo.scammerAccount = detected.accountNumber;
      if (!session.intelligence.bankAccounts) session.intelligence.bankAccounts = [];
      session.intelligence.bankAccounts.push(detected.accountNumber);
      console.log(`💰 Got account: ${detected.accountNumber}`);
    }
    
    if (detected.hasUPI && detected.upiId && !memory.extractedInfo.scammerUPI) {
      memory.extractedInfo.scammerUPI = detected.upiId;
      if (!session.intelligence.upiIds) session.intelligence.upiIds = [];
      session.intelligence.upiIds.push(detected.upiId);
      console.log(`💳 Got UPI: ${detected.upiId}`);
    }
    
    if (detected.hasEmployeeID && detected.employeeID && !memory.extractedInfo.scammerID) {
      memory.extractedInfo.scammerID = detected.employeeID;
      if (!session.intelligence.employeeIDs) session.intelligence.employeeIDs = [];
      session.intelligence.employeeIDs.push(detected.employeeID);
      console.log(`🆔 Got ID: ${detected.employeeID}`);
    }
    
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
    
    const availableReplies = replies.filter(reply => !session.memory.usedReplies.has(reply));
    
    if (availableReplies.length === 0) {
      replies.forEach(reply => session.memory.usedReplies.delete(reply));
      const freshReply = replies[Math.floor(Math.random() * replies.length)];
      session.memory.usedReplies.add(freshReply);
      return freshReply;
    }
    
    const randomIndex = Math.floor(Math.random() * availableReplies.length);
    const selectedReply = availableReplies[randomIndex];
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
    const isGreeting = /^(hi|hello|hey|namaste|नमस्ते|kaise ho|kya haal)/i.test(lowerMsg);
    return isGreeting && !this.hasScamIndicators(detected);
  }

  static getContextualFallback(session) {
    const fallbacks = [
      "Mujhe samajh nahi aaya. Aap hi batao kya karna hai?",
      "Main confuse hoon. Thoda explain karo.",
      "Kya karna hai? Batao na.",
      "Main aapke bharose hoon. Jo kaho karunga."
    ];
    
    const available = fallbacks.filter(f => !session.memory.usedReplies.has(f));
    
    if (available.length > 0) {
      const reply = available[Math.floor(Math.random() * available.length)];
      session.memory.usedReplies.add(reply);
      return reply;
    }
    
    session.memory.usedReplies.clear();
    return fallbacks[0];
  }
}