import axios from "axios";

const PERPLEXITY_REPLY_CATEGORIES = {
  confusion: [
    "Mujhe samajh nahi aaya. Aap kya keh rahe ho?",
    "Main thoda confuse hoon. Thoda explain karo.",
    "Yeh sab kya hai? Main samajh nahi pa raha.",
    "Kya aap mujhe thoda detail mein bata sakte ho?",
    "Mujhe kuch samajh nahi aaya. Aap kaun ho?"
  ],

  curiosity: [
    "Aapka naam kya hai? Kahan se bol rahe ho?",
    "Yeh kaunsa company hai? Pehli baar suna.",
    "Aapko mera number kahan se mila?",
    "Main interested hoon. Aage kya karna hai?",
    "Yeh offer sach mein hai? Mujhe batao."
  ],

  interest: [
    "Batao kya offer hai? Mujhe suno.",
    "Main sun raha hoon. Aage batao.",
    "Kya offer hai? Mujhe details chahiye.",
    "Main interested hoon. Aap batao.",
    "Offer mein kya milega? Batao na."
  ],

  skepticism: [
    "Yeh sahi lag raha hai? Mujhe doubt ho raha.",
    "Aap sahi ho na? Main verify karna chahta hoon.",
    "Koi official proof hai aapke paas?",
    "Main pehle confirm kar leta hoon.",
    "Yeh process thoda ajeeb lag raha hai."
  ],

  clarification: [
    "Maine check kiya, koi issue nahi dikh raha.",
    "Aap jo bol rahe ho woh mere records se match nahi kar raha.",
    "Mujhe koi notification nahi aaya.",
    "Kya aap transaction ID share kar sakte ho?",
    "Yeh issue kab start hua exactly?"
  ]
};

export class PerplexityService {

  static async selectCategory(message, conversationHistory, config) {
    if (!config?.USE_PERPLEXITY) return "curiosity";

    try {
      const recentContext = conversationHistory
        .slice(-2)
        .map(m => `${m.sender}: ${m.text}`)
        .join("\n");

      const response = await axios.post(
        config.PERPLEXITY_URL,
        {
          model: "sonar-pro",
          messages: [
            {
              role: "system",
              content: `Classify the user message into ONE category.
Valid categories: confusion, curiosity, interest, skepticism, clarification
Rules: Return ONLY the category name. No punctuation. No explanation. If unsure, return curiosity.`
            },
            {
              role: "user",
              content: `Message: "${message}"\n\nRecent conversation:\n${recentContext}\n\nCategory:`
            }
          ],
          temperature: 0.2,
          max_tokens: 5
        },
        {
          headers: {
            Authorization: `Bearer ${config.PERPLEXITY_API_KEY}`,
            "Content-Type": "application/json"
          },
          timeout: config.PERPLEXITY_TIMEOUT || 2000
        }
      );

      let category = response?.data?.choices?.[0]?.message?.content || "";
      category = category.toLowerCase().trim().replace(/[^a-z]/g, "");

      if (!PERPLEXITY_REPLY_CATEGORIES[category]) {
        return "curiosity";
      }
      return category;

    } catch (error) {
      console.log('Perplexity error:', error.message);
      return "curiosity";
    }
  }

  static getReply(category, session) {
    const replies = PERPLEXITY_REPLY_CATEGORIES[category] || PERPLEXITY_REPLY_CATEGORIES.curiosity;
    const index = (session.turnCount + session.repetitionCount + (session.otpRequests || 0) + (session.threatCount || 0)) % replies.length;
    return replies[index];
  }
}