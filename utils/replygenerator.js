import { REPLIES } from "./replies.js";

export class ReplyGenerator {

  static generateReply(detected, session) {

    // Update counters
    if (detected.hasThreat) {
      session.threatCount = (session.threatCount || 0) + 1;
    }

    if (detected.hasOTP) {
      session.otpRequests = (session.otpRequests || 0) + detected.otpRequestCount;
    }

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

    // ============ REPETITION DETECTION ============
    if (session.repetitionCount === 2)
      return "Aap same baat baar baar kyun bol rahe ho? Koi problem hai kya?";

    if (session.repetitionCount === 3)
      return "Mujhe aapki baat samajh aa rahi hai, par main confused hoon. Thoda explain karo.";

    if (session.repetitionCount >= 4)
      return "Aap baar baar yahi keh rahe ho. Kya aap sure ho? Mujhe kuch samajh nahi aa raha.";

    // ============ PHASE 1: CONFUSED VICTIM (Turns 1-2) ============
    if (session.turnCount === 1) return this.getReply("victim_confused", session);
    if (session.turnCount === 2) return this.getReply("victim_worried", session);

    // ============ PHASE 2: TRAPPED VICTIM (Turns 3-4) ============
    if (session.turnCount === 3) return this.getReply("victim_scared", session);
    if (session.turnCount === 4) return this.getReply("victim_asking", session);

    // ============ PHASE 3: EXTRACTION - ACTING TRAPPED (Turns 5-7) ============

    // Priority 1: Account extraction
    if (detected.hasAccount && detected.accountNumber && !session.accountQuestioned) {
      session.accountQuestioned = true;
      return this.getReplyWithParam("account_shocked", "{account}", detected.accountNumber, session);
    }
    if (detected.hasAccount && detected.accountNumber && session.accountQuestioned && !session.accountValidated) {
      session.accountValidated = true;
      return this.getReplyWithParam("account_verify", "{account}", detected.accountNumber, session);
    }

    // Priority 2: UPI extraction
    if (detected.hasUPI && detected.upiId && !session.upiQuestioned) {
      session.upiQuestioned = true;
      return this.getReplyWithParam("upi_confirm", "{upi}", detected.upiId, session);
    }

    if (detected.hasUPI && detected.upiId && session.upiQuestioned && session.upiMentionCount < 2) {
      session.upiMentionCount++;
      return this.getReplyWithParam("upi_scared", "{upi}", detected.upiId, session);
    }

    // ============ FIXED: PHONE NUMBER CONTEXT DETECTION ============
    if (detected.hasPhone && detected.phoneNumber) {
      session.phoneMentionCount = (session.phoneMentionCount || 0) + 1;

      // Get the last scammer message for context
      const lastMessage = session.lastScammerMessage?.toLowerCase() || '';
      const currentMessage = session.conversationHistory[session.conversationHistory.length - 1]?.text?.toLowerCase() || '';
      const fullContext = lastMessage + ' ' + currentMessage;
      
      console.log('🔍 Phone Context Analysis:', { 
        phone: detected.phoneNumber,
        message: currentMessage.substring(0, 50),
        context: fullContext.substring(0, 100)
      });

      // Check if this is about VICTIM'S phone (where OTP is sent)
      const isVictimPhone = 
        fullContext.includes('aapke') || 
        fullContext.includes('aapka') ||
        fullContext.includes('your') || 
        fullContext.includes('tumhare') || 
        fullContext.includes('तुम्हारे') ||
        fullContext.includes('आपके') ||
        fullContext.includes('आपका') ||
        (fullContext.includes('otp') && fullContext.includes('number')) ||
        (fullContext.includes('otp') && fullContext.includes('phone')) ||
        (fullContext.includes('code') && fullContext.includes('number')) ||
        fullContext.includes('is number pe') ||
        fullContext.includes('is number par') ||
        fullContext.includes('इस नंबर पे') ||
        fullContext.includes('इस नंबर पर') ||
        (fullContext.includes('check') && fullContext.includes('number')) ||
        fullContext.includes('aaya hai') ||
        fullContext.includes('आया है') ||
        fullContext.includes('मिला है');

      // Check if this is about SCAMMER'S phone (their own number)
      const isScammerPhone = 
        fullContext.includes('mera') || 
        fullContext.includes('my') || 
        fullContext.includes('hamara') || 
        fullContext.includes('हमारा') ||
        fullContext.includes('मेरा') ||
        fullContext.includes('this is my') ||
        fullContext.includes('yeh mera') ||
        fullContext.includes('यह मेरा') ||
        fullContext.includes('call me at') ||
        fullContext.includes('mujhe call karo') ||
        fullContext.includes('मुझे कॉल करो') ||
        fullContext.includes('is number se') ||
        fullContext.includes('इस नंबर से') ||
        fullContext.includes('official number') ||
        fullContext.includes('customer care') ||
        fullContext.includes('helpline') ||
        fullContext.includes('toll free');

      // Check if scammer is asking the VICTIM to call THEIR number
      const isCallRequest = 
        fullContext.includes('call me') ||
        fullContext.includes('mujhe call') ||
        fullContext.includes('मुझे कॉल') ||
        fullContext.includes('contact me') ||
        fullContext.includes('humse sampark') ||
        fullContext.includes('हमसे संपर्क') ||
        fullContext.includes('is number pe call') ||
        fullContext.includes('इस नंबर पे कॉल');

      console.log('📞 Phone Context Flags:', { 
        isVictimPhone, 
        isScammerPhone, 
        isCallRequest,
        mentionCount: session.phoneMentionCount 
      });

      // ==== SCENARIO 1: VICTIM'S PHONE (OTP delivery) ====
      if (isVictimPhone && !isScammerPhone) {
        console.log('✅ Detected: VICTIM\'S PHONE - OTP delivery');
        
        if (session.phoneMentionCount === 1)
          return this.getReplyWithParam("phone_victim_confirm", "{phone}", detected.phoneNumber, session);
        else
          return this.getReplyWithParam("phone_victim_wait", "{phone}", detected.phoneNumber, session);
      }
      
      // ==== SCENARIO 2: SCAMMER'S PHONE + CALL REQUEST ====
      else if (isScammerPhone || isCallRequest) {
        console.log('✅ Detected: SCAMMER\'S PHONE - Their own number');
        
        if (session.phoneMentionCount === 1)
          return this.getReplyWithParam("phone_scammer_curious", "{phone}", detected.phoneNumber, session);
        else if (session.phoneMentionCount === 2)
          return this.getReplyWithParam("phone_scammer_doubt", "{phone}", detected.phoneNumber, session);
        else
          return this.getReplyWithParam("phone_scammer_compare", "{phone}", detected.phoneNumber, session);
      }
      
      // ==== SCENARIO 3: AMBIGUOUS - Ask for clarification ====
      else {
        console.log('⚠️ Detected: AMBIGUOUS - Need clarification');
        
        if (session.phoneMentionCount === 1)
          return this.getReplyWithParam("phone_ambiguous_first", "{phone}", detected.phoneNumber, session);
        else
          return this.getReplyWithParam("phone_ambiguous_repeat", "{phone}", detected.phoneNumber, session);
      }
    }

    // Priority 4: Authority challenge
    if (detected.hasAuthority && !session.authorityChallenged) {
      session.authorityChallenged = true;
      return this.getReply("authority_believe", session);
    }

    // ============ PHASE 4: PROGRESSIVE OTP ============
    if (detected.hasOTP) {

      if (detected.hasResend)
        return this.getReply("otp_resend_scared", session);

      if (session.otpRequests === 1)
        return this.getReply("otp_first_trapped", session);

      if (session.otpRequests === 2)
        return this.getReply("otp_second_confused", session);

      if (session.otpRequests === 3)
        return this.getReply("otp_third_panicking", session);

      if (session.otpRequests === 4)
        return this.getReply("otp_fourth_almost", session);

      return this.getReply("otp_final_refuse", session);
    }

    // ============ OTHER DETECTIONS ============
    if (detected.hasPermanent)
      return this.getReply("permanent_scared", session);

    if (detected.hasFine)
      return this.getReply("fine_worried", session);

    if (detected.hasTollfree)
      return this.getReply("tollfree_curious", session);

    if (detected.hasBranch)
      return this.getReply("branch_visit", session);

    if (detected.hasFamily)
      return this.getReply("family_worried", session);

    if (detected.hasCyber) {
      session.lockToExit = true;
      return this.getReply("cyber_threat", session);
    }

    if (detected.hasLink)
      return this.getReply("link_curious", session);

    if (detected.hasFakeOffer)
      return this.getReply("offer_tempted", session);

    // ============ POLICY (Turn 5) ============
    if (session.turnCount === 5) return this.getReply("policy_confused", session);

    // ============ FALLBACK ============
    return this.getReply("fallback_scared", session);
  }

  // ===============================
  // Deterministic Reply Selector
  // ===============================
  static getReply(key, session) {
    const replies = REPLIES[key];
    if (!replies || replies.length === 0) return "Mujhe samajh nahi aaya, aap hi batao kya karna hai?";

    const index = (session.turnCount + session.otpRequests + session.threatCount + session.repetitionCount) % replies.length;
    return replies[index];
  }

  static getReplyWithParam(key, placeholder, value, session) {
    const reply = this.getReply(key, session);
    return reply.replace(new RegExp(placeholder.replace('{', '\\{').replace('}', '\\}'), 'g'), value);
  }
}