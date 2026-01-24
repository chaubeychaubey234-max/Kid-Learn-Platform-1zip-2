const bannedWords = {
  sexual: [
    "sex", "sexual", "porn", "porno", "nude", "naked",
    "boobs", "breasts", "penis", "vagina", "dick", "cock",
    "pussy", "ass", "butt", "blowjob", "handjob", "oral",
    "cum", "semen", "fuck", "fucking", "fucked",
    "screw", "horny", "kinky", "strip",
    "masturbate", "masturbation", "orgasm", "xxx"
  ],

  drugs: [
    "drugs", "drug", "weed", "marijuana", "ganja", "hash",
    "charas", "cocaine", "heroin", "lsd", "mdma", "ecstasy",
    "meth", "alcohol", "beer", "vodka", "whiskey", "rum",
    "smoking", "cigarette", "tobacco", "joint", "high",
    "nasha", "nashe"
  ],

  violence: [
    "kill", "killing", "murder", "dead", "death", "die",
    "stab", "shoot", "gun", "knife", "bomb", "fight",
    "punch", "hit", "slap", "blood", "hurt", "injure",
    "attack", "violence", "weapon", "maar", "maarna",
    "marunga", "mar dunga"
  ],

  abuse: [
    // English
    "idiot", "stupid", "dumb", "moron", "loser", "ugly",
    "hate", "shut up", "bastard", "bloody",
    "crazy", "mad", "fool", "asshole", "bitch","duffer",

    // Indian (Roman Hindi)
    "chutiya", "chutya",
    "madarchod", "madharchod",
    "behenchod", "bhenchod",
    "bhosdike", "bhosdi",
    "gandu", "gaand",
    "harami", "kamina",
    "kutta", "kutti",
    "saala", "saali",
    "randi", "lodu", "loda",
    "mc", "bc"
  ],

  selfHarm: [
    "suicide", "self harm", "kill myself",
    "die myself", "cut myself",
    "end my life", "marna chahta",
    "marna chahti"
  ],

  obfuscated: [
    "f*ck", "f**k", "fu*k",
    "sh*t", "b!tch", "a**hole",
    "ch*d", "ch*tiya"
  ]
};

const allBadWords = Object.values(bannedWords).flat();

export function filterMessage(message: string): string {
  if (!message) return message;

  let filtered = message;

  for (const word of allBadWords) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "gi");
    filtered = filtered.replace(regex, "***");
  }

  return filtered;
}
