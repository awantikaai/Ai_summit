import { PATTERNS } from "../utils/pattern.js";

export class KeywordDetector {

  static detectKeywords(text) {
    const input = text.toLowerCase();

    const detected = {
      hasOTP: false,
      hasPIN: false,
      hasAccount: false,
      hasUPI: false,
      hasPhone: false,
      hasTollfree: false,
      hasUrgency: false,
      hasThreat: false,
      hasFine: false,
      hasPermanent: false,
      hasAuthority: false,
      hasCyber: false,
      hasBranch: false,
      hasFamily: false,
      hasResend: false,
      hasLink: false,
      hasFakeOffer: false,
      hasEmployeeID: false,
      hasDesignation: false,
      hasBranchCode: false,
      accountNumber: null,
      upiId: null,
      phoneNumber: null,
      otpRequestCount: 0,
      threatCount: 0
    };

    // ================= OTP =================
    if (PATTERNS.otp.test(input) || PATTERNS.otp_hindi.test(input)) {
      detected.hasOTP = true;
      detected.otpRequestCount++;
    }

    // ================= PIN =================
    if (PATTERNS.pin.test(input)) detected.hasPIN = true;

    // ================= RESEND =================
    if (PATTERNS.resend.test(input)) detected.hasResend = true;

    // ================= ACCOUNT =================
    const accountMatch =
      input.match(PATTERNS.account_keyword) ||
      input.match(PATTERNS.account_formatted) ||
      input.match(PATTERNS.account_16digit) ||
      input.match(PATTERNS.account_12_16);

    if (accountMatch) {
      detected.hasAccount = true;
      detected.accountNumber = accountMatch[0].replace(/[^\d]/g, "");
    }

    // ================= UPI =================
    const upiMatch = input.match(PATTERNS.upiId);
    if (upiMatch) {
      detected.hasUPI = true;
      detected.upiId = upiMatch[0].toLowerCase();
    }

    // ================= PHONE =================
    const phoneMatch =
      input.match(PATTERNS.phone_plus91) ||
      input.match(PATTERNS.phone) ||
      input.match(PATTERNS.phone_zero);

    if (phoneMatch) {
      detected.hasPhone = true;
      detected.phoneNumber = phoneMatch[0].replace(/[^\d]/g, "");
    }

    // ================= AUTHORITY =================
    if (
      PATTERNS.bank.test(input) ||
      PATTERNS.department.test(input) ||
      PATTERNS.official.test(input)
    ) {
      detected.hasAuthority = true;
    }

    // ================= URGENCY =================
    if (
      PATTERNS.urgent.test(input) ||
      PATTERNS.urgent_hindi.test(input) ||
      PATTERNS.deadline.test(input)
    ) {
      detected.hasUrgency = true;
    }

    // ================= THREAT =================
    if (
      PATTERNS.block.test(input) ||
      PATTERNS.deadline.test(input)
    ) {
      detected.hasThreat = true;
      detected.threatCount++;
    }

    // ================= OTHER FLAGS =================
    if (PATTERNS.tollfree.test(input)) detected.hasTollfree = true;
    if (PATTERNS.fine.test(input)) detected.hasFine = true;
    if (PATTERNS.permanent.test(input)) detected.hasPermanent = true;
    if (PATTERNS.cyber.test(input)) detected.hasCyber = true;
    if (PATTERNS.branch.test(input)) detected.hasBranch = true;
    if (PATTERNS.family.test(input)) detected.hasFamily = true;
    if (PATTERNS.link.test(input)) detected.hasLink = true;
    if (PATTERNS.fake_offer.test(input)) detected.hasFakeOffer = true;
    if (PATTERNS.employee_id.test(input)) detected.hasEmployeeID = true;
    if (PATTERNS.designation.test(input)) detected.hasDesignation = true;
    if (PATTERNS.branch_code.test(input)) detected.hasBranchCode = true;

    return detected;
  }

  static hasAnyKeyword(detected) {
    return (
      detected.hasOTP ||
      detected.hasPIN ||
      detected.hasAccount ||
      detected.hasUPI ||
      detected.hasPhone ||
      detected.hasTollfree ||
      detected.hasUrgency ||
      detected.hasThreat ||
      detected.hasFine ||
      detected.hasPermanent ||
      detected.hasAuthority ||
      detected.hasCyber ||
      detected.hasBranch ||
      detected.hasFamily ||
      detected.hasResend ||
      detected.hasLink ||
      detected.hasFakeOffer ||
      detected.hasEmployeeID ||
      detected.hasDesignation ||
      detected.hasBranchCode
    );
  }

  static calculateRiskScore(detected) {
    let score = 0;

    if (detected.hasOTP) score += 35;
    if (detected.hasPIN) score += 30;
    if (detected.hasUPI) score += 25;
    if (detected.hasAccount) score += 20;
    if (detected.hasPhone) score += 15;
    if (detected.hasUrgency) score += 20;
    if (detected.hasThreat) score += 25;
    if (detected.hasFine) score += 20;
    if (detected.hasPermanent) score += 25;
    if (detected.hasAuthority) score += 15;
    if (detected.hasLink) score += 30;
    if (detected.hasFakeOffer) score += 25;
    if (detected.hasEmployeeID) score += 20;
    if (detected.hasDesignation) score += 15;
    if (detected.hasBranchCode) score += 15;

    if (detected.hasOTP && detected.hasUPI) score += 20;
    if (detected.hasOTP && detected.hasAccount) score += 15;
    if (detected.hasThreat && detected.hasUrgency) score += 15;

    return Math.min(score, 100);
  }
}
