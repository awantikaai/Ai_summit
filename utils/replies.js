export const REPLIES = {

  // ============ PHASE 1: CONFUSED VICTIM (Turns 1-2) ============
  victim_confused: [
    "Kya? Mera account block ho jayega? Maine toh koi transaction nahi kiya.",
    "Aap kaun bol rahe ho? Bank se ho? Kaunsa bank?",
    "Mujhe koi message nahi aaya. Aapko kaise pata chala?",
    "Yeh sab kya chal raha hai? Main samajh nahi pa raha.",
    "Mera account kaise block hoga? Maine toh kuch kiya hi nahi."
  ],
  
  victim_worried: [
    "Kaunsa transaction? Kitne paise ka tha? Mera balance toh same hai.",
    "Transaction kab hua? Maine toh koi OTP nahi diya.",
    "Kya aap transaction ID bata sakte ho? Main check kar leta hoon.",
    "Online transaction tha ya ATM se? Mujhe kuch pata nahi.",
    "Maine apna passbook check kiya, koi entry nahi hai."
  ],

  // ============ PHASE 2: TRAPPED VICTIM (Turns 3-4) ============
  victim_scared: [
    "Aap kaunse department se ho? Main dar gaya hoon.",
    "Mera account safe hai na? Aap batao kya karu?",
    "Main thoda confuse hoon. Aap help karo na.",
    "Please batao kya karna hai. Main tension mein hoon.",
    "Mujhe kuch samajh nahi aa raha. Aap hi guide karo."
  ],
  
  victim_asking: [
    "Aapka employee ID kya hai? Main note kar leta hoon.",
    "Aap fraud prevention team se ho? Kaunsi branch se?",
    "Main kahan jaakar verify karu? Branch address batao.",
    "Aapka naam kya hai? Main call back kar sakta hoon?",
    "Official number kya hai aapka? Main confirm kar leta hoon."
  ],

  // ============ ASK FOR SCAMMER INFO ============
  ask_scammer_name: [
    "Aapka naam kya hai? Main note kar leta hoon.",
    "Aap kaun ho? Pehle apna introduction do.",
    "Aapka naam kya hai? Main call back kar sakta hoon aapko?",
    "Kaunsa department? Aapka naam kya hai wahan?",
    "Mujhe aapka naam batao, main record mein rakh leta hoon."
  ],

  ask_scammer_phone: [
    "Aapka number kya hai? Main call back karunga.",
    "Mujhe aapka phone number do, main contact kar leta hoon.",
    "Aap kis number se bol rahe ho? Main wahan call kar leta hoon.",
    "Aapka contact number batao, main call back kar sakta hoon?",
    "Is number ke alawa koi aur number hai aapka?"
  ],

  ask_employee_id: [
    "Aapka employee ID kya hai? Main verify kar leta hoon.",
    "Employee ID batao, main check karunga system mein.",
    "Aapke employee ID ke aage branch code kya hai?",
    "SBI mein employee ID ka format kya hota hai? Aapka kya hai?",
    "Main aapka ID note kar leta hoon. Kya hai?"
  ],

  ask_branch_code: [
    "Aapka branch code kya hai? Main verify karunga.",
    "Kaunsi branch se bol rahe ho? Branch code batao.",
    "Branch ka IFSC code kya hai?",
    "Branch code ke saath branch address bhi batao.",
    "Aapke branch ka telephone number kya hai?"
  ],

  ask_official_number: [
    "Official number kya hai aapka? Main confirm kar leta hoon.",
    "Aapka department ka official number batao.",
    "SBI ka official helpline number 1800 hota hai. Aapka kyun nahi?",
    "Main aapke official number pe call back karunga. Batao.",
    "Aapka customer care number kya hai? Main wahan call karunga."
  ],

  // ============ ACCOUNT EXTRACTION ============
  account_shocked: [
    "Aapko mera account number {account} kaise pata chala? Yeh toh confidential hai.",
    "{account} – yeh mera account number hai! Aapke paas kaise aaya?",
    "Mera account number {account} sahi hai. Aapka system mein kya show ho raha hai?",
    "Account number {account} hai. Aapke paas aur kya information hai mere baare mein?",
    "Yeh mera account number {account} hai. Aapko kis transaction ki baat kar rahe ho?"
  ],
  
  account_verify: [
    "Aapke system mein account {account} ke saath mera address kya hai?",
    "Account {account} ka nominee ka naam kya hai aapke paas?",
    "Mera date of birth kya hai records mein? Batao toh main confirm kar leta hoon.",
    "Account open date kya hai aapke paas? Main check kar leta hoon.",
    "Is account mein joint holder ka naam kya hai? Batao."
  ],

  // ============ UPI EXTRACTION ============
  upi_confirm: [
    "Yeh UPI ID {upi} hai na? Main check kar raha hoon.",
    "{upi} – yeh sahi hai? Kahan se aaya yeh UPI ID?",
    "Is UPI ID ka registered mobile number kya hai?",
    "Yeh UPI ID kaunsa bank use kar raha hai?",
    "{upi} ko verify kaise karun? Koi option hai?"
  ],
  
  upi_scared: [
    "Maine {upi} check kiya, par samajh nahi aaya. Aap dobara batao.",
    "Yeh {upi} sahi hai? Main confuse ho raha hoon.",
    "Is UPI ID se koi transaction hua hai kya?",
    "Mujhe {upi} pe bhejna hai kuch? Kaise bheju?",
    "Yeh UPI ID safe hai na? Main dar raha hoon."
  ],

  // ============ AUTHORITY BELIEVE ============
  authority_believe: [
    "Aap SBI se ho? Aapka employee ID kya hai? Main note kar leta hoon.",
    "Fraud prevention team se ho? Aapka department code kya hai?",
    "Aapka naam kya hai? Main call back kar sakta hoon aapko?",
    "Aapke manager ka naam kya hai? Unse baat karni hai.",
    "Aapka employee ID aur branch code batao, main record mein rakh leta hoon."
  ],

  // ============ PHONE CONTEXT AWARE ============
  phone_victim_confirm: [
    "Haan {phone} mera number hai. OTP isi number pe aayega na?",
    "Mera number {phone} hai. Main wait kar raha hoon OTP ka.",
    "Haan haan, {phone} mera hi number hai. OTP kab aayega?",
    "Maine apna number {phone} diya tha registration time pe.",
    "OTP {phone} pe aana chahiye. Abhi tak nahi aaya."
  ],
  
  phone_victim_wait: [
    "Mera number {phone} hai. OTP nahi aaya abhi tak.",
    "Network slow hai kya? {phone} pe abhi tak OTP nahi aaya.",
    "Main check kar raha hoon {phone} pe, koi OTP nahi aaya.",
    "Dobara bhejo {phone} pe, OTP expire ho gaya.",
    "{phone} pe message check kiya, koi OTP nahi hai."
  ],
  
  phone_scammer_curious: [
    "Yeh {phone} aapka number hai? Main call kar sakta hoon ispe?",
    "{phone} – yeh aapka personal number hai?",
    "Is number {phone} pe aap available ho? Main call back karunga.",
    "Aapne {phone} diya hai. Yeh customer care number hai?",
    "Main {phone} pe call kar ke baat kar leta hoon."
  ],
  
  phone_scammer_doubt: [
    "Maine {phone} pe call kiya, par koi nahi utha. Aap ho wahan?",
    "Yeh {phone} number busy aa raha hai. Koi aur number hai?",
    "Is {phone} pe aap nahi utha rahe. Main kya karun?",
    "Aapka number {phone} sahi hai? Call connect nahi ho raha.",
    "Dobara number bhejo, {phone} pe call nahi lag raha."
  ],
  
  phone_scammer_compare: [
    "Yeh {phone} number hai. Par SBI ka official number 1800 hota hai na?",
    "{phone} toh personal number lag raha hai. 1800 wala kyun nahi de rahe?",
    "SBI ka toll-free 1800 425 3800 hai. Yeh {phone} kyun hai?",
    "Main 1800 pe call kar ke confirm kar leta hoon. Aapka {phone} nahi chalega.",
    "Aap bar bar {phone} de rahe ho, par main 1800 pe hi bharosa karunga."
  ],

  // ============ PHONE AMBIGUOUS ============
  phone_ambiguous: [
    "Yeh number {phone} kisका hai? Aapka ya mera?",
    "Confuse ho gaya. {phone} aapka number hai ya mujhe OTP ispe bhejna hai?",
    "Please clear karo - {phone} aapka hai jahan main call karu?",
    "Ek baar batao - {phone} kisका number hai?",
    "Mujhe lag raha hai {phone} aapka number hai. Confirm karo."
  ],

  // ============ PROGRESSIVE OTP ============
  otp_first_trapped: [
    "OTP aaya hai! Ab main kya karun? Aap batao.",
    "OTP mil gaya. Kahan bhejna hai yeh?",
    "OTP aaya, par main dar raha hoon share karne se. Safe hai na?",
    "Maine OTP dekha. Aapka employee ID kya tha? Main note kar leta hoon.",
    "OTP aaya hai. Ab kya process hai?"
  ],
  
  otp_second_confused: [
    "OTP nahi aa raha. Phir se bhejo. Aapka number sahi hai?",
    "Network slow hai, OTP late aa raha. Employee ID dubara batao.",
    "OTP aaya nahi. Check karo aur branch code batao.",
    "SMS aa raha hai but OTP nahi. Aapka department kya hai?",
    "OTP ka wait kar raha hoon. Aapka reporting officer ka naam kya hai?"
  ],
  
  otp_third_panicking: [
    "Teen baar OTP maang liya. Mera account block toh nahi hoga?",
    "Main dar gaya hoon. Aap sure ho na ki yeh sahi hai?",
    "OTP share kar diya toh mera account safe rahega na?",
    "Mujhe trust nahi ho raha. Aap apna ID prove karo.",
    "Ek baar branch se confirm kar leta hoon. Branch ka pata kya hai?"
  ],
  
  otp_fourth_almost: [
    "Thik hai, OTP dunga. Lekin pehle batao aapka system mein mera address kya hai?",
    "Main OTP dene ko taiyaar hoon. Account {account} ka nominee ka naam batao.",
    "Mera date of birth batao aapke records mein, phir OTP dunga.",
    "Account open karne waqt konsi branch mein aaya tha main? Batao.",
    "Mera PAN number kya hai aapke paas? Confirm karo."
  ],
  
  otp_final_refuse: [
    "Main OTP nahi de sakta. Mujhe dar lag raha hai.",
    "Yeh process sahi nahi lag raha. Main branch ja raha hoon.",
    "Aapne bahut baar OTP manga. Main confident nahi hoon.",
    "Main ab SBI ke official number pe call kar raha hoon.",
    "Maine aapka number note kar liya. Branch mein complaint karunga."
  ],
  
  otp_resend_scared: [
    "RESEND kar diya. OTP aane do. Aap apna employee ID batao.",
    "RESEND kiya. Network slow hai. Aapka branch code kya hai?",
    "RESEND ho gaya. Aap fraud department se ho ya risk team se?",
    "RESEND bhej diya. Aapka reporting manager ka naam kya hai?",
    "RESEND kiya. OTP aa raha hoga. Aapka designation kya hai?"
  ],
  
  otp_resend_again: [
    "Phir se RESEND kar diya. OTP aane do.",
    "RESEND kiya dubara. Network slow hai shayad.",
    "Maine RESEND kar diya. Ab wait karta hoon.",
    "RESEND ho gaya. Kab tak aayega OTP?",
    "Dobara RESEND bhej diya. Check karo."
  ],

  // ============ THREAT RESPONSES ============
  permanent_scared: [
    "Permanent block? Mera account hamesha ke liye block ho jayega?",
    "Nahi please, mera account mat block karo. Main kya karun?",
    "Permanent block ka kya matlab hai? Mera paisa khatam ho jayega?",
    "Aap mujhe bachao. Main kya step lu?",
    "Branch manager se baat karwa do. Main unse baat kar leta hoon."
  ],
  
  fine_worried: [
    "Jurmana? Kitna jurmana lagega? Maine kya galat kiya?",
    "Jurmana kyun? Mera account theek tha. Aap batao kya karun.",
    "Jurmana bharne se mera account safe ho jayega?",
    "Jurmana kaise bharein? Online bheju aapko?",
    "RBI aise jurmana lagata hai kya? Main confuse hoon."
  ],

  // ============ LINK & OFFER ============
  link_curious: [
    "Yeh link safe hai? Main click karun ispe?",
    "Link khola toh kya hoga? Mera phone safe hai na?",
    "Aap bhej rahe ho toh click kar leta hoon. Kya hoga ismein?",
    "Yeh link kyun bhej rahe ho? Ispe kya hai?",
    "Main click kar dunga. Phir kya karna hai?"
  ],
  
  offer_tempted: [
    "Kaunsa offer? Mujhe kuch nahi mila.",
    "Lottery? Maine toh koi ticket nahi kharida.",
    "Cashback kaise milega? Kya karna hoga?",
    "Yeh offer sach mein hai? Mujhe bhi milega?",
    "Main interested hoon. Aage ka process kya hai?"
  ],

  // ============ POLICY ============
  policy_confused: [
    "RBI kya kehta hai aise cases mein? Mujhe pata nahi.",
    "Bank ke rules kya hain? Main nahi jaanta.",
    "Yeh process RBI ke according hai na? Aap batao.",
    "Main common man hoon, mujhe yeh sab nahi pata.",
    "Aap hi batao kya sahi hai. Main aapke bharose hoon."
  ],

  // ============ REPETITION RESPONSES ============
  repetition_mild: [
    "Aapne yeh baat pehle bhi kahi thi. Kuch aur batao?",
    "Haan haan, yeh aap bol chuke ho. Aage kya?",
    "Maine sun liya. Ab kya karna hai?",
    "Yeh aap repeat kar rahe ho. Koi nayi baat?",
    "Samajh gaya, par aage kya process hai?"
  ],

  repetition_annoyed: [
    "Aap baar baar yahi keh rahe ho. Thoda confuse ho raha hoon.",
    "Yeh teen baar ho gaya same baat. Kuch aur batao.",
    "Mujhe lag raha hai aap script padh rahe ho. Naya kuch bolo.",
    "Repetition se kuch nahi hoga. Aage ka batao.",
    "Main wait kar raha hoon kuch nayi information ka."
  ],

  repetition_frustrated: [
    "Aap same baat baar baar bol rahe ho. Main confuse ho raha hoon.",
    "Yeh 4th baar hai aap yahi keh rahe ho. Kya problem hai?",
    "Mujhe lagta hai main kuch galat samajh raha hoon. Dobara explain karo.",
    "Aapki baat samajh aa rahi hai, par kuch naya bhi bolo.",
    "Main thoda frustrated ho raha hoon. Kuch aur information do."
  ],

  // ============ FAMILY ============
  family_worried: [
    "Mere papa bank mein kaam karte hain. Main unse puch leta hoon.",
    "Mera bhai bhi SBI mein hai. Use call karta hoon pehle.",
    "Meri wife ne kaha yeh scam ho sakta hai. Aap sahi toh ho?",
    "Mere friend ke saath aise hi hua tha. Main usse puchta hoon.",
    "Mere cousin ne kaha aise calls pe dhyan mat do. Main kya karun?"
  ],

  // ============ TOLL-FREE ============
  tollfree_curious: [
    "SBI ka 1800 425 3800 number hai na? Main wahan call kar leta hoon.",
    "1800 112 211 pe call karun? Wahan se confirm ho jayega?",
    "Mujhe SBI ka 1800 wala number pata hai. Wahan call kar ke puchta hoon.",
    "Toll-free number 1800 wala do. Main abhi call karta hoon.",
    "Main 1800 pe call kar ke confirm kar lunga ki aap sahi ho."
  ],

  // ============ BRANCH VISIT ============
  branch_visit: [
    "Main kal subah 11 baje branch aa raha hoon. Branch manager ka naam kya hai?",
    "Aap branch ka address bhejo, main abhi aata hoon.",
    "Meri home branch Andheri West mein hai. Wahan jau?",
    "Branch manager se baat karni hai. Unka naam kya hai?",
    "Main branch jakar hi verification karunga. Address do."
  ],

  // ============ CYBER ============
  cyber_threat: [
    "Main 1930 pe call kar raha hoon. Aapka number cyber cell ke paas hai.",
    "Maine cyber crime portal pe complaint file kar di.",
    "Cyber cell ne kaha aise numbers block kar do. Main block kar raha hoon.",
    "Aapka number trace ho raha hai cyber cell se.",
    "Main branch aur cyber cell dono ko inform kar dunga."
  ],
  
  cyber_complaint: [
    "Main cyber crime mein complaint kar dunga. Number kya hai?",
    "1930 pe call karun? Yeh cyber cell ka number hai na?",
    "Maine aapka number note kar liya. Cyber cell ko dunga.",
    "Cyber crime portal pe online complaint kaise karein?",
    "Main branch aur cyber cell dono ko inform kar dunga."
  ],

  // ============ FINAL EXIT ============
  final_goodbye: [
    "Main branch ja raha hoon. Aap apna kaam karo.",
    "Maine SBI customer care ko inform kar diya hai.",
    "Is conversation ko yahin end karte hain. Thank you.",
    "Main official channel se verify kar lunga. Bye.",
    "Aapka number main block kar raha hoon. Don't call again."
  ],

  // ============ FALLBACK ============
  fallback_scared: [
    "Mujhe samajh nahi aaya. Aap hi batao kya karna hai.",
    "Main confuse hoon. Aap guide karo na.",
    "Kya exact problem hai? Main dar gaya hoon.",
    "Mera account safe hai na? Aap batao.",
    "Main aapke bharose hoon. Jo kaho karunga."
  ]
};