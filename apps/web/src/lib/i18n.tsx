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
    submitOnceDescription: "You can only submit once. Check your answer before confirming.",
    chooseAnswer: "Choose or type an answer first.",
    submitting: "Submitting…",
    submitFailed: "Could not submit your answer.",
    loadingExercise: "Loading your exercise",
    sessionError: "Could not verify your session.",
    connectionLost: "Connection lost.",
    exerciseScope: "Exercise",
    chooseExercise: "Choose an exercise",
    allExercises: "All exercises",
    submitted: "submitted",
    correct: "Correct",
    partial: "Partially correct",
    wrong: "Incorrect",
    awaitingReview: "Awaiting review",
    earnedPoints: "+{count} pts",
    yourAnswer: "Your answer:",
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
    graded: "graded",
    gradedColumn: "Graded",
    pending: "Pending",
    you: "you",
    boardScope: "Board scope",
    classLabel: "Class",
    boardTeacherHint: "Every student in the class, ranked by points.",
    boardStudentHint: "Your class, ranked by points.",
    boardHint: "Points reward correct answers. Ties go to the earlier finisher.",
    noEntries: "No one is on the board yet.",
    activityOnlyNotice:
      "Points appear when this exercise closes. Activity counts are shown for now.",
    pointsHidden: "Points hidden until close",
    dashboard: "Dashboard",
    backToClass: "My exercise",
    myExercise: "My exercise",
    logOut: "Log out",
    skipToContent: "Skip to content",
    language: "Language",
    studentNavigation: "Student navigation",
    cancel: "Cancel",
    loadingHistory: "Loading history",
    historyLoadError: "Could not load your history.",
    exerciseLoadError: "Could not load this exercise.",
    leaderboardLoadError: "Could not load the leaderboard.",
    answerFor: "Answer for {prompt}",
    pointsShort: "pts",
    underFiveMinutes: "Under 5 minutes left",
    underOneMinute: "Under 1 minute left",
    thirtySecondsLeft: "30 seconds left",
    tenSecondsLeft: "10 seconds left",
  },
  fr: {
    history: "Historique",
    leaderboard: "Classement",
    nothingLive: "Rien n'est en direct pour le moment.",
    nothingLiveHint: "Votre professeur lancera un exercice pour votre classe.",
    youAnswered: "Vous avez répondu à {count} questions sur {total}.",
    timeLeft: "temps restant",
    submitAnswer: "Envoyer la réponse",
    submitOnceDescription:
      "Vous ne pouvez envoyer qu'une seule réponse. Vérifiez-la avant de confirmer.",
    chooseAnswer: "Choisissez ou saisissez d'abord une réponse.",
    submitting: "Envoi…",
    submitFailed: "Impossible d'envoyer votre réponse.",
    loadingExercise: "Chargement de votre exercice",
    sessionError: "Impossible de vérifier votre session.",
    connectionLost: "Connexion perdue.",
    exerciseScope: "Exercice",
    chooseExercise: "Choisissez un exercice",
    allExercises: "Tous les exercices",
    submitted: "envoyé",
    correct: "Correct",
    partial: "Partiellement correct",
    wrong: "Incorrect",
    awaitingReview: "En attente de correction",
    earnedPoints: "+{count} pts",
    yourAnswer: "Votre réponse :",
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
    graded: "corrigées",
    gradedColumn: "Corrigées",
    pending: "En attente",
    you: "vous",
    boardScope: "Périmètre du classement",
    classLabel: "Classe",
    boardTeacherHint: "Tous les élèves de la classe, classés par points.",
    boardStudentHint: "Votre classe, classée par points.",
    boardHint:
      "Les points récompensent les bonnes réponses. En cas d'égalité, le premier terminé est favori.",
    noEntries: "Personne n'est encore au classement.",
    activityOnlyNotice:
      "Les points apparaîtront à la fin de l'exercice. Les compteurs d'activité sont affichés pour l'instant.",
    pointsHidden: "Points masqués jusqu'à la clôture",
    dashboard: "Tableau de bord",
    backToClass: "Mon exercice",
    myExercise: "Mon exercice",
    logOut: "Déconnexion",
    skipToContent: "Aller au contenu",
    language: "Langue",
    studentNavigation: "Navigation de l'élève",
    cancel: "Annuler",
    loadingHistory: "Chargement de l'historique",
    historyLoadError: "Impossible de charger votre historique.",
    exerciseLoadError: "Impossible de charger cet exercice.",
    leaderboardLoadError: "Impossible de charger le classement.",
    answerFor: "Réponse à {prompt}",
    pointsShort: "pts",
    underFiveMinutes: "Moins de 5 minutes restantes",
    underOneMinute: "Moins d'une minute restante",
    thirtySecondsLeft: "30 secondes restantes",
    tenSecondsLeft: "10 secondes restantes",
  },
  ar: {
    history: "السجل",
    leaderboard: "لوحة الترتيب",
    nothingLive: "لا يوجد شيء مباشر الآن.",
    nothingLiveHint: "سيطلق معلمك تمريناً لصفك.",
    youAnswered: "أجبت على {count} من {total}.",
    timeLeft: "الوقت المتبقي",
    submitAnswer: "إرسال الإجابة",
    submitOnceDescription: "يمكنك إرسال إجابة واحدة فقط. تحقق من إجابتك قبل التأكيد.",
    chooseAnswer: "اختر إجابة أو اكتبها أولاً.",
    submitting: "جارٍ الإرسال…",
    submitFailed: "تعذر إرسال إجابتك.",
    loadingExercise: "جارٍ تحميل تمرينك",
    sessionError: "تعذر التحقق من جلستك.",
    connectionLost: "انقطع الاتصال.",
    exerciseScope: "تمرين",
    chooseExercise: "اختر تمريناً",
    allExercises: "كل التمارين",
    submitted: "تم الإرسال",
    correct: "صحيح",
    partial: "صحيح جزئياً",
    wrong: "خطأ",
    awaitingReview: "قيد المراجعة",
    earnedPoints: "+{count} نقطة",
    yourAnswer: "إجابتك:",
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
    graded: "مصححة",
    gradedColumn: "المصححة",
    pending: "قيد الانتظار",
    you: "أنت",
    boardScope: "نطاق الترتيب",
    classLabel: "الصف",
    boardTeacherHint: "كل تلاميذ الصف، مرتبين حسب النقاط.",
    boardStudentHint: "صفك، مرتب حسب النقاط.",
    boardHint: "النقاط تُمنح للإجابات الصحيحة، وعند التعادل يُقدَّم من أنهى أولاً.",
    noEntries: "لا أحد في الترتيب بعد.",
    activityOnlyNotice: "ستظهر النقاط عند إغلاق التمرين. يتم عرض أرقام النشاط حالياً.",
    pointsHidden: "النقاط مخفية حتى الإغلاق",
    dashboard: "لوحة التحكم",
    backToClass: "تمريني",
    myExercise: "تمريني",
    logOut: "تسجيل الخروج",
    skipToContent: "تخطَّ إلى المحتوى",
    language: "اللغة",
    studentNavigation: "تنقل التلميذ",
    cancel: "إلغاء",
    loadingHistory: "جارٍ تحميل السجل",
    historyLoadError: "تعذر تحميل سجلك.",
    exerciseLoadError: "تعذر تحميل هذا التمرين.",
    leaderboardLoadError: "تعذر تحميل لوحة الترتيب.",
    answerFor: "إجابة عن {prompt}",
    pointsShort: "نقطة",
    underFiveMinutes: "أقل من 5 دقائق متبقية",
    underOneMinute: "أقل من دقيقة واحدة متبقية",
    thirtySecondsLeft: "30 ثانية متبقية",
    tenSecondsLeft: "10 ثوانٍ متبقية",
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
  const { locale, setLocale, t } = useI18n();
  return (
    <select
      aria-label={t("language")}
      value={locale}
      onChange={(event) => setLocale(event.target.value as Locale)}
      className="rounded-md border border-border bg-card px-2 py-1 text-xs"
    >
      <option value="en">EN</option>
      <option value="fr">FR</option>
      <option value="ar">العربية</option>
    </select>
  );
}
