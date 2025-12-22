'use client';

import type { BusinessCard } from '@/lib/businessCard';
import { useMemo, useState } from 'react';

function hasUrl(url: string) {
  return typeof url === 'string' && url.trim().length > 0;
}

function ImageSlot({ url, label }: { url: string; label: string }) {
  const filled = hasUrl(url);

  return (
    <div className="w-full">
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="aspect-[4/3] bg-gray-100 flex items-center justify-center">
          {filled ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={label} className="w-full h-full object-cover" />
          ) : (
            <div className="text-xs text-gray-500">可放圖片：{label}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export function BusinessCardView({
  card,
  cta,
}: {
  card: BusinessCard;
  cta?: React.ReactNode;
}) {
  const carouselUrls = useMemo(
    () => (card.carouselImageUrls ?? []).filter((u) => u.trim().length > 0),
    [card.carouselImageUrls],
  );
  const [carouselIndex, setCarouselIndex] = useState(0);
  const hasCarousel = carouselUrls.length > 0;
  const currentCarouselUrl = hasCarousel
    ? carouselUrls[Math.max(0, Math.min(carouselIndex, carouselUrls.length - 1))]
    : '';

  const prev = () => {
    if (!hasCarousel) return;
    setCarouselIndex((i) => (i - 1 + carouselUrls.length) % carouselUrls.length);
  };

  const next = () => {
    if (!hasCarousel) return;
    setCarouselIndex((i) => (i + 1) % carouselUrls.length);
  };

  if (card.template === 'classic') {
    return (
      <div className="w-full">
        <div className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-6 border-b border-gray-200">
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-14 h-14 rounded-full bg-gray-950 text-white flex items-center justify-center font-semibold tracking-tight">
                {card.name.slice(0, 1)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-gray-900 font-semibold text-2xl tracking-tight leading-tight">
                  {card.name}
                </div>
                <div className="mt-1 text-gray-600 text-sm">{card.title}</div>
                <div className="mt-2 text-gray-500 text-sm">
                  {card.company} · {card.location}
                </div>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {card.highlights.map((h) => (
                <span
                  key={h}
                  className="text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-full px-2.5 py-1"
                >
                  {h}
                </span>
              ))}
            </div>
            <div className="mt-6 text-gray-700 text-sm leading-relaxed">{card.bio}</div>
          </div>

          <div className="px-6 py-7">
            <div className="text-gray-900 font-semibold tracking-tight">我可以協助</div>
            <ul className="mt-3 space-y-2 text-gray-700 text-sm">
              {card.services.map((s) => (
                <li key={s} className="flex gap-2">
                  <span className="mt-1 inline-block w-1.5 h-1.5 rounded-full bg-gray-300" />
                  <span className="flex-1">{s}</span>
                </li>
              ))}
            </ul>

            <div className="mt-7 border-t border-gray-200 pt-6">
              <div className="text-gray-900 font-semibold tracking-tight">聯絡資訊</div>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-gray-500">電話</dt>
                  <dd className="text-gray-900 font-medium truncate">{card.phone}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-gray-500">LINE</dt>
                  <dd className="text-gray-900 font-medium truncate">{card.line}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-gray-500">Email</dt>
                  <dd className="text-gray-900 font-medium truncate">{card.email}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-gray-500">服務時間</dt>
                  <dd className="text-gray-700 truncate">{card.hours}</dd>
                </div>
              </dl>
              {cta ? <div className="mt-7">{cta}</div> : null}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (card.template === 'gallery') {
    return (
      <div className="w-full">
        <div className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-gray-950 text-white px-6 py-6">
            <div className="text-white font-semibold text-3xl tracking-tight leading-tight">
              {card.name}
            </div>
            <div className="mt-1 text-white/80 text-sm">{card.title}</div>
            <div className="mt-2 text-white/60 text-sm">
              {card.company} · {card.location}
            </div>
          </div>

          <div className="px-6 py-6">
            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
              <div className="aspect-[16/9] bg-gray-100 flex items-center justify-center">
                {hasCarousel ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentCarouselUrl}
                    alt="輪播圖片"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-xs text-gray-500">可放輪播圖片（到 Dashboard 設定）</div>
                )}
              </div>
              <div className="px-4 py-3 flex items-center justify-between">
                <div className="text-xs text-gray-600">
                  {hasCarousel ? `${carouselIndex + 1} / ${carouselUrls.length}` : '—'}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={prev}
                    disabled={!hasCarousel}
                    className="px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100 text-sm font-medium disabled:opacity-40"
                  >
                    上一張
                  </button>
                  <button
                    type="button"
                    onClick={next}
                    disabled={!hasCarousel}
                    className="px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100 text-sm font-medium disabled:opacity-40"
                  >
                    下一張
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ImageSlot url={card.contentLeftImageUrl} label="內容左側圖片" />
              <ImageSlot url={card.contentRightImageUrl} label="內容右側圖片" />
            </div>

            <div className="mt-6 text-gray-700 text-sm leading-relaxed">{card.bio}</div>

            <div className="mt-7 border-t border-gray-200 pt-6">
              <div className="text-gray-900 font-semibold tracking-tight">聯絡資訊</div>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-gray-500">電話</dt>
                  <dd className="text-gray-900 font-medium truncate">{card.phone}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-gray-500">LINE</dt>
                  <dd className="text-gray-900 font-medium truncate">{card.line}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-gray-500">Email</dt>
                  <dd className="text-gray-900 font-medium truncate">{card.email}</dd>
                </div>
              </dl>
              {cta ? <div className="mt-7">{cta}</div> : null}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (card.template === 'split') {
    const heroUrl =
      (card.leftImageUrl && card.leftImageUrl.trim()) ||
      (card.rightImageUrl && card.rightImageUrl.trim()) ||
      (hasCarousel ? currentCarouselUrl : '');

    return (
      <div className="w-full">
        <div className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="bg-gray-100">
              <div className="aspect-[4/3] lg:aspect-auto lg:h-full flex items-center justify-center">
                {hasUrl(heroUrl) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={heroUrl}
                    alt="主視覺"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-xs text-gray-500">可放主視覺（左/右圖片或輪播）</div>
                )}
              </div>
            </div>

            <div className="px-6 py-7">
              <div className="text-gray-900 font-semibold text-3xl tracking-tight leading-tight">
                {card.name}
              </div>
              <div className="mt-1 text-gray-600 text-sm">{card.title}</div>
              <div className="mt-2 text-gray-500 text-sm">
                {card.company} · {card.location}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {card.highlights.slice(0, 6).map((h) => (
                  <span
                    key={h}
                    className="text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-full px-2.5 py-1"
                  >
                    {h}
                  </span>
                ))}
              </div>

              <div className="mt-6 text-gray-700 text-sm leading-relaxed">
                {card.bio}
              </div>

              <div className="mt-7 border-t border-gray-200 pt-6">
                <div className="text-gray-900 font-semibold tracking-tight">聯絡</div>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-gray-500">電話</dt>
                    <dd className="text-gray-900 font-medium truncate">{card.phone}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-gray-500">LINE</dt>
                    <dd className="text-gray-900 font-medium truncate">{card.line}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-gray-500">Email</dt>
                    <dd className="text-gray-900 font-medium truncate">{card.email}</dd>
                  </div>
                </dl>

                {cta ? <div className="mt-7">{cta}</div> : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // impact (default)
  return (
    <div className="w-full">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr,minmax(0,520px),1fr] gap-6 items-start">
        <div className="hidden lg:block">
          <ImageSlot url={card.leftImageUrl} label="左側圖片" />
        </div>

        <div className="w-full">
          <div className="relative rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div
              aria-hidden="true"
              className="absolute left-1/2 -translate-x-1/2 -top-28 w-[420px] h-[420px] sm:w-[520px] sm:h-[520px] lg:w-[620px] lg:h-[620px] rounded-full bg-gray-950"
            />

            <div className="relative px-6 pt-10 pb-6 text-center">
              <div className="mx-auto -mt-12 w-20 h-20 rounded-full border border-white/15 bg-white/10 backdrop-blur text-white flex items-center justify-center font-semibold tracking-tight">
                <span className="text-2xl leading-none">{card.name.slice(0, 1)}</span>
              </div>

              <div className="mt-4 text-white font-semibold text-3xl tracking-tight leading-tight">
                {card.name}
              </div>
              <div className="mt-1 text-white/80 text-sm">{card.title}</div>
              <div className="mt-2 text-white/60 text-sm">
                {card.company} · {card.location}
              </div>

              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {card.highlights.map((h) => (
                  <span
                    key={h}
                    className="text-xs text-white/90 border border-white/15 rounded-full px-2.5 py-1"
                  >
                    {h}
                  </span>
                ))}
              </div>
            </div>

            <div className="px-6 pb-7">
              <div className="-mt-2 rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
                <div className="text-gray-700 text-sm leading-relaxed">{card.bio}</div>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ImageSlot url={card.contentLeftImageUrl} label="內容左側圖片" />
                  <ImageSlot url={card.contentRightImageUrl} label="內容右側圖片" />
                </div>

                <div className="mt-6">
                  <div className="flex items-center justify-between">
                    <div className="text-gray-900 font-semibold tracking-tight">輪播</div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={prev}
                        disabled={!hasCarousel}
                        className="px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100 text-sm font-medium disabled:opacity-40"
                      >
                        上一張
                      </button>
                      <button
                        type="button"
                        onClick={next}
                        disabled={!hasCarousel}
                        className="px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100 text-sm font-medium disabled:opacity-40"
                      >
                        下一張
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                    <div className="aspect-[16/9] bg-gray-100 flex items-center justify-center">
                      {hasCarousel ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={currentCarouselUrl}
                          alt="輪播圖片"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-xs text-gray-500">可放輪播圖片（到 Dashboard 設定）</div>
                      )}
                    </div>
                    {hasCarousel ? (
                      <div className="px-4 py-3 text-xs text-gray-600">
                        {carouselIndex + 1} / {carouselUrls.length}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="mt-6">
                  <div className="text-gray-900 font-semibold tracking-tight">我可以協助</div>
                  <ul className="mt-3 space-y-2 text-gray-700 text-sm">
                    {card.services.map((s) => (
                      <li key={s} className="flex gap-2">
                        <span className="mt-1 inline-block w-1.5 h-1.5 rounded-full bg-gray-300" />
                        <span className="flex-1">{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-7 border-t border-gray-200 pt-6">
                  <div className="text-gray-900 font-semibold tracking-tight">聯絡資訊</div>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-gray-500">電話</dt>
                      <dd className="text-gray-900 font-medium truncate">{card.phone}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-gray-500">LINE</dt>
                      <dd className="text-gray-900 font-medium truncate">{card.line}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-gray-500">Email</dt>
                      <dd className="text-gray-900 font-medium truncate">{card.email}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-gray-500">服務時間</dt>
                      <dd className="text-gray-700 truncate">{card.hours}</dd>
                    </div>
                  </dl>

                  <div className="mt-6">
                    <ImageSlot url={card.contentBottomImageUrl} label="內容底部圖片" />
                  </div>

                  {cta ? <div className="mt-7">{cta}</div> : null}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="hidden lg:block">
          <ImageSlot url={card.rightImageUrl} label="右側圖片" />
        </div>
      </div>
    </div>
  );
}
