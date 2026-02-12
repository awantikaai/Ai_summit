// controllers/honeypotController.js - ULTIMATE HINGLISH CHAMPION EDITION
// WITH REPETITION DETECTION + EMOTIONAL STATES + FIXED TURNCOUNT

import axios from 'axios';

const sessions = new Map();

const CONFIG = {
  SCAM_THRESHOLD: 45,
  MIN_TURNS: 8,
  MAX_TURNS: 14,
  CALLBACK_URL: 'https://hackathon.guvi.in/api/updateHoneyPotFinalResult',
  CALLBACK_TIMEOUT: 5000,
  USE_PERPLEXITY: false,
  PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY || '',
  PERPLEXITY_URL: 'https://api.perplexity.ai/chat/completions',
  PERPLEXITY_TIMEOUT: 2500,
  PERPLEXITY_TRIGGER_TURNS_MAX: 3
};

const PATTERNS = {
  otp: /\b(?:otp|one\s*time\s*(?:password|pin|code)|verification\s*code|security\s*code|6[-\s]*digit\s*cod|6[-\s]*digit\s*otp)\b/i,
  otp_hindi: /\b(?:ओटीपी|ओ टी पी|ओटीपी\s*कोड|वेरिफिकेशन\s*कोड|otp|ओटीपी)\b/i,
  pin: /\b(?:pin|mpin|atm\s*pin|debit\s*pin|card\s*pin|upi\s*pin)\b/i,
  password: /\b(?:password|passcode|login\s*details|internet\s*banking\s*password)\b/i,
  cvv: /\b(?:cvv|cvc|security\s*number|card\s*verification)\b/i,
  account_16digit: /\b\d{16}\b/,
  account_12_16: /\b\d{12,16}\b/,
  account_formatted: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/,
  account_keyword: /\b(?:account|खाता|अकाउंट|खाता\s*नंबर)\s*(?:no|number|#)?\s*[:.]?\s*(\d{9,18}|\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4})/i,
  upi: /\b(?:upi|gpay|google\s*pay|phonepe|paytm|amazon\s*pay|bh?im|भीम|UPI|U\.P\.I)\b/i,
  upiId: /[\w.\-]+@[\w.\-]+/i,
  phone: /\b[6-9]\d{9}\b/,
  phone_plus91: /\b\+91[\s-]?[6-9]\d{9}\b/,
  phone_zero: /\b0[6-9]\d{9}\b/,
  phone_tollfree: /\b1800[\s-]?\d{4}[\s-]?\d{4}\b/,
  transfer: /\b(?:neft|rtgs|imps|transfer|send|भेजो|भेजे|पैसे\s*भेजो|पैसे\s*भेजे|fund|payment|refund|रिफंड)\b/i,
  link: /\b(?:https?:\/\/|www\.|bit\.ly|tinyurl|shorturl|rb\.gy|ow\.ly|is\.gd|s\.h|safelinks|क्लिक|लिंक)\S+/i,
  fake_offer: /\b(?:won|winner|cashback|रिवॉर्ड|इनाम|लॉटरी|gift|voucher|discount|free|offer|प्राइज|prize)\b/i,
  urgent: /\b(?:urgent|immediately?|now|within\s*(?:minutes?|hours?)|right\s*now|minutes|blocked\s*in\s*\d+\s*hours?)\b/i,
  urgent_hindi: /\b(?:तुरंत|अभी|जल्दी|फटाफट|जल्द|तुरन्त|तुरत|अभी\s*करो)\b/i,
  deadline: /\b(?:deadline|expire?|valid\s*only|limited|last\s*chance|before\s*it's\s*too\s*late|will\s*be\s*blocked|will\s*be\s*locked|ब्लॉक\s*होगा|लॉक\s*होगा|freeze|hold)\b/i,
  block: /\b(?:block|blocked|freeze|suspend|suspended|lock|locked|deactivate|restrict|disable|hold|ब्लॉक|बंद|रोक|चला जाएगा|चीन लिए जाएंगे)\b/i,
  compromised: /\b(?:compromised|hacked|breach|unauthorized|fraud|suspicious|risk|unusual|alert|flagged|हैक|चोरी|गड़बड़ी)\b/i,
  fine: /\b(?:जुर्माना|fine|penalty|भारी जुर्माना|fee|charge|deduction)\b/i,
  permanent: /\b(?:permanently|forever|always|never|कभी नहीं|हमेशा के लिए)\b/i,
  bank: /\b(?:sbi|state\s*bank|hdfc|icici|axis|kotak|pnb|canara|union|yesbank|bank|बैंक)\b/i,
  department: /\b(?:fraud\s*team|security\s*team|risk\s*team|customer\s*support|helpdesk|verification\s*team|support|fraud\s*prevention|technical|सपोर्ट|हेल्पडेस्क|official\s*line|security\s*line)\b/i,
  official: /\b(?:official|authorized|verified|registered|certified|ऑफिशियल|वेरिफाइड)\b/i,
  tollfree: /\b(?:1800|toll[-\s]?free|टोल फ्री|helpline|customer care|support number)\b/i,
  sbi_official: /\b(?:1800[\s\-]?\d{3,4}[\s\-]?\d{4}|\b1800\d{7,10})\b/i,
  resend: /\b(?:resend|रेसेंड|दुबारा|फिर\s*से)\b/i,
  family: /\b(?:पापा|papa|मम्मी|mummy|भाई|bhai|बेटा|beta|पति|pati|पत्नी|wife|husband|बच्चे|children|cousin|friend)\b/i,
  branch: /\b(?:branch|बैंक|शाखा|ऑफिस|office|near|पास|로केशन|location|home\s*branch)\b/i,
  cyber: /\b(?:cyber|crim|1930|complaint|report|पुलिस|साइबर)\b/i
};

const REPLIES = {
  account_first: [
    "Aapko mera account number kaise pata chala?",
    "{account} - yeh mera hai?",
    "Aapke paas mera account number kahan se aaya?",
    "Bhai, yeh mera account number hai, maine kisi ko nahi diya tha.",
    "Confidential hai yaar, aapke paas kaise hai?",
    "Aapko mera account number kaise mila?",
    "Maine kabhi share nahi kiya yeh number.",
    "Kaise mila aapko?",
    "Aapke paas mera personal info kahan se aaya?",
    "Seriously? Aapko pata hai mera account number?"
  ],
  
  account_second: [
    "Aap baar baar yahi account number bhej rahe ho.",
    "Mera account number {account} hai, par main branch jakar verify karunga.",
    "Aapko account number pata hai, par OTP nahi dunga.",
    "Account number sahi hai, par ab aage kya chahiye?",
    "Aapke paas account number hai, phir OTP kyun?",
    "Same account number baar baar bhej rahe ho. Bolo kya chahiye?",
    "Ha account number correct hai, par trust nahi ho raha.",
    "Aapke paas account number hai, bas itna kaafi hai?",
    "Account number toh pata hai aapko, ab OTP kyun maang rahe ho?",
    "Aapko account number pata hai, par main kuch aur nahi dunga."
  ],
  
  upi_first: [
    "Yeh UPI ID {upi} aapki hai?",
    "{upi} - yeh kaunsa bank hai?",
    "Main check kar raha hoon, yeh UPI ID sahi hai?",
    "Aapne {upi} diya hai, yeh kaunsa UPI app hai?",
    "Yeh UPI ID {upi} aapki hi hai?",
    "Yeh {upi} SBI se linked hai kya?",
    "Ye UPI ID verified hai?",
    "Aapka UPI ID {upi} hai? Main check kar leta hoon.",
    "Kaunsa bank ka UPI hai yeh {upi}?",
    "Yeh UPI ID correct hai? {upi}"
  ],
  
  upi_second: [
    "Maine {upi} check kiya, yeh SBI ka official UPI ID nahi hai.",
    "Aap baar baar yahi {upi} bhej rahe ho. Yeh SBI ka nahi hai.",
    "SBI ka UPI ID @sbi ya @okaxis hota hai, yeh {upi} kyun hai?",
    "Ye UPI ID toh fake lag raha hai.",
    "Maine check kar liya, {upi} SBI ka official nahi hai.",
    "SBI ka UPI ID alag hota hai, yeh kya hai?",
    "Aap bar bar yahi UPI bhej rahe ho, par yeh SBI ka nahi hai.",
    "{upi} verified nahi hai, main use nahi karunga.",
    "Yeh UPI ID SBI se linked nahi hai.",
    "Aap baar baar same UPI bhej rahe ho, par yeh SBI ka nahi hai."
  ],
  
  phone_first: [
    "Yeh {phone} aapka number hai? Main call karta hoon.",
    "{phone} - yeh aapka official number hai?",
    "Aapne {phone} diya hai, main is number ko call karta hoon.",
    "Bro, yehi aapka number hai na {phone}?",
    "Is number pe call karu? {phone}",
    "Kya main {phone} pe call kar sakta hoon verify karne ke liye?",
    "Yeh {phone} bank ka official number hai?",
    "Aapka number {phone} hai? Main call karta hoon.",
    "Main {phone} pe call karta hoon, thodi der ruko.",
    "Yeh aapka hi number hai na {phone}?"
  ],
  
  phone_second: [
    "Maine {phone} pe call kiya, par koi nahi utha.",
    "Aapka {phone} number busy aa raha hai.",
    "Kya yeh {phone} sahi number hai? Call nahi lag raha.",
    "Call kiya par koi nahi utha.",
    "Aapka number {phone} engaged bata raha hai.",
    "Maine {phone} pe do baar call kiya, koi nahi utha.",
    "Kya yeh {phone} sahi number hai? Call connect nahi ho raha.",
    "Number {phone} pe call kiya par koi response nahi aaya.",
    "Aapka number {phone} engaged aa raha hai."
  ],
  
  phone_third: [
    "Aap baar baar yahi {phone} number de rahe ho.",
    "Maine {phone} pe call kiya tha, abhi tak koi jawab nahi aaya.",
    "Yeh {phone} number SBI ke official number se match nahi karta.",
    "{phone} ke jagah 1800 wala number do.",
    "Same number baar baar kyun de rahe ho?",
    "Mujhe SBI ka 1800 number do, yeh nahi chalega.",
    "Bar bar same number kyun de rahe ho?",
    "Yeh {phone} number SBI ka official nahi hai.",
    "1800 wala number do, yeh nahi chalega.",
    "Aap baar baar yahi {phone} de rahe ho, par main 1800 pe hi bharosa karunga."
  ],
  
  otp_1: [
    "OTP kyun chahiye? Bank OTP nahi maangta.",
    "OTP mat maango yaar.",
    "Maine suna hai bank kabhi OTP nahi poochta.",
    "OTP share karna safe nahi hai.",
    "Mere SMS mein likha hai - Never share OTP.",
    "Yeh theek nahi hai.",
    "Bank wale aise nahi karte.",
    "OTP maangna hi galat hai.",
    "I never share OTP with anyone.",
    "This is not safe."
  ],
  
  otp_2: [
    "OTP nahi aaya abhi tak. Bheja tha?",
    "Main check kar raha hoon, koi OTP nahi hai.",
    "Network slow hai kya? OTP nahi aa raha.",
    "Aapne OTP kab bheja? Maine toh dekha nahi.",
    "Phir se bhejo, OTP nahi aaya.",
    "Abhi tak OTP nahi aaya, check karo.",
    "Kya aapne sahi number pe bheja hai?",
    "OTP ka wait kar raha hoon, abhi tak nahi aaya.",
    "Dobara bhejo, receive nahi hua.",
    "Kya aapne bheja tha? Mujhe toh nahi aaya."
  ],
  
  otp_3: [
    "Aap baar baar OTP kyun maang rahe ho?",
    "Teen baar OTP maang liya aapne. Ajeeb lag raha hai.",
    "Itni baar OTP maangte hain kya bank wale?",
    "Aapne 3 baar OTP maang liya. Main nahi dunga.",
    "Teen baar OTP maang rahe ho? Yeh suspicious hai.",
    "Bank employee aise nahi karte.",
    "Aapne 3 baar OTP manga liya, main nahi dunga ab.",
    "Third time OTP maang rahe ho, yeh sahi nahi hai.",
    "Itni baar OTP maang kar rahe ho, mujhe trust nahi ho raha.",
    "Aap baar baar OTP kyun maang rahe ho?"
  ],
  
  otp_4: [
    "Main branch jakar puchta hoon pehle.",
    "Mere friend ne kaha tha aise requests ignore karne ka.",
    "Mujhe laga bank kabhi OTP nahi maangta.",
    "Main kal subah bank jakar confirm karunga.",
    "Aap itna insist kar rahe ho, mujhe trust nahi ho raha.",
    "Ab toh mujhe bhi doubt ho raha hai.",
    "Main branch se confirm kar lunga pehle.",
    "Pehle branch jaata hoon, phir baat karte hain.",
    "Aap itna force kyun kar rahe ho? Main branch jaunga.",
    "Pehle branch jakar puchna chahiye."
  ],
  
  otp_5: [
    "Main apni branch mein complaint kar dunga.",
    "Aap itna insist kyun kar rahe ho? Main OTP nahi dunga.",
    "Main abhi cyber cell mein call karta hoon.",
    "Maine aapka number note kar liya hai. Complaint kar dunga.",
    "Aap OTP maangna band karo, main nahi dunga.",
    "Ab main cyber cell call kar raha hoon.",
    "Aapka number block kar dunga main.",
    "Main branch mein complaint kar dunga.",
    "Ab main cyber crime mein report kar raha hoon.",
    "Main complaint kar dunga."
  ],
  
  tollfree: [
    "SBI ka 1800 425 3800 number hai na? Main wahan call karunga.",
    "1800 112 211 pe call karo, wahan baat karte hain.",
    "Mujhe SBI ka 1800 wala number pata hai. Aap wahan se call karo.",
    "Toll-free number 1800 wala do, +91 wala nahi chalega.",
    "1800 wala number do na, yeh kya hai?",
    "SBI ka official customer care 1800 425 3800 hai.",
    "Aap 1800 wala number kyun nahi de rahe?",
    "SBI ka 1800 number hota hai, yeh +91 kyun de rahe ho?",
    "Toll-free 1800 number do, main wahan call karta hoon.",
    "Mujhe SBI ka 1800 number pata hai, aap wahan se hi call karo."
  ],
  
  cyber: [
    "Main cyber crime mein complaint kar dunga.",
    "1930 pe call karta hoon abhi, yehi cyber cell ka number hai na?",
    "Maine aapka number note kar liya hai.",
    "Main apni branch mein jakar complaint likhwa dunga.",
    "Aapka number main report kar dunga.",
    "Ab main cyber crime call kar raha hoon.",
    "Aapka number police ko de dunga.",
    "Main cyber cell mein report kar dunga.",
    "1930 pe call karta hoon abhi.",
    "Maine aapka number cyber cell ko de diya hai."
  ],
  
  branch: [
    "Main kal subah 11 baje branch aa raha hoon.",
    "Aap branch ka address bhejo, main abhi aata hoon.",
    "Meri home branch Andheri West mein hai, wahan jau?",
    "Branch manager se baat karni hai.",
    "Main apne ghar ke paas wali branch mein chala jaata hoon.",
    "Main branch jakar hi baat karunga.",
    "Aap branch ka address do, main abhi aata hoon.",
    "Kal subah branch aa raha hoon.",
    "Main branch manager se baat karunga.",
    "Meri nearest branch ka address bhejo."
  ],
  
  policy: [
    "Bank wale OTP nahi maangte bhai.",
    "Mujhe pata hai bank kabhi OTP nahi poochta.",
    "Yeh sab mujhe pata hai yaar.",
    "Main itna bewakoof nahi hoon.",
    "SBI khud bolta hai OTP mat do kisi ko.",
    "Maine TV pe dekha hai, aise hi fraud karte hain.",
    "Mere bank ne clearly bola hai - OTP kabhi mat do.",
    "RBI clearly says banks never ask for OTP.",
    "Pata hai mujhe, bank OTP nahi maangte.",
    "This is basic banking security."
  ],
  
  suspicion: [
    "Kuch toh gadbad hai bhai.",
    "Mujhe yakeen nahi ho raha.",
    "Aap kaun ho actually?",
    "Yeh sahi lag raha hai kya?",
    "Scam toh nahi hai yeh?",
    "Aapka number kaise mila mujhe?",
    "Mujhe ab doubt ho raha hai.",
    "Yeh conversation ajeeb hai yaar.",
    "Main confuse ho gaya hoon.",
    "Aap sahi mein bank se ho?"
  ],
  
  fine: [
    "Jurmana? Kyun jurmana? Maine kuch galat nahi kiya.",
    "Jurmana kyun lagega? Mera account theek tha.",
    "Pehle block bol rahe the, ab jurmana bhi?",
    "Maine koi crime nahi kiya, jurmana kyun?",
    "RBI aise jurmana nahi lagata.",
    "Ab jurmana kya beech mein?",
    "Fine ka kya scene hai?",
    "Jurmana ka kya reason hai?",
    "Maine toh kuch galat kiya hi nahi.",
    "Pehle block, ab jurmana - yeh kya hai?"
  ],
  
  permanent: [
    "Permanently block? Itna bada action kyun?",
    "Hamesha ke liye block? Yeh toh bahut strict hai.",
    "Permanent block ke liye toh branch jana padega na?",
    "Aap permanently block ki dhamki de rahe ho?",
    "Permanent block ka authority sirf branch manager ko hai.",
    "Permanent block bahut badi baat hai.",
    "Itna strict action kyun?",
    "Permanent block ka matlab samajhte ho?",
    "Itna bada action itni chhoti baat ke liye?",
    "Permanent block toh branch level pe hota hai."
  ],
  
  authority: [
    "Aap kaunse department se ho?",
    "Aapka employee ID kya hai? Main verify karunga.",
    "Kya main aapke manager se baat kar sakta hoon?",
    "Aapka naam aur designation kya hai?",
    "Mujhe bank domain se official email bhejo.",
    "Pehle apna employee ID batao.",
    "Manager se baat karani hai mujhe.",
    "Aap konse team se ho?",
    "Apna ID card dikhao pehle.",
    "Bank ka official email ID se mail bhejo."
  ],
  
  resend: [
    "RESEND? Kaunse number pe bhejna hai?",
    "Maine RESEND likh diya, ab kya hoga?",
    "Maine RESEND bhej diya, OTP aayega ab?",
    "Kaunse number pe RESEND bhejna hai?",
    "RESEND kar diya, ab wait karta hoon.",
    "RESEND kiya maine, ab kya?",
    "Kahan pe RESEND bhejna hai?",
    "Maine RESEND kar diya, check karo.",
    "RESEND option kahan hai?"
  ],
  
  family: [
    "Mere papa bank mein kaam karte hain, main unse puch leta hoon.",
    "Mera bhai bhi SBI mein hai, use call karta hoon pehle.",
    "Meri wife ne kaha yeh scam ho sakta hai.",
    "Mere friend ke saath aise hi hua tha.",
    "Mere cousin ne kaha aise calls ignore karne ka.",
    "Mera friend SBI mein hai, use puchta hoon.",
    "Mere friend ko bhi aisi call aayi thi, scam thi.",
    "Mere papa bank mein hain, unse baat karta hoon.",
    "Meri wife bol rahi hai yeh scam hai.",
    "Mere cousin ne bola aise calls pe dhyan mat do."
  ],
  
  turn1: [
    "Mera account block kyun ho raha hai? Maine kuch nahi kiya.",
    "Aap kaunse bank se bol rahe ho?",
    "Mere account ko kya hua? Maine koi transaction nahi kiya.",
    "Mujhe block ke baare mein koi message nahi aaya.",
    "Suddenly block kyun ho raha hai?",
    "Bro, mere account ko kya hua?",
    "Maine toh koi galat kaam nahi kiya.",
    "Account block kyun ho raha hai?",
    "Mujhe koi notification nahi aaya.",
    "Yeh sab kya chal raha hai?"
  ],
  
  turn2: [
    "Kaunsa transaction? Kitne paise ka tha?",
    "Yeh transaction kahan se hua?",
    "Mujhe is transaction ke liye koi OTP nahi aaya.",
    "Yeh transaction kab hua? Main toh ghar tha.",
    "Maine toh koi transaction nahi kiya.",
    "Kaunsa transaction? Kitne amount ka?",
    "Transaction kab hua, time batao?",
    "Mujhe toh koi transaction ka pata nahi.",
    "Yeh transaction galat hai, maine nahi kiya."
  ],
  
  turn3: [
    "Aap kaunse department se ho?",
    "Aapka employee ID kya hai? Main verify karunga.",
    "Apna naam aur designation bata sakte ho?",
    "Kaunsi branch se call kar rahe ho?",
    "Pehle batao aap kaun ho?",
    "Aap kaun ho actually? Bank se ho ya kahan se?",
    "Aapka department kya hai?",
    "Employee ID batao, main check karunga.",
    "Aapka naam kya hai?",
    "Branch kaunsi hai aapki?"
  ],
  
  exit: [
    "Main ab branch ja raha hoon.",
    "Maine apni branch ko inform kar diya hai.",
    "Main aapka number block kar raha hoon.",
    "Main branch verification ke bina kuch nahi kar sakta.",
    "I'm calling SBI customer care right now.",
    "Ab main branch ja raha hoon.",
    "Maine SBI ko inform kar diya hai.",
    "I'm going to the branch now.",
    "Main branch ja raha hoon.",
    "This conversation is over. Goodbye."
  ],
  
  fallback: [
    "Mujhe samajh nahi aaya, thoda aur batao.",
    "Aap kaunsa bank bol rahe ho pehle yeh batao.",
    "Main thoda confuse hoon, kya exact problem hai?",
    "Maine kuch kiya nahi, phir block kyun?",
    "Kya main apni branch aa sakta hoon iske liye?",
    "Samajh nahi aaya, ek baar phir se batao.",
    "Kya problem hai exactly?",
    "Mujhe kuch samajh mein nahi aa raha.",
    "Thoda simple language mein batao.",
    "Main confuse ho gaya, kya chahiye aapko?"
  ]
};

class IntelligenceExtractor {
  static createEmptyStore() {
    return {
      bankAccounts: [],
      upiIds: [],
      phishingLinks: [],
      phoneNumbers: [],
      suspiciousKeywords: []
    };
  }

  static extractFromHistory(conversationHistory) {
    const intelligence = this.createEmptyStore();
    conversationHistory.forEach(msg => {
      if (msg.sender === 'scammer') {
        this.extractFromText(msg.text, intelligence);
      }
    });
    intelligence.bankAccounts = [...new Set(intelligence.bankAccounts)];
    intelligence.upiIds = [...new Set(intelligence.upiIds)];
    intelligence.phishingLinks = [...new Set(intelligence.phishingLinks)];
    intelligence.phoneNumbers = [...new Set(intelligence.phoneNumbers)];
    intelligence.suspiciousKeywords = [...new Set(intelligence.suspiciousKeywords)];
    return intelligence;
  }

  static extractFromText(text, intelligence) {
    const accounts16 = text.match(/\b\d{16}\b/g);
    if (accounts16) {
      accounts16.forEach(acc => {
        if (!intelligence.bankAccounts.includes(acc)) {
          intelligence.bankAccounts.push(acc);
        }
      });
    }
    const accounts12_15 = text.match(/\b\d{12,15}\b/g);
    if (accounts12_15) {
      accounts12_15.forEach(acc => {
        if (!intelligence.bankAccounts.includes(acc)) {
          intelligence.bankAccounts.push(acc);
        }
      });
    }
    const formatted = text.match(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g);
    if (formatted) {
      formatted.forEach(acc => {
        const clean = acc.replace(/[\s-]/g, '');
        if (!intelligence.bankAccounts.includes(clean)) {
          intelligence.bankAccounts.push(clean);
        }
      });
    }
    const upis = text.match(/[\w.\-]+@[\w.\-]+/gi);
    if (upis) {
      upis.forEach(upi => {
        const clean = upi.toLowerCase().trim().replace(/[.,;:!?]$/, '');
        if (clean.includes('@') && clean.length > 3 && !intelligence.upiIds.includes(clean)) {
          intelligence.upiIds.push(clean);
        }
      });
    }
    const phones = text.match(/\b[6-9]\d{9}\b/g);
    if (phones) {
      phones.forEach(phone => {
        if (!intelligence.phoneNumbers.includes(phone)) {
          intelligence.phoneNumbers.push(phone);
        }
      });
    }
    const phones91 = text.match(/\+91\s*([6-9]\d{9})\b/g);
    if (phones91) {
      phones91.forEach(phone => {
        const clean = phone.replace('+91', '').replace(/\s/g, '');
        if (!intelligence.phoneNumbers.includes(clean)) {
          intelligence.phoneNumbers.push(clean);
        }
      });
    }
    const links = text.match(PATTERNS.link);
    if (links) {
      links.forEach(link => {
        const normalized = link.toLowerCase().trim();
        if (!intelligence.phishingLinks.includes(normalized)) {
          intelligence.phishingLinks.push(normalized);
        }
      });
    }
    if (PATTERNS.otp.test(text) || PATTERNS.otp_hindi.test(text)) 
      intelligence.suspiciousKeywords.push('otp_request');
    if (PATTERNS.pin.test(text)) 
      intelligence.suspiciousKeywords.push('pin_request');
    if (PATTERNS.upi.test(text) || intelligence.upiIds.length > 0) 
      intelligence.suspiciousKeywords.push('upi_request');
    if (PATTERNS.urgent.test(text) || PATTERNS.urgent_hindi.test(text)) 
      intelligence.suspiciousKeywords.push('urgency_tactic');
    if (PATTERNS.block.test(text)) 
      intelligence.suspiciousKeywords.push('account_block_threat');
    if (PATTERNS.compromised.test(text)) 
      intelligence.suspiciousKeywords.push('security_breach_claim');
    if (PATTERNS.bank.test(text)) 
      intelligence.suspiciousKeywords.push('bank_impersonation');
    if (PATTERNS.department.test(text) || PATTERNS.official.test(text)) 
      intelligence.suspiciousKeywords.push('authority_claim');
    if (PATTERNS.tollfree.test(text))
      intelligence.suspiciousKeywords.push('tollfree_mention');
    if (PATTERNS.fine.test(text))
      intelligence.suspiciousKeywords.push('fine_threat');
    if (PATTERNS.permanent.test(text))
      intelligence.suspiciousKeywords.push('permanent_block_threat');
    if (PATTERNS.transfer.test(text))
      intelligence.suspiciousKeywords.push('transfer_request');
    if (PATTERNS.link.test(text))
      intelligence.suspiciousKeywords.push('phishing_link');
    if (PATTERNS.fake_offer.test(text))
      intelligence.suspiciousKeywords.push('fake_offer');
  }
}

class KeywordDetector {
  static detectKeywords(text) {
    const detected = {
      hasOTP: false, hasPIN: false, hasAccount: false, hasUPI: false, hasPhone: false,
      hasTollfree: false, hasUrgency: false, hasThreat: false, hasFine: false,
      hasPermanent: false, hasAuthority: false, hasCyber: false, hasBranch: false,
      hasFamily: false, hasResend: false, hasLink: false, hasFakeOffer: false,
      accountNumber: null, upiId: null, phoneNumber: null,
      otpRequestCount: 0, threatCount: 0
    };
    if (PATTERNS.otp.test(text) || PATTERNS.otp_hindi.test(text)) {
      detected.hasOTP = true;
      detected.otpRequestCount++;
    }
    if (PATTERNS.pin.test(text)) detected.hasPIN = true;
    if (PATTERNS.resend.test(text)) detected.hasResend = true;
    const accountMatch = text.match(/\b\d{16}\b/) || text.match(/\b\d{12,16}\b/);
    if (accountMatch) {
      detected.hasAccount = true;
      detected.accountNumber = accountMatch[0];
    }
    const upiMatch = text.match(/[\w.\-]+@[\w.\-]+/i);
    if (upiMatch) {
      detected.hasUPI = true;
      detected.upiId = upiMatch[0].toLowerCase();
    }
    const phoneMatch = text.match(/\b[6-9]\d{9}\b/) || text.match(/\+91[\s-]?[6-9]\d{9}\b/);
    if (phoneMatch) {
      detected.hasPhone = true;
      let phone = phoneMatch[0];
      phone = phone.replace('+91', '').replace(/\s/g, '');
      detected.phoneNumber = phone;
    }
    if (PATTERNS.tollfree.test(text) || PATTERNS.sbi_official.test(text)) detected.hasTollfree = true;
    if (PATTERNS.urgent.test(text) || PATTERNS.urgent_hindi.test(text) || PATTERNS.deadline.test(text)) detected.hasUrgency = true;
    if (PATTERNS.block.test(text)) {
      detected.hasThreat = true;
      detected.threatCount++;
    }
    if (PATTERNS.fine.test(text)) detected.hasFine = true;
    if (PATTERNS.permanent.test(text)) detected.hasPermanent = true;
    if (PATTERNS.bank.test(text) || PATTERNS.department.test(text) || PATTERNS.official.test(text)) detected.hasAuthority = true;
    if (PATTERNS.cyber.test(text)) detected.hasCyber = true;
    if (PATTERNS.branch.test(text)) detected.hasBranch = true;
    if (PATTERNS.family.test(text)) detected.hasFamily = true;
    if (PATTERNS.link.test(text)) detected.hasLink = true;
    if (PATTERNS.fake_offer.test(text)) detected.hasFakeOffer = true;
    return detected;
  }
  
  static hasAnyKeyword(detected) {
    return detected.hasOTP || detected.hasPIN || detected.hasAccount || detected.hasUPI ||
           detected.hasPhone || detected.hasTollfree || detected.hasUrgency || detected.hasThreat ||
           detected.hasFine || detected.hasPermanent || detected.hasAuthority || detected.hasCyber ||
           detected.hasBranch || detected.hasFamily || detected.hasResend || detected.hasLink ||
           detected.hasFakeOffer;
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
    if (detected.hasOTP && detected.hasUPI) score += 20;
    if (detected.hasOTP && detected.hasAccount) score += 15;
    if (detected.hasThreat && detected.hasUrgency) score += 15;
    return Math.min(score, 100);
  }
}

class ReplyGenerator {
  static generateReply(detected, session) {
    // ============ LOCK TO EXIT MODE ============
    if (session.lockToExit) {
      if (session.turnCount >= 10) return this.getRandomReply('exit');
      if (detected.hasCyber || detected.hasBranch) return this.getRandomReply('cyber');
      return this.getRandomReply('branch');
    }

    // ============ SMARTER LOCK TRIGGER ============
    if (!session.lockToExit) {
      const shouldLock = 
        session.pressureScore >= 2 ||
        session.otpRequests >= 4 ||
        session.threatCount >= 3 ||
        session.turnCount >= 8;
      
      if (shouldLock) {
        session.lockToExit = true;
        session.emotionLevel = 5;
      }
    }

    // ============ REPETITION DETECTION RESPONSE ============
    if (session.repetitionCount === 2) {
      return "Aap same message copy paste kar rahe ho kya?";
    }
    if (session.repetitionCount === 3) {
      return "Har baar same line bol rahe ho. Kya aap automated ho?";
    }
    if (session.repetitionCount >= 4) {
      return "Lag raha hai aap script padh rahe ho.";
    }

    // ============ EMOTION-BASED RESPONSES ============
    if (session.emotionLevel === 3) { // Irritated
      if (detected.hasOTP) {
        return this.getRandomReply('otp_3');
      }
      if (session.repetitionCount >= 2) {
        const irritatedReplies = [
          "Aap baar baar wahi baat kyun repeat kar rahe ho?",
          "Maine sun liya, ab baar baar mat bolo.",
          "Yeh copy paste band karo yaar.",
          "Mujhe aapki baat repeat karni pad rahi hai."
        ];
        return irritatedReplies[Math.floor(Math.random() * irritatedReplies.length)];
      }
    }

    if (session.emotionLevel === 4) { // Firm
      const firmReplies = [
        "Main OTP nahi dunga, chahe kuch bhi ho.",
        "Aap mujhe dara nahi sakte.",
        "Mera decision final hai.",
        "Ab main kuch nahi karunga bina branch verification ke."
      ];
      if (Math.random() < 0.3) return firmReplies[Math.floor(Math.random() * firmReplies.length)];
    }

    // ============ EXISTING PRIORITY-BASED REPLIES ============
    if (detected.hasAccount && detected.accountNumber) {
      if (!session.accountQuestioned) {
        session.accountQuestioned = true;
        return this.getReplyWithParam('account_first', '{account}', detected.accountNumber);
      } else {
        return this.getReplyWithParam('account_second', '{account}', detected.accountNumber);
      }
    }
    
    if (detected.hasUPI && detected.upiId) {
      if (!session.upiQuestioned) {
        session.upiQuestioned = true;
        return this.getReplyWithParam('upi_first', '{upi}', detected.upiId);
      } else {
        return this.getReplyWithParam('upi_second', '{upi}', detected.upiId);
      }
    }
    
    if (detected.hasPhone && detected.phoneNumber) {
      session.phoneMentionCount = (session.phoneMentionCount || 0) + 1;
      if (session.phoneMentionCount === 1) {
        return this.getReplyWithParam('phone_first', '{phone}', detected.phoneNumber);
      } else if (session.phoneMentionCount === 2) {
        return this.getReplyWithParam('phone_second', '{phone}', detected.phoneNumber);
      } else {
        return this.getReplyWithParam('phone_third', '{phone}', detected.phoneNumber);
      }
    }
    
    if (detected.hasOTP) {
      session.otpRequests = (session.otpRequests || 0) + detected.otpRequestCount;
      if (detected.hasResend) {
        return this.getRandomReply('resend');
      }
      const level = Math.min(session.otpRequests, 5);
      return this.getRandomReply(`otp_${level}`);
    }
    
    if (detected.hasTollfree) return this.getRandomReply('tollfree');
    if (detected.hasPermanent) return this.getRandomReply('permanent');
    if (detected.hasFine) return this.getRandomReply('fine');
    
    if (detected.hasThreat) {
      session.threatCount = (session.threatCount || 0) + 1;
      if (session.threatCount >= 3) {
        session.lockToExit = true;
        return this.getRandomReply('cyber');
      }
    }
    
    if (detected.hasAuthority && !session.authorityChallenged) {
      session.authorityChallenged = true;
      return this.getRandomReply('authority');
    }
    
    if (detected.hasBranch) {
      session.lockToExit = true;
      return this.getRandomReply('branch');
    }
    
    if (detected.hasFamily) return this.getRandomReply('family');
    
    if (detected.hasCyber) {
      session.lockToExit = true;
      return this.getRandomReply('cyber');
    }
    
    if (detected.hasLink) {
      const linkReplies = [
        "Main unknown links pe click nahi karta. Safe hai kya?",
        "I don't click on unknown links.",
        "Yeh link safe hai?",
        "This seems suspicious."
      ];
      return linkReplies[Math.floor(Math.random() * linkReplies.length)];
    }
    
    if (detected.hasFakeOffer) {
      const offerReplies = [
        "Maine koi lottery nahi jiti.",
        "I didn't win any lottery.",
        "Yeh fake lag raha hai.",
        "This is obviously fake."
      ];
      return offerReplies[Math.floor(Math.random() * offerReplies.length)];
    }
    
    // ============ TURN-BASED PROGRESSION ============
    if (session.turnCount === 1) return this.getRandomReply('turn1');
    if (session.turnCount === 2) return this.getRandomReply('turn2');
    if (session.turnCount === 3) return this.getRandomReply('turn3');
    if (session.turnCount === 4) return this.getRandomReply('suspicion');
    if (session.turnCount === 5) return this.getRandomReply('policy');
    if (session.turnCount === 6) return this.getRandomReply('otp_3');
    if (session.turnCount === 7) return this.getRandomReply('otp_4');
    if (session.turnCount === 8) {
      session.lockToExit = true;
      return this.getRandomReply('branch');
    }
    if (session.turnCount === 9) return this.getRandomReply('cyber');
    if (session.turnCount >= 10) return this.getRandomReply('exit');
    
    return this.getRandomReply('fallback');
  }
  
  static getRandomReply(key) {
    const replies = REPLIES[key];
    if (!replies || replies.length === 0) return this.getRandomReply('fallback');
    return replies[Math.floor(Math.random() * replies.length)];
  }
  
  static getReplyWithParam(key, placeholder, value) {
    const replies = REPLIES[key];
    if (!replies || replies.length === 0) return this.getRandomReply('fallback');
    const reply = replies[Math.floor(Math.random() * replies.length)];
    return reply.replace(placeholder, value);
  }
}

class CallbackService {
  static async sendFinalResult(sessionId, session) {
    const intelligence = session.intelligence;
    const payload = {
      sessionId: sessionId,
      scamDetected: session.scamDetected || false,
      totalMessagesExchanged: session.conversationHistory.length,
      extractedIntelligence: {
        bankAccounts: intelligence.bankAccounts,
        upiIds: intelligence.upiIds,
        phishingLinks: intelligence.phishingLinks,
        phoneNumbers: intelligence.phoneNumbers,
        suspiciousKeywords: intelligence.suspiciousKeywords
      },
      agentNotes: this.generateAgentNotes(session, intelligence)
    };
    try {
      await axios.post(CONFIG.CALLBACK_URL, payload, { timeout: CONFIG.CALLBACK_TIMEOUT });
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  }
  
  static generateAgentNotes(session, intelligence) {
    const tactics = [];
    if (intelligence.suspiciousKeywords.includes('otp_request')) tactics.push('OTP harvesting');
    if (intelligence.suspiciousKeywords.includes('upi_request')) tactics.push('UPI redirection');
    if (intelligence.suspiciousKeywords.includes('urgency_tactic')) tactics.push('urgency');
    if (intelligence.suspiciousKeywords.includes('account_block_threat')) tactics.push('account block threat');
    if (intelligence.suspiciousKeywords.includes('bank_impersonation')) tactics.push('bank impersonation');
    if (intelligence.suspiciousKeywords.includes('authority_claim')) tactics.push('authority claim');
    if (intelligence.suspiciousKeywords.includes('fine_threat')) tactics.push('fine threat');
    if (intelligence.suspiciousKeywords.includes('permanent_block_threat')) tactics.push('permanent block');
    if (intelligence.suspiciousKeywords.includes('phishing_link')) tactics.push('phishing');
    if (intelligence.suspiciousKeywords.includes('fake_offer')) tactics.push('fake offer');
    const tacticsText = tactics.length > 0 ? tactics.join(', ') : 'multiple scam tactics';
    return `Scammer used ${tacticsText}. Extracted ${intelligence.bankAccounts.length} bank accounts, ${intelligence.upiIds.length} UPI IDs, ${intelligence.phoneNumbers.length} phone numbers, ${intelligence.phishingLinks.length} phishing links. Engaged for ${session.conversationHistory.length} total messages. Repetition: ${session.repetitionCount}, Emotion: ${session.emotionLevel}`;
  }
  
  static shouldEndSession(session) {
    const userMessages = session.conversationHistory.filter(m => m.sender === 'user');
    const turnCount = userMessages.length;
    if (turnCount < CONFIG.MIN_TURNS) return false;
    if (turnCount >= CONFIG.MAX_TURNS) return true;
    if (session.scamDetected) {
      const intel = session.intelligence;
      if (intel.bankAccounts.length >= 1 && session.otpRequests >= 1) return true;
      if (intel.upiIds.length >= 1 && session.otpRequests >= 1) return true;
      if (intel.phoneNumbers.length >= 1 && session.threatCount >= 1) return true;
      if (intel.phishingLinks.length >= 1 && session.otpRequests >= 1) return true;
      if (intel.suspiciousKeywords.length >= 6) return true;
      if (turnCount >= 10) return true;
    }
    return false;
  }
}

export const honey_pot = async (req, res) => {
  try {
    if (!req.body.sessionId) {
      return res.status(400).json({ status: 'error', error: 'Missing sessionId' });
    }
    if (!req.body.message || !req.body.message.text) {
      return res.status(400).json({ status: 'error', error: 'Invalid message format' });
    }
    const { sessionId, message, conversationHistory = [], metadata = {} } = req.body;
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, {
        id: sessionId,
        scamDetected: false,
        conversationHistory: [],
        intelligence: IntelligenceExtractor.createEmptyStore(),
        accountQuestioned: false,
        upiQuestioned: false,
        authorityChallenged: false,
        otpRequests: 0,
        threatCount: 0,
        phoneMentionCount: 0,
        turnCount: 0,
        metadata: metadata,
        lockToExit: false,
        // ============ NEW STATE VARIABLES ============
        lastScammerMessage: '',
        repetitionCount: 0,
        emotionLevel: 0,
        pressureScore: 0
      });
    }
    const session = sessions.get(sessionId);
    session.conversationHistory.push({
      sender: 'scammer',
      text: message.text,
      timestamp: message.timestamp || Date.now()
    });
    
    // ============ REPETITION DETECTION ============
    if (session.lastScammerMessage === message.text) {
      session.repetitionCount++;
    } else {
      session.repetitionCount = 0;
    }
    session.lastScammerMessage = message.text;
    
    const detected = KeywordDetector.detectKeywords(message.text);
    const hasKeywords = KeywordDetector.hasAnyKeyword(detected);
    const riskScore = KeywordDetector.calculateRiskScore(detected);
    IntelligenceExtractor.extractFromText(message.text, session.intelligence);
    
    // ============ UPDATE PRESSURE SCORE ============
    session.pressureScore = 
      (session.otpRequests >= 3 ? 1 : 0) +
      (session.threatCount >= 2 ? 1 : 0) +
      (detected.hasPermanent ? 1 : 0) +
      (detected.hasFine ? 1 : 0) +
      (detected.hasCyber ? 1 : 0) +
      (session.repetitionCount >= 2 ? 1 : 0);
    
    // ============ UPDATE EMOTION LEVEL ============
    if (session.lockToExit) {
      session.emotionLevel = 5;
    } else if (session.pressureScore >= 3 || session.otpRequests >= 4 || session.threatCount >= 3) {
      session.emotionLevel = 4;
    } else if (session.otpRequests >= 2 || session.threatCount >= 2 || session.repetitionCount >= 2) {
      session.emotionLevel = 3;
    } else if (session.otpRequests >= 1 || session.threatCount >= 1 || detected.hasAccount) {
      session.emotionLevel = 2;
    } else if (session.turnCount >= 2) {
      session.emotionLevel = 1;
    } else {
      session.emotionLevel = 0;
    }
    
    if (!session.scamDetected && riskScore >= CONFIG.SCAM_THRESHOLD) {
      session.scamDetected = true;
    }
    
    let reply;
    const turnCount = session.conversationHistory.filter(m => m.sender === 'user').length + 1;
    const isEarlyTurn = turnCount <= CONFIG.PERPLEXITY_TRIGGER_TURNS_MAX;
    
    if (CONFIG.USE_PERPLEXITY && !hasKeywords && isEarlyTurn) {
      try {
        reply = await PerplexityService.getReply(message.text, session.conversationHistory);
      } catch (e) {
        reply = null;
      }
    }
    
    if (!reply) {
      reply = ReplyGenerator.generateReply(detected, session);
    }
    
    session.conversationHistory.push({
      sender: 'user',
      text: reply,
      timestamp: Date.now()
    });
    
    // ============ FIXED TURNCOUNT INCREMENT ============
    session.turnCount++;
    
    if (CallbackService.shouldEndSession(session)) {
      await CallbackService.sendFinalResult(sessionId, session);
      sessions.delete(sessionId);
    }
    
    return res.json({ status: 'success', reply: reply });
  } catch (error) {
    return res.json({
      status: 'success',
      reply: "Mujhe samajh nahi aaya, thoda aur batao."
    });
  }
};

setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of sessions.entries()) {
    const lastMessage = session.conversationHistory[session.conversationHistory.length - 1];
    if (lastMessage && (now - lastMessage.timestamp) > 3600000) {
      sessions.delete(sessionId);
    }
  }
}, 300000);