import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Link, Route, Router as WouterRouter, Switch, useLocation } from 'wouter';
import {
  Activity, ArrowLeft, BarChart3, Bell, Camera, Check, ChevronLeft,
  CircleHelp, Droplets, Flame, Footprints, Gauge, HeartPulse, History, Home, Loader2, MessageCircle,
  Minus, MoreHorizontal, Pencil, Plus, RotateCcw, Search, Send, Settings2, Sparkles, Trash2,
  TrendingDown, UserRound, Utensils, Weight, X, Zap,
} from 'lucide-react';
import {
  getGetDashboardQueryKey, getGetMealsQueryKey, getGetPlanQueryKey, getGetProfileQueryKey,
  getGetWeightEntriesQueryKey, getGetWorkoutsQueryKey, getGetYesterdayMealsQueryKey,
  getSearchFoodQueryKey, useAdjustPlan, useAnalyzeMealPhoto, useCreateMeal, useCreateWeightEntry,
  useCreateWorkout, useDeleteMeal, useGetDashboard, useGetMeals, useGetPlan, useGetProfile,
  useGetWeightEntries, useGetWorkouts, useGetYesterdayMeals, useRepeatYesterdayMeals,
  useSearchFood, useSendCoachMessage, useUpdateProfile,
} from '@workspace/api-client-react';
import type { Meal, MealScan, Profile, Plan, Workout, WeightEntry } from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import NotFound from '@/pages/not-found';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import './index.css';

const queryClient = new QueryClient();
const today = new Date().toISOString().slice(0, 10);
type Language = 'en' | 'ar';
const LanguageContext = createContext<{ language: Language; setLanguage: (language: Language) => void }>({
  language: 'en',
  setLanguage: () => undefined,
});
const useLanguage = () => useContext(LanguageContext);
const useT = () => {
  const { language } = useLanguage();
  return (english: string, arabic: string) => language === 'en' ? english : arabic;
};
const number = (n = 0) => new Intl.NumberFormat('en-US').format(Math.round(n));
const time = (value: string, language: Language) => new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : 'en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(value));
const pct = (current: number, target: number) => Math.min(100, Math.max(0, target ? (current / target) * 100 : 0));

function IconButton({ label, children, onClick, testId }: { label: string; children: ReactNode; onClick?: () => void; testId: string }) {
  return <button type="button" aria-label={label} data-testid={testId} onClick={onClick} className="qoot-button grid h-10 w-10 place-items-center rounded-xl border border-border/80 bg-card text-muted-foreground hover:border-primary/50 hover:text-primary">{children}</button>;
}

function Logo() {
  return <Link href="/" data-testid="link-logo" className="flex items-center gap-3">
    <img src={`${import.meta.env.BASE_URL}icons/icon-512.png`} alt="شعار قوت" className="h-11 w-11 rounded-2xl object-cover shadow-lg shadow-primary/20" />
    <span className="text-right"><strong className="qoot-display block text-xl leading-none">قوت</strong><small className="mt-1 block text-[10px] font-semibold tracking-[.22em] text-muted-foreground">QOOT COACH</small></span>
  </Link>;
}

function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  return <button type="button" onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')} data-testid="button-language-switcher" className="qoot-button inline-flex h-10 items-center gap-1 rounded-xl border border-primary/30 bg-primary/10 px-3 text-xs font-bold text-primary hover:border-primary/60"><span className={language === 'en' ? 'text-primary' : 'text-muted-foreground'}>EN</span><span className="text-muted-foreground">/</span><span className={language === 'ar' ? 'text-primary' : 'text-muted-foreground'}>AR</span></button>;
}

function navItems(t: (english: string, arabic: string) => string) {
  return [
    { href: '/', label: t('Today', 'النهارده'), icon: Home },
    { href: '/coach', label: t('Coach', 'الكوتش'), icon: MessageCircle },
    { href: '/scan', label: t('Scan food', 'صوّر أكلك'), icon: Camera },
    { href: '/progress', label: t('Progress', 'تقدّمك'), icon: BarChart3 },
    { href: '/profile', label: t('Profile', 'حسابي'), icon: UserRound },
  ];
}

function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { language } = useLanguage();
  const t = useT();
  const nav = navItems(t);
  return <div lang={language} dir={language === 'ar' ? 'rtl' : 'ltr'} className="qoot-shell qoot-noise min-h-[100dvh] text-foreground">
    <aside className={`fixed inset-y-0 z-40 hidden w-[260px] bg-sidebar/95 px-5 py-7 backdrop-blur-xl lg:flex lg:flex-col ${language === 'ar' ? 'right-0 border-l' : 'left-0 border-r'} border-sidebar-border`}>
      <Logo />
      <div className="mt-12 px-3 text-xs font-semibold text-muted-foreground">{t('Your daily space', 'مساحتك اليومية')}</div>
      <nav className="mt-3 space-y-1.5">
        {nav.map(({ href, label, icon: NavIcon }) => <Link key={href} href={href} data-testid={`link-nav-${href.slice(1) || 'today'}`} className={`group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition ${location === href ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/15' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}>
          <NavIcon className="h-[18px] w-[18px]" strokeWidth={1.8} /><span>{label}</span>{href === '/coach' && <span className="ml-auto h-2 w-2 rounded-full bg-accent" />}
        </Link>)}
      </nav>
      <div className="mt-auto rounded-2xl border border-primary/20 bg-primary/10 p-4">
        <div className="mb-2 flex items-center justify-between"><span className="text-xs text-primary">{t("Coach's note", 'ملاحظة الكوتش')}</span><Sparkles className="h-4 w-4 text-accent" /></div>
        <p className="text-sm leading-7 text-foreground/85">{t("Every day doesn't have to be perfect. Just return to your plan.", 'مش لازم كل يوم يبقى كامل. المهم إنك ترجع للخطة.')}</p>
      </div>
      <Link href="/profile" data-testid="link-sidebar-profile" className="mt-5 flex items-center gap-3 border-t border-sidebar-border pt-5">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-accent/15 text-sm font-bold text-accent">Q</span>
        <span><strong className="block text-sm">Qoot member</strong><small className="text-xs text-muted-foreground">{t('Balanced plan', 'الخطة المتوازنة')}</small></span>
        <ChevronLeft className="ml-auto h-4 w-4 text-muted-foreground" />
      </Link>
    </aside>
    <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-border/70 bg-background/80 px-5 backdrop-blur-xl">
      <Logo />
      <div className="flex items-center gap-2"><LanguageSwitcher /><IconButton label={t('Notifications', 'التنبيهات')} testId="button-notifications"><Bell className="h-5 w-5" /></IconButton></div>
    </header>
    <main className={`min-h-[100dvh] pb-24 lg:pb-8 ${language === 'ar' ? 'lg:mr-[260px]' : 'lg:ml-[260px]'}`}>
      <div className="mx-auto max-w-[1400px] px-5 py-7 sm:px-8 lg:px-12 lg:py-10">{children}</div>
    </main>
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border/80 bg-sidebar/95 px-2 py-2 backdrop-blur-xl lg:hidden">
      {nav.map(({ href, label, icon: NavIcon }) => <Link key={href} href={href} data-testid={`link-mobile-nav-${href.slice(1) || 'today'}`} className={`flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[10px] ${location === href ? 'text-primary' : 'text-muted-foreground'}`}><NavIcon className="h-5 w-5" /><span>{label}</span></Link>)}
    </nav>
  </div>;
}

function SectionTitle({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: React.ReactNode }) {
  return <div className="mb-5 flex items-end justify-between gap-4"><div>{eyebrow && <p className="mb-1 text-xs font-bold tracking-[.14em] text-primary">{eyebrow}</p>}<h2 className="qoot-display text-2xl font-semibold sm:text-3xl">{title}</h2></div>{action}</div>;
}

function Skeleton({ className = '' }: { className?: string }) { return <div className={`qoot-skeleton rounded-2xl ${className}`} />; }
function PageState({ error, retry }: { error?: boolean; retry?: () => void }) {
  const t = useT();
  return <div className="qoot-card rounded-3xl p-10 text-center"><CircleHelp className="mx-auto mb-3 h-9 w-9 text-accent" /><h2 className="qoot-display text-xl">{error ? t('Something went wrong', 'حصل لخبطة بسيطة') : t('Preparing your space', 'بنجهّز مساحتك')}</h2><p className="mt-2 text-sm text-muted-foreground">{error ? t('Try again in a moment. Your data is waiting.', 'جرّب تاني بعد لحظة، بياناتك مستنيّاك.') : t('We will be ready in a second.', 'ثواني ونكون جاهزين.')}</p>{error && retry && <button onClick={retry} data-testid="button-retry" className="qoot-button mt-5 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">{t('Try again', 'حاول تاني')}</button>}</div>;
}

function ProgressBar({ current, target, color = 'primary' }: { current: number; target: number; color?: 'primary' | 'accent' | 'cyan' }) {
  const colorClass = color === 'accent' ? 'bg-accent' : color === 'cyan' ? 'bg-chart-3' : 'bg-primary';
  return <div className="h-2 overflow-hidden rounded-full bg-secondary"><div className={`qoot-progress h-full rounded-full ${colorClass}`} style={{ width: `${pct(current, target)}%` }} /></div>;
}

function Macro({ label, value, target, unit, color }: { label: string; value: number; target: number; unit: string; color: 'primary' | 'accent' | 'cyan' }) {
  return <div className="rounded-2xl bg-secondary/70 p-4"><div className="mb-3 flex items-center justify-between text-xs text-muted-foreground"><span>{label}</span><span className="font-semibold text-foreground">{number(value)} / {number(target)} {unit}</span></div><ProgressBar current={value} target={target} color={color} /></div>;
}

type OnboardingValues = {
  name: string;
  age: string;
  heightCm: string;
  weightKg: string;
  targetWeightKg: string;
  sex: 'male' | 'female';
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'high';
  goal: 'lose' | 'build' | 'maintain';
  stepTarget: string;
  unitSystem: 'metric' | 'imperial';
};

function onboardingValues(profile?: Profile): OnboardingValues {
  return {
    name: profile?.name ?? '',
    age: profile?.age ? String(profile.age) : '',
    heightCm: profile?.heightCm ? String(profile.heightCm) : '',
    weightKg: profile?.weightKg ? String(profile.weightKg) : '',
    targetWeightKg: profile?.targetWeightKg ? String(profile.targetWeightKg) : '',
    sex: profile?.sex ?? 'male',
    activityLevel: profile?.activityLevel ?? 'moderate',
    goal: profile?.goal ?? 'lose',
    stepTarget: profile?.stepTarget ? String(profile.stepTarget) : '8000',
    unitSystem: profile?.unitSystem ?? 'metric',
  };
}

function OnboardingPage({ profile }: { profile?: Profile }) {
  const t = useT();
  const qc = useQueryClient();
  const update = useUpdateProfile();
  const [form, setForm] = useState<OnboardingValues>(() => onboardingValues(profile));
  const field = <K extends keyof OnboardingValues>(key: K, value: OnboardingValues[K]) => setForm((current) => ({ ...current, [key]: value }));
  const save = () => {
    if (!form.name || !form.age || !form.heightCm || !form.weightKg || !form.targetWeightKg) return;
    update.mutate({ data: {
      name: form.name.trim(),
      age: Number(form.age),
      heightCm: Number(form.heightCm),
      weightKg: Number(form.weightKg),
      targetWeightKg: Number(form.targetWeightKg),
      sex: form.sex,
      activityLevel: form.activityLevel,
      goal: form.goal,
      stepTarget: Number(form.stepTarget),
      unitSystem: form.unitSystem,
    } }, {
      onSuccess: (savedProfile) => {
        qc.setQueryData(getGetProfileQueryKey(), savedProfile);
        qc.invalidateQueries({ queryKey: getGetPlanQueryKey() });
        qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        toast.success(t('Your personalized plan is ready', 'خطتك المخصصة جاهزة'));
      },
      onError: () => toast.error(t('Please check your details and try again', 'راجع بياناتك وحاول تاني')),
    });
  };
  return <div className="qoot-page-in mx-auto max-w-3xl space-y-7"><header className="text-center"><p className="mb-2 text-sm font-bold text-primary">{t('Welcome to Qoot', 'أهلاً بيك في قوت')}</p><h1 className="qoot-display text-4xl font-semibold">{t('Let’s build your plan', 'خلّينا نبني خطتك')}</h1><p className="mx-auto mt-3 max-w-xl leading-7 text-muted-foreground">{t('Tell us a little about yourself. We will calculate your calories and macros using your own goals and activity.', 'قولنا شوية عنك، وإحنا هنحسب سعراتك وماكروزك على حسب هدفك ونشاطك.')}</p></header><section className="qoot-card rounded-3xl p-6 sm:p-8"><div className="grid gap-4 sm:grid-cols-2"><label className="sm:col-span-2"><span className="qoot-label">{t('Name', 'الاسم')}</span><input value={form.name} onChange={(e) => field('name', e.target.value)} data-testid="input-onboarding-name" className="qoot-input" placeholder={t('Your name', 'اسمك')} /></label><label><span className="qoot-label">{t('Age', 'السن')}</span><input value={form.age} onChange={(e) => field('age', e.target.value)} data-testid="input-onboarding-age" className="qoot-input" type="number" min="13" max="100" /></label><label><span className="qoot-label">{t('Sex', 'النوع')}</span><select value={form.sex} onChange={(e) => field('sex', e.target.value as OnboardingValues['sex'])} data-testid="select-onboarding-sex" className="qoot-input"><option value="male">{t('Male', 'راجل')}</option><option value="female">{t('Female', 'ست')}</option></select></label><label><span className="qoot-label">{t('Height (cm)', 'الطول (سم)')}</span><input value={form.heightCm} onChange={(e) => field('heightCm', e.target.value)} data-testid="input-onboarding-height" className="qoot-input" type="number" min="100" max="240" /></label><label><span className="qoot-label">{t('Current weight (kg)', 'الوزن الحالي (كجم)')}</span><input value={form.weightKg} onChange={(e) => field('weightKg', e.target.value)} data-testid="input-onboarding-weight" className="qoot-input" type="number" min="30" max="300" step="0.1" /></label><label><span className="qoot-label">{t('Target weight (kg)', 'الوزن المستهدف (كجم)')}</span><input value={form.targetWeightKg} onChange={(e) => field('targetWeightKg', e.target.value)} data-testid="input-onboarding-target-weight" className="qoot-input" type="number" min="30" max="300" step="0.1" /></label><label><span className="qoot-label">{t('Daily steps', 'هدف الخطوات')}</span><input value={form.stepTarget} onChange={(e) => field('stepTarget', e.target.value)} data-testid="input-onboarding-steps" className="qoot-input" type="number" min="1000" max="50000" /></label><label><span className="qoot-label">{t('Goal', 'الهدف')}</span><select value={form.goal} onChange={(e) => field('goal', e.target.value as OnboardingValues['goal'])} data-testid="select-onboarding-goal" className="qoot-input"><option value="lose">{t('Lose weight', 'أخسّس')}</option><option value="maintain">{t('Maintain weight', 'أحافظ')}</option><option value="build">{t('Build muscle', 'أبني عضل')}</option></select></label><label><span className="qoot-label">{t('Activity level', 'النشاط اليومي')}</span><select value={form.activityLevel} onChange={(e) => field('activityLevel', e.target.value as OnboardingValues['activityLevel'])} data-testid="select-onboarding-activity" className="qoot-input"><option value="sedentary">{t('Mostly sitting', 'قليل الحركة')}</option><option value="light">{t('Light activity', 'خفيف')}</option><option value="moderate">{t('Moderate activity', 'متوسط')}</option><option value="high">{t('High activity', 'عالي')}</option></select></label></div><button onClick={save} disabled={update.isPending} data-testid="button-complete-onboarding" className="qoot-button mt-7 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 font-bold text-primary-foreground disabled:opacity-60">{update.isPending ? <><Loader2 className="h-5 w-5 animate-spin" />{t('Calculating your personalized plan...', 'جاري حساب خطتك المخصصة...')}</> : <>{t('Calculate my plan', 'احسب خطتي')} <ArrowLeft className="h-4 w-4" /></>}</button></section></div>;
}

function DashboardPage() {
  const qc = useQueryClient();
  const { language } = useLanguage();
  const t = useT();
  const profileQ = useGetProfile();
  const dashboardQ = useGetDashboard();
  const planQ = useGetPlan();
  const mealsQ = useGetMeals({ date: today });
  const yesterdayQ = useGetYesterdayMeals();
  const repeat = useRepeatYesterdayMeals();
  const createMeal = useCreateMeal();
  const deleteMeal = useDeleteMeal();
  const [showMealForm, setShowMealForm] = useState(false);
  const [mealName, setMealName] = useState('');
  const [mealCalories, setMealCalories] = useState('');
  const [foodQuery, setFoodQuery] = useState('');
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('lunch');
  const [localWater, setLocalWater] = useState<number | null>(null);
  const foodSearch = useSearchFood(
    { q: foodQuery || ' ', limit: 5 },
    { query: { enabled: foodQuery.length > 1, queryKey: getSearchFoodQueryKey({ q: foodQuery || ' ', limit: 5 }) } },
  );
  const dashboard = dashboardQ.data;
  const meals = Array.isArray(mealsQ.data) ? mealsQ.data : Array.isArray(dashboard?.meals) ? dashboard.meals : [];
  const profile = profileQ.data;
  const waterMl = localWater ?? dashboard?.waterMl ?? 0;
  const plan = planQ.data;
  const addMeal = () => {
    if (!mealName || !mealCalories) return;
    createMeal.mutate({ data: { name: mealName, mealType, calories: Number(mealCalories), protein: 0, carbs: 0, fat: 0, fiber: 0, portion: 'حصة واحدة', date: today } }, {
      onSuccess: () => { toast.success('اتسجلت الوجبة'); setMealName(''); setMealCalories(''); setShowMealForm(false); qc.invalidateQueries({ queryKey: getGetMealsQueryKey({ date: today }) }); qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() }); },
      onError: () => toast.error('ماعرفناش نسجلها دلوقتي'),
    });
  };
  if (dashboardQ.isLoading || profileQ.isLoading || planQ.isLoading) return <div className="space-y-6"><Skeleton className="h-28 w-2/3" /><div className="grid gap-4 md:grid-cols-3"><Skeleton className="h-40" /><Skeleton className="h-40" /><Skeleton className="h-40" /></div><Skeleton className="h-72" /></div>;
  if (dashboardQ.isError) return <PageState error retry={() => dashboardQ.refetch()} />;
  const calories = dashboard?.calories ?? { target: plan?.calories ?? 2100, consumed: 0, burned: 0, remaining: plan?.calories ?? 2100 };
  const macros = dashboard?.macros ?? { protein: { current: 0, target: plan?.protein ?? 140 }, carbs: { current: 0, target: plan?.carbs ?? 220 }, fat: { current: 0, target: plan?.fat ?? 70 }, fiber: { current: 0, target: plan?.fiber ?? 30 } };
  const firstName = profile?.name?.split(' ')[0] ?? 'يا بطل';
  return <div className="qoot-page-in space-y-8">
     <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="mb-2 text-sm font-medium text-primary">{new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</p><h1 className="qoot-display text-4xl font-semibold leading-tight sm:text-5xl">{t(`Good morning, ${firstName}`, `صباح الخير يا ${firstName}`)}</h1><p className="mt-2 text-muted-foreground">{t("Let's make today simple and balanced.", 'خلّينا نخلي النهارده بسيط ومظبوط.')}</p></div><div className="flex items-center gap-3"><div className="hidden text-left sm:block"><p className="text-xs text-muted-foreground">{t('Consistency streak', 'سلسلة الالتزام')}</p><p className="text-lg font-bold text-accent">{number(dashboard?.streak ?? 0)} {t('days', 'يوم')}</p></div><IconButton label={t('Notifications', 'التنبيهات')} testId="button-dashboard-notifications"><Bell className="h-5 w-5" /></IconButton></div></header>
    <section className="grid gap-4 md:grid-cols-[1.4fr_1fr_1fr]">
       <div className="qoot-card relative overflow-hidden rounded-3xl p-6 sm:p-7"><div className="absolute -left-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" /><div className="relative"><div className="mb-6 flex items-center justify-between"><div><p className="text-sm text-muted-foreground">{t("Today's calories", 'سعراتك النهارده')}</p><p className="mt-1 text-3xl font-bold">{number(calories.remaining)} <span className="text-sm font-normal text-muted-foreground">{t('remaining', 'متبقية')}</span></p></div><div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/15 text-primary"><Flame className="h-6 w-6" /></div></div><div className="mb-3 flex items-center justify-between text-xs text-muted-foreground"><span>{number(calories.consumed)} {t('consumed', 'متاخد')}</span><span>{t('Goal', 'هدف')} {number(calories.target)}</span></div><ProgressBar current={calories.consumed} target={calories.target} /><div className="mt-5 flex justify-between border-t border-border/70 pt-4 text-xs"><span><span className="text-muted-foreground">{t('Burned ', 'اتحرق ')}</span><b className="text-accent">{number(calories.burned)}</b></span><span className="text-muted-foreground">{t('Your plan is on track', 'المعادلة ماشية معاك')}</span></div></div></div>
        <div className="qoot-card rounded-3xl p-6"><div className="mb-4 flex items-center justify-between"><p className="text-sm text-muted-foreground">{t('Water', 'المياه')}</p><button type="button" onClick={() => setLocalWater(Math.min(2500, waterMl + 250))} data-testid="button-add-water" className="qoot-button inline-flex items-center gap-1 rounded-lg border border-chart-3/30 px-2.5 py-1.5 text-xs font-bold text-chart-3 hover:border-chart-3/60"><Plus className="h-3.5 w-3.5" />+250 ml</button></div><p className="text-3xl font-bold">{number(waterMl)} <span className="text-sm font-normal text-muted-foreground">ml</span></p><div className="mt-6"><ProgressBar current={waterMl} target={2500} color="cyan" /></div><p className="mt-3 text-xs text-muted-foreground">{t('Your goal is 2.5 L today', 'هدفك ٢.٥ لتر النهارده')}</p></div>
       <div className="qoot-card rounded-3xl p-6"><div className="mb-4 flex items-center justify-between"><p className="text-sm text-muted-foreground">{t('Movement', 'الحركة')}</p><Footprints className="h-5 w-5 text-accent" /></div><p className="text-3xl font-bold">{number(dashboard?.workouts?.length ?? 0)} <span className="text-sm font-normal text-muted-foreground">{t('workouts', 'تمرين')}</span></p><div className="mt-6 flex items-center gap-2 text-sm"><span className="grid h-7 w-7 place-items-center rounded-full bg-accent/15 text-accent"><Zap className="h-3.5 w-3.5" /></span><span className="text-muted-foreground">{t('Every step counts', 'كل خطوة بتفرق')}</span></div><Link href="/progress" data-testid="link-dashboard-progress" className="mt-3 inline-flex text-xs font-bold text-primary">{t('See your progress', 'شوف تقدّمك')} <ArrowLeft className="ml-1 h-3.5 w-3.5" /></Link></div>
    </section>
     <section><SectionTitle eyebrow={t('Daily split', 'توزيع اليوم')} title={t('Your macros', 'الماكروز بتاعتك')} action={<Link href="/profile" data-testid="link-dashboard-plan" className="text-sm font-semibold text-primary">{t('Edit plan', 'تعديل الخطة')}</Link>} /><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Macro label={t('Protein', 'بروتين')} value={macros.protein.current} target={macros.protein.target} unit={t('g', 'جم')} color="primary" /><Macro label={t('Carbs', 'كربوهيدرات')} value={macros.carbs.current} target={macros.carbs.target} unit={t('g', 'جم')} color="accent" /><Macro label={t('Fat', 'دهون')} value={macros.fat.current} target={macros.fat.target} unit={t('g', 'جم')} color="cyan" /><Macro label={t('Fiber', 'ألياف')} value={macros.fiber.current} target={macros.fiber.target} unit={t('g', 'جم')} color="primary" /></div></section>
     <section><SectionTitle eyebrow={t('Food', 'الأكل')} title={t("Today's meals", 'وجبات النهارده')} action={<button onClick={() => setShowMealForm((v) => !v)} data-testid="button-add-meal" className="qoot-button inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"><Plus className="h-4 w-4" />{t('Log a meal', 'سجّل وجبة')}</button>} />
      {showMealForm && <div className="qoot-card mb-4 grid gap-3 rounded-2xl p-4 sm:grid-cols-[1fr_1fr_140px_140px_auto]"><div className="relative"><input value={mealName} onChange={(e) => setMealName(e.target.value)} data-testid="input-meal-name" className="qoot-input" placeholder="اسم الوجبة أو ابحث عن أكلة" />{foodQuery && foodSearch.data?.length ? <div className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-border bg-popover shadow-xl">{foodSearch.data.map((food) => <button key={food.id} type="button" onClick={() => { setMealName(food.name); setMealCalories(String(food.calories)); setFoodQuery(''); }} data-testid={`button-food-result-${food.id}`} className="block w-full px-3 py-2 text-right text-xs hover:bg-secondary">{food.name} · {number(food.calories)} سعرة</button>)}</div> : null}</div><input value={mealCalories} onChange={(e) => setMealCalories(e.target.value)} onFocus={() => setFoodQuery(mealName)} data-testid="input-meal-calories" className="qoot-input" placeholder="السعرات" type="number" /><select value={mealType} onChange={(e) => setMealType(e.target.value as typeof mealType)} data-testid="select-meal-type" className="qoot-input"><option value="breakfast">فطار</option><option value="lunch">غدا</option><option value="dinner">عشا</option><option value="snack">سناك</option></select><button onClick={addMeal} disabled={createMeal.isPending} data-testid="button-save-meal" className="qoot-button rounded-xl bg-accent px-4 py-2 font-bold text-accent-foreground disabled:opacity-50">{createMeal.isPending ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : 'حفظ'}</button></div>}
       {!meals.length ? <div className="qoot-card rounded-3xl p-9 text-center"><Utensils className="mx-auto mb-3 h-8 w-8 text-muted-foreground" /><p className="font-semibold">لسه مفيش حاجة اتسجلت</p><p className="mt-1 text-sm text-muted-foreground">ابدأ بوجبة بسيطة، وإحنا نكمّل الصورة معاك.</p>{(yesterdayQ.data?.length ?? 0) > 0 && <button onClick={() => repeat.mutate(undefined, { onSuccess: () => { toast.success('كررنا وجبات امبارح'); qc.invalidateQueries({ queryKey: getGetMealsQueryKey({ date: today }) }); qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() }); } })} data-testid="button-repeat-yesterday" className="qoot-button mt-4 inline-flex items-center gap-2 rounded-xl border border-primary/40 px-4 py-2.5 text-sm font-bold text-primary"><RotateCcw className="h-4 w-4" />كرّر وجبات امبارح</button>}</div> : <div className="qoot-card divide-y divide-border/70 overflow-hidden rounded-3xl">{meals.map((meal: Meal) => <div key={meal.id} data-testid={`row-meal-${meal.id}`} className="flex items-center gap-4 px-5 py-4 transition hover:bg-secondary/40"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary"><Utensils className="h-5 w-5" /></span><div className="min-w-0 flex-1"><p className="font-semibold">{meal.name}</p><p className="mt-1 text-xs text-muted-foreground">{meal.portion} · {time(meal.loggedAt, language)}</p></div><div className="text-left"><b>{number(meal.calories)}</b><span className="mr-1 text-xs text-muted-foreground">سعرة</span></div><IconButton label={`حذف ${meal.name}`} testId={`button-delete-meal-${meal.id}`} onClick={() => deleteMeal.mutate({ id: meal.id }, { onSuccess: () => { toast.success('اتمسحت الوجبة'); qc.invalidateQueries({ queryKey: getGetMealsQueryKey({ date: today }) }); qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() }); } })}><Trash2 className="h-4 w-4 text-muted-foreground" /></IconButton></div>)}</div>}
    </section>
  </div>;
}

function CoachPage() {
  const { language } = useLanguage();
  const t = useT();
  const send = useSendCoachMessage();
  const profileQ = useGetProfile();
  const planQ = useGetPlan();
  const dashboardQ = useGetDashboard();
  const [message, setMessage] = useState('');
  const [suggestions, setSuggestions] = useState([t('What should I have for dinner?', 'أعمل إيه في العشا؟'), t('How many calories do I have left?', 'فاضلي كام؟'), t('How can I add protein?', 'إزاي أزوّد البروتين؟')]);
  const [messages, setMessages] = useState<{ id: string | number; role: 'user' | 'assistant'; message: string }[]>([
    { id: 'welcome', role: 'assistant', message: t(`Hi ${profileQ.data?.name?.split(' ')[0] ?? 'there'}. I can see your plan and today's food. Ask me about any nutrition or training decision.`, `أهلاً يا ${profileQ.data?.name?.split(' ')[0] ?? 'بطل'}. أنا شايف يومك وخطتك، واسألني عن أي قرار يخص أكلك أو تمرينك.`) },
  ]);
  const submit = (text = message) => {
    if (!text.trim() || send.isPending) return;
    const clean = text.trim();
    setMessage('');
    setMessages((current) => [...current, { id: `u-${Date.now()}`, role: 'user', message: clean }]);
    send.mutate({
      data: {
        message: clean,
        context: {
          language,
          profile: profileQ.data,
          plan: planQ.data,
          dashboard: dashboardQ.data,
          recentMessages: messages.slice(-8).map(({ role, message: textValue }) => ({ role, message: textValue })),
        },
      },
    }, {
      onSuccess: (reply) => {
        setSuggestions(reply.suggestions);
        setMessages((current) => [...current, { id: reply.id, role: 'assistant', message: reply.message }]);
      },
      onError: () => {
        toast.error('الكوتش مشغول شوية');
        setMessages((current) => [...current, { id: `e-${Date.now()}`, role: 'assistant', message: 'معلش حصل عطل صغير. جرّب تبعتلي تاني بعد لحظة.' }]);
      },
    });
  };
  return <div className="qoot-page-in mx-auto max-w-4xl space-y-7"><header><p className="mb-2 text-sm font-bold text-primary">{t('Your coach', 'الكوتش بتاعك')}</p><h1 className="qoot-display text-4xl font-semibold">{t('Talk freely, I am listening', 'اتكلم براحتك، أنا سامعك')}</h1><p className="mt-2 text-muted-foreground">{t("I use today's food and plan to give you a personal answer, not generic advice.", 'أنا بستخدم أكلك وخطتك النهارده عشان أديك إجابة مناسبة ليك، مش نصيحة عامة.')}</p></header><div className="qoot-card flex min-h-[620px] flex-col rounded-3xl"><div className="flex items-center gap-3 border-b border-border/70 p-5"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary text-primary-foreground"><Sparkles className="h-5 w-5" /></span><div><p className="font-bold">Qoot Coach</p><p className="text-xs text-primary">{t("Seeing today's data", 'شايف بيانات يومك')}</p></div><span className="ml-auto h-2.5 w-2.5 rounded-full bg-primary" /></div><div className="flex-1 space-y-5 overflow-auto p-5 sm:p-7">{messages.map((item) => <div key={item.id} data-testid={`message-coach-${item.id}`} className={`flex ${item.role === 'user' ? 'justify-start' : 'justify-end'}`}><div className={`max-w-[84%] rounded-2xl px-4 py-3 text-sm leading-7 ${item.role === 'user' ? 'rounded-bl-sm bg-primary text-primary-foreground' : 'rounded-br-sm bg-secondary text-foreground'}`}>{item.message}</div></div>)}{send.isPending && <div className="flex justify-end"><div className="rounded-2xl rounded-br-sm bg-secondary px-5 py-4"><span className="inline-flex gap-1"><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" /><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:.15s]" /><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:.3s]" /></span></div></div>}</div><div className="border-t border-border/70 p-4"><div className="mb-3 flex flex-wrap gap-2">{suggestions.map((s) => <button key={s} onClick={() => submit(s)} data-testid={`button-suggestion-${s}`} className="qoot-button rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-primary hover:text-primary">{s}</button>)}</div><div className="flex items-center gap-2"><input value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} data-testid="input-coach-message" className="qoot-input" placeholder={t('Ask your question...', 'اكتب سؤالك هنا...')} /><button onClick={() => submit()} disabled={!message.trim() || send.isPending} data-testid="button-send-coach" className="qoot-button grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground disabled:opacity-40"><Send className="h-5 w-5" /></button></div></div></div></div>;
}

function ScanPage() {
  const t = useT();
  const analyze = useAnalyzeMealPhoto();
  const createMeal = useCreateMeal();
  const qc = useQueryClient();
  const [scan, setScan] = useState<MealScan | null>(null);
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('lunch');
  const [selectedImageName, setSelectedImageName] = useState('meal-photo.jpg');
  const runScan = () => analyze.mutate({ data: { imageName: selectedImageName, mealType } }, { onSuccess: (result) => { setScan(result); toast.success(t('Meal analyzed', 'حلّلنا الطبق')); }, onError: () => toast.error(t("We couldn't analyze the photo", 'مش قادرين نحلّل الصورة دلوقتي')) });
  const logScan = () => { if (!scan) return; createMeal.mutate({ data: { name: scan.mealName, mealType, calories: scan.calories, protein: scan.protein, carbs: scan.carbs, fat: scan.fat, fiber: scan.fiber, portion: scan.portion, date: today } }, { onSuccess: () => { toast.success(t("Added to today's meals", 'اتضافت لوجبات النهارده')); qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() }); qc.invalidateQueries({ queryKey: getGetMealsQueryKey({ date: today }) }); } }); };
    return <div className="qoot-page-in space-y-8"><header><p className="mb-2 text-sm font-bold text-primary">{t('Scan your food', 'صوّر أكلك')}</p><h1 className="qoot-display text-4xl font-semibold">{t('Let your plate speak', 'خلّي الطبق يتكلم')}</h1><p className="mt-2 text-muted-foreground">{t('One photo, one practical estimate to help you choose better.', 'صورة واحدة، وتقدير عملي يساعدك تاخد قرار أحسن.')}</p></header><div className="grid gap-6 lg:grid-cols-[1.08fr_.92fr]"><div className="qoot-card rounded-3xl p-5 sm:p-7"><div className="flex min-h-[390px] flex-col items-center justify-center rounded-2xl border border-dashed border-primary/40 bg-primary/[.04] p-6 text-center"><div className="mb-5 grid h-20 w-20 place-items-center rounded-[28px] bg-primary/15 text-primary"><Camera className="h-9 w-9" /></div><h2 className="qoot-display text-2xl">{t('Take or choose a photo', 'صوّر أو اختار صورة')}</h2><p className="mt-2 max-w-sm text-sm leading-7 text-muted-foreground">{t("It doesn't need to be perfect. Your everyday plate is enough.", 'مش لازم الصورة تبقى مثالية. طبقك العادي كفاية عشان نبدأ.')}</p><label className="qoot-button mt-6 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-primary/40 px-4 py-2.5 text-sm font-bold text-primary hover:border-primary"><Camera className="h-4 w-4" />{t('Choose photo', 'اختار صورة')}<input type="file" accept="image/*" className="sr-only" data-testid="input-meal-photo" onChange={(event) => { const file = event.target.files?.[0]; if (file) setSelectedImageName(file.name); }} /></label><p className="mt-3 max-w-xs truncate text-xs text-muted-foreground">{selectedImageName}</p><button onClick={runScan} disabled={analyze.isPending} data-testid="button-analyze-meal" className="qoot-button mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground disabled:opacity-50">{analyze.isPending ? <><Loader2 className="h-4 w-4 animate-spin" />{t('Analyzing...', 'بنحلّل...')}</> : <><Camera className="h-4 w-4" />{t('Analyze photo', 'حلّل الصورة')}</>}</button><p className="mt-4 text-[11px] text-muted-foreground">{t('By continuing, you agree to process the photo for an estimate.', 'بالضغط، أنت بتوافق إن الصورة تتعالج لتقدير المكونات')}</p></div></div><div className="qoot-card rounded-3xl p-6 sm:p-7"><div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-bold text-primary">{t('Result', 'النتيجة')}</p><h2 className="qoot-display mt-1 text-2xl">{t('Meal estimate', 'تقدير الوجبة')}</h2></div><select value={mealType} onChange={(e) => setMealType(e.target.value as typeof mealType)} data-testid="select-scan-meal-type" className="qoot-input w-auto text-sm"><option value="breakfast">{t('Breakfast', 'فطار')}</option><option value="lunch">{t('Lunch', 'غدا')}</option><option value="dinner">{t('Dinner', 'عشا')}</option><option value="snack">{t('Snack', 'سناك')}</option></select></div>{!scan ? <div className="grid min-h-[320px] place-items-center text-center text-sm text-muted-foreground"><div><Utensils className="mx-auto mb-3 h-8 w-8 opacity-50" /><p>{t('Your result will appear here after analysis', 'النتيجة هتظهر هنا بعد التحليل')}</p></div></div> : <div className="space-y-5"><div className="rounded-2xl bg-secondary/70 p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">{t('Meal name', 'اسم الوجبة')}</p><input value={scan.mealName} onChange={(e) => setScan({ ...scan, mealName: e.target.value })} data-testid="input-scan-meal-name" className="mt-1 w-full bg-transparent text-xl font-bold outline-none" /></div><span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary">{number(scan.confidence)}% {t('confidence', 'ثقة')}</span></div><input value={scan.portion} onChange={(e) => setScan({ ...scan, portion: e.target.value })} data-testid="input-scan-portion" className="mt-3 w-full border-b border-border bg-transparent pb-1 text-sm text-muted-foreground outline-none" /></div><div className="grid grid-cols-2 gap-3">{[['calories', t('calories', 'سعرة'), scan.calories], ['protein', t('protein g', 'جم بروتين'), scan.protein], ['carbs', t('carbs g', 'جم كربوهيدرات'), scan.carbs], ['fat', t('fat g', 'جم دهون'), scan.fat], ['fiber', t('fiber g', 'جم ألياف'), scan.fiber]].map(([key, label, value]) => <label key={key as string} className="rounded-2xl bg-secondary/60 p-3"><span className="block text-[11px] text-muted-foreground">{label as string}</span><input type="number" value={value as number} onChange={(e) => setScan({ ...scan, [key as string]: Number(e.target.value) })} data-testid={`input-scan-${key}`} className="mt-1 w-full bg-transparent text-lg font-bold outline-none" /></label>)}</div><button onClick={logScan} disabled={createMeal.isPending} data-testid="button-log-scan" className="qoot-button flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 font-bold text-accent-foreground disabled:opacity-50">{createMeal.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{t('Approve and log meal', 'اعتمد وسجّل الوجبة')}</button></div>}</div></div></div>;
}

function ProgressPage() {
  const qc = useQueryClient();
  const weightsQ = useGetWeightEntries({ range: 30 });
  const workoutsQ = useGetWorkouts({ date: today });
  const profileQ = useGetProfile();
  const createWeight = useCreateWeightEntry();
  const createWorkout = useCreateWorkout();
  const [weight, setWeight] = useState('');
  const [showWeight, setShowWeight] = useState(false);
  const [workoutName, setWorkoutName] = useState('');
  const [showWorkout, setShowWorkout] = useState(false);
  const weights = weightsQ.data ?? [];
  const workouts = workoutsQ.data ?? [];
  const currentWeight = weights[weights.length - 1]?.weightKg ?? profileQ.data?.weightKg ?? 0;
  const startWeight = weights[0]?.weightKg ?? currentWeight;
  const targetWeight = profileQ.data?.targetWeightKg ?? currentWeight;
  const change = currentWeight - startWeight;
  const addWeight = () => { if (!weight) return; createWeight.mutate({ data: { weightKg: Number(weight), recordedAt: new Date().toISOString(), note: 'تسجيل من لوحة التقدم' } }, { onSuccess: () => { toast.success('اتسجل وزنك'); setWeight(''); setShowWeight(false); qc.invalidateQueries({ queryKey: getGetWeightEntriesQueryKey({ range: 30 }) }); } }); };
  const addWorkout = () => { if (!workoutName) return; createWorkout.mutate({ data: { name: workoutName, workoutType: 'resistance', durationMinutes: 30, caloriesBurned: 180, recordedAt: new Date().toISOString() } }, { onSuccess: () => { toast.success('برافو عليك، التمرين اتسجل'); setWorkoutName(''); setShowWorkout(false); qc.invalidateQueries({ queryKey: getGetWorkoutsQueryKey({ date: today }) }); qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() }); } }); };
  return <div className="qoot-page-in space-y-8"><header><p className="mb-2 text-sm font-bold text-primary">ملف التقدّم</p><h1 className="qoot-display text-4xl font-semibold">شايف الفرق؟ إحنا شايفينه</h1><p className="mt-2 text-muted-foreground">النتيجة مش رقم واحد. هي عادات صغيرة اتجمعت.</p></header><section className="grid gap-4 sm:grid-cols-3"><div className="qoot-card rounded-3xl p-5"><div className="mb-4 flex items-center justify-between text-muted-foreground"><span className="text-sm">الوزن الحالي</span><Weight className="h-5 w-5 text-primary" /></div><p className="text-3xl font-bold">{number(currentWeight)} <span className="text-sm font-normal text-muted-foreground">كجم</span></p><p className="mt-2 text-xs text-muted-foreground">الهدف {number(targetWeight)} كجم</p></div><div className="qoot-card rounded-3xl p-5"><div className="mb-4 flex items-center justify-between text-muted-foreground"><span className="text-sm">التغيير</span><TrendingDown className="h-5 w-5 text-accent" /></div><p className={`text-3xl font-bold ${change <= 0 ? 'text-primary' : 'text-accent'}`}>{change > 0 ? '+' : ''}{number(change)} <span className="text-sm font-normal text-muted-foreground">كجم</span></p><p className="mt-2 text-xs text-muted-foreground">آخر ٣٠ يوم</p></div><div className="qoot-card rounded-3xl p-5"><div className="mb-4 flex items-center justify-between text-muted-foreground"><span className="text-sm">تمارين الشهر</span><Activity className="h-5 w-5 text-chart-3" /></div><p className="text-3xl font-bold">{number(workouts.length)} <span className="text-sm font-normal text-muted-foreground">جلسة</span></p><p className="mt-2 text-xs text-muted-foreground">كل مرة بتقوّيك</p></div></section><div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]"><section className="qoot-card rounded-3xl p-6"><SectionTitle title="مسار الوزن" eyebrow="آخر ٣٠ يوم" action={<button onClick={() => setShowWeight((v) => !v)} data-testid="button-toggle-weight" className="qoot-button inline-flex items-center gap-1 rounded-xl border border-primary/40 px-3 py-2 text-xs font-bold text-primary"><Plus className="h-4 w-4" />تسجيل</button>} />{showWeight && <div className="mb-5 flex gap-2"><input value={weight} onChange={(e) => setWeight(e.target.value)} data-testid="input-weight" className="qoot-input" type="number" step="0.1" placeholder="وزنك بالكيلو" /><button onClick={addWeight} data-testid="button-save-weight" className="qoot-button rounded-xl bg-primary px-4 font-bold text-primary-foreground">حفظ</button></div>}{!weights.length ? <div className="grid min-h-[270px] place-items-center text-center text-sm text-muted-foreground"><div><Weight className="mx-auto mb-3 h-8 w-8 opacity-50" /><p>سجّل أول وزن عشان نرسم الطريق</p></div></div> : <div className="relative h-[270px] pt-5"><div className="absolute inset-x-0 top-1/2 border-t border-dashed border-border" /><div className="flex h-full items-end gap-2">{weights.slice(-14).map((entry: WeightEntry, i) => { const min = Math.min(...weights.map((w) => w.weightKg)); const max = Math.max(...weights.map((w) => w.weightKg)); const height = max === min ? 50 : 24 + ((entry.weightKg - min) / (max - min)) * 56; return <div key={entry.id} className="group flex h-full flex-1 flex-col items-center justify-end gap-2"><span className="pointer-events-none rounded bg-foreground px-1.5 py-1 text-[10px] text-background opacity-0 transition group-hover:opacity-100">{number(entry.weightKg)}</span><div className="w-full max-w-8 rounded-t-lg bg-primary/80 transition group-hover:bg-accent" style={{ height: `${height}%` }} /><span className="text-[9px] text-muted-foreground">{i % 2 === 0 ? new Date(entry.recordedAt).getDate() : ''}</span></div>; })}</div></div>}</section><section className="qoot-card rounded-3xl p-6"><SectionTitle title="حركة النهارده" eyebrow="خليك في الحركة" action={<button onClick={() => setShowWorkout((v) => !v)} data-testid="button-toggle-workout" className="qoot-button grid h-9 w-9 place-items-center rounded-xl border border-primary/40 text-primary"><Plus className="h-4 w-4" /></button>} />{showWorkout && <div className="mb-4 flex gap-2"><input value={workoutName} onChange={(e) => setWorkoutName(e.target.value)} data-testid="input-workout-name" className="qoot-input" placeholder="اسم التمرين" /><button onClick={addWorkout} data-testid="button-save-workout" className="qoot-button rounded-xl bg-primary px-3 text-sm font-bold text-primary-foreground">حفظ</button></div>}{!workouts.length ? <div className="grid min-h-[270px] place-items-center text-center text-sm text-muted-foreground"><div><HeartPulse className="mx-auto mb-3 h-8 w-8 opacity-50" /><p>مفيش تمارين متسجلة النهارده</p><p className="mt-1">حتى مشية قصيرة تتحسب.</p></div></div> : <div className="space-y-3">{workouts.map((workout: Workout) => <div key={workout.id} data-testid={`row-workout-${workout.id}`} className="flex items-center gap-3 rounded-2xl bg-secondary/60 p-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/15 text-accent"><Activity className="h-5 w-5" /></span><div className="flex-1"><p className="text-sm font-bold">{workout.name}</p><p className="text-xs text-muted-foreground">{number(workout.durationMinutes)} دقيقة</p></div><span className="text-sm font-bold text-accent">{number(workout.caloriesBurned)} سعرة</span></div>)}</div>}</section></div></div>;
}

function ProfilePage() {
  const qc = useQueryClient();
  const profileQ = useGetProfile();
  const planQ = useGetPlan();
  const update = useUpdateProfile();
  const adjust = useAdjustPlan();
  const [editing, setEditing] = useState(false);
  const [planReason, setPlanReason] = useState('');
  const profile = profileQ.data;
  const plan = planQ.data;
  const [form, setForm] = useState<Partial<Profile>>({});
  const beginEdit = () => { if (profile) setForm(profile); setEditing(true); };
  const saveProfile = () => { if (!profile || !form.name) return; const data = { name: form.name, age: Number(form.age), heightCm: Number(form.heightCm), weightKg: Number(form.weightKg), targetWeightKg: Number(form.targetWeightKg), sex: form.sex ?? 'male', activityLevel: form.activityLevel ?? 'moderate', goal: form.goal ?? 'lose', stepTarget: Number(form.stepTarget), unitSystem: form.unitSystem ?? 'metric' } as const; update.mutate({ data }, { onSuccess: () => { toast.success('اتحفظت بياناتك واتحدّثت الخطة'); setEditing(false); qc.invalidateQueries({ queryKey: getGetProfileQueryKey() }); qc.invalidateQueries({ queryKey: getGetPlanQueryKey() }); qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() }); }, onError: () => toast.error('محتاجين نراجع البيانات مرة كمان') }); };
  const adjustPlan = () => { if (!planReason) return; adjust.mutate({ data: { reason: planReason } }, { onSuccess: () => { toast.success('الخطة اتظبطت على احتياجك'); setPlanReason(''); qc.invalidateQueries({ queryKey: getGetPlanQueryKey() }); }, onError: () => toast.error('ماقدرناش نعدّل الخطة') }); };
  if (profileQ.isLoading || planQ.isLoading) return <div className="space-y-5"><Skeleton className="h-28" /><Skeleton className="h-80" /></div>;
  if (!profile) return <PageState error retry={() => profileQ.refetch()} />;
  const field = (key: keyof Profile, value: string | number) => setForm((f) => ({ ...f, [key]: value }));
  return <div className="qoot-page-in space-y-8"><header className="flex items-end justify-between gap-4"><div><p className="mb-2 text-sm font-bold text-primary">مساحتك</p><h1 className="qoot-display text-4xl font-semibold">بياناتك، على مزاجك</h1><p className="mt-2 text-muted-foreground">كل ما نعرفك أكتر، خطتك تبقى أذكى.</p></div><button onClick={() => editing ? saveProfile() : beginEdit()} disabled={update.isPending} data-testid="button-edit-profile" className="qoot-button inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">{editing ? (update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />) : <Pencil className="h-4 w-4" />}{editing ? 'حفظ التغييرات' : 'تعديل البيانات'}</button></header><div className="grid gap-6 lg:grid-cols-[.9fr_1.1fr]"><section className="qoot-card rounded-3xl p-6 sm:p-7"><div className="mb-7 flex items-center gap-4"><span className="grid h-16 w-16 place-items-center rounded-3xl bg-accent/15 text-xl font-bold text-accent">{profile.avatarInitials}</span><div><h2 className="qoot-display text-2xl">{profile.name}</h2><p className="mt-1 text-sm text-muted-foreground">عضو من فترة وبيتحسن كل يوم</p></div></div><div className="grid gap-4 sm:grid-cols-2">{[['name', 'الاسم', profile.name], ['age', 'السن', profile.age], ['heightCm', 'الطول بالسنتي', profile.heightCm], ['weightKg', 'الوزن الحالي', profile.weightKg], ['targetWeightKg', 'الوزن المستهدف', profile.targetWeightKg], ['stepTarget', 'هدف الخطوات', profile.stepTarget]].map(([key, label, value]) => <label key={key as string} className="block"><span className="mb-1.5 block text-xs text-muted-foreground">{label as string}</span><input disabled={!editing} value={String(form[key as keyof Profile] ?? value)} onChange={(e) => field(key as keyof Profile, key === 'name' ? e.target.value : Number(e.target.value))} data-testid={`input-profile-${key}`} className={`qoot-input ${!editing ? 'cursor-default border-transparent bg-secondary/50' : ''}`} /></label>)}</div><div className="mt-5 grid gap-4 sm:grid-cols-2"><label><span className="mb-1.5 block text-xs text-muted-foreground">الهدف</span><select disabled={!editing} value={form.goal ?? profile.goal} onChange={(e) => field('goal', e.target.value)} data-testid="select-profile-goal" className="qoot-input"><option value="lose">أخسّس</option><option value="maintain">أحافظ</option><option value="build">أبني عضل</option></select></label><label><span className="mb-1.5 block text-xs text-muted-foreground">النشاط اليومي</span><select disabled={!editing} value={form.activityLevel ?? profile.activityLevel} onChange={(e) => field('activityLevel', e.target.value)} data-testid="select-profile-activity" className="qoot-input"><option value="sedentary">قليل الحركة</option><option value="light">خفيف</option><option value="moderate">متوسط</option><option value="high">عالي</option></select></label></div></section><section className="space-y-6"><div className="qoot-card rounded-3xl p-6"><div className="mb-5 flex items-start justify-between"><div><p className="text-xs font-bold text-primary">الخطة الحالية · {plan?.version ?? '—'}</p><h2 className="qoot-display mt-1 text-3xl">{number(plan?.calories ?? 0)} <span className="text-sm font-normal text-muted-foreground">سعرة يومياً</span></h2></div><Gauge className="h-7 w-7 text-accent" /></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><div className="rounded-2xl bg-secondary/60 p-3"><span className="text-xs text-muted-foreground">بروتين</span><b className="mt-1 block">{number(plan?.protein)} جم</b></div><div className="rounded-2xl bg-secondary/60 p-3"><span className="text-xs text-muted-foreground">كربوهيدرات</span><b className="mt-1 block">{number(plan?.carbs)} جم</b></div><div className="rounded-2xl bg-secondary/60 p-3"><span className="text-xs text-muted-foreground">دهون</span><b className="mt-1 block">{number(plan?.fat)} جم</b></div><div className="rounded-2xl bg-secondary/60 p-3"><span className="text-xs text-muted-foreground">ألياف</span><b className="mt-1 block">{number(plan?.fiber)} جم</b></div></div><div className="mt-6 border-t border-border/70 pt-5"><p className="mb-3 text-sm font-semibold">حاسس إن الخطة محتاجة تتظبط؟</p><div className="flex gap-2"><input value={planReason} onChange={(e) => setPlanReason(e.target.value)} data-testid="input-plan-reason" className="qoot-input" placeholder="قولنا إيه اللي اتغيّر..." /><button onClick={adjustPlan} disabled={!planReason || adjust.isPending} data-testid="button-adjust-plan" className="qoot-button shrink-0 rounded-xl bg-accent px-4 font-bold text-accent-foreground disabled:opacity-40">{adjust.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'عدّلها'}</button></div></div></div><div className="qoot-card rounded-3xl p-6"><div className="mb-4 flex items-center gap-2"><History className="h-5 w-5 text-primary" /><h2 className="qoot-display text-xl">تاريخ خططك</h2></div>{!plan?.history?.length ? <p className="py-4 text-sm text-muted-foreground">أول خطة ليك لسه — ونبدأ منها.</p> : <div className="space-y-2">{plan.history.map((item) => <div key={`${item.version}-${item.createdAt}`} className="flex items-center justify-between rounded-xl bg-secondary/50 px-3 py-2.5 text-sm"><span>{item.reason}</span><span className="font-bold text-primary">{number(item.calories)}</span></div>)}</div>}</div></section></div></div>;
}

function AppRouter() {
  const [location] = useLocation();
  const profileQ = useGetProfile();
  if (profileQ.isLoading) return <Shell><div className="space-y-5"><Skeleton className="h-28" /><Skeleton className="h-80" /></div></Shell>;
  if (profileQ.isError) return <Shell><PageState error retry={() => profileQ.refetch()} /></Shell>;
  if (!profileQ.data?.onboardingCompleted) return <Shell><OnboardingPage profile={profileQ.data} /></Shell>;
  return <ErrorBoundary resetKey={location}><Shell><Switch><Route path="/" component={DashboardPage} /><Route path="/coach" component={CoachPage} /><Route path="/scan" component={ScanPage} /><Route path="/progress" component={ProgressPage} /><Route path="/profile" component={ProfilePage} /><Route component={NotFound} /></Switch></Shell></ErrorBoundary>;
}

function App() {
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window === 'undefined') return 'en';
    return window.localStorage.getItem('qoot-language') === 'ar' ? 'ar' : 'en';
  });
  useEffect(() => {
    window.localStorage.setItem('qoot-language', language);
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);
  return <LanguageContext.Provider value={{ language, setLanguage }}><QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><AppRouter /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider></LanguageContext.Provider>;
}

export default App;
