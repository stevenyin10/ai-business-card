export type BusinessCard = {
  template: BusinessCardTemplate;
  name: string;
  title: string;
  company: string;
  location: string;
  phone: string;
  line: string;
  email: string;
  hours: string;
  highlights: string[];
  bio: string;
  services: string[];

  leftImageUrl: string;
  rightImageUrl: string;
  contentLeftImageUrl: string;
  contentRightImageUrl: string;
  contentBottomImageUrl: string;
  carouselImageUrls: string[];
};

export type BusinessCardTemplate = 'classic' | 'impact' | 'gallery' | 'split';

export const BUSINESS_CARD_STORAGE_KEY = 'ai-business-card:v1';

export const DEFAULT_BUSINESS_CARD: BusinessCard = {
  template: 'impact',
  name: '小陳',
  title: '汽車銷售顧問',
  company: '（可填：品牌／據點）',
  location: '（可填：城市／展示中心）',
  phone: '（可填：09xx-xxx-xxx）',
  line: '（可填：LINE ID）',
  email: '（可填：email）',
  hours: '（可填：週一～週日 10:00–20:00）',
  highlights: ['新車諮詢', '配備比較', '價格優惠', '貸款／保險', '預約賞車'],
  bio:
    '我可以協助你了解車款、配備、價格優惠、貸款方案與預約賞車；也能依需求推薦適合的車型與配件。',
  services: [
    '依預算／需求推薦車款與配備組合',
    '整理報價與優惠，協助比較不同方案',
    '貸款、保險與交車流程說明',
    '安排到店或外出賞車（以可行性為準）',
  ],

  leftImageUrl: '',
  rightImageUrl: '',
  contentLeftImageUrl: '',
  contentRightImageUrl: '',
  contentBottomImageUrl: '',
  carouselImageUrls: [],
};

export function safeParseBusinessCard(value: unknown): BusinessCard | null {
  if (!value || typeof value !== 'object') return null;

  const v = value as Partial<BusinessCard>;

  const isString = (x: unknown): x is string => typeof x === 'string';
  const isStringArray = (x: unknown): x is string[] =>
    Array.isArray(x) && x.every((i) => typeof i === 'string');

  const template: BusinessCardTemplate =
    v.template === 'classic' ||
    v.template === 'impact' ||
    v.template === 'gallery' ||
    v.template === 'split'
      ? v.template
      : DEFAULT_BUSINESS_CARD.template;

  if (
    !isString(v.name) ||
    !isString(v.title) ||
    !isString(v.company) ||
    !isString(v.location) ||
    !isString(v.phone) ||
    !isString(v.line) ||
    !isString(v.email) ||
    !isString(v.hours) ||
    !isString(v.bio) ||
    !isStringArray(v.highlights) ||
    !isStringArray(v.services)
  ) {
    return null;
  }

  const leftImageUrl = isString(v.leftImageUrl)
    ? v.leftImageUrl
    : DEFAULT_BUSINESS_CARD.leftImageUrl;
  const rightImageUrl = isString(v.rightImageUrl)
    ? v.rightImageUrl
    : DEFAULT_BUSINESS_CARD.rightImageUrl;
  const contentLeftImageUrl = isString(v.contentLeftImageUrl)
    ? v.contentLeftImageUrl
    : DEFAULT_BUSINESS_CARD.contentLeftImageUrl;
  const contentRightImageUrl = isString(v.contentRightImageUrl)
    ? v.contentRightImageUrl
    : DEFAULT_BUSINESS_CARD.contentRightImageUrl;
  const contentBottomImageUrl = isString(v.contentBottomImageUrl)
    ? v.contentBottomImageUrl
    : DEFAULT_BUSINESS_CARD.contentBottomImageUrl;
  const carouselImageUrls = isStringArray(v.carouselImageUrls)
    ? v.carouselImageUrls
    : DEFAULT_BUSINESS_CARD.carouselImageUrls;

  return {
    template,
    name: v.name,
    title: v.title,
    company: v.company,
    location: v.location,
    phone: v.phone,
    line: v.line,
    email: v.email,
    hours: v.hours,
    highlights: v.highlights,
    bio: v.bio,
    services: v.services,

    leftImageUrl,
    rightImageUrl,
    contentLeftImageUrl,
    contentRightImageUrl,
    contentBottomImageUrl,
    carouselImageUrls,
  };
}
