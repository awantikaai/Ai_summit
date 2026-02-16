import { REPLIES } from "./replies.js";

export class ReplyGenerator {

  static generateReply(detected, session) {
    
    // ============ UPDATE COUNTERS ============
    if (detected.hasThreat) {
      session.threatCount = (session.threatCount || 0) + 1;
    }

    if (detected.hasOTP) {
      session.otpRequests = (session.otpRequests || 0) + detected.otpRequestCount;
    }

    // ============ INITIALIZE SCAM-SPECIFIC STATE ============
    if (!session.scamState) {
      session.scamState = {};
    }

    // ============ LOCK TO EXIT LOGIC ============
    if (!session.lockToExit) {
      const shouldLock =
        session.pressureScore >= 4 &&
        session.otpRequests >= 4 &&
        session.threatCount >= 3 &&
        session.turnCount >= 12;

      if (shouldLock) {
        session.lockToExit = true;
        session.emotionLevel = 5;
      }
    }

    if (session.lockToExit) {
      if (session.turnCount >= 15)
        return this.getReply("exit", session);

      if (detected.hasCyber)
        return this.getReply("cyber", session);

      return this.getReply("branch", session);
    }

    // ============ REPETITION DETECTION ============
    if (session.repetitionCount === 2)
      return "Aap same message copy paste kar rahe ho kya?";

    if (session.repetitionCount === 3)
      return "Har baar same line bol rahe ho. Kya aap automated ho?";

    if (session.repetitionCount >= 4)
      return "Lag raha hai aap script padh rahe ho. Case reference number generate hua hai kya?";

    // ============ NEW: LOTTERY SCAM ============
    if (detected.hasLottery || detected.hasFakeOffer) {
      if (!session.scamState.lotteryAsked) {
        session.scamState.lotteryAsked = true;
        session.scamState.lotteryStage = 0;
        return this.getReply("lottery_initial", session);
      }
      
      session.scamState.lotteryStage = (session.scamState.lotteryStage || 0) + 1;
      
      if (session.scamState.lotteryStage === 1) return this.getReply("lottery_first", session);
      if (session.scamState.lotteryStage === 2) return this.getReply("lottery_second", session);
      if (session.scamState.lotteryStage === 3) return this.getReply("lottery_third", session);
      if (session.scamState.lotteryStage >= 4) return this.getReply("lottery_gift", session);
    }

    // ============ NEW: INVESTMENT SCAM ============
    if (detected.hasInvestment) {
      if (!session.scamState.investmentAsked) {
        session.scamState.investmentAsked = true;
        session.scamState.investmentStage = 0;
        return this.getReply("investment_initial", session);
      }
      
      session.scamState.investmentStage = (session.scamState.investmentStage || 0) + 1;
      
      if (session.scamState.investmentStage === 1) return this.getReply("investment_first", session);
      if (session.scamState.investmentStage === 2) return this.getReply("investment_second", session);
      if (session.scamState.investmentStage === 3) return this.getReply("investment_third", session);
      if (session.scamState.investmentStage === 4) return this.getReply("investment_profit", session);
      if (session.scamState.investmentStage >= 5) return this.getReply("investment_referral", session);
    }

    // ============ NEW: JOB SCAM ============
    if (detected.hasJob) {
      if (!session.scamState.jobAsked) {
        session.scamState.jobAsked = true;
        session.scamState.jobStage = 0;
        return this.getReply("job_initial", session);
      }
      
      session.scamState.jobStage = (session.scamState.jobStage || 0) + 1;
      
      if (session.scamState.jobStage === 1) return this.getReply("job_first", session);
      if (session.scamState.jobStage === 2) return this.getReply("job_second", session);
      if (session.scamState.jobStage === 3) return this.getReply("job_third", session);
      if (session.scamState.jobStage >= 4) return this.getReply("job_fee_question", session);
    }

    // ============ NEW: LOAN SCAM ============
    if (detected.hasLoan) {
      if (!session.scamState.loanAsked) {
        session.scamState.loanAsked = true;
        session.scamState.loanStage = 0;
        return this.getReply("loan_initial", session);
      }
      
      session.scamState.loanStage = (session.scamState.loanStage || 0) + 1;
      
      if (session.scamState.loanStage === 1) return this.getReply("loan_first", session);
      if (session.scamState.loanStage === 2) return this.getReply("loan_second", session);
      if (session.scamState.loanStage === 3) return this.getReply("loan_third", session);
      if (session.scamState.loanStage >= 4) return this.getReply("loan_advance_fee", session);
    }

    // ============ NEW: KYC SCAM ============
    if (detected.hasKYC) {
      if (!session.scamState.kycAsked) {
        session.scamState.kycAsked = true;
        session.scamState.kycStage = 0;
        return this.getReply("kyc_initial", session);
      }
      
      session.scamState.kycStage = (session.scamState.kycStage || 0) + 1;
      
      if (session.scamState.kycStage === 1) return this.getReply("kyc_first", session);
      if (session.scamState.kycStage === 2) return this.getReply("kyc_second", session);
      if (session.scamState.kycStage === 3) return this.getReply("kyc_third", session);
    }

    // ============ NEW: TECH SUPPORT SCAM ============
    if (detected.hasVirus || detected.hasTechnician) {
      if (!session.scamState.techAsked) {
        session.scamState.techAsked = true;
        session.scamState.techStage = 0;
        return this.getReply("tech_initial", session);
      }
      
      session.scamState.techStage = (session.scamState.techStage || 0) + 1;
      
      if (session.scamState.techStage === 1) return this.getReply("tech_first", session);
      if (session.scamState.techStage === 2) return this.getReply("tech_second", session);
      if (session.scamState.techStage === 3) return this.getReply("tech_third", session);
      if (session.scamState.techStage >= 4) return this.getReply("tech_remote", session);
    }

    // ============ NEW: CRYPTO SCAM ============
    if (detected.hasCrypto) {
      if (!session.scamState.cryptoAsked) {
        session.scamState.cryptoAsked = true;
        session.scamState.cryptoStage = 0;
        return this.getReply("crypto_initial", session);
      }
      
      session.scamState.cryptoStage = (session.scamState.cryptoStage || 0) + 1;
      
      if (session.scamState.cryptoStage === 1) return this.getReply("crypto_first", session);
      if (session.scamState.cryptoStage === 2) return this.getReply("crypto_second", session);
      if (session.scamState.cryptoStage === 3) return this.getReply("crypto_third", session);
    }

    // ============ NEW: GIFT CARD SCAM ============
    if (detected.hasGiftCard) {
      if (!session.scamState.giftcardAsked) {
        session.scamState.giftcardAsked = true;
        session.scamState.giftcardStage = 0;
        return this.getReply("giftcard_initial", session);
      }
      
      session.scamState.giftcardStage = (session.scamState.giftcardStage || 0) + 1;
      
      if (session.scamState.giftcardStage === 1) return this.getReply("giftcard_first", session);
      if (session.scamState.giftcardStage === 2) return this.getReply("giftcard_second", session);
      if (session.scamState.giftcardStage === 3) return this.getReply("giftcard_third", session);
    }

    // ============ NEW: REFUND SCAM ============
    if (detected.hasRefund) {
      if (!session.scamState.refundAsked) {
        session.scamState.refundAsked = true;
        session.scamState.refundStage = 0;
        return this.getReply("refund_initial", session);
      }
      
      session.scamState.refundStage = (session.scamState.refundStage || 0) + 1;
      
      if (session.scamState.refundStage === 1) return this.getReply("refund_first", session);
      if (session.scamState.refundStage === 2) return this.getReply("refund_second", session);
      if (session.scamState.refundStage === 3) return this.getReply("refund_third", session);
    }

    // ============ NEW: EMAIL SCAM ============
    if (detected.hasEmail && !session.scamState.emailAsked) {
      session.scamState.emailAsked = true;
      return this.getReply("email_send_request", session);
    }
    
    if (detected.extractedEmail && !session.scamState.emailProvided) {
      session.scamState.emailProvided = true;
      return this.getReplyWithParam("email_provided", "{email}", detected.extractedEmail, session);
    }
    
    if (detected.hasSuspiciousEmail && !session.scamState.emailSuspicious) {
      session.scamState.emailSuspicious = true;
      return this.getReplyWithParam("email_suspicious", "{email}", detected.extractedEmail, session);
    }

    // ============ YOUR EXISTING CODE (UNCHANGED) ============
    
    // Account detection
    if (detected.hasAccount && detected.accountNumber && !session.accountQuestioned) {
      session.accountQuestioned = true;
      return this.getReplyWithParam("account_first", "{account}", detected.accountNumber, session);
    }
    if (detected.hasAccount && detected.accountNumber && session.accountQuestioned && !session.accountValidated) {
      session.accountValidated = true;
      return this.getReplyWithParam("account_second", "{account}", detected.accountNumber, session);
    }

    // UPI detection
    if (detected.hasUPI && detected.upiId && !session.upiQuestioned) {
      session.upiQuestioned = true;
      return this.getReplyWithParam("upi_first", "{upi}", detected.upiId, session);
    }

    if (detected.hasUPI && detected.upiId && session.upiQuestioned && session.upiMentionCount < 2) {
      session.upiMentionCount++;
      return this.getReplyWithParam("upi_second", "{upi}", detected.upiId, session);
    }

    // Phone detection
    if (detected.hasPhone && detected.phoneNumber) {
      session.phoneMentionCount = (session.phoneMentionCount || 0) + 1;

      if (session.phoneMentionCount === 1)
        return this.getReplyWithParam("phone_first", "{phone}", detected.phoneNumber, session);

      if (session.phoneMentionCount === 2)
        return this.getReplyWithParam("phone_second", "{phone}", detected.phoneNumber, session);

      return this.getReplyWithParam("phone_third", "{phone}", detected.phoneNumber, session);
    }

    // Authority challenge
    if (detected.hasAuthority && !session.authorityChallenged) {
      session.authorityChallenged = true;
      return this.getReply("authority", session);
    }

    // Progressive OTP Responses
    if (detected.hasOTP) {

      if (detected.hasResend)
        return this.getReply("resend", session);

      if (session.otpRequests === 1)
        return this.getReply("otp_1", session);

      if (session.otpRequests === 2)
        return this.getReply("otp_2", session);

      if (session.otpRequests === 3)
        return this.getReply("otp_3", session);

      if (session.otpRequests === 4)
        return this.getReply("otp_4", session);

      return this.getReply("otp_5", session);
    }

    // Other detections
    if (detected.hasPermanent)
      return this.getReply("permanent", session);

    if (detected.hasFine)
      return this.getReply("fine", session);

    if (detected.hasTollfree)
      return this.getReply("tollfree", session);

    if (detected.hasBranch)
      return this.getReply("branch", session);

    if (detected.hasFamily)
      return this.getReply("family", session);

    if (detected.hasCyber) {
      session.lockToExit = true;
      return this.getReply("cyber", session);
    }

    if (detected.hasLink)
      return this.getReply("link", session);

    if (detected.hasFakeOffer)
      return this.getReply("fake_offer", session);

    // Turn-based progression fallback
    if (session.turnCount === 1) return this.getReply("turn1", session);
    if (session.turnCount === 2) return this.getReply("turn2", session);
    if (session.turnCount === 3) return this.getReply("turn3", session);
    if (session.turnCount === 4) return this.getReply("suspicion", session);
    if (session.turnCount === 5) return this.getReply("policy", session);

    return this.getReply("fallback", session);
  }

  // ===============================
  // Deterministic Reply Selector
  // ===============================
  static getReply(key, session) {
    const replies = REPLIES[key];
    if (!replies || replies.length === 0) return REPLIES.fallback[0];

    const index =
      (session.turnCount +
        session.otpRequests +
        session.threatCount +
        session.repetitionCount) % replies.length;

    return replies[index];
  }

  static getReplyWithParam(key, placeholder, value, session) {
    const reply = this.getReply(key, session);
    return reply.replace(placeholder, value);
  }
}