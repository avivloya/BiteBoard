export type Meal = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
export const MEALS: Meal[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

export type Recipe = {
  id: string;
  title: string;
  cat: Meal;
  min: number;
  serv: number;
  kcal: number;
  p: number;
  c: number;
  f: number;
  tags: string[];
  ing: string[];
  steps: string[];
  image?: string | null;
  /** cooking video: a file on this phone for your own recipes, a web link for posts */
  video?: string | null;
  /** playback speed the video was filmed for: 0.5 slow motion, 2 fast motion */
  speed?: number;
  /** part of the video to play, in seconds: [start, end] */
  trim?: [number, number];
  /** Deleted clips: parts of the file skipped on playback. */
  cuts?: [number, number][];
  /** Filmed with Mirror on (website); the app saves mirrored video itself. */
  mirror?: boolean;
  /** look picked in the camera: beauty, warm, bright */
  filter?: 'none' | 'beauty' | 'warm' | 'bright' | 'mono';
  /** id of a free Snapspoon sound played with the video (see lib/sounds) */
  music?: string;
  /** music volume, 0 to 1 (default 0.8) */
  mvol?: number;
  /** volume of the video's own sound (your voice), 0 to 1 (default 1) */
  ovol?: number;
  /** words placed on the video */
  texts?: VideoText[];
  /** the cover frame picked in the editor */
  cover?: string;
  /** short text shown with the post, like a TikTok caption */
  caption?: string;
  /** created with AI */
  ai?: boolean;
  /** written by the user */
  own?: boolean;
  /** posted to the user's recipe page and the For you feed */
  shared?: boolean;
  /** handle of the person who posted it */
  by?: string;
  /** user id of the person who posted it */
  byId?: string;
  /** when it was posted, ms since epoch */
  posted?: number;
};

/** Words on a video. x and y are the center in % of the video; size is % of its width. */
export type VideoText = { text: string; x: number; y: number; color: string; style: 'pill' | 'plain'; size: number };

export type Sex = 'female' | 'male' | 'other';

export type Profile = {
  name: string;
  email: string;
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  goalKg: number;
  activity: number;
  pace: number;
  units: 'metric' | 'imperial';
  bio?: string;
  /** username, unique across Snapspoon */
  handle?: string;
  /** profile picture on this phone, used before a recipe page exists */
  photo?: string;
};

export type Targets = { kcal: number; p: number; c: number; f: number };

export type Entry = {
  id: string;
  name: string;
  kcal: number;
  p: number;
  c: number;
  f: number;
  meal: Meal;
  src: 'recipe' | 'photo' | 'manual' | 'barcode';
  t: number;
};

export type Board = { id: string; name: string; ids: string[] };

export type Reminders = { meals: boolean; streak: boolean; weighIn: boolean };
