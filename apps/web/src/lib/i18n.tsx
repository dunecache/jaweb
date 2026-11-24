import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";

export type Locale = "en" | "fr" | "ar";

const STRINGS: Record<Locale, Record<string, string>> = {
  en: {
    history: "History",
    leaderboard: "Leaderboard",
    nothingLive: "Nothing is live right now.",
    nothingLiveHint: "Your teacher will push an exercise to your class.",
    youAnswered: "You answered {count} of {total}.",
    timeLeft: "time left",
    submitAnswer: "Submit answer",
    submitted: "submitted",
    refresh: "Refresh",
    disconnected: "Connection lost. Retrying…",
    loading: "Loading",
    emptyHistory: "No closed exercises yet.",
    yourHistory: "Your history",
    historyHint: "Answers and grades from past exercises.",
    answeredOf: "{count} of {total} answered",
    closedAnswers: "Correct:",
    noAnswer: "no answer",
    leaderboardHidden: "The leaderboard is hidden by your teacher.",
    points: "Points",
    rank: "Rank",
    student: "Student",
    allTime: "All time",
    live: "Live",
    grading: "grading",
  },
  fr: {
    history: "Historique",
    leaderboard: "Classement",
    nothingLive: "Rien n'est en direct pour le moment.",
    nothingLiveHint: "Votre professeur lancera un exercice pour votre classe.",
    youAnswered: "Vous avez répondu à {count} questions sur {total}.",
    timeLeft: "temps restant",
    submitAnswer: "Envoyer la réponse",
    submitted: "envoyé",
    refresh: "Actualiser",
    disconnected: "Connexion perdue. Nouvelle tentative…",
    loading: "Chargement",
    emptyHistory: "Aucun exercice terminé.",
    yourHistory: "Votre historique",
    historyHint: "Réponses et notes des exercices passés.",
    answeredOf: "{count} sur {total} répondu",
    closedAnswers: "Correct :",
    noAnswer: "sans réponse",
    leaderboardHidden: "Le classement est masqué par votre professeur.",
    points: "Points",
    rank: "Rang",
    student: "Élève",
    allTime: "Depuis le début",
    live: "En direct",
    grading: "correction",
  },
  ar: {
    history: "السجل",
    leaderboard: "لوحة الترتيب",
    nothingLive: "لا يوجد شيء مباشر الآن.",
    nothingLiveHint: "سيطلق معلمك تمريناً لصفك.",
    youAnswered: "أجبت على {count} من {total}.",
    timeLeft: "الوقت المتبقي",
    submitAnswer: "إرسال الإجابة",
    submitted: "تم الإرسال",
    refresh: "تحديث",
    disconnected: "انقطع الاتصال. إعادة المحاولة…",
    loading: "جار التحميل",
    emptyHistory: "لا توجد تمارين منتهية بعد.",
    yourHistory: "سجلك",
    historyHint: "إجاباتك ودرجاتك من التمارين السابقة.",
    answeredOf: "{count} من {total} تمت الإجابة",
    closedAnswers: "الصحيح:",
    noAnswer: "لا إجابة",
    leaderboardHidden: "لوحة الترتيب مخفية من قبل معلمك.",
    points: "النقاط",
    rank: "الترتيب",
    student: "تلميذ",
    allTime: "كل الوقت",
    live: "مباشر",
    grading: "قيد التصحيح",
  },
};

type I18nValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};
const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => {
    const stored = localStorage.getItem("jaweb:locale");
    return stored === "fr" || stored === "ar" ? stored : "en";
  });

  useEffect(() => {
    localStorage.setItem("jaweb:locale", locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);

  const value = useMemo<I18nValue>(
    () => ({
      locale,
      setLocale,
      t: (key, vars) => {
        let text = STRINGS[locale][key] ?? STRINGS.en[key] ?? key;
        for (const [name, replacement] of Object.entries(vars ?? {})) {
          text = text.replaceAll(`{${name}}`, String(replacement));
        }
        return text;
      },
    }),
    [locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error("I18nProvider missing");
  return value;
}

export function LocaleSwitcher() {
  const { locale, setLocale } = useI18n();
  return (
    <select
      aria-label="Language"
      value={locale}
      onChange={(event) => setLocale(event.target.value as Locale)}
      className="rounded-input border border-hairline bg-surface px-2 py-1 text-xs"
    >
      <option value="en">EN</option>
      <option value="fr">FR</option>
      <option value="ar">العربية</option>
    </select>
  );
}
