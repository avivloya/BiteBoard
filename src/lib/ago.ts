/** "now", "5m", "3h", "2d": how long ago something happened. */
export const ago = (iso: string | number) => {
  const s = (Date.now() - (typeof iso === 'number' ? iso : Date.parse(iso))) / 1000;
  return s < 60 ? 'now' : s < 3600 ? `${Math.floor(s / 60)}m` : s < 86400 ? `${Math.floor(s / 3600)}h` : `${Math.floor(s / 86400)}d`;
};
