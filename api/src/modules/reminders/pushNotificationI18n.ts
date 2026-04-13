export type PushNotificationLocale = 'en' | 'uk';

export function normalizePushLocale(value: string | null | undefined): PushNotificationLocale {
  const v = value?.trim().toLowerCase();
  return v === 'uk' ? 'uk' : 'en';
}

function ukPagesForReview(count: number): string {
  const n = Math.floor(count);
  const mod10 = n % 10;
  const mod100 = n % 100;
  let noun: string;
  if (mod10 === 1 && mod100 !== 11) {
    noun = 'сторінка';
  } else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    noun = 'сторінки';
  } else {
    noun = 'сторінок';
  }
  return `Сьогодні у вас ${n} ${noun} для повторення.`;
}

export function getDailyReminderPushCopy(
  locale: PushNotificationLocale,
  dueCount: number
): { title: string; body: string } {
  const title = 'Rememo';
  if (locale === 'uk') {
    return {
      title,
      body: ukPagesForReview(dueCount),
    };
  }
  return {
    title,
    body: `You have ${dueCount} pages to review today`,
  };
}

export function getDebugReminderPushCopy(
  locale: PushNotificationLocale,
  dueCount: number
): { title: string; body: string } {
  const title = 'Rememo';
  if (dueCount > 0) {
    return getDailyReminderPushCopy(locale, dueCount);
  }
  if (locale === 'uk') {
    return {
      title,
      body: 'Тест нагадування: відкрийте застосунок Rememo',
    };
  }
  return {
    title,
    body: 'Debug reminder test: open Rememo learning',
  };
}
