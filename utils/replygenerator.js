import { REPLIES } from "./replies.js";
import { PerplexityService } from "../service/perplexity.js";
import { CONFIG } from "./config.js";

export class ReplyGenerator {

  static async generateReply(detected, session, messageText, conversationHistory) {
    
    // ============ NATURAL HUMAN DELAY ============
    console.log(`⏱️ Waiting 6 seconds before replying...`);
    await this.delay(10000);
    console.log(`✅ Delay complete`);

    // Initialize memory if first time
    if (!session.memory) {
      session.memory = this.initializeMemory();
    }

    const memory = session.memory;
    memory.turnCount = session.turnCount;

    // ============ EXTRACT ALL INTELLIGENCE ============
    this.extractIntelligence(detected, session, messageText);

    // ============ UPDATE COUNTERS ============
    if (detected.hasThreat) memory.threatCount++;
    if (detected.hasOTP) memory.otpRequests++;

    // ============ CHECK FOR GREETING ============
    if (this.isGreeting(detected, messageText) && session.turnCount === 0) {
      return this.getUniqueReply("greeting_response", session);
    }

    // ============ CHECK FOR NAME CONTRADICTION ============
    if (memory.contradictions.nameChanged) {
      return `Aapne pehle ${memory.contradictions.previousName} bola tha, ab ${memory.extracted.name} bol rahe ho? Yeh kya hai?`;
    }

    // ============ EXIT CONDITIONS ============
    const extractionCount = this.getExtractionCount(session);
    
    // Exit after turn 6 OR after collecting 3+ data types
    if (session.turnCount >= 6 || extractionCount >= 3) {
      session.memory.exitInitiated = true;
      return this.getExitReply(session);
    }

    // ============ FIND NEXT MISSING INFORMATION ============
    const nextMissing = this.getNextMissingInfo(session);

    // ============ ASK FOR MISSING INFO NATURALLY ============
    if (nextMissing) {
      return this.askForInfo(nextMissing, session);
    }

    // ============ CONTEXT-AWARE FALLBACK ============
    return this.getContextAwareReply(detected, session);
  }

  // ===============================
  // MEMORY INITIALIZATION
  // ===============================
  static initializeMemory() {
    return {
      // Extracted data (using Sets to prevent duplicates)
      extracted: {
        phone: new Set(),
        bankAccount: new Set(),
        upi: new Set(),
        email: new Set(),
        link: new Set(),
        name: null,
        employeeId: null
      },
      
      // What we've already asked
      asked: {
        name: false,
        phone: false,
        email: false,
        account: false,
        upi: false,
        link: false
      },
      
      // Contradiction tracking
      contradictions: {
        previousName: null,
        nameChanged: false
      },
      
      // State
      threatCount: 0,
      otpRequests: 0,
      turnCount: 0,
      usedReplies: new Set(),
      dataCollected: [],
      exitInitiated: false
    };
  }

  // ===============================
  // INTELLIGENCE EXTRACTION - NO DUPLICATES
  // ===============================
  static extractIntelligence(detected, session, messageText) {
    const memory = session.memory;
    const intel = session.intelligence;
    
    // Initialize arrays if needed
    if (!intel.phoneNumbers) intel.phoneNumbers = [];
    if (!intel.bankAccounts) intel.bankAccounts = [];
    if (!intel.upiIds) intel.upiIds = [];
    if (!intel.emailAddresses) intel.emailAddresses = [];
    if (!intel.phishingLinks) intel.phishingLinks = [];
    if (!intel.employeeIDs) intel.employeeIDs = [];
    
    // ============ NAME EXTRACTION ============
    const nameMatch = messageText.match(/(?:mera naam|my name is|main|मेरा नाम)\s+([A-Za-z\s]+?)(?:\s+hai|\s+हूँ|\.|,|$)/i);
    if (nameMatch) {
      const newName = nameMatch[1].trim();
      if (!memory.extracted.name) {
        memory.extracted.name = newName;
        memory.contradictions.previousName = newName;
        intel.employeeIDs ? intel.employeeIDs.push(newName) : intel.employeeIDs = [newName];
        console.log(`📝 NAME: ${newName}`);
      } else if (memory.extracted.name !== newName) {
        memory.contradictions.nameChanged = true;
        console.log(`⚠️ NAME CONTRADICTION: ${memory.extracted.name} → ${newName}`);
      }
    }
    
    // ============ PHONE EXTRACTION ============
    if (detected.phoneNumber && !memory.extracted.phone.has(detected.phoneNumber)) {
      memory.extracted.phone.add(detected.phoneNumber);
      intel.phoneNumbers.push(detected.phoneNumber);
      console.log(`📞 PHONE: ${detected.phoneNumber}`);
    }
    
    // ============ BANK ACCOUNT EXTRACTION ============
    if (detected.hasAccount && detected.accountNumber && 
        !memory.extracted.bankAccount.has(detected.accountNumber)) {
      memory.extracted.bankAccount.add(detected.accountNumber);
      intel.bankAccounts.push(detected.accountNumber);
      console.log(`💰 ACCOUNT: ${detected.accountNumber}`);
    }
    
    // ============ UPI EXTRACTION ============
    if (detected.hasUPI && detected.upiId && 
        !memory.extracted.upi.has(detected.upiId)) {
      memory.extracted.upi.add(detected.upiId);
      intel.upiIds.push(detected.upiId);
      console.log(`💳 UPI: ${detected.upiId}`);
    }
    
    // ============ EMAIL EXTRACTION ============
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const emailMatch = messageText.match(emailRegex);
    if (emailMatch && !memory.extracted.email.has(emailMatch[0])) {
      memory.extracted.email.add(emailMatch[0]);
      intel.emailAddresses.push(emailMatch[0]);
      console.log(`📧 EMAIL: ${emailMatch[0]}`);
    }
    
    // ============ LINK EXTRACTION ============
    const linkRegex = /(https?:\/\/[^\s]+|bit\.ly\/[^\s]+|tinyurl\.com\/[^\s]+)/i;
    const linkMatch = messageText.match(linkRegex);
    if (linkMatch && !memory.extracted.link.has(linkMatch[0])) {
      memory.extracted.link.add(linkMatch[0]);
      intel.phishingLinks.push(linkMatch[0]);
      console.log(`🔗 LINK: ${linkMatch[0]}`);
    }
    
    // ============ EMPLOYEE ID EXTRACTION ============
    if (detected.hasEmployeeID && detected.employeeID && !memory.extracted.employeeId) {
      memory.extracted.employeeId = detected.employeeID;
      intel.employeeIDs.push(detected.employeeID);
      console.log(`🆔 EMPLOYEE ID: ${detected.employeeID}`);
    }
  }

  // ===============================
  // FIND NEXT MISSING INFORMATION
  // ===============================
  static getNextMissingInfo(session) {
    const e = session.memory.extracted;
    const asked = session.memory.asked;
    
    // Priority order: name → phone → email → account → upi → link
    if (!e.name && !asked.name) {
      session.memory.asked.name = true;
      return 'name';
    }
    if (e.phone.size === 0 && !asked.phone) {
      session.memory.asked.phone = true;
      return 'phone';
    }
    if (e.email.size === 0 && !asked.email) {
      session.memory.asked.email = true;
      return 'email';
    }
    if (e.bankAccount.size === 0 && !asked.account) {
      session.memory.asked.account = true;
      return 'account';
    }
    if (e.upi.size === 0 && !asked.upi) {
      session.memory.asked.upi = true;
      return 'upi';
    }
    if (e.link.size === 0 && !asked.link) {
      session.memory.asked.link = true;
      return 'link';
    }
    
    return null;
  }

  // ===============================
  // ASK FOR SPECIFIC INFO USING REPLIES.JS
  // ===============================
  static askForInfo(type, session) {
    const map = {
      'name': 'ask_scammer_name',
      'phone': 'ask_scammer_phone',
      'email': 'email_send_request',
      'account': 'account_shocked',
      'upi': 'upi_confirm',
      'link': 'link_curious'
    };
    
    const key = map[type];
    if (!key) return this.getUniqueReply("victim_asking", session);
    
    // If account/upi/link, we need to pass parameters
    if (type === 'account' && session.memory.extracted.bankAccount.size > 0) {
      const account = Array.from(session.memory.extracted.bankAccount)[0];
      return this.getParamReply(key, '{account}', account, session);
    }
    if (type === 'upi' && session.memory.extracted.upi.size > 0) {
      const upi = Array.from(session.memory.extracted.upi)[0];
      return this.getParamReply(key, '{upi}', upi, session);
    }
    if (type === 'link' && session.memory.extracted.link.size > 0) {
      const link = Array.from(session.memory.extracted.link)[0];
      return this.getParamReply(key, '{link}', link, session);
    }
    
    return this.getUniqueReply(key, session);
  }

  // ===============================
  // CONTEXT-AWARE FALLBACK
  // ===============================
  static getContextAwareReply(detected, session) {
    
    // OTP related
    if (detected.hasOTP) {
      if (session.memory.otpRequests === 1) return this.getUniqueReply("otp_first", session);
      if (session.memory.otpRequests === 2) return this.getUniqueReply("otp_second", session);
      if (session.memory.otpRequests >= 3) return this.getUniqueReply("otp_third", session);
    }
    
    // Threat related
    if (detected.hasThreat) {
      if (detected.hasPermanent) return this.getUniqueReply("permanent_scared", session);
      if (detected.hasFine) return this.getUniqueReply("fine_worried", session);
      return this.getUniqueReply("victim_scared", session);
    }
    
    // Link related
    if (detected.hasLink) {
      return this.getUniqueReply("link_curious", session);
    }
    
    // Offer related
    if (detected.hasFakeOffer || detected.hasLottery) {
      return this.getUniqueReply("offer_tempted", session);
    }
    
    // Default
    return this.getUniqueReply("victim_confused", session);
  }

  // ===============================
  // EXIT REPLY - NATURAL AND VARIED
  // ===============================
  static getExitReply(session) {
    const extractionCount = this.getExtractionCount(session);
    
    const exitReplies = [
      "Main branch se verify kar leta hoon. Thank you.",
      "Main official customer care number pe call karunga. Bye.",
      "Maine information note kar liya. Main check karunga.",
      "Thik hai, main verify kar leta hoon. Aap apna kaam karo.",
      "Main cyber helpline 1930 pe complaint kar dunga.",
      "Is conversation ko yahin end karte hain. Thank you."
    ];
    
    // If we collected good data, use final_goodbye
    if (extractionCount >= 2) {
      return this.getUniqueReply("final_goodbye", session);
    }
    
    return exitReplies[Math.floor(Math.random() * exitReplies.length)];
  }

  // ===============================
  // COUNT EXTRACTED DATA TYPES
  // ===============================
  static getExtractionCount(session) {
    const e = session.memory.extracted;
    let count = 0;
    if (e.name) count++;
    if (e.phone.size > 0) count++;
    if (e.email.size > 0) count++;
    if (e.bankAccount.size > 0) count++;
    if (e.upi.size > 0) count++;
    if (e.link.size > 0) count++;
    if (e.employeeId) count++;
    return count;
  }

  // ===============================
  // CHECK IF MESSAGE IS GREETING
  // ===============================
  static isGreeting(detected, message) {
    if (!message) return false;
    const lowerMsg = message.toLowerCase();
    const hasScamIndicators = detected.hasOTP || detected.hasAccount || detected.hasUPI || 
                              detected.hasPhone || detected.hasThreat || detected.hasLink;
    const isGreeting = /^(hi|hello|hey|namaste|नमस्ते|kaise ho|kya haal)/i.test(lowerMsg);
    return isGreeting && !hasScamIndicators;
  }

  // ===============================
  // DELAY FUNCTION
  // ===============================
  static delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ===============================
  // GET UNIQUE REPLY - NEVER REPEATS
  // ===============================
  static getUniqueReply(key, session) {
    const replies = REPLIES[key];
    if (!replies || replies.length === 0) {
      return "Mujhe samajh nahi aaya.";
    }
    
    // Get unused replies
    const available = replies.filter(r => !session.memory.usedReplies.has(r));
    
    if (available.length === 0) {
      // Reset if all used
      session.memory.usedReplies.clear();
      const fresh = replies[Math.floor(Math.random() * replies.length)];
      session.memory.usedReplies.add(fresh);
      return fresh;
    }
    
    const selected = available[Math.floor(Math.random() * available.length)];
    session.memory.usedReplies.add(selected);
    return selected;
  }

  // ===============================
  // GET REPLY WITH PARAMETER
  // ===============================
  static getParamReply(key, placeholder, value, session) {
    let reply = this.getUniqueReply(key, session);
    return reply.replace(new RegExp(placeholder.replace('{', '\\{').replace('}', '\\}'), 'g'), value);
  }
}