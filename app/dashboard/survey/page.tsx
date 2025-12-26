'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import {
  DEFAULT_SURVEY_SETTINGS,
  createBlankQuestion,
  normalizeSurveySettings,
  type SurveySettings,
  type SurveyQuestion,
  type SurveyQuestionType,
} from '@/lib/surveySettings';

const QUESTION_TYPES: Array<{ value: SurveyQuestionType; label: string }> = [
  { value: 'shortText', label: '短答' },
  { value: 'longText', label: '段落' },
  { value: 'singleChoice', label: '單選' },
  { value: 'multipleChoice', label: '多選' },
  { value: 'dropdown', label: '下拉' },
];

function moveItem<T>(arr: T[], fromIndex: number, toIndex: number): T[] {
  const next = arr.slice();
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

function isOptionType(type: SurveyQuestionType) {
  return type === 'singleChoice' || type === 'multipleChoice' || type === 'dropdown';
}

export default function SurveySettingsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [userEmail, setUserEmail] = useState<string>('');

  const [form, setForm] = useState<SurveySettings>(DEFAULT_SURVEY_SETTINGS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      if (!data.session) {
        router.replace('/login');
        return;
      }

      setUserEmail(data.session.user.email ?? '');
      await reload();
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace('/login');
      else setUserEmail(session.user.email ?? '');
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, supabase]);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token ?? '';
      if (!token) throw new Error('尚未登入');

      const res = await fetch('/api/survey/settings', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || '讀取失敗');
      }

      const json = (await res.json()) as { form?: unknown; updatedAt?: string | null };
      setForm(normalizeSurveySettings(json.form));
      setSavedAt(json.updatedAt ?? null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || '讀取失敗');
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token ?? '';
      if (!token) throw new Error('尚未登入');

      const res = await fetch('/api/survey/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ form }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || '保存失敗');
      }

      await reload();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || '保存失敗');
    } finally {
      setSaving(false);
    }
  };

  const updateQuestion = (index: number, patch: Partial<SurveyQuestion>) => {
    setForm((p) => {
      const questions = p.questions.slice();
      const current = questions[index];
      if (!current) return p;
      questions[index] = { ...current, ...patch };
      return { ...p, questions };
    });
  };

  const ensureAtLeastOneRequired = (questions: SurveyQuestion[]) => {
    if (questions.some((q) => q.required)) return questions;
    if (!questions.length) return questions;
    return [{ ...questions[0], required: true }, ...questions.slice(1)];
  };

  const removeQuestion = (index: number) => {
    setForm((p) => {
      const questions = p.questions.filter((_, i) => i !== index);
      return { ...p, questions: ensureAtLeastOneRequired(questions) };
    });
  };

  const addQuestion = () => {
    setForm((p) => ({ ...p, questions: [...p.questions, createBlankQuestion('shortText')] }));
  };

  const setQuestionType = (index: number, type: SurveyQuestionType) => {
    setForm((p) => {
      const questions = p.questions.slice();
      const current = questions[index];
      if (!current) return p;
      const next: SurveyQuestion = { ...current, type };
      if (isOptionType(type)) {
        next.options = Array.isArray(next.options) && next.options.length ? next.options : ['選項 1'];
      } else {
        next.options = [];
      }
      questions[index] = next;
      return { ...p, questions };
    });
  };

  const setQuestionOptionsText = (index: number, text: string) => {
    const options = text
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    updateQuestion(index, { options: options.length ? options : ['選項 1'] });
  };

  const moveQuestion = (index: number, dir: -1 | 1) => {
    setForm((p) => {
      const nextIndex = index + dir;
      if (nextIndex < 0 || nextIndex >= p.questions.length) return p;
      return { ...p, questions: moveItem(p.questions, index, nextIndex) };
    });
  };

  return (
    <div className="min-h-[100svh] bg-gray-50">
      <div className="mx-auto max-w-5xl min-h-[100svh] flex flex-col">
        <div className="sticky top-0 z-10 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-b border-gray-200">
          <div className="px-4 sm:px-6 py-4 text-gray-900 flex items-center justify-between">
            <div>
              <div className="font-semibold tracking-tight">問卷設定</div>
              <div className="text-xs text-gray-500 mt-0.5">{userEmail ? `登入中：${userEmail}` : ''}</div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/dashboard/leads"
                className="text-sm font-medium px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100"
              >
                業務後台
              </Link>
              <Link
                href="/dashboard/knowledge"
                className="text-sm font-medium px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100"
              >
                知識庫
              </Link>
              <Link
                href="/dashboard"
                className="text-sm font-medium px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100"
              >
                名片設定
              </Link>
              <button
                type="button"
                onClick={async () => {
                  await supabase.auth.signOut();
                  router.replace('/login');
                }}
                className="text-sm font-medium px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100"
              >
                登出
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 px-4 sm:px-6 py-6">
          <div className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <div className="font-semibold tracking-tight">前台問卷設定</div>
                <div className="text-xs text-gray-500 mt-0.5">像 Google 表單一樣編輯題目/題型，並影響訪客在 /chat 看到的問卷。</div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard/survey/responses"
                  className="text-sm font-medium px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100"
                >
                  查看作答
                </Link>
                <button
                  type="button"
                  onClick={reload}
                  disabled={loading}
                  className="text-sm font-medium px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100 disabled:opacity-60"
                >
                  {loading ? '讀取中…' : '重新載入'}
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  className="text-sm font-medium px-3 py-1.5 rounded-full bg-gray-950 text-white hover:bg-gray-900 disabled:opacity-60"
                >
                  {saving ? '保存中…' : '保存'}
                </button>
              </div>
            </div>

            {error ? (
              <div className="m-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {savedAt ? (
              <div className="px-5 pt-4 text-xs text-gray-500">最後更新：{new Date(savedAt).toLocaleString('zh-TW')}</div>
            ) : null}

            <div className="px-5 py-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block">
                  <div className="text-xs font-medium text-gray-600">標題</div>
                  <input
                    className="mt-1 w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm text-gray-900 bg-white"
                    value={form.title}
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  />
                </label>

                <label className="block">
                  <div className="text-xs font-medium text-gray-600">送出按鈕文字</div>
                  <input
                    className="mt-1 w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm text-gray-900 bg-white"
                    value={form.submitLabel}
                    onChange={(e) => setForm((p) => ({ ...p, submitLabel: e.target.value }))}
                  />
                </label>
              </div>

              <label className="block">
                <div className="text-xs font-medium text-gray-600">說明文字</div>
                <textarea
                  className="mt-1 w-full min-h-[72px] rounded-2xl border border-gray-200 px-3 py-2 text-sm text-gray-900 bg-white"
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                />
              </label>

              <div className="pt-2">
                <div className="text-sm font-semibold tracking-tight text-gray-900">題目</div>
                <div className="mt-1 text-xs text-gray-500">至少要有 1 題必填（避免送出空白問卷）。</div>
              </div>

              <div className="space-y-4">
                {form.questions.map((q, idx) => {
                  const typeInfo = QUESTION_TYPES.find((t) => t.value === q.type);
                  const optionText = Array.isArray(q.options) ? q.options.join('\n') : '';
                  return (
                    <div key={q.id} className="rounded-2xl border border-gray-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            題目 {idx + 1}{typeInfo ? ` · ${typeInfo.label}` : ''}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">id：{q.id}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => moveQuestion(idx, -1)}
                            className="text-sm font-medium px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100 disabled:opacity-60"
                            disabled={idx === 0}
                          >
                            上移
                          </button>
                          <button
                            type="button"
                            onClick={() => moveQuestion(idx, 1)}
                            className="text-sm font-medium px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100 disabled:opacity-60"
                            disabled={idx === form.questions.length - 1}
                          >
                            下移
                          </button>
                          <button
                            type="button"
                            onClick={() => removeQuestion(idx)}
                            className="text-sm font-medium px-3 py-1.5 rounded-full border border-red-200 bg-white hover:bg-red-50 active:bg-red-100 text-red-700"
                          >
                            刪除
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <label className="block">
                          <div className="text-xs font-medium text-gray-600">題型</div>
                          <select
                            className="mt-1 w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm text-gray-900 bg-white"
                            value={q.type}
                            onChange={(e) => setQuestionType(idx, e.target.value as SurveyQuestionType)}
                          >
                            {QUESTION_TYPES.map((t) => (
                              <option key={t.value} value={t.value}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="block">
                          <div className="text-xs font-medium text-gray-600">必填</div>
                          <div className="mt-2 flex items-center gap-2 text-sm text-gray-700">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300"
                              checked={!!q.required}
                              onChange={(e) =>
                                setForm((p) => ({
                                  ...p,
                                  questions: ensureAtLeastOneRequired(
                                    p.questions.map((qq, i) =>
                                      i === idx ? { ...qq, required: e.target.checked } : qq,
                                    ),
                                  ),
                                }))
                              }
                            />
                            這題必填
                          </div>
                        </label>
                      </div>

                      <label className="block mt-4">
                        <div className="text-xs font-medium text-gray-600">題目文字</div>
                        <input
                          className="mt-1 w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm text-gray-900 bg-white"
                          value={q.title}
                          onChange={(e) => updateQuestion(idx, { title: e.target.value })}
                        />
                      </label>

                      <label className="block mt-3">
                        <div className="text-xs font-medium text-gray-600">描述（可留空）</div>
                        <input
                          className="mt-1 w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm text-gray-900 bg-white"
                          value={q.description ?? ''}
                          onChange={(e) => updateQuestion(idx, { description: e.target.value })}
                        />
                      </label>

                      {isOptionType(q.type) ? (
                        <label className="block mt-3">
                          <div className="text-xs font-medium text-gray-600">選項（每行一個）</div>
                          <textarea
                            className="mt-1 w-full min-h-[96px] rounded-2xl border border-gray-200 px-3 py-2 text-sm text-gray-900 bg-white"
                            value={optionText}
                            onChange={(e) => setQuestionOptionsText(idx, e.target.value)}
                          />
                        </label>
                      ) : null}
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={addQuestion}
                  className="w-full rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100 px-4 py-3 text-sm font-medium text-gray-900"
                >
                  + 新增題目
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
