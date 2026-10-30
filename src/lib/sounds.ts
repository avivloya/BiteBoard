/**
 * Free music anyone can post with. These are Snapspoon's own tracks (the same ones the website makes),
 * so there's nothing to license. Famous songs need a deal with a music catalog first.
 */
export const SOUNDS = [
  { id: 'sunny', name: 'Sunny kitchen', file: require('../../assets/sounds/sunny.m4a') },
  { id: 'lofi', name: 'Lo-fi simmer', file: require('../../assets/sounds/lofi.m4a') },
  { id: 'upbeat', name: 'Meal prep rush', file: require('../../assets/sounds/upbeat.m4a') },
  { id: 'chill', name: 'Slow Sunday', file: require('../../assets/sounds/chill.m4a') },
  { id: 'bounce', name: 'Snack bounce', file: require('../../assets/sounds/bounce.m4a') },
] as const;

export const soundFile = (id?: string) => SOUNDS.find((s) => s.id === id)?.file ?? null;
export const soundName = (id?: string) => SOUNDS.find((s) => s.id === id)?.name;
