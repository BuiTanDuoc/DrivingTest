export const PASSWORD_OK = (p) => p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p);

const LETTERS = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS = '23456789';

/** Sinh mật khẩu ngẫu nhiên (bỏ ký tự dễ nhầm như l/1/O/0), luôn có cả chữ và số. */
export function generatePassword(length = 12) {
  const all = LETTERS + DIGITS;
  const rand = new Uint32Array(length);
  crypto.getRandomValues(rand);
  const chars = Array.from(rand, (r) => all[r % all.length]);
  chars[0] = LETTERS[rand[0] % LETTERS.length];
  chars[length - 1] = DIGITS[rand[length - 1] % DIGITS.length];
  return chars.join('');
}

const camel = (k) => k.charAt(0).toLowerCase() + k.slice(1);

/** Lỗi validation của backend { Email: ['...'] } → { email: '...' }; null nếu không phải lỗi validation. */
export function mapErrors(err) {
  if (!err?.errors) return null;
  return Object.fromEntries(Object.entries(err.errors).map(([k, msgs]) => [camel(k), msgs[0]]));
}
