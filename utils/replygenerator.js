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
        // Track what we've already extracted
        extracted: {
          phone: new Set(),
          bankAccount: new Set(),
          upi: new Set(),
          email: new Set(),
          link: new Set(),
          name: null
        },
        
        // Track what we've asked
        asked: {
          phone: false,
          account: false,
          upi: false,
          email: false,
          link: false,
          name: false
        },
        
        // Scammer's info
        scammerInfo: {
          phone: null,
          account: null,
          upi: null,
          email: null,
          link: null,
          name: null
        },
        
        // State
        threatCount: 0,
        otpRequests: 0,
        turnCount: 0,
        usedReplies: new Set(),
        detectedScamType: null,
        
        // Exit flags
        exitInitiated: false,
        exitReason: null,
        dataCollected: []
      };
    }

    // ============ EXTRACT UNIQUE DATA ============
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

    // ============ CHECK FOR EXIT CONDITIONS ============
    const exitCheck = this.shouldExit(session);
    if (exitCheck.shouldExit) {
      session.memory.exitInitiated = true;
      session.memory.exitReason = exitCheck.reason;
      console.log(`🚪 EXITING: ${exitCheck.reason}`);
      
      // If we already collected data, use appropriate exit message
      const extractionCount = this.getExtractionCount(session);
      if (extractionCount >= 2) {
        return this.getUniqueReply("final_goodbye", session);
      } else {
        return "Main baad mein baat karta hoon. Bye.";
      }
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
      return this.getUniqueReply("greeting_response", session);
    }

    // ============ CHECK DATA COLLECTION PROGRESS ============
    const extractionCount = this.getExtractionCount(session);
    const missingData = this.getMissingDataTypes(session, scamType);
    
    // Log progress
    console.log(`📊 Data collected: ${extractionCount} types | Missing: ${missingData.join(', ') || 'none'}`);

    // ============ TURN-BASED FLOW ============
    
    // Turn 1: Initial response based on scam type
    if (session.turnCount === 0) {
      return this.getInitialReply(scamType, session);
    }
    
    // Turn 2: Ask for name
    if (session.turnCount === 1) {
      if (!session.memory.asked.name) {
        session.memory.asked.name = true;
        return this.getUniqueReply("ask_scammer_name", session);
      }
    }
    
    // Turn 3: Ask for phone
    if (session.turnCount === 2) {
      if (!session.memory.asked.phone && !session.memory.extracted.phone.size) {
        session.memory.asked.phone = true;
        return this.getUniqueReply("ask_scammer_phone", session);
      }
    }
    
    // Turn 4: Ask for email
    if (session.turnCount === 3) {
      if (!session.memory.asked.email && !session.memory.extracted.email.size) {
        session.memory.asked.email = true;
        return this.getUniqueReply("email_send_request", session);
      }
    }
    
    // Turn 5+: Ask for missing data based on scam type
    if (session.turnCount >= 4) {
      return this.getMissingDataReply(scamType, session);
    }
    
    return this.getUniqueReply("victim_asking", session);
  }

  // ===============================
  // EXIT DECISION ENGINE
  // ===============================
  static shouldExit(session) {
    const memory = session.memory;
    const extractionCount = this.getExtractionCount(session);
    
    // EXIT CONDITION 1: Already have 2+ data types and minimum turns
    if (extractionCount >= 2 && session.turnCount >= 4) {
      return {
        shouldExit: true,
        reason: `Collected ${extractionCount} data types in ${session.turnCount} turns`
      };
    }
    
    // EXIT CONDITION 2: Got phone + (bank/email/upi) combo
    if (memory.extracted.phone.size > 0) {
      if (memory.extracted.bankAccount.size > 0 && session.turnCount >= 4) {
        return {
          shouldExit: true,
          reason: 'Got phone + bank account'
        };
      }
      if (memory.extracted.email.size > 0 && session.turnCount >= 4) {
        return {
          shouldExit: true,
          reason: 'Got phone + email'
        };
      }
      if (memory.extracted.upi.size > 0 && session.turnCount >= 4) {
        return {
          shouldExit: true,
          reason: 'Got phone + UPI'
        };
      }
    }
    
    // EXIT CONDITION 3: Max turns reached
    if (session.turnCount >= 6) {
      return {
        shouldExit: true,
        reason: 'Max turns reached'
      };
    }
    
    // EXIT CONDITION 4: High threats + some data
    if (memory.threatCount >= 3 && extractionCount >= 1 && session.turnCount >= 4) {
      return {
        shouldExit: true,
        reason: 'High threats with some data'
      };
    }
    
    return { shouldExit: false };
  }

  // ===============================
  // Get Initial Reply Based on Scam Type
  // ===============================
  static getInitialReply(scamType, session) {
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
  // Get Missing Data Reply
  // ===============================
  static getMissingDataReply(scamType, session) {
    const missing = this.getMissingDataTypes(session, scamType);
    
    // If nothing missing, exit
    if (missing.length === 0) {
      return this.getUniqueReply("final_goodbye", session);
    }
    
    // Priority order: phone > name > scam-specific > email
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
    
    if (missing.includes('email') && !session.memory.asked.email) {
      session.memory.asked.email = true;
      return this.getUniqueReply("email_send_request", session);
    }
    
    return this.getUniqueReply("victim_asking", session);
  }

  // ===============================
  // Extract Unique Data Only
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
    
    // Extract phone number
    if (detected.phoneNumber && !memory.extracted.phone.has(detected.phoneNumber)) {
      memory.extracted.phone.add(detected.phoneNumber);
      memory.scammerInfo.phone = detected.phoneNumber;
      intel.phoneNumbers.push(detected.phoneNumber);
      console.log(`📞 NEW phone: ${detected.phoneNumber}`);
      memory.dataCollected.push('phone');
    }
    
    // Extract bank account
    if (detected.hasAccount && detected.accountNumber && 
        !memory.extracted.bankAccount.has(detected.accountNumber)) {
      memory.extracted.bankAccount.add(detected.accountNumber);
      memory.scammerInfo.account = detected.accountNumber;
      intel.bankAccounts.push(detected.accountNumber);
      console.log(`💰 NEW account: ${detected.accountNumber}`);
      memory.dataCollected.push('account');
    }
    
    // Extract UPI ID
    if (detected.hasUPI && detected.upiId && 
        !memory.extracted.upi.has(detected.upiId)) {
      memory.extracted.upi.add(detected.upiId);
      memory.scammerInfo.upi = detected.upiId;
      intel.upiIds.push(detected.upiId);
      console.log(`💳 NEW UPI: ${detected.upiId}`);
      memory.dataCollected.push('upi');
    }
    
    // Extract email
    if (detected.extractedEmail && !memory.extracted.email.has(detected.extractedEmail)) {
      memory.extracted.email.add(detected.extractedEmail);
      memory.scammerInfo.email = detected.extractedEmail;
      intel.emailAddresses.push(detected.extractedEmail);
      console.log(`📧 NEW email: ${detected.extractedEmail}`);
      memory.dataCollected.push('email');
    }
    
    // Extract link
    const linkMatch = messageText.match(/(https?:\/\/[^\s]+|bit\.ly\/[^\s]+|tinyurl\.com\/[^\s]+)/i);
    if (linkMatch && !memory.extracted.link.has(linkMatch[0])) {
      memory.extracted.link.add(linkMatch[0]);
      memory.scammerInfo.link = linkMatch[0];
      intel.phishingLinks.push(linkMatch[0]);
      console.log(`🔗 NEW link: ${linkMatch[0]}`);
      memory.dataCollected.push('link');
    }
    
    // Extract name
    if (detected.extractedName && !memory.extracted.name) {
      memory.extracted.name = detected.extractedName;
      memory.scammerInfo.name = detected.extractedName;
      console.log(`📝 Got name: ${detected.extractedName}`);
      memory.dataCollected.push('name');
    }
  }

  // ===============================
  // Count Unique Data Types
  // ===============================
  static getExtractionCount(session) {
    const memory = session.memory;
    let count = 0;
    if (memory.extracted.phone.size > 0) count++;
    if (memory.extracted.bankAccount.size > 0) count++;
    if (memory.extracted.upi.size > 0) count++;
    if (memory.extracted.email.size > 0) count++;
    if (memory.extracted.link.size > 0) count++;
    return count;
  }

  // ===============================
  // Get Missing Data Types
  // ===============================
  static getMissingDataTypes(session, scamType) {
    const memory = session.memory;
    const missing = [];
    
    if (memory.extracted.phone.size === 0) missing.push('phone');
    if (!memory.extracted.name) missing.push('name');
    
    if (scamType === 'bank' && memory.extracted.bankAccount.size === 0) missing.push('account');
    if (scamType === 'upi' && memory.extracted.upi.size === 0) missing.push('upi');
    if (scamType === 'phishing' && memory.extracted.link.size === 0) missing.push('link');
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
           detected.hasEmail;
  }

  static isGreetingOnly(detected, message) {
    if (!message) return false;
    const lowerMsg = message.toLowerCase();
    const isGreeting = /^(hi|hello|hey|namaste|नमस्ते|kaise ho|kya haal)/i.test(lowerMsg);
    return isGreeting && !this.hasScamIndicators(detected);
  }

  static delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

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

  static getUniqueReplyWithParam(key, placeholder, value, session) {
    const reply = this.getUniqueReply(key, session);
    return reply.replace(new RegExp(placeholder.replace('{', '\\{').replace('}', '\\}'), 'g'), value);
  }

  static getContextualFallback(session) {
    const fallbacks = REPLIES.fallback_scared || [
      "Mujhe samajh nahi aaya. Aap hi batao kya karna hai?"
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