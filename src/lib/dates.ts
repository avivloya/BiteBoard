export const dayKey = (d: Date = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const shiftDay = (key: string, n: number) => {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + n));
};

export const weekdayLetter = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return 'SMTWTFS'[new Date(y, m - 1, d).getDay()];
};

export const guessMeal = () => {
  const h = new Date().getHours();
  return h < 11 ? 'Breakfast' : h < 15 ? 'Lunch' : h < 21 ? 'Dinner' : 'Snack';
};
