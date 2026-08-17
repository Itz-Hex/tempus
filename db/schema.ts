import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  boolean,
  time,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export const categories = pgTable("category", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  description: text("description").notNull(),
  color: text("color").notNull(),
  type: text("type").notNull(),
});

export const tasks = pgTable("task", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  description: text("description").notNull(),
  categoryId: uuid("categoryId")
    .notNull()
    .references(() => categories.id),
  duration: integer("duration").notNull(), // minutes
  dueDate: timestamp("dueDate", { withTimezone: true }),
  userPriority: integer("user_priority").notNull(), // should restrict 1-5 in db or nah?
  computedPriority: integer("computed_priority").notNull(),
  pushCount: integer("push_count").notNull().default(0),
  splittable: boolean("splittable").notNull().default(false),
  status: text("status").notNull().default("pending"), // should restrict to pending/scheduled/completed/overran/skipped/conflict or nah?
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const fixedEvents = pgTable("fixed_event", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  description: text("description").notNull(),
  category: uuid("category")
    .notNull()
    .references(() => categories.id),
  start: timestamp("start", { withTimezone: true }).notNull(),
  end: timestamp("end", { withTimezone: true }).notNull(),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }),
});

// export const completionLogs = pgTable("completion_log", {});

export const scheduleAssignments = pgTable("schedule_assignment", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id")
    .notNull()
    .references(() => tasks.id),
  start: timestamp("start", { withTimezone: true }).notNull(),
  end: timestamp("end", { withTimezone: true }).notNull(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const userSettings = pgTable("user_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  weekDayStartTime: time("week_day_start_time").notNull(),
  weekDayEndTime: time("week_day_end_time").notNull(),
  weekendDayStartTime: time("weekend_day_start_time").notNull(),
  weekendDayEndTime: time("weekend_day_end_time").notNull(),
  weekStart: text("week_start").notNull().default("Monday"),
  timezone: text("timezone").notNull(),
});
