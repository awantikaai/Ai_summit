import { REPLIES } from "./replies.js";
import { PerplexityService } from "../service/perplexity.js";
import { CONFIG } from "./config.js";

export class ReplyGenerator {

  static async generateReply(detected, session, messageText, conversationHistory) {
    
    // ============ 10 SECOND DELAY ============
    console.log(`⏱️ Waiting 10 seconds before replying...`);
    await this.delay(10000);
    console.log(`✅ Delay complete`);

    // Initialize memory with extraction tracking
    if (!session.memory) {
      session.memory = {
        // Track what we've already extracted (using Sets to prevent duplicates)
        extracted: {
          phone: new Set(),
          bankAccount: new Set(),
          upi: new Set(),
          email: new Set(),
          link: new Set(),
          employeeID: new Set(),
          name: null
        },
        
        // Track what we've asked
        asked: {
          phone: false,
          account: false,
          upi: false,
          email: false,
          link: false,
          name: false,
          employeeID: false,
          branchCode: false,
          ifsc: false,
          reference: false
        },
        
        // Scammer's info (first occurrence only)
        scammerInfo: {
          phone: null,
          account: null,
          upi: null,
          email: null,
          link: null,
          employeeID: null,
          name: null
        },
        
        // State
        threatCount: 0,
        otpRequests: 0,
        turnCount: 0,
        usedReplies: new Set(),
        detectedScamType: null
      };
    }

    // ============ EXTRACT UNIQUE DATA ONLY ============
    this.extractUniqueData(detected, session, messageText);

    // ============ DETECT SCAM TYPE ============
    const scamType = this.detectScamType(detected, messageText);
    if (scamType && !session.memory.detectedScamType) {
      session.memory.detectedScamType = scamType;
      console.log(`🎯 Scam type: ${scamType}`);
    }

    // ============ UPDATE COUNTERS ============
    if (detected.hasThreat) session.memory.threatCount++;
    if (detected.hasOTP) session.memory.otpRequests++;

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
      return this.getUniqueReply("greeting_response", session);
    }

    // ============ CHECK IF WE HAVE ENOUGH DATA TO EXIT ============
    const extractionCount = this.getExtractionCount(session);
    
    // If we have 2+ data types and at least 5 turns, exit
    if (extractionCount >= 2 && session.turnCount >= 5) {
      console.log(`✅ Collected ${extractionCount} data types - exiting`);
      return this.getUniqueReply("final_goodbye", session);
    }

    // ============ TURN-BASED FLOW USING REPLIES.JS ============
    
    // Turn 1: Initial confusion based on scam type
    if (session.turnCount === 0) {
      return this.getScamTypeInitialReply(scamType, session);
    }
    
    // Turn 2: Show interest, ask for name
    if (session.turnCount === 1) {
      if (!session.memory.asked.name) {
        session.memory.asked.name = true;
        return this.getUniqueReply("ask_scammer_name", session);
      }
      return this.getUniqueReply("victim_worried", session);
    }
    
    // Turn 3: Ask for phone number
    if (session.turnCount === 2) {
      if (!session.memory.asked.phone) {
        session.memory.asked.phone = true;
        return this.getUniqueReply("ask_scammer_phone", session);
      }
      return this.getUniqueReply("victim_asking", session);
    }
    
    // Turn 4+: Ask for missing data based on scam type
    return this.getMissingDataReply(scamType, session);
  }

  // ===============================
  // Get Scam Type Initial Reply from REPLIES
  // ===============================
  static getScamTypeInitialReply(scamType, session) {
    switch(scamType) {
      case 'bank':
        return this.getUniqueReply("victim_confused", session);
      case 'lottery':
        return this.getUniqueReply("lottery_initial", session);
      case 'investment':
        return this.getUniqueReply("investment_initial", session);
      case 'job':
        return this.getUniqueReply("job_initial", session);
      case 'loan':
        return this.getUniqueReply("loan_initial", session);
      case 'upi':
        return this.getUniqueReply("upi_initial", session);
      case 'phishing':
        return this.getUniqueReply("link_initial", session);
      case 'kyc':
        return this.getUniqueReply("kyc_initial", session);
      default:
        return this.getUniqueReply("greeting_response", session);
    }
  }

  // ===============================
  // Get Missing Data Reply from REPLIES
  // ===============================
  static getMissingDataReply(scamType, session) {
    const missing = this.getMissingDataTypes(session, scamType);
    
    if (missing.length === 0) {
      return this.getUniqueReply("final_goodbye", session);
    }
    
    // Ask for missing data in priority order
    if (missing.includes('phone') && !session.memory.asked.phone) {
      session.memory.asked.phone = true;
      return this.getUniqueReply("ask_scammer_phone", session);
    }
    
    if (missing.includes('name') && !session.memory.asked.name) {
      session.memory.asked.name = true;
      return this.getUniqueReply("ask_scammer_name", session);
    }
    
    if (missing.includes('account') && !session.memory.asked.account) {
      session.memory.asked.account = true;
      return this.getUniqueReplyWithParam("account_shocked", "{account}", 
        session.memory.scammerInfo.account || "aapka account", session);
    }
    
    if (missing.includes('upi') && !session.memory.asked.upi) {
      session.memory.asked.upi = true;
      return this.getUniqueReply("upi_confirm", session);
    }
    
    if (missing.includes('link') && !session.memory.asked.link) {
      session.memory.asked.link = true;
      return this.getUniqueReply("link_curious", session);
    }
    
    if (missing.includes('employeeID') && !session.memory.asked.employeeID) {
      session.memory.asked.employeeID = true;
      return this.getUniqueReply("ask_employee_id", session);
    }
    
    if (missing.includes('email') && !session.memory.asked.email) {
      session.memory.asked.email = true;
      return this.getUniqueReply("email_send_request", session);
    }
    
    return this.getUniqueReply("victim_asking", session);
  }

  // ===============================
  // Extract Unique Data Only (No Duplicates)
  // ===============================
  static extractUniqueData(detected, session, messageText) {
    const memory = session.memory;
    const intel = session.intelligence;
    
    // Initialize arrays if needed
    if (!intel.phoneNumbers) intel.phoneNumbers = [];
    if (!intel.bankAccounts) intel.bankAccounts = [];
    if (!intel.upiIds) intel.upiIds = [];
    if (!intel.emailAddresses) intel.emailAddresses = [];
    if (!intel.phishingLinks) intel.phishingLinks = [];
    if (!intel.employeeIDs) intel.employeeIDs = [];
    
    // Extract phone number - UNIQUE only
    if (detected.phoneNumber && !memory.extracted.phone.has(detected.phoneNumber)) {
      memory.extracted.phone.add(detected.phoneNumber);
      memory.scammerInfo.phone = detected.phoneNumber;
      intel.phoneNumbers.push(detected.phoneNumber);
      console.log(`📞 NEW phone: ${detected.phoneNumber}`);
    }
    
    // Extract bank account - UNIQUE only
    if (detected.hasAccount && detected.accountNumber && 
        !memory.extracted.bankAccount.has(detected.accountNumber)) {
      memory.extracted.bankAccount.add(detected.accountNumber);
      memory.scammerInfo.account = detected.accountNumber;
      intel.bankAccounts.push(detected.accountNumber);
      console.log(`💰 NEW account: ${detected.accountNumber}`);
    }
    
    // Extract UPI ID - UNIQUE only
    if (detected.hasUPI && detected.upiId && 
        !memory.extracted.upi.has(detected.upiId)) {
      memory.extracted.upi.add(detected.upiId);
      memory.scammerInfo.upi = detected.upiId;
      intel.upiIds.push(detected.upiId);
      console.log(`💳 NEW UPI: ${detected.upiId}`);
    }
    
    // Extract email - UNIQUE only
    if (detected.extractedEmail && !memory.extracted.email.has(detected.extractedEmail)) {
      memory.extracted.email.add(detected.extractedEmail);
      memory.scammerInfo.email = detected.extractedEmail;
      intel.emailAddresses.push(detected.extractedEmail);
      console.log(`📧 NEW email: ${detected.extractedEmail}`);
    }
    
    // Extract link - UNIQUE only
    const linkMatch = messageText.match(/(https?:\/\/[^\s]+|bit\.ly\/[^\s]+|tinyurl\.com\/[^\s]+)/i);
    if (linkMatch && !memory.extracted.link.has(linkMatch[0])) {
      memory.extracted.link.add(linkMatch[0]);
      memory.scammerInfo.link = linkMatch[0];
      intel.phishingLinks.push(linkMatch[0]);
      console.log(`🔗 NEW link: ${linkMatch[0]}`);
    }
    
    // Extract employee ID - UNIQUE only
    if (detected.hasEmployeeID && detected.employeeID && 
        !memory.extracted.employeeID.has(detected.employeeID)) {
      memory.extracted.employeeID.add(detected.employeeID);
      memory.scammerInfo.employeeID = detected.employeeID;
      intel.employeeIDs.push(detected.employeeID);
      console.log(`🆔 NEW employee ID: ${detected.employeeID}`);
    }
    
    // Extract name
    if (detected.extractedName && !memory.extracted.name) {
      memory.extracted.name = detected.extractedName;
      memory.scammerInfo.name = detected.extractedName;
      console.log(`📝 Got name: ${detected.extractedName}`);
    }
  }

  // ===============================
  // Count Unique Data Types Extracted
  // ===============================
  static getExtractionCount(session) {
    const memory = session.memory;
    let count = 0;
    if (memory.extracted.phone.size > 0) count++;
    if (memory.extracted.bankAccount.size > 0) count++;
    if (memory.extracted.upi.size > 0) count++;
    if (memory.extracted.email.size > 0) count++;
    if (memory.extracted.link.size > 0) count++;
    if (memory.extracted.employeeID.size > 0) count++;
    return count;
  }

  // ===============================
  // Get Missing Data Types Based on Scam Type
  // ===============================
  static getMissingDataTypes(session, scamType) {
    const memory = session.memory;
    const missing = [];
    
    // Phone is always important
    if (memory.extracted.phone.size === 0) missing.push('phone');
    
    // Name is always good to have
    if (!memory.extracted.name) missing.push('name');
    
    // Scam-specific data
    if (scamType === 'bank' && memory.extracted.bankAccount.size === 0) missing.push('account');
    if (scamType === 'upi' && memory.extracted.upi.size === 0) missing.push('upi');
    if (scamType === 'phishing' && memory.extracted.link.size === 0) missing.push('link');
    if (scamType === 'job' && memory.extracted.employeeID.size === 0) missing.push('employeeID');
    if (memory.extracted.email.size === 0) missing.push('email');
    
    return missing;
  }

  // ===============================
  // Detect Scam Type
  // ===============================
  static detectScamType(detected, text) {
    const lowerText = text?.toLowerCase() || '';
    
    if (detected.hasBank || detected.hasAccount || detected.hasOTP) return 'bank';
    if (detected.hasUPI) return 'upi';
    if (detected.hasLink) return 'phishing';
    if (detected.hasLottery) return 'lottery';
    if (detected.hasInvestment) return 'investment';
    if (detected.hasJob) return 'job';
    if (detected.hasLoan) return 'loan';
    if (detected.hasKYC) return 'kyc';
    
    return 'generic';
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

  // ===============================
  // Delay Function
  // ===============================
  static delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ===============================
  // Get Unique Reply from REPLIES - NEVER REPEATS
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
  // Get Reply with Parameter from REPLIES
  // ===============================
  static getUniqueReplyWithParam(key, placeholder, value, session) {
    const reply = this.getUniqueReply(key, session);
    return reply.replace(new RegExp(placeholder.replace('{', '\\{').replace('}', '\\}'), 'g'), value);
  }

  // ===============================
  // Contextual Fallback
  // ===============================
  static getContextualFallback(session) {
    const fallbacks = REPLIES.fallback_scared || [
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