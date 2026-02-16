// utils/trapReplyGenerator.js
import { REPLIES } from "./replies.js";

export class ReplyGenerator {

  static async generateReply(detected, session, messageText) {
    
    // ============ INITIALIZE SESSION MEMORY ============
    this.initializeMemory(session);
    
    // ============ 10 SECOND DELAY (Evaluation) ============
    await this.delay(10000);
    
    // ============ UPDATE SESSION WITH EXTRACTED SCAMMER INFO ============
    const extractedInfo = this.updateExtractedInfo(detected, session, messageText);
    
    // ============ DETECT SCAM TYPE ============
    const scamType = this.detectScamType(detected);
    
    console.log(`\n🎯 Turn ${session.turnCount + 1}/8 | Scam: ${scamType}`);
    if (extractedInfo) console.log(`📥 Extracted: ${extractedInfo}`);
    
    // ============ IF SCAMMER JUST SHARED INFO, RESPOND APPROPRIATELY ============
    if (extractedInfo) {
      return this.getExtractedInfoResponse(extractedInfo, session);
    }
    
    // ============ TURN-BASED RESPONSES (1-8) ============
    
    // TURN 1: Fall for the trap (excited)
    if (session.turnCount === 0) {
      return this.getTurn1Response(scamType, session);
    }
    
    // TURN 2: Ask for scammer's name
    if (session.turnCount === 1) {
      session.memory.asked.name = true;
      return this.getReply("ask_name", session);
    }
    
    // TURN 3: Ask for scammer's phone
    if (session.turnCount === 2) {
      session.memory.asked.phone = true;
      return this.getReply("ask_phone", session);
    }
    
    // TURN 4: Ask for scammer's email/ID
    if (session.turnCount === 3) {
      if (scamType === 'bank' || detected.hasEmployeeID || detected.hasAuthority) {
        session.memory.asked.employeeID = true;
        return this.getReply("ask_employee_id", session);
      } else {
        session.memory.asked.email = true;
        return this.getReply("ask_email", session);
      }
    }
    
    // TURN 5: Act confused, ask for verification
    if (session.turnCount === 4) {
      return this.getReply("confused_verify", session);
    }
    
    // TURN 6: Ask for branch/department
    if (session.turnCount === 5) {
      if (scamType === 'bank') {
        return this.getReply("ask_branch", session);
      } else {
        return this.getReply("ask_department", session);
      }
    }
    
    // TURN 7: Pretend to cooperate, ask one more detail
    if (session.turnCount === 6) {
      if (detected.hasUPI) {
        return this.getReply("cooperate_ask_upi", session);
      } else if (detected.hasAccount) {
        return this.getReply("cooperate_ask_account", session);
      } else if (detected.hasThreat || detected.hasUrgency) {
        return this.getReply("cooperate_ask_reference", session);
      } else {
        return this.getReply("cooperate_ask_reference", session);
      }
    }
    
    // TURN 8: Exit gracefully
    if (session.turnCount === 7) {
      // Log all extracted info before exiting
      this.logExtractedInfo(session);
      
      // Return exit response
      return this.getExitResponse(scamType, session);
    }
    
    // Fallback (should never reach here with 8-turn limit)
    return this.getReply("fallback", session);
  }

  // ===============================
  // INITIALIZATION
  // ===============================
  static initializeMemory(session) {
    if (!session.memory) {
      session.memory = {
        // Scammer details we've extracted
        scammer: {
          name: null,
          phone: null,
          email: null,
          employeeID: null,
          department: null,
          branch: null,
          upiID: null,
          account: null,
          reference: null
        },
        
        // What we've asked
        asked: {
          name: false,
          phone: false,
          email: false,
          employeeID: false,
          department: false,
          branch: false,
          upiID: false,
          account: false,
          reference: false
        },
        
        // Track used replies to avoid repetition
        usedReplies: {},
        
        // Scam context
        scamType: null,
        otpCount: 0
      };
    }
    
    // Initialize usedReplies for each key if not exists
    if (!session.memory.usedReplies) {
      session.memory.usedReplies = {};
    }
  }

  // ===============================
  // UPDATE EXTRACTED INFO (RETURNS WHAT WAS EXTRACTED)
  // ===============================
  static updateExtractedInfo(detected, session, messageText) {
    const memory = session.memory;
    let extracted = null;
    
    // Check for name in message
    if (detected.extractedName && !memory.scammer.name) {
      memory.scammer.name = detected.extractedName;
      extracted = `name: ${detected.extractedName}`;
    }
    
    // Check for phone
    if (detected.phoneNumber && !memory.scammer.phone) {
      memory.scammer.phone = detected.phoneNumber;
      extracted = `phone: ${detected.phoneNumber}`;
    }
    
    // Check for email
    if (detected.extractedEmail && !memory.scammer.email) {
      memory.scammer.email = detected.extractedEmail;
      extracted = `email: ${detected.extractedEmail}`;
    }
    
    // Check for employee ID
    if (detected.hasEmployeeID && !memory.scammer.employeeID) {
      const empIdMatch = messageText.match(/\b([A-Z0-9]{4,10})\b/i);
      if (empIdMatch) {
        memory.scammer.employeeID = empIdMatch[1];
        extracted = `employee ID: ${empIdMatch[1]}`;
      }
    }
    
    // Check for UPI
    if (detected.upiId && !memory.scammer.upiID) {
      memory.scammer.upiID = detected.upiId;
      extracted = `UPI: ${detected.upiId}`;
    }
    
    // Check for account
    if (detected.accountNumber && !memory.scammer.account) {
      memory.scammer.account = detected.accountNumber;
      extracted = `account: ${detected.accountNumber}`;
    }
    
    // Check for branch (from context)
    if (!memory.scammer.branch) {
      const branchMatch = messageText.match(/(?:branch|शाखा).{0,10}([A-Za-z\s]{3,20})/i);
      if (branchMatch) {
        memory.scammer.branch = branchMatch[1].trim();
        extracted = `branch: ${branchMatch[1].trim()}`;
      }
    }
    
    // Track OTP requests
    if (detected.hasOTP) {
      memory.otpCount++;
    }
    
    return extracted;
  }

  // ===============================
  // DETECT SCAM TYPE
  // ===============================
  static detectScamType(detected) {
    if (detected.hasBank || detected.hasAccount) return 'bank';
    if (detected.hasUPI) return 'upi';
    if (detected.hasLink) return 'phishing';
    if (detected.hasFakeOffer || detected.hasLottery) return 'lottery';
    if (detected.hasInvestment) return 'investment';
    if (detected.hasJob) return 'job';
    if (detected.hasLoan) return 'loan';
    if (detected.hasKYC) return 'kyc';
    return 'generic';
  }

  // ===============================
  // RESPOND TO EXTRACTED INFO
  // ===============================
  static getExtractedInfoResponse(infoType, session) {
    const scammer = session.memory.scammer;
    
    if (infoType.includes('name') && scammer.name) {
      return this.getReplyWithParam("scammer_name_provided", "{name}", scammer.name, session);
    }
    
    if (infoType.includes('phone') && scammer.phone) {
      return this.getReplyWithParam("scammer_phone_provided", "{phone}", scammer.phone, session);
    }
    
    if (infoType.includes('email') && scammer.email) {
      return this.getReplyWithParam("scammer_email_provided", "{email}", scammer.email, session);
    }
    
    if (infoType.includes('employee') && scammer.employeeID) {
      return this.getReplyWithParam("scammer_employee_id_provided", "{empId}", scammer.employeeID, session);
    }
    
    if (infoType.includes('branch') && scammer.branch) {
      return this.getReplyWithParam("scammer_branch_provided", "{branch}", scammer.branch, session);
    }
    
    return null;
  }

  // ===============================
  // TURN 1 RESPONSE
  // ===============================
  static getTurn1Response(scamType, session) {
    switch(scamType) {
      case 'bank': return this.getReply("turn1_bank", session);
      case 'upi': return this.getReply("turn1_bank", session); // UPI scams often use bank pretext
      case 'lottery': return this.getReply("turn1_lottery", session);
      case 'investment': return this.getReply("turn1_investment", session);
      case 'job': return this.getReply("turn1_job", session);
      case 'loan': return this.getReply("turn1_loan", session);
      case 'kyc': return this.getReply("turn1_kyc", session);
      case 'phishing': return this.getReply("turn1_phishing", session);
      default: return this.getReply("turn1_bank", session);
    }
  }

  // ===============================
  // EXIT RESPONSE
  // ===============================
  static getExitResponse(scamType, session) {
    const scammer = session.memory.scammer;
    
    // If we have scammer's phone, use it in exit
    if (scammer.phone) {
      return `Main abhi ${scammer.phone} pe call kar ke confirm kar leta hoon. Phir baat karte hain.`;
    }
    
    // If we have scammer's email, use it
    if (scammer.email) {
      return `Main aapko ${scammer.email} pe email bhej dunga details. Phir aap confirm karo.`;
    }
    
    // Scam-type specific exits
    switch(scamType) {
      case 'bank': return this.getReply("exit_bank", session);
      case 'lottery': return this.getReply("exit_lottery", session);
      case 'investment': return this.getReply("exit_investment", session);
      case 'job': return this.getReply("exit_job", session);
      case 'loan': return this.getReply("exit_loan", session);
      case 'kyc': return this.getReply("exit_kyc", session);
      case 'phishing': return this.getReply("exit_phishing", session);
      default: return this.getReply("exit_generic", session);
    }
  }

  // ===============================
  // GET UNIQUE REPLY (No repeats within a session)
  // ===============================
  static getReply(key, session) {
    const replies = REPLIES[key];
    if (!replies || replies.length === 0) {
      return REPLIES.fallback[0];
    }
    
    // Initialize used replies for this key
    if (!session.memory.usedReplies[key]) {
      session.memory.usedReplies[key] = [];
    }
    
    // Find unused replies
    const available = replies.filter(r => !session.memory.usedReplies[key].includes(r));
    
    // If all used, reset and use first (should not happen with 8 turns)
    if (available.length === 0) {
      session.memory.usedReplies[key] = [];
      const selected = replies[0];
      session.memory.usedReplies[key].push(selected);
      return selected;
    }
    
    // Pick random from available
    const selected = available[Math.floor(Math.random() * available.length)];
    session.memory.usedReplies[key].push(selected);
    return selected;
  }

  // ===============================
  // GET REPLY WITH PARAMETER
  // ===============================
  static getReplyWithParam(key, placeholder, value, session) {
    const reply = this.getReply(key, session);
    return reply.replace(placeholder, value);
  }

  // ===============================
  // LOG EXTRACTED INFO
  // ===============================
  static logExtractedInfo(session) {
    const scammer = session.memory.scammer;
    
    console.log("\n" + "=".repeat(60));
    console.log("📊 EXTRACTED SCAMMER INTELLIGENCE - READY FOR CALLBACK");
    console.log("=".repeat(60));
    console.log(`👤 Name        : ${scammer.name || '❌ Not provided'}`);
    console.log(`📞 Phone       : ${scammer.phone || '❌ Not provided'}`);
    console.log(`📧 Email       : ${scammer.email || '❌ Not provided'}`);
    console.log(`🆔 Employee ID : ${scammer.employeeID || '❌ Not provided'}`);
    console.log(`🏢 Department  : ${scammer.department || '❌ Not provided'}`);
    console.log(`📍 Branch      : ${scammer.branch || '❌ Not provided'}`);
    console.log(`💳 UPI ID      : ${scammer.upiID || '❌ Not provided'}`);
    console.log(`💰 Account     : ${scammer.account || '❌ Not provided'}`);
    console.log(`🔢 Reference   : ${scammer.reference || '❌ Not provided'}`);
    console.log("=".repeat(60));
    
    // Count extracted items
    const extractedCount = [
      scammer.name, scammer.phone, scammer.email, scammer.employeeID,
      scammer.department, scammer.branch, scammer.upiID, scammer.account
    ].filter(Boolean).length;
    
    console.log(`✅ Total ${extractedCount} scammer details extracted in ${session.turnCount + 1} turns`);
    console.log("=".repeat(60));
  }

  // ===============================
  // SHOULD END SESSION (Callback trigger)
  // ===============================
  static shouldEndSession(session) {
    // End after 8 turns (0-indexed, so 7 = 8th message)
    if (session.turnCount >= 7) {
      console.log(`✅ Session complete (${session.turnCount + 1} turns) - triggering callback`);
      return true;
    }
    return false;
  }

  // ===============================
  // DELAY FUNCTION
  // ===============================
  static delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}