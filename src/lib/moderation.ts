// Biteboard's word filter. Every comment, message, caption, recipe, on-video text and profile goes through it.
// Hate, threats, self-harm and pro-eating-disorder words are refused; ordinary swearing is starred out.
// The same lists run on the website (biteboard.html) and in the database (migration 0010). Keep all three in sync.

/** Refused outright. A trailing * also matches longer words (slur* matches slurs). */
export const BLOCKED = [
  'nigger*', 'nigga*', 'niggah', 'chink*', 'spic', 'spics', 'kike*', 'wetback*', 'gook*', 'raghead*', 'towelhead*', 'beaner*', 'coon', 'coons', 'jigaboo*', 'paki', 'pakis',
  'faggot*', 'fag', 'fags', 'dyke', 'dykes', 'tranny', 'trannies', 'shemale*',
  'retard', 'retards', 'retarded',
  'kys', 'kill yourself', 'kill urself', 'go die', 'hope you die', 'neck yourself', 'drink bleach', 'slit your wrists',
  'proana', 'pro ana', 'promia', 'pro mia', 'thinspo*', 'thinspiration', 'meanspo', 'bonespo', 'skinnyspo', 'starve yourself',
  'child porn', 'pedo', 'pedos', 'pedophile*', 'paedo*', 'cp links',
  'heil hitler', 'sieg heil', '1488', 'white power',
];

/** Starred out: f**k. */
export const MASKED = ['fuck*', 'fuk', 'fck', 'motherfuck*', 'shit*', 'bullshit', 'bitch*', 'cunt*', 'asshole*', 'dick', 'dicks', 'dickhead*', 'pussy', 'pussies', 'bastard*', 'whore*', 'slut*', 'wank*', 'twat*', 'cock', 'cocks', 'porn*'];

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '!': 'i', '3': 'e', '4': 'a', '@': 'a', '5': 's', '$': 's', '7': 't', '+': 't', '8': 'b' };

/** One word as the filter sees it: lower case, look-alike numbers turned back into letters, 3+ repeats squashed ("fuuuck" → "fuck"). */
const norm = (w: string) =>
  w.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[0-9!@$+]/g, (c) => LEET[c] ?? c).replace(/[^a-z]/g, '').replace(/(.)\1{2,}/g, '$1');

const hit = (list: string[], word: string) => list.some((e) => (e.endsWith('*') ? word.startsWith(e.slice(0, -1)) : word === e));

/** The reason a text can't be posted, or null when it's fine. */
export function blockedReason(text: string): string | null {
  if (!text) return null;
  if (/\b1488\b/.test(text)) return BLOCKED_MSG;
  const words = text.split(/[\s,.;:?"()[\]{}<>/\\|_-]+/).map(norm).filter(Boolean);
  const singles = BLOCKED.filter((e) => !e.includes(' '));
  if (words.some((w) => hit(singles, w))) return BLOCKED_MSG;
  const joined = ` ${words.join(' ')} `;
  if (BLOCKED.some((e) => e.includes(' ') && joined.includes(` ${e} `))) return BLOCKED_MSG;
  // Spelled out one letter at a time ("n i g g e r", "f.a.g"): join each run of single letters and check it as a word.
  const runs = words.reduce<string[]>((acc, w, i) => (w.length === 1 ? (words[i - 1]?.length === 1 ? (acc[acc.length - 1] += w, acc) : [...acc, w]) : acc), []);
  if (runs.some((r) => r.length >= 3 && hit(singles, r))) return BLOCKED_MSG;
  return null;
}

export const BLOCKED_MSG = "That has words that aren't allowed on Biteboard. Please change it and try again.";

/** Stars out swear words, keeping the first letter: "shit" → "s***". */
export const maskSwears = (text: string) =>
  text.replace(/[\p{L}\p{N}@$!+]+/gu, (w) => (hit(MASKED, norm(w)) ? w[0] + '*'.repeat(Math.max(2, w.length - 1)) : w));

/** Checks then cleans a text. Throws with a friendly message when it can't be posted. */
export function clean(text: string) {
  const why = blockedReason(text);
  if (why) throw new Error(why);
  return maskSwears(text);
}
