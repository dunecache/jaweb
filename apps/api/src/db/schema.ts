import type { Answer, GradedBy, SubmissionStatus, Verdict } from "@jaweb/shared";
import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

// Classes scope liveness, rosters, monitors, and leaderboards (AGENTS §6).
export const classes = sqliteTable(
  "classes",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    position: integer("position").notNull().default(0),
    createdAt: text("created_at").notNull(),
    archivedAt: text("archived_at"),
  },
  (table) => [index("classes_position_idx").on(table.position)],
);

// Usernames are stored lowercase; the unique index makes case-insensitive
// uniqueness a database invariant, not only an application convention.
export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    username: text("username").notNull(),
    displayName: text("display_name").notNull(),
    role: text("role", { enum: ["teacher", "student"] }).notNull(),
    passwordHash: text("password_hash").notNull(),
    classId: text("class_id").references(() => classes.id),
    createdAt: text("created_at").notNull(),
    archivedAt: text("archived_at"),
  },
  (table) => [uniqueIndex("users_username_idx").on(table.username)],
);

// Session tokens are 32 random bytes; only their SHA-256 hex hash is stored.
export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    tokenHash: text("token_hash").notNull(),
    expiresAt: text("expires_at").notNull(),
    createdAt: text("created_at").notNull(),
    lastUsedAt: text("last_used_at").notNull(),
  },
  (table) => [
    uniqueIndex("sessions_token_hash_idx").on(table.tokenHash),
    index("sessions_user_id_idx").on(table.userId),
  ],
);

export const modules = sqliteTable(
  "modules",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    position: integer("position").notNull().default(0),
    createdAt: text("created_at").notNull(),
    archivedAt: text("archived_at"),
  },
  (table) => [index("modules_position_idx").on(table.position)],
);

// Live exercises are immutable except close; status flips are lazy (AGENTS §6).
export const exercises = sqliteTable(
  "exercises",
  {
    id: text("id").primaryKey(),
    moduleId: text("module_id")
      .notNull()
      .references(() => modules.id),
    classId: text("class_id")
      .notNull()
      .references(() => classes.id),
    title: text("title").notNull(),
    description: text("description"),
    type: text("type", { enum: ["exercise", "exam"] }).notNull(),
    status: text("status", { enum: ["draft", "scheduled", "live", "closed"] })
      .notNull()
      .default("draft"),
    verdictVisibility: text("verdict_visibility", { enum: ["immediate", "at_close"] }).notNull(),
    opensAt: text("opens_at"),
    closesAt: text("closes_at"),
    speedWindowSeconds: integer("speed_window_seconds").notNull().default(120),
    weightCorrect: real("weight_correct").notNull().default(0.75),
    weightSpeed: real("weight_speed").notNull().default(0.25),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("exercises_module_idx").on(table.moduleId),
    index("exercises_class_status_idx").on(table.classId, table.status),
  ],
);

export const providerSettings = sqliteTable("provider_settings", {
  id: text("id").primaryKey(),
  provider: text("provider", {
    enum: ["google", "opencode", "openai", "anthropic", "openrouter", "ollama", "fake"],
  }).notNull(),
  model: text("model").notNull(),
  apiKeyCiphertext: text("api_key_ciphertext"),
  apiKeyLast4: text("api_key_last4"),
  baseUrl: text("base_url"),
  testedAt: text("tested_at"),
  testOk: integer("test_ok", { mode: "boolean" }),
  leaderboardVisibility: text("leaderboard_visibility", {
    enum: ["full", "top10_self", "hidden"],
  })
    .notNull()
    .default("top10_self"),
  updatedAt: text("updated_at").notNull(),
});

export const participations = sqliteTable(
  "participations",
  {
    id: text("id").primaryKey(),
    exerciseId: text("exercise_id")
      .notNull()
      .references(() => exercises.id),
    studentId: text("student_id")
      .notNull()
      .references(() => users.id),
    startedAt: text("started_at").notNull(),
    lastSeenAt: text("last_seen_at").notNull(),
  },
  (table) => [
    uniqueIndex("participations_exercise_student_idx").on(table.exerciseId, table.studentId),
  ],
);

export const submissions = sqliteTable(
  "submissions",
  {
    id: text("id").primaryKey(),
    exerciseId: text("exercise_id")
      .notNull()
      .references(() => exercises.id),
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id),
    studentId: text("student_id")
      .notNull()
      .references(() => users.id),
    answer: text("answer", { mode: "json" }).$type<Answer>(),
    submittedAt: text("submitted_at").notNull(),
    status: text("status", { enum: ["grading", "graded", "needs_review"] })
      .notNull()
      .default("grading"),
    score: real("score"),
    verdict: text("verdict", { enum: ["correct", "partial", "wrong"] }).$type<Verdict>(),
    feedback: text("feedback"),
    gradedBy: text("graded_by", { enum: ["auto", "llm", "teacher"] }).$type<GradedBy>(),
    gradedAt: text("graded_at"),
    points: integer("points"),
    flagged: integer("flagged", { mode: "boolean" }).notNull().default(false),
    archivedAt: text("archived_at"),
  },
  (table) => [
    uniqueIndex("submissions_question_student_idx")
      .on(table.questionId, table.studentId)
      .where(sql`archived_at IS NULL`),
    index("submissions_exercise_idx").on(table.exerciseId),
  ],
);

export const questions = sqliteTable(
  "questions",
  {
    id: text("id").primaryKey(),
    exerciseId: text("exercise_id")
      .notNull()
      .references(() => exercises.id),
    position: integer("position").notNull(),
    prompt: text("prompt").notNull(),
    kind: text("kind", { enum: ["single_choice", "multi_select", "free_text"] }).notNull(),
    options: text("options", { mode: "json" }).$type<Array<{ id: string; text: string }>>(),
    correctOptionIds: text("correct_option_ids", { mode: "json" }).$type<string[]>(),
    modelAnswer: text("model_answer"),
    keyPoints: text("key_points", { mode: "json" }).$type<string[]>(),
    aliases: text("aliases", { mode: "json" }).$type<string[]>(),
    points: integer("points").notNull().default(10),
    partialCredit: integer("partial_credit", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("questions_exercise_idx").on(table.exerciseId, table.position)],
);
