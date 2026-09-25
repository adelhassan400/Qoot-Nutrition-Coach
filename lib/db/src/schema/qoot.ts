import { createInsertSchema } from "drizzle-zod";
import {
  boolean,
  date,
  integer,
  jsonb,
  pgTable,
  real,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const profilesTable = pgTable("qoot_profiles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  age: integer("age").notNull(),
  heightCm: real("height_cm").notNull(),
  weightKg: real("weight_kg").notNull(),
  targetWeightKg: real("target_weight_kg").notNull(),
  sex: text("sex").notNull(),
  activityLevel: text("activity_level").notNull(),
  goal: text("goal").notNull(),
  stepTarget: integer("step_target").notNull(),
  unitSystem: text("unit_system").notNull(),
  avatarInitials: text("avatar_initials").notNull(),
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  trialStartedAt: timestamp("trial_started_at", { withTimezone: true }),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
});

export const nutritionPlansTable = pgTable("qoot_nutrition_plans", {
  id: serial("id").primaryKey(),
  version: text("version").notNull(),
  calories: integer("calories").notNull(),
  protein: integer("protein").notNull(),
  carbs: integer("carbs").notNull(),
  fat: integer("fat").notNull(),
  fiber: integer("fiber").notNull(),
  bmr: integer("bmr").notNull(),
  tdee: integer("tdee").notNull(),
  reason: text("reason").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const mealsTable = pgTable("qoot_meals", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  mealType: text("meal_type").notNull(),
  calories: integer("calories").notNull(),
  protein: integer("protein").notNull(),
  carbs: integer("carbs").notNull(),
  fat: integer("fat").notNull(),
  fiber: integer("fiber").notNull(),
  portion: text("portion").notNull(),
  loggedAt: timestamp("logged_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  date: date("date", { mode: "string" }).notNull(),
});

export const weightEntriesTable = pgTable("qoot_weight_entries", {
  id: serial("id").primaryKey(),
  weightKg: real("weight_kg").notNull(),
  recordedAt: date("recorded_at", { mode: "string" }).notNull(),
  note: text("note").notNull().default(""),
});

export const workoutsTable = pgTable("qoot_workouts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  workoutType: text("workout_type").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  caloriesBurned: integer("calories_burned").notNull(),
  recordedAt: date("recorded_at", { mode: "string" }).notNull(),
});

export const insertProfileSchema = createInsertSchema(profilesTable).omit({
  id: true,
});
export const insertNutritionPlanSchema = createInsertSchema(
  nutritionPlansTable,
).omit({ id: true, updatedAt: true });
export const insertMealSchema = createInsertSchema(mealsTable).omit({
  id: true,
  loggedAt: true,
});
export const insertWeightEntrySchema = createInsertSchema(
  weightEntriesTable,
).omit({ id: true });
export const insertWorkoutSchema = createInsertSchema(workoutsTable).omit({
  id: true,
});

export type Profile = typeof profilesTable.$inferSelect;
export type NutritionPlan = typeof nutritionPlansTable.$inferSelect;
export type Meal = typeof mealsTable.$inferSelect;
export type WeightEntry = typeof weightEntriesTable.$inferSelect;
export type Workout = typeof workoutsTable.$inferSelect;
export type PlanHistory = {
  version: string;
  reason: string;
  calories: number;
  createdAt: string;
};

export const planHistorySchema = z.object({
  version: z.string(),
  reason: z.string(),
  calories: z.number(),
  createdAt: z.string(),
});

export type ProfileInput = z.infer<typeof insertProfileSchema>;
