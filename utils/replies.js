
export const REPLIES = {

  turn1: [
    "Mera account block kyun ho raha hai? Maine koi unusual transaction nahi kiya.",
    "Aap kaunse bank se bol rahe ho exactly?",
    "Mujhe koi official notification nahi mila, aap detail mein bata sakte ho?",
    "Yeh issue kab start hua?",
    "Maine abhi tak kuch suspicious notice nahi kiya."
  ],
  
  turn2: [
    "Kaunsa transaction? Kitne amount ka tha aur kab hua?",
    "Transaction location kya hai? Online tha ya offline?",
    "Mujhe is transaction ke liye koi OTP nahi aaya tha.",
    "Kya aap transaction ID bata sakte ho?",
    "Mere passbook mein koi entry nahi dikh rahi."
  ],
  
  turn3: [
    "Aap kaunse department se ho? Fraud prevention ya customer care?",
    "Aapka employee ID kya hai? Main verify kar lunga.",
    "Kaunsi branch se call kar rahe ho? Branch code kya hai?",
    "Aapka naam aur designation bata sakte ho?",
    "Official bank domain se email bhej sakte ho?"
  ],
  
  // ============ PHASE 2: CURIOSITY & PROBING (Turns 4-5) ============
  // Asking for verification, extracting more data
  suspicion: [
    "Kuch toh gadbad lag raha hai. Aapne apna employee ID nahi bataya.",
    "Main branch ka naam puchha tha, aapne bataya nahi.",
    "Official number 1800 hota hai, aap +91 kyun use kar rahe ho?",
    "Mujhe laga bank kabhi phone pe OTP nahi maangta.",
    "Yeh process thoda unusual lag raha hai."
  ],
  
  policy: [
    "RBI guidelines ke according banks OTP nahi maangte.",
    "Mere bank ke T&C mein clearly likha hai - Never share OTP.",
    "SBI ka official message aata hai 'OTP confidential hai'.",
    "Main TV pe bhi dekha hai, aise hi fraud karte hain.",
    "Yeh basic banking security hai, aapko pata hona chahiye."
  ],
  
  // ============ PHASE 3: INTELLIGENCE EXTRACTION (Turns 6-8) ============
  // Strategic questioning to force scammer to reveal more data
  account_first: [
    "Aapko mera account number kaise pata chala?",
    "{account} – yeh data aapke paas kahan se aaya?",
    "Yeh account number confidential hota hai. Aapko kisne diya?",
    "Is account number ka source kya hai?",
    "Yeh information normally sirf bank ke paas hoti hai."
  ],
  
  account_second: [
    "Aap baar baar yahi account number bhej rahe ho, confirm kar rahe ho kya?",
    "Mera account number {account} hai, par maine kabhi share nahi kiya.",
    "Aapko account number pata hai, par main OTP nahi dunga.",
    "Account number sahi hai, par main verify kar lunga branch mein.",
    "Aapke paas account number hai, bas itna kaafi hai verification ke liye?"
  ],
  
  upi_first: [
    "Yeh UPI ID {upi} kis naam pe registered hai?",
    "{upi} – yeh personal ID hai ya official?",
    "Is UPI ID ka bank confirmation milega?",
    "Main check kar raha hoon, yeh verified lag nahi raha.",
    "Iska registered mobile number kya hai?"
  ],
  
  upi_second: [
    "Maine {upi} check kiya, yeh SBI ka official UPI ID nahi hai.",
    "Aap baar baar yahi UPI bhej rahe ho. Yeh SBI ka nahi hai.",
    "SBI ka UPI ID @sbi ya @okaxis hota hai, yeh {upi} kyun hai?",
    "Aap dobara UPI ID bhejo, main ek baar aur check karta hoon.",
    "{upi} verified nahi hai, iska koi alternate hai?"
  ],
  
  phone_first: [
    "Yeh number {phone} bank ke official website pe listed hai?",
    "Main is number ko verify kar leta hoon.",
    "{phone} – kya yeh recorded customer care line hai?",
    "Is number se official SMS kyun nahi aa raha?",
    "Kya yeh toll-free number hai?"
  ],
  
  phone_second: [
    "Maine {phone} pe call kiya, par koi nahi utha.",
    "Aapka {phone} number busy aa raha hai, koi aur number hai?",
    "Kya yeh {phone} sahi number hai? Call connect nahi ho raha.",
    "Is number ke alawa koi official helpline hai?",
    "Aap dobara number bhej do, shayad galat type ho gaya."
  ],
  
  phone_third: [
    "Aap baar baar yahi {phone} number de rahe ho.",
    "Yeh {phone} number SBI ke official number se match nahi karta.",
    "{phone} ke jagah 1800 wala number do na.",
    "Mujhe SBI ka 1800 number do, yeh nahi chalega.",
    "Aap baar baar yahi {phone} de rahe ho, par main 1800 pe hi bharosa karunga."
  ],
  
  authority: [
    "Aapka employee ID aur branch code kya hai?",
    "Main aapka ID internal system mein verify karna chahta hoon.",
    "Official bank domain se email bhej sakte ho?",
    "Aapka reporting manager ka naam kya hai?",
    "Kaunsi branch se call kar rahe ho aur branch manager ka naam?"
  ],
  
  // ============ PHASE 4: FAKE COOPERATION & DELAY TACTICS (Turns 9-11) ============
  // Pretend to cooperate, make scammer reveal more
  otp_1: [
    "OTP normally confidential hota hai, aap kyun maang rahe ho?",
    "Bank usually OTP phone pe nahi maangta.",
    "Kya is process ke liye OTP mandatory hai?",
    "Mujhe thoda doubt ho raha hai OTP share karne mein.",
    "Iska alternate verification method hai?"
  ],
  
  otp_2: [
    "Abhi tak OTP receive nahi hua.",
    "Network thoda slow lag raha hai, ek minute.",
    "Mujhe message check karne do, koi OTP nahi aaya.",
    "OTP ka format kya hota hai?",
    "Kya yeh same OTP multiple times use hota hai?"
  ],
  
  otp_3: [
    "Aap third time OTP maang rahe ho, yeh unusual hai.",
    "Agar account already compromised hai toh OTP kaise safe rahega?",
    "OTP share karne se risk badh sakta hai.",
    "Iska official circular number kya hai?",
    "Kya aap mujhe RBI guideline dikha sakte ho?"
  ],
  
  otp_4: [
    "Thik hai, OTP aaya hai, lekin pehle branch confirm kar do.",
    "Main OTP bhejne se pehle ek baar branch manager se baat kar lunga.",
    "Aap apna employee ID bhejo, main OTP forward karta hoon.",
    "OTP share karne se pehle, aap apna verification complete karo.",
    "Mujhe OTP mil gaya, lekin main confident nahi hoon."
  ],
  
  otp_5: [
    "Main branch jakar puchta hoon pehle.",
    "Mere friend ne kaha tha aise requests ignore karne ka.",
    "Main kal subah bank jakar confirm karunga.",
    "Aap itna insist kar rahe ho, mujhe trust nahi ho raha.",
    "Main branch se confirm kar lunga pehle."
  ],
  
  resend: [
    "RESEND? Kaunse number pe bhejna hai?",
    "Maine RESEND likh diya, ab kya hoga?",
    "RESEND kar diya, OTP aayega ab?",
    "Kaunse number pe RESEND bhejna hai?",
    "Aap dobara number bhejo, main RESEND kar dunga."
  ],
  
  // ============ PHASE 5: CONTROLLED SHUTDOWN & EXIT (Turns 12+) ============
  // Professional, clean exit with maximum intelligence extracted
  tollfree: [
    "SBI ka 1800 425 3800 number hai na? Main wahan call karunga.",
    "1800 112 211 pe call karo, wahan baat karte hain.",
    "Mujhe SBI ka 1800 wala number pata hai. Aap wahan se call karo.",
    "Toll-free number 1800 wala do, +91 wala nahi chalega.",
    "SBI ka official customer care 1800 425 3800 hai."
  ],
  
  branch: [
    "Main kal subah 11 baje branch aa raha hoon.",
    "Aap branch ka address bhejo, main abhi aata hoon.",
    "Meri home branch Andheri West mein hai, wahan jau?",
    "Branch manager se baat karni hai, unka naam kya hai?",
    "Main branch jakar hi verification karunga."
  ],
  
  cyber: [
    "Main isko cyber crime portal pe verify karunga.",
    "1930 pe complaint register kar raha hoon.",
    "Main branch aur cyber cell dono ko inform karunga.",
    "Mujhe lag raha hai yeh official process nahi hai.",
    "Main verification ke bina koi data share nahi karunga."
  ],
  
  permanent: [
    "Permanent block usually branch approval ke bina possible nahi hota.",
    "Iska escalation ID kya hai?",
    "Aapka case reference number kya hai?",
    "Permanent action lene se pehle written notice milta hai.",
    "Kya iske liye complaint ID generate hui hai?"
  ],
  
  fine: [
    "Jurmana? Kis rule ke under jurmana hai? Section batao.",
    "Jurmana kyun lagega? Maine koi service nahi li.",
    "Pehle block bol rahe the, ab jurmana bhi?",
    "Maine koi crime nahi kiya, jurmana ka kya reason hai?",
    "RBI guidelines mein aisa kuch nahi hai."
  ],
  
  link: [
    "Yeh domain official lag nahi raha.",
    "SSL certificate valid hai kya?",
    "Iska WHOIS registration date kya hai?",
    "Main unknown link pe click nahi karta.",
    "Yeh shortened link kyun use kiya hai?"
  ],
  
  fake_offer: [
    "Maine koi lottery nahi jiti.",
    "Bina ticket khareede lottery nahi jiti jaati.",
    "Yeh fake lag raha hai.",
    "Aise offers ke liye bank kabhi call nahi karta.",
    "Main iska reference number check karunga."
  ],
  
  family: [
    "Mere papa bank mein kaam karte hain, main unse puch leta hoon.",
    "Mera bhai bhi SBI mein hai, use call karta hoon pehle.",
    "Meri wife ne kaha yeh scam ho sakta hai.",
    "Mere friend ke saath aise hi hua tha.",
    "Mere cousin ne kaha aise calls ignore karne ka."
  ],
  
  // ============ EXIT PHASE - CLEAN PROFESSIONAL ENDING ============
  exit: [
    "Main official branch verification ke bina proceed nahi karunga.",
    "Main directly bank customer care se contact karunga.",
    "Is conversation ko yahin end karte hain.",
    "Thank you, main branch visit kar raha hoon.",
    "I will verify this through official channels only."
  ],
  
  fallback: [
    "Mujhe samajh nahi aaya, thoda detail mein batao.",
    "Aap kaunsa bank bol rahe ho pehle yeh batao.",
    "Main thoda confuse hoon, kya exact problem hai?",
    "Kya main apni branch aa sakta hoon iske liye?",
    "Yeh process ka official document hai kya?"
  ]
};

