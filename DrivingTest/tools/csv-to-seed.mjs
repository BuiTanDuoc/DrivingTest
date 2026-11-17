#!/usr/bin/env node
// Chuyển file CSV ngân hàng câu hỏi → JSON seed của DrivingTest.
//
//   node tools/csv-to-seed.mjs questions.csv src/DrivingTest.Infrastructure/Seed/questions.json
//
// Cột bắt buộc : number, topic, critical, text, a1, a2, correct
// Cột tùy chọn : a3, a4, explanation, image, text_en, explanation_en, a1_en..a4_en
//   - topic   : rules | signs | scenarios | driving-skills | vehicle | ethics
//   - critical: 1/true/x = câu điểm liệt
//   - correct : số thứ tự đáp án đúng (1-4)
import { readFileSync, writeFileSync } from 'node:fs';

const TOPICS = ['rules', 'signs', 'scenarios', 'driving-skills', 'vehicle', 'ethics'];

/** Parser CSV (RFC 4180): hỗ trợ dấu ngoặc kép, dấu phẩy và xuống dòng trong ô. */
function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((x) => x.trim() !== '')) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim() !== '')) rows.push(row);
  return rows;
}

const [, , input, output] = process.argv;
if (!input || !output) {
  console.error('Usage: node tools/csv-to-seed.mjs <input.csv> <output.json>');
  process.exit(1);
}

const [header, ...body] = parseCsv(readFileSync(input, 'utf8').replace(/^\uFEFF/, ''));
const col = Object.fromEntries(header.map((h, i) => [h.trim().toLowerCase(), i]));
for (const required of ['number', 'topic', 'critical', 'text', 'a1', 'a2', 'correct']) {
  if (!(required in col)) { console.error(`Missing column: ${required}`); process.exit(1); }
}
const get = (r, name) => (name in col ? (r[col[name]] ?? '').trim() : '');

const errors = [];
const seen = new Set();
const out = [];

body.forEach((r, idx) => {
  const line = idx + 2;
  const number = Number(get(r, 'number'));
  const topic = get(r, 'topic');
  const correct = Number(get(r, 'correct'));
  const viAnswers = [1, 2, 3, 4].map((n) => get(r, `a${n}`));
  const enAnswers = [1, 2, 3, 4].map((n) => get(r, `a${n}_en`));

  if (!Number.isInteger(number) || number < 1) errors.push(`Line ${line}: invalid number`);
  if (seen.has(number)) errors.push(`Line ${line}: duplicate number ${number}`);
  seen.add(number);
  if (!TOPICS.includes(topic)) errors.push(`Line ${line}: unknown topic "${topic}"`);
  if (!get(r, 'text')) errors.push(`Line ${line}: empty question text`);
  if (viAnswers.filter(Boolean).length < 2) errors.push(`Line ${line}: need at least 2 answers`);
  if (!(correct >= 1 && correct <= 4) || !viAnswers[correct - 1]) errors.push(`Line ${line}: "correct" must point to a non-empty answer`);

  const answers = [];
  viAnswers.forEach((vi, i) => {
    if (!vi) return;
    answers.push({ correct: i + 1 === correct, vi, ...(enAnswers[i] ? { en: enAnswers[i] } : {}) });
  });

  const entry = {
    number,
    topic,
    critical: ['1', 'true', 'x', 'yes'].includes(get(r, 'critical').toLowerCase()),
    imageUrl: get(r, 'image') || null,
    vi: { text: get(r, 'text'), explanation: get(r, 'explanation') },
    answers
  };
  if (get(r, 'text_en')) entry.en = { text: get(r, 'text_en'), explanation: get(r, 'explanation_en') };
  out.push(entry);
});

if (errors.length) {
  console.error(`Found ${errors.length} problem(s):\n` + errors.slice(0, 50).join('\n'));
  if (errors.length > 50) console.error(`...and ${errors.length - 50} more`);
  process.exit(1);
}

out.sort((a, b) => a.number - b.number);
writeFileSync(output, JSON.stringify(out, null, 2) + '\n', 'utf8');

const perTopic = Object.fromEntries(TOPICS.map((t) => [t, out.filter((q) => q.topic === t).length]));
console.log(`OK: ${out.length} questions, ${out.filter((q) => q.critical).length} critical`);
console.log('Per topic:', perTopic);
