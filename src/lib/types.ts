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
