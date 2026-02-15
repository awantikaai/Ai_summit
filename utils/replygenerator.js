import { REPLIES } from "./replies.js";

export class ReplyGenerator {

  static generateReply(detected, session) {


    if (detected.hasThreat) {
      session.threatCount = (session.threatCount || 0) + 1;
    }

    if (detected.hasOTP) {
      session.otpRequests = (session.otpRequests || 0) + detected.otpRequestCount;
    }

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


    if (session.repetitionCount === 2)
      return "Aap same message copy paste kar rahe ho kya?";

    if (session.repetitionCount === 3)
      return "Har baar same line bol rahe ho. Kya aap automated ho?";

    if (session.repetitionCount >= 4)
      return "Lag raha hai aap script padh rahe ho. Case reference number generate hua hai kya?";


    if (detected.hasAccount && detected.accountNumber && !session.accountQuestioned) {
      session.accountQuestioned = true;
      return this.getReplyWithParam("account_first", "{account}", detected.accountNumber, session);
    }
    if (detected.hasAccount && detected.accountNumber && session.accountQuestioned && !session.accountValidated) {
      session.accountValidated = true;
      return this.getReplyWithParam("account_second", "{account}", detected.accountNumber, session);
    }

    if (detected.hasUPI && detected.upiId && !session.upiQuestioned) {
      session.upiQuestioned = true;
      return this.getReplyWithParam("upi_first", "{upi}", detected.upiId, session);
    }

    if (detected.hasUPI && detected.upiId && session.upiQuestioned && session.upiMentionCount < 2) {
      session.upiMentionCount++;
      return this.getReplyWithParam("upi_second", "{upi}", detected.upiId, session);
    }

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

    // ===============================
    // 6️⃣ Progressive OTP Responses
    // ===============================
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

    // ===============================
    // 7️⃣ Other detections
    // ===============================
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

    // ===============================
    // 8️⃣ Turn-based progression fallback
    // ===============================
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
