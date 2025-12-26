function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : null;
}

function pickString(v: unknown, fallback: string): string {
  return typeof v === 'string' ? v : fallback;
}

function pickBoolean(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

function pickArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function createId(): string {
  // deterministic enough for UI keys; server doesn't rely on it for security
  return `q_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

export type SurveyQuestionType =
  | 'shortText'
  | 'longText'
  | 'singleChoice'
  | 'multipleChoice'
  | 'dropdown';

export type SurveyQuestion = {
  id: string;
  type: SurveyQuestionType;
  title: string;
  description?: string;
  required?: boolean;
  options?: string[];
};

export type SurveySettings = {
  title: string;
  description: string;
  submitLabel: string;
  questions: SurveyQuestion[];
};

export const DEFAULT_SURVEY_SETTINGS: SurveySettings = {
  title: '購車問卷',
  description: '填完後會把內容送到聊天，方便接續服務。',
  submitLabel: '送出問卷',
  questions: [
    {
      id: 'goal',
      type: 'shortText',
      title: '需求/目的',
      description: '',
      required: true,
      options: [],
    },
    {
      id: 'budget',
      type: 'dropdown',
      title: '預算',
      required: false,
      options: ['（未填）', '50 萬以下', '50–80 萬', '80–120 萬', '120–200 萬', '200 萬以上'],
    },
    {
      id: 'timeline',
      type: 'dropdown',
      title: '購買時間',
      required: false,
      options: ['（未填）', '1 週內', '1 個月內', '1–3 個月', '3 個月以上', '尚未確定'],
    },
    {
      id: 'tradeIn',
      type: 'dropdown',
      title: '是否舊車換購',
      required: false,
      options: ['（未填）', '是', '否', '不確定'],
    },
    {
      id: 'note',
      type: 'longText',
      title: '其他備註',
      required: false,
      options: [],
    },
  ],
};

export function createBlankQuestion(type: SurveyQuestionType = 'shortText'): SurveyQuestion {
  return {
    id: createId(),
    type,
    title: '未命名題目',
    description: '',
    required: false,
    options:
      type === 'singleChoice' || type === 'multipleChoice' || type === 'dropdown'
        ? ['選項 1']
        : [],
  };
}

const ALLOWED_TYPES: SurveyQuestionType[] = [
  'shortText',
  'longText',
  'singleChoice',
  'multipleChoice',
  'dropdown',
];

function normalizeQuestion(input: unknown): SurveyQuestion | null {
  const raw = asRecord(input);
  if (!raw) return null;

  const typeRaw = raw.type;
  const type = (typeof typeRaw === 'string' && (ALLOWED_TYPES as string[]).includes(typeRaw)
    ? (typeRaw as SurveyQuestionType)
    : 'shortText');

  const id = pickString(raw.id, '').trim() || createId();
  const title = pickString(raw.title, '').trim();
  if (!title) return null;

  const optionsRaw = pickArray(raw.options)
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .filter(Boolean);

  const needsOptions = type === 'singleChoice' || type === 'multipleChoice' || type === 'dropdown';
  const options = needsOptions ? (optionsRaw.length ? optionsRaw : ['選項 1']) : [];

  return {
    id,
    type,
    title,
    description: pickString(raw.description, ''),
    required: pickBoolean(raw.required, false),
    options,
  };
}

export function normalizeSurveySettings(input: unknown): SurveySettings {
  const root = asRecord(input);
  const base = DEFAULT_SURVEY_SETTINGS;

  // Backward compat: older settings might use { fields: { goal/budget/... } }
  // We convert them into questions.
  const legacyFields = asRecord(root?.fields);
  const legacyKeys = legacyFields ? Object.keys(legacyFields) : [];
  const hasLegacy = legacyKeys.length > 0;

  const rawQuestions = pickArray(root?.questions);
  const normalizedQuestions = rawQuestions
    .map((q) => normalizeQuestion(q))
    .filter(Boolean) as SurveyQuestion[];

  let questions: SurveyQuestion[] = normalizedQuestions;

  if (!questions.length && hasLegacy) {
    const goal = asRecord(legacyFields?.goal);
    const note = asRecord(legacyFields?.note);
    const budget = asRecord(legacyFields?.budget);
    const timeline = asRecord(legacyFields?.timeline);
    const tradeIn = asRecord(legacyFields?.tradeIn);

    questions = [
      {
        id: 'goal',
        type: 'shortText',
        title: pickString(goal?.label, '需求/目的').replace(/\*+\s*$/, '').trim() || '需求/目的',
        description: '',
        required: true,
        options: [],
      },
      budget && pickBoolean(budget.enabled, true)
        ? {
            id: 'budget',
            type: 'dropdown',
            title: pickString(budget.label, '預算') || '預算',
            required: false,
            options: base.questions.find((q) => q.id === 'budget')?.options ?? [],
          }
        : null,
      timeline && pickBoolean(timeline.enabled, true)
        ? {
            id: 'timeline',
            type: 'dropdown',
            title: pickString(timeline.label, '購買時間') || '購買時間',
            required: false,
            options: base.questions.find((q) => q.id === 'timeline')?.options ?? [],
          }
        : null,
      tradeIn && pickBoolean(tradeIn.enabled, true)
        ? {
            id: 'tradeIn',
            type: 'dropdown',
            title: pickString(tradeIn.label, '是否舊車換購') || '是否舊車換購',
            required: false,
            options: base.questions.find((q) => q.id === 'tradeIn')?.options ?? [],
          }
        : null,
      note && pickBoolean(note.enabled, true)
        ? {
            id: 'note',
            type: 'longText',
            title: pickString(note.label, '其他備註') || '其他備註',
            required: false,
            options: [],
          }
        : null,
    ].filter(Boolean) as SurveyQuestion[];
  }

  if (!questions.length) questions = base.questions;

  // Ensure at least one required question exists (client can enforce, server will still validate)
  if (!questions.some((q) => q.required)) {
    questions = [{ ...questions[0], required: true }, ...questions.slice(1)];
  }

  return {
    title: pickString(root?.title, base.title),
    description: pickString(root?.description, base.description),
    submitLabel: pickString(root?.submitLabel, base.submitLabel),
    questions,
  };
}
