import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { adminApi, catalogApi } from '../../api/endpoints';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { ErrorBox, Spinner } from '../../components/Feedback';

const MAX_ANSWERS = 6;
const emptyAnswer = () => ({ id: null, isCorrect: false, texts: { vi: '', en: '' } });

const blankForm = () => ({
  number: '', topicId: '', isCritical: false, isActive: true, imageUrl: '',
  texts: { vi: { text: '', explanation: '' }, en: { text: '', explanation: '' } },
  answers: [emptyAnswer(), emptyAnswer(), emptyAnswer(), emptyAnswer()]
});

/** DTO backend → state của form (đủ cả hai ngôn ngữ để dễ chỉnh sửa). */
function toForm(q) {
  const txt = (lang) => ({ text: q.texts?.[lang]?.text ?? '', explanation: q.texts?.[lang]?.explanation ?? '' });
  return {
    number: String(q.number), topicId: String(q.topicId), isCritical: q.isCritical, isActive: q.isActive, imageUrl: q.imageUrl ?? '',
    texts: { vi: txt('vi'), en: txt('en') },
    answers: q.answers.map((a) => ({ id: a.id, isCorrect: a.isCorrect, texts: { vi: a.texts?.vi ?? '', en: a.texts?.en ?? '' } }))
  };
}

/** State của form → payload backend (bỏ ngôn ngữ/đáp án trống). */
function toPayload(f) {
  const texts = { vi: { text: f.texts.vi.text.trim(), explanation: f.texts.vi.explanation.trim() } };
  if (f.texts.en.text.trim()) texts.en = { text: f.texts.en.text.trim(), explanation: f.texts.en.explanation.trim() };

  const answers = f.answers
    .filter((a) => a.texts.vi.trim())
    .map((a) => {
      const t = { vi: a.texts.vi.trim() };
      if (a.texts.en.trim()) t.en = a.texts.en.trim();
      return { id: a.id, isCorrect: a.isCorrect, texts: t };
    });

  return {
    number: Number.parseInt(f.number, 10), topicId: Number(f.topicId), isCritical: f.isCritical, isActive: f.isActive,
    imageUrl: f.imageUrl.trim() || null, texts, answers
  };
}

function validate(f, t) {
  const errors = [];
  if (!(Number.parseInt(f.number, 10) >= 1)) errors.push(t('editor.errNumber'));
  if (!f.topicId) errors.push(t('editor.errTopic'));
  if (!f.texts.vi.text.trim()) errors.push(t('editor.errText'));
  const filled = f.answers.filter((a) => a.texts.vi.trim());
  if (filled.length < 2) errors.push(t('editor.errAnswers'));
  else if (filled.filter((a) => a.isCorrect).length !== 1) errors.push(t('editor.errCorrect'));
  return errors;
}

export default function QuestionEditor() {
  const { id } = useParams();
  const isNew = !id;
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();

  const topics = useAsync(() => catalogApi.topics(), [i18n.language]);
  const loaded = useAsync(() => (isNew ? Promise.resolve(null) : adminApi.get(id)), [id]);

  if (loaded.loading && !loaded.data && !isNew) return <div className="container page"><Spinner /></div>;
  if (loaded.error) return <div className="container page"><ErrorBox error={loaded.error} onRetry={loaded.reload} /></div>;

  // key={id}: đổi câu hỏi thì khởi tạo lại form.
  return (
    <EditorForm
      key={id ?? 'new'}
      isNew={isNew}
      id={id}
      initial={loaded.data ? toForm(loaded.data) : blankForm()}
      topics={topics.data ?? []}
      onDone={(msg) => navigate('/quan-tri', { state: { toast: msg } })}
      toast={toast}
      t={t}
    />
  );
}

function EditorForm({ isNew, id, initial, topics, onDone, toast, t }) {
  const [form, setForm] = useState(initial);
  const [lang, setLang] = useState('vi');
  const [errors, setErrors] = useState([]);
  const [busy, setBusy] = useState(false);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const setText = (field, value) => setForm((f) => ({ ...f, texts: { ...f.texts, [lang]: { ...f.texts[lang], [field]: value } } }));
  const setAnswer = (i, patch) => setForm((f) => ({ ...f, answers: f.answers.map((a, idx) => (idx === i ? { ...a, ...patch } : a)) }));
  const setAnswerText = (i, value) => setForm((f) => ({
    ...f, answers: f.answers.map((a, idx) => (idx === i ? { ...a, texts: { ...a.texts, [lang]: value } } : a))
  }));
  const markCorrect = (i) => setForm((f) => ({ ...f, answers: f.answers.map((a, idx) => ({ ...a, isCorrect: idx === i })) }));
  const addAnswer = () => setForm((f) => (f.answers.length >= MAX_ANSWERS ? f : { ...f, answers: [...f.answers, emptyAnswer()] }));
  const removeAnswer = (i) => setForm((f) => ({ ...f, answers: f.answers.filter((_, idx) => idx !== i) }));
  const move = (i, dir) => setForm((f) => {
    const j = i + dir;
    if (j < 0 || j >= f.answers.length) return f;
    const answers = [...f.answers];
    [answers[i], answers[j]] = [answers[j], answers[i]];
    return { ...f, answers };
  });

  const submit = async (e) => {
    e.preventDefault();
    const local = validate(form, t);
    setErrors(local);
    if (local.length) return;

    setBusy(true);
    try {
      const payload = toPayload(form);
      if (isNew) await adminApi.create(payload);
      else await adminApi.update(id, payload);
      onDone(isNew ? 'admin.created' : 'admin.updated');
    } catch (err) {
      // Lỗi validation (400) có thể có nhiều thông điệp; các lỗi khác (409 trùng số câu...) là một thông điệp.
      const msgs = err.errors ? Object.values(err.errors).flat() : [err.message];
      setErrors(msgs);
      toast(msgs[0], 'error');
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(t('admin.deleteBody', { n: form.number }))) return;
    try {
      const r = await adminApi.remove(id);
      onDone(r.deactivated ? 'admin.deactivated' : 'admin.deleted');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const current = form.texts[lang];

  return (
    <div className="container page narrow-lg">
      <Link to="/quan-tri" className="back-link">← {t('editor.back')}</Link>
      <h1>{isNew ? t('editor.newTitle') : t('editor.editTitle', { n: form.number })}</h1>

      <form onSubmit={submit} noValidate className="editor">
        <section className="card form-card">
          <div className="form-row">
            <label className="field">
              <span>{t('editor.number')}</span>
              <input className="input" type="number" min="1" value={form.number} onChange={(e) => set({ number: e.target.value })} />
            </label>
            <label className="field grow">
              <span>{t('editor.topic')}</span>
              <select className="input" value={form.topicId} onChange={(e) => set({ topicId: e.target.value })}>
                <option value="">{t('editor.chooseTopic')}</option>
                {topics.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
            </label>
          </div>

          <div className="form-row">
            <label className="check"><input type="checkbox" checked={form.isCritical} onChange={(e) => set({ isCritical: e.target.checked })} /><span>{t('editor.critical')}</span></label>
            <label className="check"><input type="checkbox" checked={form.isActive} onChange={(e) => set({ isActive: e.target.checked })} /><span>{t('editor.active')}</span></label>
          </div>

          <label className="field">
            <span>{t('editor.image')}</span>
            <input className="input" value={form.imageUrl} onChange={(e) => set({ imageUrl: e.target.value })} placeholder="https://… hoặc /images/q1.png" />
            <small className="muted">{t('editor.imageHint')}</small>
          </label>
          {form.imageUrl.trim() && <img className="qimg" src={form.imageUrl.trim()} alt="" />}
        </section>

        <section className="card form-card">
          <div className="section-head">
            <div className="seg" role="tablist">
              <button type="button" role="tab" aria-selected={lang === 'vi'} className={lang === 'vi' ? 'active' : ''} onClick={() => setLang('vi')}>{t('editor.langVi')}</button>
              <button type="button" role="tab" aria-selected={lang === 'en'} className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>{t('editor.langEn')}</button>
            </div>
            {lang === 'en' && <small className="muted">{t('editor.englishHint')}</small>}
          </div>

          <label className="field">
            <span>{t('editor.text')} ({lang.toUpperCase()})</span>
            <textarea className="input" rows={3} value={current.text} onChange={(e) => setText('text', e.target.value)} />
          </label>
          <label className="field">
            <span>{t('editor.explanation')} ({lang.toUpperCase()})</span>
            <textarea className="input" rows={3} value={current.explanation} onChange={(e) => setText('explanation', e.target.value)} />
          </label>

          <h3>{t('editor.answers')} ({lang.toUpperCase()})</h3>
          <ul className="answer-edit">
            {form.answers.map((a, i) => (
              <li key={a.id ?? `new-${i}`} className={a.isCorrect ? 'is-correct' : ''}>
                <label className="radio" title={t('editor.correct')}>
                  <input type="radio" name="correct" checked={a.isCorrect} onChange={() => markCorrect(i)} aria-label={`${t('editor.correct')} ${i + 1}`} />
                  <span>{i + 1}</span>
                </label>
                <input className="input" value={a.texts[lang]} onChange={(e) => setAnswerText(i, e.target.value)} placeholder={t('editor.answerPlaceholder', { n: i + 1 })} aria-label={t('editor.answerPlaceholder', { n: i + 1 })} />
                <div className="answer-tools">
                  <button type="button" className="icon-btn" onClick={() => move(i, -1)} disabled={i === 0} title={t('editor.moveUp')} aria-label={t('editor.moveUp')}>↑</button>
                  <button type="button" className="icon-btn" onClick={() => move(i, 1)} disabled={i === form.answers.length - 1} title={t('editor.moveDown')} aria-label={t('editor.moveDown')}>↓</button>
                  <button type="button" className="icon-btn" onClick={() => removeAnswer(i)} disabled={form.answers.length <= 2} title={t('editor.removeAnswer')} aria-label={t('editor.removeAnswer')}>✕</button>
                </div>
              </li>
            ))}
          </ul>
          <div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={addAnswer} disabled={form.answers.length >= MAX_ANSWERS}>＋ {t('editor.addAnswer')}</button>
          </div>
        </section>

        {errors.length > 0 && (
          <div className="error-box" role="alert">
            <ul className="plain-list">{errors.map((m) => <li key={m}>{m}</li>)}</ul>
          </div>
        )}

        <div className="editor-actions">
          <button className="btn btn-primary btn-lg" disabled={busy}>{busy ? t('editor.saving') : t('editor.save')}</button>
          <Link to="/quan-tri" className="btn btn-ghost btn-lg">{t('common.cancel')}</Link>
          <span className="spacer" />
          {!isNew && <button type="button" className="btn btn-danger" onClick={remove}>{t('editor.delete')}</button>}
        </div>
      </form>
    </div>
  );
}
