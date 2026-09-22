import { Router, type IRouter } from "express";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  mealsTable,
  nutritionPlansTable,
  profilesTable,
  weightEntriesTable,
  workoutsTable,
} from "@workspace/db";
import {
  AdjustPlanBody,
  AdjustPlanResponse,
  AnalyzeMealPhotoBody,
  AnalyzeMealPhotoResponse,
  CreateMealBody,
  CreateMealResponse,
  CreateWeightEntryBody,
  CreateWeightEntryResponse,
  CreateWorkoutBody,
  CreateWorkoutResponse,
  DeleteMealParams,
  GetDashboardResponse,
  GetMealsQueryParams,
  GetMealsResponse,
  GetPlanResponse,
  GetProfileResponse,
  GetWeightEntriesQueryParams,
  GetWeightEntriesResponse,
  GetWorkoutsQueryParams,
  GetWorkoutsResponse,
  GetYesterdayMealsResponse,
  SearchFoodQueryParams,
  SearchFoodResponse,
  SendCoachMessageBody,
  SendCoachMessageResponse,
  UpdateProfileBody,
  UpdateProfileResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const today = () => new Date().toISOString().slice(0, 10);
const dateKey = (date: Date) => date.toISOString().slice(0, 10);
type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
};

async function askGemini(prompt: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;

  const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.6-flash";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 300 },
        }),
        signal: controller.signal,
      },
    );
    if (!response.ok) {
      console.warn(`Gemini request failed with status ${response.status}`);
      return null;
    }
    const data = (await response.json()) as GeminiResponse;
    return data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim() || null;
  } catch (error) {
    console.warn(
      "Gemini request failed; using local coach response",
      error instanceof Error ? error.message : error,
    );
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

const daysAgo = (days: number) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
};

const activityMultipliers: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  high: 1.725,
};

function calculatePlan(profile: Pick<typeof profilesTable.$inferSelect, "age" | "heightCm" | "weightKg" | "sex" | "activityLevel" | "goal">) {
  const base =
    profile.sex === "female"
      ? 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age - 161
      : 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age + 5;
  const bmr = Math.round(base);
  const tdee = Math.round(bmr * (activityMultipliers[profile.activityLevel] ?? 1.2));
  const calories = Math.max(
    1200,
    Math.round(tdee + (profile.goal === "lose" ? -400 : profile.goal === "build" ? 250 : 0)),
  );
  const protein = Math.round(profile.weightKg * (profile.goal === "build" ? 1.8 : 1.6));
  const fat = Math.round((calories * 0.28) / 9);
  const carbs = Math.max(80, Math.round((calories - protein * 4 - fat * 9) / 4));
  return { bmr, tdee, calories, protein, carbs, fat, fiber: 30 };
}

function profileResponse(profile: typeof profilesTable.$inferSelect) {
  return GetProfileResponse.parse(profile);
}

function mealResponse(meal: typeof mealsTable.$inferSelect) {
  return {
    ...meal,
    loggedAt: meal.loggedAt.toISOString(),
  };
}

function workoutResponse(workout: typeof workoutsTable.$inferSelect) {
  return workout;
}

async function currentProfile() {
  const [profile] = await db.select().from(profilesTable).orderBy(asc(profilesTable.id)).limit(1);
  if (!profile) throw new Error("Qoot profile has not been initialized");
  return profile;
}

async function currentPlan() {
  const [plan] = await db
    .select()
    .from(nutritionPlansTable)
    .orderBy(desc(nutritionPlansTable.id))
    .limit(1);
  if (!plan) throw new Error("Qoot plan has not been initialized");
  return plan;
}

async function ensureSeeded() {
  const [existing] = await db.select({ id: profilesTable.id }).from(profilesTable).limit(1);
  if (existing) return;

  const profileValues = {
    name: "أحمد",
    age: 29,
    heightCm: 178,
    weightKg: 81.5,
    targetWeightKg: 76,
    sex: "male",
    activityLevel: "moderate",
    goal: "lose",
    stepTarget: 8000,
    unitSystem: "metric",
    avatarInitials: "أح",
    onboardingCompleted: false,
  } as const;
  const [profile] = await db.insert(profilesTable).values(profileValues).returning();
  const targets = calculatePlan(profile);
  await db.insert(nutritionPlansTable).values({
    ...targets,
    version: "v1",
    reason: "الخطة الأولية",
  });

  const currentDay = today();
  await db.insert(mealsTable).values([
    {
      name: "بيض مسلوق وجبنة قريش",
      mealType: "breakfast",
      calories: 360,
      protein: 29,
      carbs: 18,
      fat: 20,
      fiber: 3,
      portion: "بيضتان + 100 جم جبنة",
      date: currentDay,
    },
    {
      name: "كشري مصري",
      mealType: "lunch",
      calories: 620,
      protein: 21,
      carbs: 99,
      fat: 15,
      fiber: 12,
      portion: "طبق وسط",
      date: currentDay,
    },
  ]);
  await db.insert(weightEntriesTable).values([
    { weightKg: 83.2, recordedAt: daysAgo(21), note: "بداية المتابعة" },
    { weightKg: 82.4, recordedAt: daysAgo(14), note: "" },
    { weightKg: 81.5, recordedAt: currentDay, note: "مستمر كويس" },
  ]);
  await db.insert(workoutsTable).values({
    name: "مشي سريع",
    workoutType: "cardio",
    durationMinutes: 32,
    caloriesBurned: 185,
    recordedAt: currentDay,
  });
}

const foods = [
  { id: 1, name: "كشري مصري", aliases: ["كشري", "طبق كشري"], portion: "طبق وسط", calories: 620, protein: 21, carbs: 99, fat: 15, fiber: 12, category: "وجبات مصرية" },
  { id: 2, name: "فول مدمس بالليمون", aliases: ["فول", "فول بالليمون"], portion: "طبق صغير", calories: 280, protein: 16, carbs: 37, fat: 8, fiber: 11, category: "فطار" },
  { id: 3, name: "طعمية سخنة", aliases: ["طعمية", "فلافل"], portion: "4 قطع", calories: 330, protein: 13, carbs: 34, fat: 17, fiber: 8, category: "فطار" },
  { id: 4, name: "حواوشي بلدي", aliases: ["حواوشي"], portion: "رغيف", calories: 580, protein: 28, carbs: 54, fat: 27, fiber: 4, category: "وجبات مصرية" },
  { id: 5, name: "ملوخية وفراخ مشوية", aliases: ["ملوخية", "فراخ مشوية"], portion: "طبق + ربع فرخة", calories: 470, protein: 41, carbs: 35, fat: 18, fiber: 7, category: "غداء" },
  { id: 6, name: "كباب وكفتة مشوية", aliases: ["كباب", "كفتة"], portion: "150 جم", calories: 390, protein: 35, carbs: 4, fat: 26, fiber: 1, category: "بروتين" },
  { id: 7, name: "جبنة قريش بالطماطم", aliases: ["جبنة قريش"], portion: "150 جم", calories: 210, protein: 27, carbs: 8, fat: 7, fiber: 2, category: "بروتين اقتصادي" },
  { id: 8, name: "عيش بلدي مدعم", aliases: ["عيش بلدي", "رغيف بلدي"], portion: "نصف رغيف", calories: 155, protein: 5, carbs: 31, fat: 1, fiber: 3, category: "نشويات" },
  { id: 9, name: "عدس أصفر", aliases: ["شوربة عدس", "عدس"], portion: "طبق شوربة", calories: 260, protein: 16, carbs: 39, fat: 5, fiber: 13, category: "بروتين اقتصادي" },
];

async function historyResponse() {
  const historyRows = await db.select().from(nutritionPlansTable).orderBy(desc(nutritionPlansTable.id));
  return historyRows.map((item) => ({
    version: item.version,
    reason: item.reason,
    calories: item.calories,
    createdAt: item.updatedAt,
  }));
}

router.get("/profile", async (_req, res): Promise<void> => {
  await ensureSeeded();
  res.json(profileResponse(await currentProfile()));
});

router.put("/profile", async (req, res): Promise<void> => {
  await ensureSeeded();
  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const profile = await currentProfile();
  const initials = parsed.data.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("");
  const [updated] = await db
    .update(profilesTable)
    .set({ ...parsed.data, avatarInitials: initials, onboardingCompleted: true })
    .where(eq(profilesTable.id, profile.id))
    .returning();
  const targets = calculatePlan(updated);
  const previous = await currentPlan();
  const versionNumber = Number(previous.version.replace("v", "")) + 1;
  await db.insert(nutritionPlansTable).values({
    ...targets,
    version: `v${versionNumber}`,
    reason: "تحديث البيانات وحساب الخطة تلقائياً",
  });
  res.json(UpdateProfileResponse.parse(updated));
});

router.get("/plan", async (_req, res): Promise<void> => {
  await ensureSeeded();
  const plan = await currentPlan();
  res.json(GetPlanResponse.parse({ ...plan, updatedAt: plan.updatedAt.toISOString(), history: await historyResponse() }));
});

router.post("/plan/adjust", async (req, res): Promise<void> => {
  await ensureSeeded();
  const parsed = AdjustPlanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const previous = await currentPlan();
  const calories = parsed.data.calories ?? previous.calories;
  const profile = await currentProfile();
  const targets = calculatePlan(profile);
  const adjusted = {
    ...targets,
    calories,
    carbs: Math.max(80, Math.round((calories - targets.protein * 4 - targets.fat * 9) / 4)),
  };
  const versionNumber = Number(previous.version.replace("v", "")) + 1;
  const [plan] = await db.insert(nutritionPlansTable).values({
    ...adjusted,
    version: `v${versionNumber}`,
    reason: parsed.data.reason,
  }).returning();
  res.status(201).json(AdjustPlanResponse.parse({ ...plan, updatedAt: plan.updatedAt.toISOString(), history: await historyResponse() }));
});

router.get("/dashboard", async (_req, res): Promise<void> => {
  await ensureSeeded();
  const date = today();
  const [plan, meals, workouts] = await Promise.all([
    currentPlan(),
    db.select().from(mealsTable).where(eq(mealsTable.date, date)).orderBy(asc(mealsTable.loggedAt)),
    db.select().from(workoutsTable).where(eq(workoutsTable.recordedAt, date)).orderBy(desc(workoutsTable.id)),
  ]);
  const consumed = meals.reduce((sum, meal) => sum + meal.calories, 0);
  const burned = workouts.reduce((sum, workout) => sum + workout.caloriesBurned, 0);
  const total = (key: "protein" | "carbs" | "fat" | "fiber") => meals.reduce((sum, meal) => sum + meal[key], 0);
  const dashboard = {
    date,
    calories: { target: plan.calories, consumed, burned, remaining: Math.max(0, plan.calories - consumed) },
    macros: {
      protein: { current: total("protein"), target: plan.protein },
      carbs: { current: total("carbs"), target: plan.carbs },
      fat: { current: total("fat"), target: plan.fat },
      fiber: { current: total("fiber"), target: plan.fiber },
    },
    waterMl: 1250,
    meals: meals.map(mealResponse),
    workouts: workouts.map(workoutResponse),
    streak: 6,
  };
  res.json(GetDashboardResponse.parse(dashboard));
});

router.get("/meals", async (req, res): Promise<void> => {
  await ensureSeeded();
  const query = typeof req.query.date === "string"
    ? { ...req.query, date: new Date(`${req.query.date}T00:00:00Z`) }
    : req.query;
  const parsed = GetMealsQueryParams.safeParse(query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const where = parsed.data.date ? eq(mealsTable.date, dateKey(parsed.data.date)) : undefined;
  const meals = await db.select().from(mealsTable).where(where).orderBy(asc(mealsTable.loggedAt));
  res.json(GetMealsResponse.parse(meals.map(mealResponse)));
});

router.post("/meals", async (req, res): Promise<void> => {
  await ensureSeeded();
  const parsed = CreateMealBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [meal] = await db.insert(mealsTable).values({
    ...parsed.data,
    date: parsed.data.date ? dateKey(parsed.data.date) : today(),
  }).returning();
  res.status(201).json(CreateMealResponse.parse(mealResponse(meal)));
});

router.delete("/meals/:id", async (req, res): Promise<void> => {
  await ensureSeeded();
  const parsed = DeleteMealParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [deleted] = await db.delete(mealsTable).where(eq(mealsTable.id, parsed.data.id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Meal not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/meals/yesterday", async (_req, res): Promise<void> => {
  await ensureSeeded();
  const meals = await db.select().from(mealsTable).where(eq(mealsTable.date, daysAgo(1))).orderBy(asc(mealsTable.loggedAt));
  res.json(GetYesterdayMealsResponse.parse(meals.map(mealResponse)));
});

router.post("/meals/repeat-yesterday", async (_req, res): Promise<void> => {
  await ensureSeeded();
  const meals = await db.select().from(mealsTable).where(eq(mealsTable.date, daysAgo(1))).orderBy(asc(mealsTable.loggedAt));
  if (meals.length === 0) {
    res.status(201).json([]);
    return;
  }
  const repeated = await db.insert(mealsTable).values(meals.map(({ id, loggedAt, date, ...meal }) => ({ ...meal, date: today() }))).returning();
  res.status(201).json(repeated.map(mealResponse));
});

router.get("/weight", async (req, res): Promise<void> => {
  await ensureSeeded();
  const parsed = GetWeightEntriesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const entries = await db.select().from(weightEntriesTable).orderBy(asc(weightEntriesTable.recordedAt));
  res.json(GetWeightEntriesResponse.parse(entries.slice(-parsed.data.range)));
});

router.post("/weight", async (req, res): Promise<void> => {
  await ensureSeeded();
  const parsed = CreateWeightEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [entry] = await db.insert(weightEntriesTable).values({
    ...parsed.data,
    recordedAt: dateKey(parsed.data.recordedAt),
  }).returning();
  res.status(201).json(CreateWeightEntryResponse.parse(entry));
});

router.get("/workouts", async (req, res): Promise<void> => {
  await ensureSeeded();
  const query = typeof req.query.date === "string"
    ? { ...req.query, date: new Date(`${req.query.date}T00:00:00Z`) }
    : req.query;
  const parsed = GetWorkoutsQueryParams.safeParse(query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const where = parsed.data.date ? eq(workoutsTable.recordedAt, dateKey(parsed.data.date)) : undefined;
  const workouts = await db.select().from(workoutsTable).where(where).orderBy(desc(workoutsTable.id));
  res.json(GetWorkoutsResponse.parse(workouts));
});

router.post("/workouts", async (req, res): Promise<void> => {
  await ensureSeeded();
  const parsed = CreateWorkoutBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [workout] = await db.insert(workoutsTable).values({
    ...parsed.data,
    recordedAt: dateKey(parsed.data.recordedAt),
  }).returning();
  res.status(201).json(CreateWorkoutResponse.parse(workout));
});

router.get("/food/search", async (req, res): Promise<void> => {
  const parsed = SearchFoodQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const query = parsed.data.q.toLocaleLowerCase("ar");
  const matches = foods
    .filter((food) => [food.name, ...food.aliases].some((value) => value.toLocaleLowerCase("ar").includes(query)))
    .slice(0, parsed.data.limit);
  res.json(SearchFoodResponse.parse(matches));
});

router.post("/coach/message", async (req, res): Promise<void> => {
  await ensureSeeded();
  const parsed = SendCoachMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [profile, plan] = await Promise.all([currentProfile(), currentPlan()]);
  const date = today();
  const meals = await db.select().from(mealsTable).where(eq(mealsTable.date, date)).orderBy(asc(mealsTable.loggedAt));
  const consumed = meals.reduce((sum, meal) => sum + meal.calories, 0);
  const remaining = Math.max(0, plan.calories - consumed);
  const protein = meals.reduce((sum, meal) => sum + meal.protein, 0);
  const carbs = meals.reduce((sum, meal) => sum + meal.carbs, 0);
  const fat = meals.reduce((sum, meal) => sum + meal.fat, 0);
  const mealNames = meals.map((meal) => meal.name).join("، ") || "لسه مفيش وجبات";
  const context = parsed.data.context;
  const contextProfile = context?.profile?.name ? context.profile : profile;
  const contextPlan = context?.plan?.calories ? context.plan : plan;
  const contextDashboard = context?.dashboard;
  const prompt = [
    "أنت كوتش قوت، مساعد تغذية مصري يتكلم بالمصرية وبأسلوب عملي مش حُكمي.",
    `اسم المستخدم: ${contextProfile.name}. الهدف: ${contextProfile.goal}. الوزن: ${contextProfile.weightKg} كجم إلى ${contextProfile.targetWeightKg} كجم.`,
    `الخطة: ${contextPlan.calories} سعرة، ${contextPlan.protein} جم بروتين، ${contextPlan.carbs} جم كربوهيدرات، ${contextPlan.fat} جم دهون.`,
    `اليوم: ${contextDashboard?.calories.consumed ?? consumed} سعرة مستهلكة، ${contextDashboard?.calories.remaining ?? remaining} سعرة متبقية، والوجبات: ${mealNames}.`,
    `رسالة المستخدم: ${parsed.data.message}`,
  ].join("\n");
  const message = parsed.data.message.toLocaleLowerCase("ar");
  let response = `عاش يا ${profile.name.split(" ")[0]}. أنا شايف يومك: اتاخد ${consumed} من ${plan.calories} سعرة، فاضلك ${remaining} سعرة. خلّي الوجبة الجاية فيها بروتين وخضار عشان تكمّل براحة.`;
  let suggestions = ["أعمل إيه في العشا؟", "فاضلي كام؟", "إزاي أزوّد البروتين؟"];
  if (message.includes("فاضل") || message.includes("باقي") || message.includes("سعر") || message.includes("ميزاني")) {
    response = `فاضلك النهارده حوالي ${remaining} سعرة من هدف ${plan.calories}. أكلت ${consumed} سعرة، و${protein} جم بروتين من هدف ${plan.protein} جم.`;
    suggestions = ["أعمل إيه في العشا؟", "وجبة بروتين اقتصادية", "أحتاج كام بروتين؟"];
  } else if (message.includes("عشا") || message.includes("عشاء") || message.includes("وجبة")) {
    const dinnerCalories = Math.min(remaining, Math.max(350, Math.round(remaining * 0.45)));
    response = remaining > 0
      ? `للعشا عندك مساحة حوالي ${dinnerCalories} سعرة. اختار 150 جم فراخ أو علبة تونة، طبق سلطة كبير، ونصف رغيف عيش بلدي. كده تزود البروتين من غير ما تتخطى ميزانيتك.`
      : "أنت قفلت سعراتك تقريباً النهارده، فلو جعان اختار حاجة خفيفة زي زبادي لايت أو خضار، ومش محتاج تعاقب نفسك.";
    suggestions = ["بديل نباتي للعشا", "قدّر لي عشا مصري", "أعمل إيه لو جعت بالليل؟"];
  } else if (message.includes("بروتين") || message.includes("protein")) {
    response = `هدفك ${plan.protein} جم بروتين، وأنت وصلت ${protein} جم لحد دلوقتي. جبنة قريش، بيض، فول، وعدس اختيارات مصرية اقتصادية؛ جبنة قريش بالطماطم تعطي حوالي 27 جم في 150 جم.`;
    suggestions = ["سجّل جبنة قريش", "اعمل لي وجبة بفول", "أعمل إيه في العشا؟"];
  } else if (message.includes("عزوم") || message.includes("عزومة") || message.includes("cheat")) {
    response = `في العزومة خليك ذكي مش مثالي. عندك ${remaining} سعرة متبقية، فابدأ بالسلطة والبروتين، خُد حصة واحدة نشويات، وسيب مساحة للحلو. وجبة واحدة مش هتحدد نتيجتك.`;
    suggestions = ["اختيارات ذكية في العزومة", "قدّر لي طبق كشري", "فاضلي كام؟"];
  } else if (message.includes("مياه") || message.includes("مية") || message.includes("water")) {
    response = "خلّي هدفك كباية 250 مل كل ساعتين تقريباً، وخصوصاً قبل الوجبة أو بعد التمرين. سجّلها أول بأول عشان نعرف يومك فعلاً.";
    suggestions = ["أضف كباية مية", "سجّل تمرين", "ماكروز اليوم"];
  }
  const geminiResponse = await askGemini(prompt);
  if (geminiResponse) response = geminiResponse;
  res.json(SendCoachMessageResponse.parse({
    id: Date.now(),
    role: "assistant",
    message: response,
    suggestions,
    createdAt: new Date().toISOString(),
  }));
});

router.post("/scanner/analyze", async (req, res): Promise<void> => {
  const parsed = AnalyzeMealPhotoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const name = parsed.data.imageName.toLocaleLowerCase("ar");
  const analysis = name.includes("kosh") || name.includes("كشر")
    ? { mealName: "كشري مصري", portion: "طبق وسط · حوالي 320 جم", calories: 620, protein: 21, carbs: 99, fat: 15, fiber: 12, confidence: 91 }
    : name.includes("molok") || name.includes("ملوخ")
      ? { mealName: "ملوخية وفراخ", portion: "طبق متوسط · حوالي 280 جم", calories: 470, protein: 41, carbs: 35, fat: 18, fiber: 7, confidence: 86 }
      : { mealName: "وجبة مصرية متنوعة", portion: "حصة متوسطة · حوالي 300 جم", calories: 510, protein: 26, carbs: 58, fat: 20, fiber: 6, confidence: 72 };
  res.json(AnalyzeMealPhotoResponse.parse(analysis));
});

export default router;
