import { REPLIES } from "./replies.js";

export class ReplyGenerator {

  static generateReply(detected, session) {

    // Initialize memory tracking if not exists
    if (!session.memory) {
      session.memory = {
        askedName: false,
        askedPhone: false,
        askedCallBack: false,
        askedOTP: false,
        askedTransaction: false,
        askedAccount: false,
        askedUPI: false,
        questionedOfficial: false,
        threatened: false,
        lastTopics: [],
        extractedInfo: {
          scammerName: null,
          scammerPhone: null,
          scammerID: null,
          accountNumber: null,
          upiId: null
        }
      };
    }

    // Update counters
    if (detected.hasThreat) {
      session.threatCount = (session.threatCount || 0) + 1;
      session.memory.threatened = true;
    }

    if (detected.hasOTP) {
      session.otpRequests = (session.otpRequests || 0) + detected.otpRequestCount;
      session.memory.askedOTP = true;
    }

    // Track extracted info from scammer messages
    this.trackExtractedInfo(detected, session);

    // ============ LOCK TO EXIT - OPTIMIZED FOR 10 TURNS ============
    if (!session.lockToExit) {
      const shouldLock =
        session.pressureScore >= 3 &&
        session.otpRequests >= 3 &&
        session.threatCount >= 2 &&
        session.turnCount >= 7;

      if (shouldLock) {
        session.lockToExit = true;
        session.emotionLevel = 5;
      }
    }

    // ============ LOCK MODE - EXIT PHASE (Turns 8-10) ============
    if (session.lockToExit) {
      if (session.turnCount >= 8) {
        if (session.turnCount === 8) return this.getReply("branch_visit", session);
        if (session.turnCount === 9) return this.getReply("cyber_complaint", session);
        if (session.turnCount >= 10) return this.getReply("final_goodbye", session);
      }
      
      if (detected.hasCyber) return this.getReply("cyber_threat", session);
      return this.getReply("branch_visit", session);
    }

    // ============ REPETITION DETECTION - Progressive ============
    if (session.repetitionCount === 2)
      return this.getContextualReply("repetition_mild", session);

    if (session.repetitionCount === 3)
      return this.getContextualReply("repetition_annoyed", session);

    if (session.repetitionCount >= 4)
      return this.getContextualReply("repetition_frustrated", session);

    // ============ TRACK TOPIC TO AVOID REPETITION ============
    const lastTopic = session.memory.lastTopics[0] || '';
    
    // ============ PHASE 1: CONFUSED VICTIM (Turns 1-2) ============
    if (session.turnCount === 1) {
      session.memory.lastTopics.unshift('confused');
      return this.getReply("victim_confused", session);
    }
    
    if (session.turnCount === 2) {
      // Only ask transaction if not already asked
      if (!session.memory.askedTransaction) {
        session.memory.askedTransaction = true;
        session.memory.lastTopics.unshift('transaction');
        return this.getReply("victim_worried", session);
      }
      session.memory.lastTopics.unshift('confused');
      return this.getReply("victim_confused", session);
    }

    // ============ PHASE 2: INFORMATION GATHERING (Turns 3-4) ============
    if (session.turnCount === 3) {
      // Ask for name if not already asked
      if (!session.memory.askedName && !session.memory.extractedInfo.scammerName) {
        session.memory.askedName = true;
        session.memory.lastTopics.unshift('name');
        return this.getReply("ask_scammer_name", session);
      }
      // Ask for phone if not already asked
      else if (!session.memory.askedPhone && !session.memory.extractedInfo.scammerPhone) {
        session.memory.askedPhone = true;
        session.memory.lastTopics.unshift('phone');
        return this.getReply("ask_scammer_phone", session);
      }
      else {
        session.memory.lastTopics.unshift('scared');
        return this.getReply("victim_scared", session);
      }
    }
    
    if (session.turnCount === 4) {
      // Ask for employee ID if not already asked
      if (!session.memory.askedID && !session.memory.extractedInfo.scammerID) {
        session.memory.askedID = true;
        session.memory.lastTopics.unshift('employee_id');
        return this.getReply("ask_employee_id", session);
      }
      // Ask for official verification
      else if (!session.memory.questionedOfficial) {
        session.memory.questionedOfficial = true;
        session.memory.lastTopics.unshift('official');
        return this.getReply("ask_official_number", session);
      }
      else {
        session.memory.lastTopics.unshift('asking');
        return this.getReply("victim_asking", session);
      }
    }

    // ============ PHASE 3: EXTRACTION - Avoid repetition ============

    // Check if we already have account number - don't ask again
    if (detected.hasAccount && detected.accountNumber && !session.memory.extractedInfo.accountNumber) {
      session.memory.extractedInfo.accountNumber = detected.accountNumber;
      
      if (!session.memory.accountQuestioned) {
        session.memory.accountQuestioned = true;
        session.memory.lastTopics.unshift('account_shocked');
        return this.getReplyWithParam("account_shocked", "{account}", detected.accountNumber, session);
      }
      else if (!session.memory.accountValidated) {
        session.memory.accountValidated = true;
        session.memory.lastTopics.unshift('account_verify');
        return this.getReplyWithParam("account_verify", "{account}", detected.accountNumber, session);
      }
    }

    // Check if we already have UPI ID - don't ask again
    if (detected.hasUPI && detected.upiId && !session.memory.extractedInfo.upiId) {
      session.memory.extractedInfo.upiId = detected.upiId;
      
      if (!session.memory.upiQuestioned) {
        session.memory.upiQuestioned = true;
        session.memory.lastTopics.unshift('upi_confirm');
        return this.getReplyWithParam("upi_confirm", "{upi}", detected.upiId, session);
      }
      else if (session.memory.upiMentionCount < 2) {
        session.memory.upiMentionCount = (session.memory.upiMentionCount || 0) + 1;
        session.memory.lastTopics.unshift('upi_scared');
        return this.getReplyWithParam("upi_scared", "{upi}", detected.upiId, session);
      }
    }

    // ============ PHONE NUMBER CONTEXT DETECTION - WITH MEMORY ============
    if (detected.hasPhone && detected.phoneNumber) {
      session.phoneMentionCount = (session.phoneMentionCount || 0) + 1;

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

      // Don't ask the same thing repeatedly
      const lastTopic = session.memory.lastTopics[0];

      if (isVictimPhone && !session.memory.askedVictimPhone) {
        session.memory.askedVictimPhone = true;
        session.memory.lastTopics.unshift('phone_victim');
        return this.getReplyWithParam("phone_victim_confirm", "{phone}", detected.phoneNumber, session);
      }
      else if (isScammerPhone && !session.memory.askedScammerPhone) {
        session.memory.askedScammerPhone = true;
        session.memory.extractedInfo.scammerPhone = detected.phoneNumber;
        session.memory.lastTopics.unshift('phone_scammer');
        return this.getReplyWithParam("phone_scammer_curious", "{phone}", detected.phoneNumber, session);
      }
      else if (!session.memory.askedPhoneClarification && session.phoneMentionCount > 1) {
        session.memory.askedPhoneClarification = true;
        session.memory.lastTopics.unshift('phone_ambiguous');
        return this.getReplyWithParam("phone_ambiguous", "{phone}", detected.phoneNumber, session);
      }
    }

    // ============ AUTHORITY CHALLENGE - Only once ============
    if (detected.hasAuthority && !session.memory.authorityChallenged) {
      session.memory.authorityChallenged = true;
      session.memory.lastTopics.unshift('authority');
      return this.getReply("authority_believe", session);
    }

    // ============ PROGRESSIVE OTP - With memory ============
    if (detected.hasOTP) {

      if (detected.hasResend) {
        if (!session.memory.askedResend) {
          session.memory.askedResend = true;
          return this.getReply("otp_resend_scared", session);
        }
        return this.getReply("otp_resend_again", session);
      }

      if (session.otpRequests === 1 && !session.memory.askedOTP1) {
        session.memory.askedOTP1 = true;
        session.memory.lastTopics.unshift('otp1');
        return this.getReply("otp_first_trapped", session);
      }
      else if (session.otpRequests === 2 && !session.memory.askedOTP2) {
        session.memory.askedOTP2 = true;
        session.memory.lastTopics.unshift('otp2');
        return this.getReply("otp_second_confused", session);
      }
      else if (session.otpRequests === 3 && !session.memory.askedOTP3) {
        session.memory.askedOTP3 = true;
        session.memory.lastTopics.unshift('otp3');
        return this.getReply("otp_third_panicking", session);
      }
      else if (session.otpRequests === 4 && !session.memory.askedOTP4) {
        session.memory.askedOTP4 = true;
        session.memory.lastTopics.unshift('otp4');
        return this.getReply("otp_fourth_almost", session);
      }
      else if (session.otpRequests >= 5 && !session.memory.askedOTP5) {
        session.memory.askedOTP5 = true;
        return this.getReply("otp_final_refuse", session);
      }
    }

    // ============ THREATS - Progressive response ============
    if (detected.hasPermanent && !session.memory.askedPermanent) {
      session.memory.askedPermanent = true;
      return this.getReply("permanent_scared", session);
    }

    if (detected.hasFine && !session.memory.askedFine) {
      session.memory.askedFine = true;
      return this.getReply("fine_worried", session);
    }

    // ============ LINK & OFFER ============
    if (detected.hasLink && !session.memory.askedLink) {
      session.memory.askedLink = true;
      return this.getReply("link_curious", session);
    }

    if (detected.hasFakeOffer && !session.memory.askedOffer) {
      session.memory.askedOffer = true;
      return this.getReply("offer_tempted", session);
    }

    // ============ PROGRESSIVE CONVERSATION - No repetition ============
    const askedTopics = Object.values(session.memory).filter(v => v === true).length;
    
    if (session.turnCount === 5 && !session.memory.askedPolicy) {
      session.memory.askedPolicy = true;
      return this.getReply("policy_confused", session);
    }
    else if (session.turnCount === 6 && !session.memory.askedFamily) {
      session.memory.askedFamily = true;
      return this.getReply("family_worried", session);
    }
    else if (session.turnCount === 7 && !session.memory.askedTollfree) {
      session.memory.askedTollfree = true;
      return this.getReply("tollfree_curious", session);
    }

    // ============ FALLBACK - Use context to avoid repetition ============
    return this.getContextualFallback(session);
  }

  // ===============================
  // Track extracted information
  // ===============================
  static trackExtractedInfo(detected, session) {
    if (detected.employeeId && !session.memory.extractedInfo.scammerID) {
      session.memory.extractedInfo.scammerID = detected.employeeId;
    }
    
    // Look for name in message
    const lastMessage = session.lastScammerMessage || '';
    const nameMatch = lastMessage.match(/(?:mera naam|my name is|main|मेरा नाम)\s+([A-Za-z\s]+?)(?:\s+hai|\s+हूँ|\.|,|$)/i);
    if (nameMatch && nameMatch[1] && !session.memory.extractedInfo.scammerName) {
      session.memory.extractedInfo.scammerName = nameMatch[1].trim();
    }
  }

  // ===============================
  // Contextual reply selector
  // ===============================
  static getContextualReply(key, session) {
    const replies = REPLIES[key];
    if (!replies || replies.length === 0) return this.getContextualFallback(session);

    // Use different index based on context
    const index = (session.turnCount + session.repetitionCount) % replies.length;
    return replies[index];
  }

  // ===============================
  // Contextual fallback - never repeats
  // ===============================
  static getContextualFallback(session) {
    const fallbacks = [
      "Mujhe samajh nahi aaya. Aap hi batao kya karna hai?",
      "Main confuse hoon. Thoda explain karo.",
      "Mera account safe hai na? Aap batao.",
      "Kya exact problem hai? Main tension mein hoon.",
      "Aap guide karo, main aapke bharose hoon."
    ];
    
    // Rotate through fallbacks based on turn count
    const index = session.turnCount % fallbacks.length;
    return fallbacks[index];
  }

  // ===============================
  // Deterministic Reply Selector
  // ===============================
  static getReply(key, session) {
    const replies = REPLIES[key];
    if (!replies || replies.length === 0) return this.getContextualFallback(session);

    const index = (session.turnCount + session.otpRequests + session.threatCount + session.repetitionCount) % replies.length;
    return replies[index];
  }

  static getReplyWithParam(key, placeholder, value, session) {
    const reply = this.getReply(key, session);
    return reply.replace(new RegExp(placeholder.replace('{', '\\{').replace('}', '\\}'), 'g'), value);
  }
}