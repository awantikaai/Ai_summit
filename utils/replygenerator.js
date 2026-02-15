import { REPLIES } from "./replies.js";

export class ReplyGenerator {

  static generateReply(detected, session) {

    // Initialize memory tracking if not exists
    if (!session.memory) {
      session.memory = {
        // What we've asked
        askedName: false,
        askedPhone: false,
        askedCallBack: false,
        askedOTP: false,
        askedTransaction: false,
        askedAccount: false,
        askedUPI: false,
        askedEmployeeID: false,
        askedBranchCode: false,
        askedOfficialEmail: false,
        questionedOfficial: false,
        
        // What we've extracted
        extractedInfo: {
          scammerName: null,
          scammerPhone: null,
          scammerID: null,
          accountNumber: null,
          upiId: null,
          bankName: null
        },
        
        // What phase we're in
        currentPhase: 1, // 1:Confused, 2:Curious, 3:Extraction, 4:Authority, 5:Escalation, 6:Exit
        phaseCompleted: {
          phase1: false,
          phase2: false,
          phase3: false,
          phase4: false,
          phase5: false
        },
        
        // Threat tracking
        threatCount: 0,
        otpRequests: 0,
        
        // Topics to avoid repetition
        lastTopics: [],
        
        // Escalation flags
        authorityChallenged: false,
        cyberMentioned: false,
        branchMentioned: false
      };
    }

    // Update counters and track extracted info
    this.updateCountersAndExtract(detected, session);

    // ============ INTELLIGENT PHASE TRANSITION ============
    // Determine current phase based on extracted data and turn count
    this.determineCurrentPhase(session);

    // ============ PHASE-BASED RESPONSE GENERATION ============
    
    // PHASE 6: EXIT (Turns 9-10) - Clean shutdown
    if (session.memory.currentPhase >= 6 || session.turnCount >= 9) {
      session.memory.currentPhase = 6;
      return this.getPhase6ExitResponse(session);
    }
    
    // PHASE 5: ESCALATION (Turns 7-8) - Cyber cell, branch visit
    if (session.memory.currentPhase >= 5 || 
        (session.memory.threatCount >= 3 && session.memory.otpRequests >= 2) ||
        session.turnCount >= 7) {
      session.memory.currentPhase = 5;
      return this.getPhase5EscalationResponse(detected, session);
    }
    
    // PHASE 4: AUTHORITY CHALLENGE (Turns 5-6) - Employee ID, branch code
    if (session.memory.currentPhase >= 4 ||
        (session.memory.extractedInfo.accountNumber && session.memory.extractedInfo.scammerPhone) ||
        session.memory.otpRequests >= 2 ||
        session.turnCount >= 5) {
      session.memory.currentPhase = 4;
      return this.getPhase4AuthorityResponse(detected, session);
    }
    
    // PHASE 3: INTELLIGENCE EXTRACTION (Turns 3-4) - Get account, UPI, phone
    if (session.memory.currentPhase >= 3 || session.turnCount >= 3) {
      session.memory.currentPhase = 3;
      return this.getPhase3ExtractionResponse(detected, session);
    }
    
    // PHASE 2: CURIOSITY (Turn 2) - Ask basic questions
    if (session.memory.currentPhase >= 2 || session.turnCount >= 2) {
      session.memory.currentPhase = 2;
      return this.getPhase2CuriosityResponse(detected, session);
    }
    
    // PHASE 1: CONFUSION (Turn 1) - Initial shock
    return this.getPhase1ConfusionResponse(session);
  }

  // ===============================
  // PHASE 1: CONFUSION (Turn 1)
  // ===============================
  static getPhase1ConfusionResponse(session) {
    if (!session.memory.phaseCompleted.phase1) {
      session.memory.phaseCompleted.phase1 = true;
      session.memory.lastTopics.unshift('confused');
      return this.getReply("victim_confused", session);
    }
    return this.getReply("victim_confused", session);
  }

  // ===============================
  // PHASE 2: CURIOSITY (Turn 2)
  // ===============================
  static getPhase2CuriosityResponse(detected, session) {
    if (!session.memory.phaseCompleted.phase2) {
      session.memory.phaseCompleted.phase2 = true;
      
      // Ask about transaction first
      if (!session.memory.askedTransaction) {
        session.memory.askedTransaction = true;
        session.memory.lastTopics.unshift('transaction');
        return this.getReply("victim_worried", session);
      }
    }
    
    // Progressive curiosity based on what scammer said
    if (detected.hasThreat && !session.memory.askedWhyBlock) {
      session.memory.askedWhyBlock = true;
      return "Mera account block kyun ho raha hai? Maine kuch nahi kiya.";
    }
    
    return this.getReply("victim_worried", session);
  }

  // ===============================
  // PHASE 3: INTELLIGENCE EXTRACTION (Turns 3-4)
  // ===============================
  static getPhase3ExtractionResponse(detected, session) {
    
    // PRIORITY 1: Extract scammer's name
    if (!session.memory.askedName && !session.memory.extractedInfo.scammerName) {
      session.memory.askedName = true;
      session.memory.lastTopics.unshift('name');
      return this.getReply("ask_scammer_name", session);
    }
    
    // PRIORITY 2: Extract scammer's phone
    if (!session.memory.askedPhone && !session.memory.extractedInfo.scammerPhone) {
      session.memory.askedPhone = true;
      session.memory.lastTopics.unshift('phone');
      return this.getReply("ask_scammer_phone", session);
    }
    
    // PRIORITY 3: Extract account number
    if (detected.hasAccount && detected.accountNumber && !session.memory.extractedInfo.accountNumber) {
      session.memory.extractedInfo.accountNumber = detected.accountNumber;
      session.memory.lastTopics.unshift('account_shocked');
      return this.getReplyWithParam("account_shocked", "{account}", detected.accountNumber, session);
    }
    
    // PRIORITY 4: Extract UPI ID
    if (detected.hasUPI && detected.upiId && !session.memory.extractedInfo.upiId) {
      session.memory.extractedInfo.upiId = detected.upiId;
      session.memory.lastTopics.unshift('upi_confirm');
      return this.getReplyWithParam("upi_confirm", "{upi}", detected.upiId, session);
    }
    
    // PRIORITY 5: Handle phone numbers (with context)
    if (detected.hasPhone && detected.phoneNumber) {
      return this.handlePhoneNumber(detected.phoneNumber, session);
    }
    
    // If nothing else, ask for more details
    if (!session.memory.phaseCompleted.phase3) {
      session.memory.phaseCompleted.phase3 = true;
      return this.getReply("victim_asking", session);
    }
    
    return this.getReply("victim_asking", session);
  }

  // ===============================
  // PHASE 4: AUTHORITY CHALLENGE (Turns 5-6)
  // ===============================
  static getPhase4AuthorityResponse(detected, session) {
    
    // PRIORITY 1: Ask for employee ID
    if (!session.memory.askedEmployeeID) {
      session.memory.askedEmployeeID = true;
      session.memory.lastTopics.unshift('employee_id');
      return this.getReply("ask_employee_id", session);
    }
    
    // PRIORITY 2: Ask for branch code
    if (!session.memory.askedBranchCode) {
      session.memory.askedBranchCode = true;
      session.memory.lastTopics.unshift('branch_code');
      return this.getReply("ask_branch_code", session);
    }
    
    // PRIORITY 3: Question official number
    if (!session.memory.questionedOfficial) {
      session.memory.questionedOfficial = true;
      session.memory.lastTopics.unshift('official');
      return this.getReply("ask_official_number", session);
    }
    
    // PRIORITY 4: Ask for official email
    if (!session.memory.askedOfficialEmail) {
      session.memory.askedOfficialEmail = true;
      return "Aapka official email ID kya hai? Main domain check karunga.";
    }
    
    // If we've asked all authority questions, mark phase complete
    if (!session.memory.phaseCompleted.phase4) {
      session.memory.phaseCompleted.phase4 = true;
    }
    
    return this.getReply("authority_believe", session);
  }

  // ===============================
  // PHASE 5: ESCALATION (Turns 7-8)
  // ===============================
  static getPhase5EscalationResponse(detected, session) {
    
    // PRIORITY 1: Mention cyber cell
    if (!session.memory.cyberMentioned) {
      session.memory.cyberMentioned = true;
      session.memory.lastTopics.unshift('cyber');
      return this.getReply("cyber_threat", session);
    }
    
    // PRIORITY 2: Mention branch visit
    if (!session.memory.branchMentioned) {
      session.memory.branchMentioned = true;
      session.memory.lastTopics.unshift('branch');
      return this.getReply("branch_visit", session);
    }
    
    // PRIORITY 3: Mention toll-free verification
    if (!session.memory.tollfreeMentioned) {
      session.memory.tollfreeMentioned = true;
      return this.getReply("tollfree_curious", session);
    }
    
    // Mark phase complete
    if (!session.memory.phaseCompleted.phase5) {
      session.memory.phaseCompleted.phase5 = true;
    }
    
    return this.getReply("cyber_threat", session);
  }

  // ===============================
  // PHASE 6: EXIT (Turns 9-10)
  // ===============================
  static getPhase6ExitResponse(session) {
    const exitReplies = [
      "Main branch ja raha hoon aur wahan complaint register karunga.",
      "Main SBI ke official number 1800 425 3800 pe call kar raha hoon.",
      "Main cyber cell mein complaint file kar dunga. Aapka number note kar liya.",
      "Is conversation ko yahin end karte hain. Main official channel se verify karunga.",
      "Thank you for the information. Main SBI customer care se confirm kar lunga."
    ];
    
    const index = session.turnCount % exitReplies.length;
    return exitReplies[index];
  }

  // ===============================
  // Handle Phone Numbers with Context
  // ===============================
  static handlePhoneNumber(phoneNumber, session) {
    const lastMessage = session.lastScammerMessage?.toLowerCase() || '';
    const currentMessage = session.conversationHistory[session.conversationHistory.length - 1]?.text?.toLowerCase() || '';
    const fullContext = lastMessage + ' ' + currentMessage;

    // Check if this is about VICTIM'S phone
    const isVictimPhone = fullContext.includes('aapke') || fullContext.includes('aapka') ||
                          fullContext.includes('your') || fullContext.includes('तुम्हारे') ||
                          (fullContext.includes('otp') && fullContext.includes('number')) ||
                          fullContext.includes('इस नंबर पे') || fullContext.includes('aaya hai');

    // Check if this is about SCAMMER'S phone
    const isScammerPhone = fullContext.includes('mera') || fullContext.includes('my') ||
                           fullContext.includes('hamara') || fullContext.includes('call me') ||
                           fullContext.includes('mujhe call') || fullContext.includes('इस नंबर से');

    session.phoneMentionCount = (session.phoneMentionCount || 0) + 1;

    // SCENARIO 1: Victim's phone (OTP delivery)
    if (isVictimPhone && !session.memory.askedVictimPhone) {
      session.memory.askedVictimPhone = true;
      session.memory.lastTopics.unshift('phone_victim');
      return this.getReplyWithParam("phone_victim_confirm", "{phone}", phoneNumber, session);
    }
    
    // SCENARIO 2: Scammer's phone
    else if (isScammerPhone && !session.memory.extractedInfo.scammerPhone) {
      session.memory.extractedInfo.scammerPhone = phoneNumber;
      session.memory.lastTopics.unshift('phone_scammer');
      return this.getReplyWithParam("phone_scammer_curious", "{phone}", phoneNumber, session);
    }
    
    // SCENARIO 3: Already have scammer's phone, now question it
    else if (session.memory.extractedInfo.scammerPhone && session.phoneMentionCount > 1) {
      return this.getReplyWithParam("phone_scammer_compare", "{phone}", phoneNumber, session);
    }
    
    // SCENARIO 4: Ambiguous
    else {
      return this.getReplyWithParam("phone_ambiguous", "{phone}", phoneNumber, session);
    }
  }

  // ===============================
  // Update Counters and Extract Info
  // ===============================
  static updateCountersAndExtract(detected, session) {
    
    if (detected.hasThreat) {
      session.memory.threatCount = (session.memory.threatCount || 0) + 1;
    }

    if (detected.hasOTP) {
      session.memory.otpRequests = (session.memory.otpRequests || 0) + detected.otpRequestCount;
    }

    // Extract scammer name from message
    const lastMessage = session.lastScammerMessage || '';
    const nameMatch = lastMessage.match(/(?:mera naam|my name is|main|मेरा नाम)\s+([A-Za-z\s]+?)(?:\s+hai|\s+हूँ|\.|,|$)/i);
    if (nameMatch && nameMatch[1] && !session.memory.extractedInfo.scammerName) {
      session.memory.extractedInfo.scammerName = nameMatch[1].trim();
    }

    // Extract bank name
    if (detected.bankName && !session.memory.extractedInfo.bankName) {
      session.memory.extractedInfo.bankName = detected.bankName;
    }
  }

  // ===============================
  // Determine Current Phase Intelligently
  // ===============================
  static determineCurrentPhase(session) {
    
    // PHASE 6: EXIT - If we have enough intelligence
    if (session.memory.extractedInfo.accountNumber && 
        session.memory.extractedInfo.scammerPhone && 
        session.memory.otpRequests >= 3 &&
        session.turnCount >= 8) {
      session.memory.currentPhase = 6;
      return;
    }
    
    // PHASE 5: ESCALATION - If threats are high or we have key data
    if ((session.memory.threatCount >= 3 && session.memory.otpRequests >= 2) ||
        (session.memory.extractedInfo.accountNumber && session.memory.extractedInfo.scammerPhone) ||
        session.turnCount >= 7) {
      session.memory.currentPhase = Math.max(session.memory.currentPhase, 5);
      return;
    }
    
    // PHASE 4: AUTHORITY - If we have basic data
    if ((session.memory.extractedInfo.scammerName || session.memory.otpRequests >= 2) ||
        session.turnCount >= 5) {
      session.memory.currentPhase = Math.max(session.memory.currentPhase, 4);
      return;
    }
    
    // PHASE 3: EXTRACTION - After turn 3
    if (session.turnCount >= 3) {
      session.memory.currentPhase = Math.max(session.memory.currentPhase, 3);
      return;
    }
    
    // PHASE 2: CURIOSITY - After turn 2
    if (session.turnCount >= 2) {
      session.memory.currentPhase = Math.max(session.memory.currentPhase, 2);
    }
  }

  // ===============================
  // Deterministic Reply Selector
  // ===============================
  static getReply(key, session) {
    const replies = REPLIES[key];
    if (!replies || replies.length === 0) return this.getContextualFallback(session);

    const index = (session.turnCount + session.memory.otpRequests + session.memory.threatCount) % replies.length;
    return replies[index];
  }

  static getReplyWithParam(key, placeholder, value, session) {
    const reply = this.getReply(key, session);
    return reply.replace(new RegExp(placeholder.replace('{', '\\{').replace('}', '\\}'), 'g'), value);
  }

  static getContextualFallback(session) {
    const fallbacks = [
      "Mujhe samajh nahi aaya. Aap hi batao kya karna hai?",
      "Main confuse hoon. Thoda explain karo.",
      "Mera account safe hai na? Aap batao.",
      "Kya exact problem hai? Main tension mein hoon.",
      "Aap guide karo, main aapke bharose hoon."
    ];
    const index = session.turnCount % fallbacks.length;
    return fallbacks[index];
  }
}