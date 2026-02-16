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
        // Track extracted data
        extracted: {
          phone: new Set(),
          bankAccount: new Set(),
          upi: new Set(),
          email: new Set(),
          link: new Set(),
          name: null,
          employeeId: null
        },
        
        // Track asked questions (ONCE per session)
        asked: {
          name: false,
          phone: false,
          email: false,
          account: false,
          upi: false,
          link: false,
          employeeId: false
        },
        
        // Scammer info
        scammerInfo: {
          name: null,
          phone: null,
          email: null,
          account: null,
          upi: null,
          link: null,
          employeeId: null
        },
        
        // Contradiction tracking
        contradictions: {
          nameChanged: false,
          previousName: null
        },
        
        // State
        threatCount: 0,
        otpRequests: 0,
        turnCount: 0,
        usedReplies: new Set(),
        detectedScamType: this.detectScamType(detected, messageText),
        
        // Exit flag
        exitInitiated: false,
        dataCollected: []
      };
    }

    // Update turn count
    session.memory.turnCount = session.turnCount;

    // ============ EXTRACT INTELLIGENCE ============
    await this.extractIntelligence(detected, session, messageText);

    // ============ UPDATE COUNTERS ============
    if (detected.hasThreat) session.memory.threatCount++;
    if (detected.hasOTP) session.memory.otpRequests++;

    // ============ CHECK FOR GREETING ============
    const isGreeting = this.isGreetingOnly(detected, session.lastScammerMessage);
    if (isGreeting && session.turnCount === 0) {
      return this.getUniqueReply("greeting_response", session);
    }

    // ============ CHECK FOR CONTRADICTIONS ============
    if (session.memory.contradictions.nameChanged) {
      return `Aapne pehle ${session.memory.contradictions.previousName} bola tha, ab ${session.memory.extracted.name} bol rahe ho? Yeh kya hai?`;
    }

    // ============ CHECK IF WE HAVE ENOUGH DATA TO EXIT ============
    const extractionCount = this.getExtractionCount(session);
    
    // Exit after collecting 2+ data types OR after turn 6
    if (extractionCount >= 2 && session.turnCount >= 4) {
      session.memory.exitInitiated = true;
      return this.getExitReply(session);
    }
    
    if (session.turnCount >= 6) {
      session.memory.exitInitiated = true;
      return this.getExitReply(session);
    }

    // ============ GET SCAM-SPECIFIC RESPONSE FROM REPLIES.JS ============
    const scamType = session.memory.detectedScamType;
    
    // TURN-BASED FLOW - Always use replies.js
    if (session.turnCount === 0) {
      // First turn - use scam-specific initial reply
      return this.getScamSpecificReply(scamType, 'initial', session);
    }
    
    if (session.turnCount === 1 && !session.memory.asked.name) {
      session.memory.asked.name = true;
      return this.getUniqueReply("ask_scammer_name", session);
    }
    
    if (session.turnCount === 2 && !session.memory.asked.phone) {
      session.memory.asked.phone = true;
      return this.getUniqueReply("ask_scammer_phone", session);
    }
    
    if (session.turnCount === 3 && !session.memory.asked.email) {
      session.memory.asked.email = true;
      return this.getUniqueReply("email_send_request", session);
    }
    
    // Check for missing data based on scam type
    const missingData = this.getMissingDataTypes(session);
    
    if (missingData.length > 0) {
      const nextMissing = missingData[0];
      
      if (nextMissing === 'account' && !session.memory.asked.account) {
        session.memory.asked.account = true;
        return this.getScamSpecificReply(scamType, 'account', session);
      }
      
      if (nextMissing === 'upi' && !session.memory.asked.upi) {
        session.memory.asked.upi = true;
        return this.getScamSpecificReply(scamType, 'upi', session);
      }
      
      if (nextMissing === 'link' && !session.memory.asked.link) {
        session.memory.asked.link = true;
        return this.getScamSpecificReply(scamType, 'link', session);
      }
      
      if (nextMissing === 'employeeId' && !session.memory.asked.employeeId) {
        session.memory.asked.employeeId = true;
        return this.getUniqueReply("ask_employee_id", session);
      }
    }
    
    // Default to victim_asking if nothing else
    return this.getUniqueReply("victim_asking", session);
  }

  // ===============================
  // Get Scam-Specific Reply from REPLIES
  // ===============================
  static getScamSpecificReply(scamType, replyType, session) {
    const key = `${scamType}_${replyType}`;
    
    // Try scam-specific reply first
    if (REPLIES[key]) {
      return this.getUniqueReply(key, session);
    }
    
    // Fallback to generic replies
    if (replyType === 'initial') {
      return this.getUniqueReply("victim_confused", session);
    }
    if (replyType === 'account') {
      return this.getUniqueReply("account_shocked", session);
    }
    if (replyType === 'upi') {
      return this.getUniqueReply("upi_confirm", session);
    }
    if (replyType === 'link') {
      return this.getUniqueReply("link_curious", session);
    }
    
    return this.getUniqueReply("victim_asking", session);
  }

  // ===============================
  // Get Exit Reply (Natural)
  // ===============================
  static getExitReply(session) {
    const extractionCount = this.getExtractionCount(session);
    
    if (extractionCount >= 3) {
      return this.getUniqueReply("final_goodbye", session);
    } else if (extractionCount >= 2) {
      return "Thank you for the information. Main verify kar leta hoon.";
    } else {
      return "Main baad mein baat karta hoon. Bye.";
    }
  }

  // ===============================
  // Detect Scam Type - UNIVERSAL
  // ===============================
  static detectScamType(detected, text) {
    const lowerText = text?.toLowerCase() || '';
    
    if (detected.hasBank || detected.hasAccount || detected.hasOTP || 
        lowerText.includes('bank') || lowerText.includes('sbi') || lowerText.includes('account')) {
      return 'bank';
    }
    if (detected.hasUPI || lowerText.includes('upi') || lowerText.includes('gpay') || 
        lowerText.includes('phonepe') || lowerText.includes('paytm')) {
      return 'upi';
    }
    if (detected.hasLink || lowerText.includes('link') || lowerText.includes('click') || 
        lowerText.includes('bit.ly') || lowerText.includes('tinyurl')) {
      return 'link';
    }
    if (detected.hasLottery || lowerText.includes('lottery') || lowerText.includes('winner') || 
        lowerText.includes('prize') || lowerText.includes('gift')) {
      return 'lottery';
    }
    if (detected.hasInvestment || lowerText.includes('invest') || lowerText.includes('profit') || 
        lowerText.includes('return') || lowerText.includes('scheme')) {
      return 'investment';
    }
    if (detected.hasJob || lowerText.includes('job') || lowerText.includes('work') || 
        lowerText.includes('salary') || lowerText.includes('hiring')) {
      return 'job';
    }
    if (detected.hasLoan || lowerText.includes('loan') || lowerText.includes('interest') || 
        lowerText.includes('credit') || lowerText.includes('emi')) {
      return 'loan';
    }
    if (detected.hasKYC || lowerText.includes('kyc') || lowerText.includes('update') || 
        lowerText.includes('verify') || lowerText.includes('aadhar')) {
      return 'kyc';
    }
    
    return 'generic';
  }

  // ===============================
  // Extract Intelligence - NO DUPLICATES
  // ===============================
  static async extractIntelligence(detected, session, messageText) {
    const memory = session.memory;
    const intel = session.intelligence;
    
    // Initialize arrays
    if (!intel.phoneNumbers) intel.phoneNumbers = [];
    if (!intel.bankAccounts) intel.bankAccounts = [];
    if (!intel.upiIds) intel.upiIds = [];
    if (!intel.emailAddresses) intel.emailAddresses = [];
    if (!intel.phishingLinks) intel.phishingLinks = [];
    
    // ============ NAME EXTRACTION ============
    if (detected.extractedName) {
      if (!memory.extracted.name) {
        memory.extracted.name = detected.extractedName;
        memory.scammerInfo.name = detected.extractedName;
        memory.contradictions.previousName = detected.extractedName;
        memory.dataCollected.push('name');
        console.log(`📝 NAME: ${detected.extractedName}`);
      } else if (memory.extracted.name !== detected.extractedName) {
        memory.contradictions.nameChanged = true;
        console.log(`⚠️ CONTRADICTION: Name changed from ${memory.extracted.name} to ${detected.extractedName}`);
      }
    }
    
    // ============ PHONE EXTRACTION ============
    if (detected.phoneNumber && !memory.extracted.phone.has(detected.phoneNumber)) {
      memory.extracted.phone.add(detected.phoneNumber);
      memory.scammerInfo.phone = detected.phoneNumber;
      intel.phoneNumbers.push(detected.phoneNumber);
      memory.dataCollected.push('phone');
      console.log(`📞 PHONE: ${detected.phoneNumber}`);
    }
    
    // ============ BANK ACCOUNT EXTRACTION ============
    if (detected.hasAccount && detected.accountNumber && 
        !memory.extracted.bankAccount.has(detected.accountNumber)) {
      memory.extracted.bankAccount.add(detected.accountNumber);
      memory.scammerInfo.account = detected.accountNumber;
      intel.bankAccounts.push(detected.accountNumber);
      memory.dataCollected.push('account');
      console.log(`💰 ACCOUNT: ${detected.accountNumber}`);
    }
    
    // ============ EMAIL EXTRACTION ============
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const emailMatch = messageText.match(emailRegex);
    if (emailMatch && !memory.extracted.email.has(emailMatch[0])) {
      memory.extracted.email.add(emailMatch[0]);
      memory.scammerInfo.email = emailMatch[0];
      intel.emailAddresses.push(emailMatch[0]);
      memory.dataCollected.push('email');
      console.log(`📧 EMAIL: ${emailMatch[0]}`);
    }
    
    // ============ UPI EXTRACTION ============
    const upiRegex = /[\w.\-]+@[\w.\-]+/i;
    const upiMatch = messageText.match(upiRegex);
    if (upiMatch && !emailMatch) {
      const upi = upiMatch[0].toLowerCase();
      if (!memory.extracted.upi.has(upi) && 
          !upi.includes('gmail.com') && !upi.includes('yahoo.com') && 
          !upi.includes('hotmail.com') && !upi.includes('outlook.com')) {
        memory.extracted.upi.add(upi);
        memory.scammerInfo.upi = upi;
        intel.upiIds.push(upi);
        memory.dataCollected.push('upi');
        console.log(`💳 UPI: ${upi}`);
      }
    }
    
    // ============ LINK EXTRACTION ============
    const linkRegex = /(https?:\/\/[^\s]+|bit\.ly\/[^\s]+|tinyurl\.com\/[^\s]+)/i;
    const linkMatch = messageText.match(linkRegex);
    if (linkMatch && !memory.extracted.link.has(linkMatch[0])) {
      memory.extracted.link.add(linkMatch[0]);
      memory.scammerInfo.link = linkMatch[0];
      intel.phishingLinks.push(linkMatch[0]);
      memory.dataCollected.push('link');
      console.log(`🔗 LINK: ${linkMatch[0]}`);
    }
    
    // ============ EMPLOYEE ID EXTRACTION ============
    if (detected.hasEmployeeID && detected.employeeID && !memory.extracted.employeeId) {
      memory.extracted.employeeId = detected.employeeID;
      memory.scammerInfo.employeeId = detected.employeeID;
      if (!intel.employeeIDs) intel.employeeIDs = [];
      intel.employeeIDs.push(detected.employeeID);
      memory.dataCollected.push('employeeId');
      console.log(`🆔 EMPLOYEE ID: ${detected.employeeID}`);
    }
  }

  // ===============================
  // Get Missing Data Types
  // ===============================
  static getMissingDataTypes(session) {
    const memory = session.memory;
    const scamType = memory.detectedScamType;
    const missing = [];
    
    // Universal data types
    if (memory.extracted.phone.size === 0) missing.push('phone');
    if (!memory.extracted.email) missing.push('email');
    if (!memory.extracted.name) missing.push('name');
    
    // Scam-specific data types
    if (scamType === 'bank' && memory.extracted.bankAccount.size === 0) missing.push('account');
    if (scamType === 'upi' && memory.extracted.upi.size === 0) missing.push('upi');
    if (scamType === 'link' && memory.extracted.link.size === 0) missing.push('link');
    if (scamType === 'job' && !memory.extracted.employeeId) missing.push('employeeId');
    if (scamType === 'loan' && memory.extracted.bankAccount.size === 0) missing.push('account');
    if (scamType === 'investment' && memory.extracted.upi.size === 0) missing.push('upi');
    
    return missing;
  }

  // ===============================
  // Count Extracted Data Types
  // ===============================
  static getExtractionCount(session) {
    const memory = session.memory;
    let count = 0;
    if (memory.extracted.phone.size > 0) count++;
    if (memory.extracted.bankAccount.size > 0) count++;
    if (memory.extracted.upi.size > 0) count++;
    if (memory.extracted.email.size > 0) count++;
    if (memory.extracted.link.size > 0) count++;
    if (memory.extracted.name) count++;
    if (memory.extracted.employeeId) count++;
    return count;
  }

  // ===============================
  // Helper Methods
  // ===============================
  static hasScamIndicators(detected) {
    return detected.hasOTP || detected.hasAccount || detected.hasUPI || 
           detected.hasPhone || detected.hasThreat || detected.hasBank ||
           detected.hasLink || detected.hasLottery || detected.hasInvestment ||
           detected.hasJob || detected.hasLoan || detected.hasKYC;
  }

  static isGreetingOnly(detected, message) {
    if (!message) return false;
    const lowerMsg = message.toLowerCase();
    const isGreeting = /^(hi|hello|hey|namaste|नमस्ते)/i.test(lowerMsg);
    return isGreeting && !this.hasScamIndicators(detected);
  }

  static delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static getUniqueReply(key, session) {
    const replies = REPLIES[key];
    if (!replies || replies.length === 0) {
      return "Mujhe samajh nahi aaya.";
    }
    
    // Get available replies (not used)
    const availableReplies = replies.filter(reply => !session.memory.usedReplies.has(reply));
    
    if (availableReplies.length === 0) {
      // Reset if all used
      session.memory.usedReplies.clear();
      const freshReply = replies[Math.floor(Math.random() * replies.length)];
      session.memory.usedReplies.add(freshReply);
      return freshReply;
    }
    
    const randomIndex = Math.floor(Math.random() * availableReplies.length);
    const selectedReply = availableReplies[randomIndex];
    session.memory.usedReplies.add(selectedReply);
    return selectedReply;
  }
}