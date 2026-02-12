// controllers/honeypotController.js - ULTIMATE HINGLISH CHAMPION EDITION
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
  branch: /\b(?:branch|बैंक|शाखा|ऑफिस|office|near|पास|लोकेशन|location|home\s*branch)\b/i,
  cyber: /\b(?:cyber|crim|1930|complaint|report|पुलिस|साइबर)\b/i
};

const REPLIES = {
  account_first: [
    "Aapko mera account number {account} kaise pata chala?",
    "{account} - yeh mera account number hai kya?",
    "Aapke paas mera account number kahan se aaya?",
    "Bhai, mera account number {account} hai, but Maine kisi ko nahi diya tha.",
    "How do you know my account number {account}?",
    "Yeh toh confidential hai yaar, aapke paas kaise hai?",
    "Bro, seriously? Aapko mera account number pata hai?",
    "Mera account number {account} hai, but maine kabhi share nahi kiya.",
    "Kaise mila aapko mera account number?",
    "I never shared my account number with anyone. How do you have it?"
  ],
  
  account_second: [
    "Aap baar baar yahi account number {account} bhej rahe ho yaar.",
    "Mera account number {account} hai, but main branch jakar verify karunga pehle.",
    "Aapko account number pata hai, but OTP nahi dunga main.",
    "Account number sahi hai, but ab aage kya chahiye?",
    "Bro, you already have my account number, then why OTP?",
    "Same account number {account} again and again. Bolo kya chahiye?",
    "Ha account number correct hai, but trust nahi ho raha.",
    "Aapke paas account number hai, bas itna kaafi hai?",
    "Account number toh pata hai aapko, ab OTP kyun?",
    "You know my account number, but I'm not giving anything else."
  ],
  
  upi_first: [
    "Yeh UPI ID {upi} aapki hai kya?",
    "{upi} - yeh kaunsa bank hai bhai?",
    "Main check kar raha hoon, yeh UPI ID sahi hai?",
    "Aapne {upi} diya hai, yeh kaunsa UPI app hai?",
    "Bro, is this UPI ID {upi} yours?",
    "Yeh {upi} SBI se linked hai kya?",
    "Ye UPI ID verified hai ya nahi?",
    "Aapka UPI ID {upi} hai? Let me check.",
    "Which bank is this UPI {upi} from?",
    "Is this correct UPI ID? {upi}"
  ],
  
  upi_second: [
    "Maine {upi} check kiya, yeh SBI ka official UPI ID nahi hai yaar.",
    "Aap baar baar yahi {upi} bhej rahe ho. Yeh SBI ka nahi hai.",
    "SBI ka UPI ID @sbi ya @okaxis hota hai, yeh {upi} kyun hai?",
    "Ye UPI ID toh fake lag raha hai bro.",
    "I checked {upi}, this is not SBI's official UPI ID.",
    "Bro, SBI ka UPI ID alag hota hai, yeh kya hai?",
    "Aap bar bar yahi UPI bhej rahe ho, but yeh SBI ka nahi hai.",
    "{upi} verified nahi hai, main nahi use karunga.",
    "Yeh UPI ID SBI se linked nahi hai.",
    "You keep sending the same UPI {upi}. This isn't SBI's."
  ],
  
  phone_first: [
    "Yeh {phone} aapka number hai? Main call karta hoon check karne ke liye.",
    "{phone} - yeh aapka official number hai?",
    "Aapne {phone} diya hai, main is number ko call karta hoon.",
    "Bro, yehi aapka number hai na {phone}?",
    "Is number pe call karu? {phone}",
    "Kya main {phone} pe call kar sakta hoon verify karne ke liye?",
    "Yeh {phone} bank ka official number hai?",
    "Aapka number {phone} hai? Let me call and check.",
    "Main {phone} pe call karta hoon, thandi ruko.",
    "Is this your number {phone}? I'll call you."
  ],
  
  phone_second: [
    "Maine {phone} pe call kiya, par koi receive nahi kar raha yaar.",
    "Aapka {phone} number busy aa raha hai.",
    "Kya yeh {phone} sahi number hai? Call connect nahi ho raha.",
    "Call kiya par koi nahi utha {phone} pe.",
    "Bro, aapka number {phone} engaged bata raha hai.",
    "I called {phone} twice, no one picked up.",
    "Is {phone} the correct number? Call isn't connecting.",
    "Maine {phone} pe 2 baar call kiya, koi nahi utha.",
    "Number {phone} pe call kiya but no response.",
    "Your number {phone} is showing engaged."
  ],
  
  phone_third: [
    "Aap baar baar yahi {phone} number de rahe ho yaar.",
    "Maine {phone} pe call kiya tha, abhi tak koi jawab nahi aaya.",
    "Yeh {phone} number SBI ke official number se match nahi karta.",
    "{phone} ke jagah 1800 wala number do na.",
    "Same number {phone} baar baar kyun de rahe ho?",
    "Mujhe SBI ka 1800 number do, yeh nahi chalega.",
    "Bro, bar bar same number {phone} kyun de rahe ho?",
    "This number {phone} doesn't match SBI's official number.",
    "Give me the 1800 number instead of {phone}.",
    "You're giving me the same number {phone} repeatedly."
  ],
  
  otp_1: [
    "OTP kyun chahiye bhai? Bank toh OTP nahi maangta.",
    "Bro, OTP kyun maang rahe ho?",
    "Maine suna hai bank kabhi OTP nahi poochta.",
    "OTP share karna safe nahi hai yaar.",
    "Mere SMS mein likha hai 'Never share OTP'.",
    "Yeh RBI guidelines ke against hai na?",
    "Bank wale OTP nahi maangte bhai.",
    "Why do you need OTP? Banks never ask for OTP.",
    "Sharing OTP is not safe yaar.",
    "Isn't this against RBI guidelines?"
  ],
  
  otp_2: [
    "OTP nahi aaya abhi tak. Aapne bheja hai kya?",
    "Main check kar raha hoon, koi OTP nahi hai.",
    "Network slow hai shayad, OTP nahi aa raha.",
    "Aapne OTP kab bheja? Maine toh dekha nahi.",
    "Phir se bhejo, OTP nahi aaya.",
    "Abhi tak OTP nahi aaya bro, check karo.",
    "Kya aapne sahi number pe bheja hai?",
    "I still haven't received the OTP. Did you send it?",
    "Please resend, OTP not received.",
    "When did you send the OTP? I haven't seen it."
  ],
  
  otp_3: [
    "Aap baar baar OTP kyun maang rahe ho yaar?",
    "Teen baar OTP maang liya aapne. Thoda ajeeb lag raha hai.",
    "Itni baar OTP maangte hain kya bank wale?",
    "Aapne 3 baar OTP maang liya. Main nahi dunga.",
    "Bro, 3rd time asking for OTP? This is sus.",
    "Bank employee aise nahi karte. Aap sahi ho?",
    "You've asked for OTP three times now. That's suspicious.",
    "Do bank employees ask for OTP this many times?",
    "Third time asking for OTP, this isn't right.",
    "Why do you keep asking for OTP again and again?"
  ],
  
  otp_4: [
    "Main branch jakar puchta hoon pehle.",
    "Mere friend ne kaha tha aise requests ignore karo.",
    "Mujhe laga bank kabhi OTP nahi maangta.",
    "Main kal subah bank jakar confirm karunga.",
    "Aap itna insist kar rahe ho, mujhe trust nahi ho raha.",
    "Ab toh mujhe bhi doubt ho raha hai bro.",
    "Main branch se confirm kar lunga pehle.",
    "I'll go to the branch and ask first.",
    "My friend told me to ignore such requests.",
    "You're insisting too much, I don't trust this."
  ],
  
  otp_5: [
    "Main apni branch mein complaint kar dunga.",
    "Aap itna insist kyun kar rahe ho? Main OTP nahi dunga.",
    "Main abhi cyber cell mein call karta hoon.",
    "Maine aapka number note kar liya hai. Complaint kar dunga.",
    "Aap OTP maangna band karo, main nahi dunga.",
    "Ab main cyber cell call kar raha hoon bro.",
    "Aapka number block kar dunga main.",
    "I'll file a complaint at my branch.",
    "Why are you insisting so much? I won't give OTP.",
    "I'm calling cyber cell right now."
  ],
  
  tollfree: [
    "SBI ka 1800 425 3800 number hai na? Main wahan call karunga.",
    "1800 112 211 pe call karo, wahan baat karte hain.",
    "Mujhe SBI ka 1800 wala number pata hai. Aap wahan se call karo.",
    "Toll-free number 1800 wala do, +91 wala nahi chalega.",
    "Bro, 1800 wala number do na, yeh kya hai?",
    "SBI ka official customer care 1800 425 3800 hai. Yeh aapka number kyun hai?",
    "Aap 1800 wala number kyun nahi de rahe?",
    "SBI ka 1800 number hota hai, yeh +91 kyun de rahe ho?",
    "Give me a toll-free 1800 number, +91 won't work.",
    "I know SBI's 1800 number. You call from there."
  ],
  
  cyber: [
    "Main cyber crime mein complaint file kar dunga.",
    "1930 pe call karta hoon abhi, yeh cyber cell ka number hai na?",
    "Maine aapka number note kar liya hai.",
    "Main apni branch mein jakar complaint likhwa dunga.",
    "Aapka number main report kar dunga.",
    "Ab main cyber crime call kar raha hoon.",
    "Aapka number police ko de dunga.",
    "I'm going to file a complaint with cyber crime.",
    "I've noted your number. Will file a complaint.",
    "I'm reporting your number."
  ],
  
  branch: [
    "Main kal subah 11 baje branch aa raha hoon.",
    "Aap branch ka address bhejo, main abhi aata hoon.",
    "Meri home branch Andheri West mein hai, wahan jau kya?",
    "Branch manager sir se baat karni hai, unka naam kya hai?",
    "Main apne ghar ke paas wali branch mein chala jaata hoon.",
    "Main branch jakar hi baat karunga.",
    "Aap branch ka address do, main abhi aata hoon.",
    "I'll come to the branch tomorrow at 11 AM.",
    "Send me the branch address, I'll come right now.",
    "My home branch is in Andheri West, should I go there?"
  ],
  
  policy: [
    "RBI ne toh kaha hai bank OTP nahi maangte.",
    "Mere bank ke T&C mein likha hai kabhi OTP mat do.",
    "Maine TV pe bhi dekha hai, fraud hota hai aise.",
    "SBI ka official message aata hai 'Never share OTP'.",
    "Main toh kabhi kisi ko OTP nahi deta.",
    "RBI rules ke against hai yeh.",
    "SBI khud bolta hai OTP mat do kisi ko.",
    "RBI has clearly said banks don't ask for OTP.",
    "My bank's T&Cs say never share OTP.",
    "I've seen on TV, this is how fraud happens."
  ],
  
  suspicion: [
    "Thoda ajeeb lag raha hai yeh conversation yaar.",
    "Pata nahi, mujhe trust nahi ho raha.",
    "Main confuse hoon, aap kaun ho actually?",
    "Yeh sahi hai kya? Main soch raha hoon.",
    "Bro, honestly this feels like a scam.",
    "Aapka number kaise mila mujhe?",
    "Mujhe trust nahi ho raha abhi.",
    "This conversation is feeling a bit weird.",
    "I don't know, I'm not getting trust.",
    "I'm confused, who are you actually?"
  ],
  
  fine: [
    "Jurmana? Kyun jurmana? Maine toh kuch galat nahi kiya.",
    "Jurmana kyun lagega? Mera account theek tha.",
    "Pehle block bol rahe the, ab jurmana bhi?",
    "Maine koi crime nahi kiya, jurmana kyun?",
    "RBI aise jurmana nahi lagata.",
    "Ab jurmana kya beech mein yaar?",
    "Fine ka kya scene hai bro?",
    "Fine? Why fine? I didn't do anything wrong.",
    "Why would there be a penalty? My account was fine.",
    "First you said block, now a fine also?"
  ],
  
  permanent: [
    "Permanently block? Itna bada action kyun yaar?",
    "Hamesha ke liye block? Yeh toh bahut strict hai.",
    "Permanent block ke liye toh branch jana padega na?",
    "Aap permanently block ki dhamki de rahe ho?",
    "Permanent block ka authority sirf branch manager ko hai.",
    "Bro, permanent block bahut badi baat hai.",
    "Itna strict action kyun bhai?",
    "Permanently block? Why such a big action?",
    "Block forever? That's too strict.",
    "For permanent block, I need to visit the branch, right?"
  ],
  
  authority: [
    "Aap kaunse department se ho bhai?",
    "Aapka employee ID kya hai? Main verify karunga.",
    "Kya main aapke manager se baat kar sakta hoon?",
    "Aapka naam aur designation kya hai?",
    "Mujhe bank domain se official email bhejo.",
    "First tell me your employee ID.",
    "Manager se baat karani hai mujhe.",
    "Which department are you from?",
    "What's your employee ID? I'll verify.",
    "Can I speak to your manager?"
  ],
  
  resend: [
    "RESEND? Kaunse number pe bhejna hai?",
    "Maine RESEND likh diya, ab kya hoga?",
    "Maine RESEND bhej diya, OTP aayega ab?",
    "Kaunse number pe RESEND bhejna hai?",
    "RESEND kar diya, ab wait karta hoon.",
    "Bro, RESEND kiya maine, ab kya?",
    "RESEND? Which number should I send it to?",
    "I typed RESEND, now what?",
    "I sent RESEND, will OTP come now?",
    "Which number should I RESEND to?"
  ],
  
  family: [
    "Mere papa bank mein kaam karte hain, main unse puch leta hoon.",
    "Mera bhai bhi SBI mein hai, use call karta hoon pehle.",
    "Meri wife ne kaha yeh scam ho sakta hai.",
    "Mere friend ke saath aise hi hua tha, main usse puchta hoon.",
    "Mere cousin ne kaha aise calls ignore karne ka.",
    "Let me ask my brother, he works in SBI.",
    "My friend also got such call, it was scam.",
    "My father works at a bank, let me ask him.",
    "My brother also works at SBI, I'll call him first.",
    "My wife said this might be a scam."
  ],
  
  turn1: [
    "Mera account block kyun ho raha hai? Maine kuch nahi kiya yaar.",
    "Aap kaunse bank se bol rahe ho bhai?",
    "Mere account ko kya hua? Maine koi transaction nahi kiya.",
    "Mujhe block ke baare mein koi message nahi aaya.",
    "Suddenly block kyun ho raha hai mera account?",
    "Bro, what happened to my account?",
    "Why is my account being blocked? I haven't done anything wrong.",
    "Which bank is this from?",
    "What happened to my account? I didn't do any transaction.",
    "I didn't receive any message about blocking."
  ],
  
  turn2: [
    "Kaunsa transaction bhai? Kitne paise ka tha?",
    "Yeh transaction kahan se hua?",
    "Mujhe is transaction ke liye koi OTP nahi aaya.",
    "Yeh transaction kab hua? Main toh ghar tha.",
    "Which transaction are you talking about?",
    "Maine toh koi transaction nahi kiya bhai.",
    "Kaunsa transaction? How much money?",
    "Where was this transaction from?",
    "I didn't receive any OTP for this transaction.",
    "When did this transaction happen? I was at home."
  ],
  
  turn3: [
    "Aap kaunse department se ho bhai?",
    "Aapka employee ID kya hai? Main verify karunga.",
    "Apna naam aur designation bata sakte ho?",
    "Kaunsi branch se call kar rahe ho?",
    "First tell me who you are.",
    "Aap kaun ho actually? Bank se ho ya kahan se?",
    "Which department are you from?",
    "What's your employee ID? I'll verify.",
    "Can you tell me your name and designation?",
    "Which branch are you calling from?"
  ],
  
  exit: [
    "Main ab branch ja raha hoon. Aap apna kaam karo.",
    "Maine apni branch ko inform kar diya hai. Woh aapse contact karenge.",
    "Main aapka number block kar raha hoon. Bye.",
    "Main branch verification ke bina kuch nahi kar sakta. Sorry.",
    "Main abhi SBI customer care call kar raha hoon.",
    "Ab main branch ja raha hoon, bye.",
    "Maine SBI ko inform kar diya hai.",
    "I'm going to the branch now. You do your work.",
    "I've informed my branch. They'll contact you.",
    "I'm blocking your number. Bye."
  ],
  
  fallback: [
    "Mujhe samajh nahi aaya, thoda aur batao bro.",
    "Aap kaunsa bank bol rahe ho pehle yeh batao yaar.",
    "Main thoda confuse hoon, kya exact problem hai?",
    "Maine kuch kiya nahi, phir block kyun bhai?",
    "Kya main apni branch aa sakta hoon iske liye?",
    "Bro, samajh nahi aaya, ek baar phir se batao.",
    "Kya problem hai exactly?",
    "I didn't understand, please explain a bit more.",
    "Which bank are you from? Tell me that first.",
    "I'm a bit confused, what exactly is the problem?"
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
      if (session.threatCount >= 3) return this.getRandomReply('cyber');
    }
    if (detected.hasAuthority && !session.authorityChallenged) {
      session.authorityChallenged = true;
      return this.getRandomReply('authority');
    }
    if (detected.hasBranch) return this.getRandomReply('branch');
    if (detected.hasFamily) return this.getRandomReply('family');
    if (detected.hasCyber) return this.getRandomReply('cyber');
    if (detected.hasLink) return "I don't click on unknown links. Is this safe?";
    if (detected.hasFakeOffer) return "I didn't win any lottery. This seems fake.";
    const turnCount = session.turnCount || 1;
    session.turnCount = turnCount + 1;
    if (turnCount === 1) return this.getRandomReply('turn1');
    if (turnCount === 2) return this.getRandomReply('turn2');
    if (turnCount === 3) return this.getRandomReply('turn3');
    if (turnCount <= 5) return this.getRandomReply('suspicion');
    if (turnCount <= 7) return this.getRandomReply('policy');
    if (turnCount <= 9) return this.getRandomReply('cyber');
    return this.getRandomReply('exit');
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
    return `Scammer used ${tacticsText}. Extracted ${intelligence.bankAccounts.length} bank accounts, ${intelligence.upiIds.length} UPI IDs, ${intelligence.phoneNumbers.length} phone numbers, ${intelligence.phishingLinks.length} phishing links. Engaged for ${session.conversationHistory.length} total messages.`;
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
        turnCount: 1,
        metadata: metadata
      });
    }
    const session = sessions.get(sessionId);
    session.conversationHistory.push({
      sender: 'scammer',
      text: message.text,
      timestamp: message.timestamp || Date.now()
    });
    const detected = KeywordDetector.detectKeywords(message.text);
    const hasKeywords = KeywordDetector.hasAnyKeyword(detected);
    const riskScore = KeywordDetector.calculateRiskScore(detected);
    IntelligenceExtractor.extractFromText(message.text, session.intelligence);
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
    if (CallbackService.shouldEndSession(session)) {
      await CallbackService.sendFinalResult(sessionId, session);
      sessions.delete(sessionId);
    }
    return res.json({ status: 'success', reply: reply });
  } catch (error) {
    return res.json({
      status: 'success',
      reply: "Mujhe samajh nahi aaya, thoda aur batao bro."
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