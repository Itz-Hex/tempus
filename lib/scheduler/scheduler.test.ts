import { describe, it, expect } from "vitest";
import { Task, FixedEvent } from "./types";
import { scheduleTasks } from ".";

// NOTE: result.assignments is in the order tasks were PROCESSED (i.e. sorted by
// urgency), not chronological order. Any test asserting which task landed in
// which slot must either (a) sort assignments by `start` first, or (b) set up
// the scenario so only one task could possibly land in the slot being checked.

const baseOpts = {
    today: new Date("2026-08-18T00:00:00"), // a Tuesday
    horizonDays: 28,
    workingHours: { weekDayStart: "16:00", weekDayEnd: "22:00", weekendStart: "10:00", weekendEnd: "18:00" },
};

function byStart(assignments: { start: Date }[]) {
    return [...assignments].sort((a, b) => a.start.getTime() - b.start.getTime());
}

describe("scheduleTasks — basic placement", () => {
    it("returns empty assignments and conflicts for an empty task list", () => {
        const result = scheduleTasks([], [], baseOpts);
        expect(result.assignments).toEqual([]);
        expect(result.conflicts).toEqual([]);
    });

    it("places a single task with no conflicts", () => {
        const tasks: Task[] = [
            { id: "t1", description: "Write report", duration: 60, dueDate: new Date("2026-08-25T23:59:00"), computedPriority: 3, pushCount: 0, splittable: false },
        ];
        const result = scheduleTasks(tasks, [], baseOpts);

        expect(result.conflicts).toEqual([]);
        expect(result.assignments).toHaveLength(1);
        expect(result.assignments[0].taskId).toBe("t1");
    });

    it("places multiple non-competing tasks without conflict", () => {
        const tasks: Task[] = [
            { id: "t1", description: "A", duration: 60, dueDate: new Date("2026-08-25T23:59:00"), computedPriority: 3, pushCount: 0, splittable: false },
            { id: "t2", description: "B", duration: 90, dueDate: new Date("2026-08-26T23:59:00"), computedPriority: 2, pushCount: 0, splittable: false },
            { id: "t3", description: "C", duration: 45, dueDate: new Date("2026-08-21T23:59:00"), computedPriority: 5, pushCount: 0, splittable: false },
        ];
        const result = scheduleTasks(tasks, [], baseOpts);

        expect(result.conflicts).toEqual([]);
        expect(result.assignments).toHaveLength(3);
        const ids = result.assignments.map(a => a.taskId).sort();
        expect(ids).toEqual(["t1", "t2", "t3"]);
    });

    it("assigns an end time exactly start + duration", () => {
        const tasks: Task[] = [
            { id: "t1", description: "A", duration: 45, dueDate: new Date("2026-08-25T23:59:00"), computedPriority: 3, pushCount: 0, splittable: false },
        ];
        const result = scheduleTasks(tasks, [], baseOpts);

        const a = result.assignments[0];
        expect(a.end.getTime() - a.start.getTime()).toBe(45 * 60 * 1000);
    });

    it("places a task in a slot exactly equal to its duration (boundary)", () => {
        const fixedEvents: FixedEvent[] = [
            { id: "f1", start: new Date("2026-08-18T17:00:00"), end: new Date("2026-08-18T22:00:00") },
        ];
        const tasks: Task[] = [
            { id: "t1", description: "Exactly fits", duration: 60, dueDate: new Date("2026-08-25T23:59:00"), computedPriority: 3, pushCount: 0, splittable: false },
        ];
        const result = scheduleTasks(tasks, fixedEvents, baseOpts);

        expect(result.conflicts).toEqual([]);
        expect(result.assignments[0].start.getHours()).toBe(16);
    });
});

describe("scheduleTasks — urgency ordering", () => {
    it("prioritizes higher computedPriority when tasks compete for the same day's capacity", () => {
        // 360-min window; two 200-min tasks can't both fit in one day
        const tasks: Task[] = [
            { id: "low", description: "Low priority", duration: 200, dueDate: new Date("2026-08-19T23:59:00"), computedPriority: 1, pushCount: 0, splittable: false },
            { id: "high", description: "High priority", duration: 200, dueDate: new Date("2026-08-19T23:59:00"), computedPriority: 5, pushCount: 0, splittable: false },
        ];
        const result = scheduleTasks(tasks, [], baseOpts);

        // only "today" is available (due tomorrow), so exactly one fits
        expect(result.assignments).toHaveLength(1);
        expect(result.assignments[0].taskId).toBe("high");
        expect(result.conflicts).toEqual(["low"]);
    });

    it("prioritizes the sooner deadline when priorities are equal and only one can fit", () => {
        const tasks: Task[] = [
            { id: "later", description: "Due later", duration: 200, dueDate: new Date("2026-09-15T23:59:00"), computedPriority: 3, pushCount: 0, splittable: false },
            { id: "sooner", description: "Due sooner", duration: 200, dueDate: new Date("2026-08-19T23:59:00"), computedPriority: 3, pushCount: 0, splittable: false },
        ];
        const result = scheduleTasks(tasks, [], baseOpts);

        const sorted = byStart(result.assignments);

        expect(sorted).toHaveLength(2);
        expect(sorted[0].taskId).toBe("sooner");
    });

    it("treats an overdue task as maximum urgency, beating a higher-priority non-overdue task", () => {
        const tasks: Task[] = [
            { id: "overdue", description: "Overdue", duration: 200, dueDate: new Date("2026-08-10T23:59:00"), computedPriority: 1, pushCount: 0, splittable: false },
            { id: "future", description: "Not urgent", duration: 200, dueDate: new Date("2026-09-20T23:59:00"), computedPriority: 5, pushCount: 0, splittable: false },
        ];
        const result = scheduleTasks(tasks, [], baseOpts);

        // both compete for today's capacity since "overdue" has no other valid days
        // and only one 200-min task fits in the 360-min window
        const todaysAssignment = result.assignments.find(a => a.start.getDate() === 18);
        expect(todaysAssignment?.taskId).toBe("overdue");
    });

    it("still schedules a task with no due date", () => {
        const tasks: Task[] = [
            { id: "t1", description: "Someday", duration: 30, dueDate: null, computedPriority: 3, pushCount: 0, splittable: false },
        ];
        const result = scheduleTasks(tasks, [], baseOpts);

        expect(result.conflicts).toEqual([]);
        expect(result.assignments).toHaveLength(1);
    });

    it("deprioritizes a no-due-date task behind a task with a real deadline", () => {
        const tasks: Task[] = [
            { id: "noDeadline", description: "Whenever", duration: 200, dueDate: null, computedPriority: 3, pushCount: 0, splittable: false },
            { id: "hasDeadline", description: "Due soon", duration: 200, dueDate: new Date("2026-08-19T23:59:00"), computedPriority: 3, pushCount: 0, splittable: false },
        ];
        const result = scheduleTasks(tasks, [], baseOpts);

        const todaysAssignment = result.assignments.find(a => a.start.getDate() === 18);
        expect(todaysAssignment?.taskId).toBe("hasDeadline");
    });
});

describe("scheduleTasks — push count", () => {
    it("prioritizes a higher pushCount when priority and deadline are otherwise equal", () => {
        const tasks: Task[] = [
            { id: "neverPushed", description: "Fresh", duration: 200, dueDate: new Date("2026-08-19T23:59:00"), computedPriority: 3, pushCount: 0, splittable: false },
            { id: "pushedThrice", description: "Delayed before", duration: 200, dueDate: new Date("2026-08-19T23:59:00"), computedPriority: 3, pushCount: 3, splittable: false },
        ];
        const result = scheduleTasks(tasks, [], baseOpts);

        const todaysAssignment = result.assignments.find(a => a.start.getDate() === 18);
        expect(todaysAssignment?.taskId).toBe("pushedThrice");
    });

    it("does not affect placement when pushCount is 0 for all competing tasks", () => {
        const tasks: Task[] = [
            { id: "a", description: "A", duration: 200, dueDate: new Date("2026-08-19T23:59:00"), computedPriority: 3, pushCount: 0, splittable: false },
            { id: "b", description: "B", duration: 200, dueDate: new Date("2026-08-19T23:59:00"), computedPriority: 3, pushCount: 0, splittable: false },
        ];
        const result = scheduleTasks(tasks, [], baseOpts);

        // one gets in, one conflicts — just confirm nothing crashes/duplicates on a genuine tie
        expect(result.assignments.length + result.conflicts.length).toBe(2);
    });
});

describe("scheduleTasks — conflicts", () => {
    it("flags a task that cannot fit in any working window before its deadline", () => {
        const tasks: Task[] = [
            { id: "t1", description: "Too long", duration: 500, dueDate: new Date("2026-08-19T23:59:00"), computedPriority: 3, pushCount: 0, splittable: false },
        ];
        const result = scheduleTasks(tasks, [], baseOpts);

        expect(result.assignments).toEqual([]);
        expect(result.conflicts).toEqual(["t1"]);
    });

    it("conflicts the losing task, not the winning one, when only one of two fits", () => {
        const tasks: Task[] = [
            { id: "winner", description: "Fits", duration: 200, dueDate: new Date("2026-08-19T23:59:00"), computedPriority: 5, pushCount: 0, splittable: false },
            { id: "loser", description: "Doesn't fit", duration: 200, dueDate: new Date("2026-08-19T23:59:00"), computedPriority: 1, pushCount: 0, splittable: false },
        ];
        const result = scheduleTasks(tasks, [], baseOpts);

        expect(result.assignments.map(a => a.taskId)).toEqual(["winner"]);
        expect(result.conflicts).toEqual(["loser"]);
    });

    it("does not let a conflicted task block others from being scheduled", () => {
        const tasks: Task[] = [
            { id: "impossible", description: "Way too long", duration: 10000, dueDate: new Date("2026-08-19T23:59:00"), computedPriority: 5, pushCount: 0, splittable: false },
            { id: "fine", description: "Normal task", duration: 30, dueDate: new Date("2026-08-25T23:59:00"), computedPriority: 3, pushCount: 0, splittable: false },
        ];
        const result = scheduleTasks(tasks, [], baseOpts);

        expect(result.conflicts).toEqual(["impossible"]);
        expect(result.assignments.map(a => a.taskId)).toEqual(["fine"]);
    });
});

describe("scheduleTasks — fixed events / busy time", () => {
    it("skips a day whose entire working window is blocked", () => {
        const fixedEvents: FixedEvent[] = [
            { id: "f1", start: new Date("2026-08-18T16:00:00"), end: new Date("2026-08-18T22:00:00") },
        ];
        const tasks: Task[] = [
            { id: "t1", description: "Bumped", duration: 30, dueDate: new Date("2026-08-25T23:59:00"), computedPriority: 3, pushCount: 0, splittable: false },
        ];
        const result = scheduleTasks(tasks, fixedEvents, baseOpts);

        expect(result.conflicts).toEqual([]);
        expect(result.assignments[0].start.getDate()).toBe(19);
    });

    it("finds the second gap when two fixed events split the working day", () => {
        const fixedEvents: FixedEvent[] = [
            { id: "f1", start: new Date("2026-08-18T16:00:00"), end: new Date("2026-08-18T17:00:00") },
            { id: "f2", start: new Date("2026-08-18T18:00:00"), end: new Date("2026-08-18T19:00:00") },
        ];
        const tasks: Task[] = [
            { id: "t1", description: "Needs the bigger gap", duration: 90, dueDate: new Date("2026-08-25T23:59:00"), computedPriority: 3, pushCount: 0, splittable: false },
        ];
        const result = scheduleTasks(tasks, fixedEvents, baseOpts);

        expect(result.conflicts).toEqual([]);
        expect(result.assignments[0].start.getHours()).toBe(19);
    });

    it("merges overlapping fixed events correctly rather than double-counting free time", () => {
        const fixedEvents: FixedEvent[] = [
            { id: "f1", start: new Date("2026-08-18T16:00:00"), end: new Date("2026-08-18T19:00:00") },
            { id: "f2", start: new Date("2026-08-18T18:00:00"), end: new Date("2026-08-18T20:00:00") }, // overlaps f1
        ];
        const tasks: Task[] = [
            // only gap is 20:00-22:00 (120 min) — a task needing more than that must roll to next day
            { id: "t1", description: "Needs more than the real gap", duration: 150, dueDate: new Date("2026-08-25T23:59:00"), computedPriority: 3, pushCount: 0, splittable: false },
        ];
        const result = scheduleTasks(tasks, fixedEvents, baseOpts);

        expect(result.conflicts).toEqual([]);
        expect(result.assignments[0].start.getDate()).toBe(19);
    });

    it("treats a previously-placed assignment in this run as busy time for later tasks", () => {
        const tasks: Task[] = [
            { id: "first", description: "Takes most of the day", duration: 300, dueDate: new Date("2026-08-19T23:59:00"), computedPriority: 5, pushCount: 0, splittable: false },
            { id: "second", description: "Needs remaining capacity", duration: 100, dueDate: new Date("2026-08-19T23:59:00"), computedPriority: 3, pushCount: 0, splittable: false },
        ];
        const result = scheduleTasks(tasks, [], baseOpts);

        // 360 - 300 = 60min remaining today; "second" needs 100min so must conflict, not overlap "first"
        expect(result.conflicts).toEqual(["second"]);
        const sorted = byStart(result.assignments);
        expect(sorted).toHaveLength(1);
        expect(sorted[0].taskId).toBe("first");
    });
});

describe("scheduleTasks — weekday vs weekend hours", () => {
    it("uses weekend working hours on a weekend day", () => {
        const weekendOpts = { ...baseOpts, today: new Date("2026-08-22T00:00:00") }; // Saturday
        const tasks: Task[] = [
            { id: "t1", description: "Weekend task", duration: 30, dueDate: new Date("2026-08-29T23:59:00"), computedPriority: 3, pushCount: 0, splittable: false },
        ];
        const result = scheduleTasks(tasks, [], weekendOpts);

        expect(result.conflicts).toEqual([]);
        expect(result.assignments[0].start.getHours()).toBe(10); // weekendStart
    });

    it("respects today's working-hours start rather than midnight", () => {
        const tasks: Task[] = [
            { id: "t1", description: "Should not start at midnight", duration: 30, dueDate: new Date("2026-08-25T23:59:00"), computedPriority: 3, pushCount: 0, splittable: false },
        ];
        const result = scheduleTasks(tasks, [], baseOpts);

        expect(result.assignments[0].start.getHours()).toBe(16); // weekDayStart, not 0
    });
});

describe("scheduleTasks — purity (no mutation of inputs)", () => {
    it("does not mutate the caller's fixedEvents", () => {
        const originalStart = new Date("2026-08-18T17:00:00");
        const originalEnd = new Date("2026-08-18T18:00:00");
        const fixedEvents: FixedEvent[] = [{ id: "f1", start: originalStart, end: originalEnd }];
        const tasks: Task[] = [
            { id: "t1", description: "Task", duration: 30, dueDate: new Date("2026-08-25T23:59:00"), computedPriority: 3, pushCount: 0, splittable: false },
        ];

        scheduleTasks(tasks, fixedEvents, baseOpts);

        expect(fixedEvents[0].start.getTime()).toBe(originalStart.getTime());
        expect(fixedEvents[0].end.getTime()).toBe(originalEnd.getTime());
    });

    it("does not mutate opts.today", () => {
        const today = new Date("2026-08-18T00:00:00");
        const originalTime = today.getTime();
        const tasks: Task[] = [
            { id: "t1", description: "Task", duration: 30, dueDate: new Date("2026-08-25T23:59:00"), computedPriority: 3, pushCount: 0, splittable: false },
        ];

        scheduleTasks(tasks, [], { ...baseOpts, today });

        expect(today.getTime()).toBe(originalTime);
    });

    it("produces no cross-contamination between two separate calls", () => {
        const tasks: Task[] = [
            { id: "t1", description: "Task", duration: 30, dueDate: new Date("2026-08-25T23:59:00"), computedPriority: 3, pushCount: 0, splittable: false },
        ];

        const result1 = scheduleTasks(tasks, [], baseOpts);
        const result2 = scheduleTasks(tasks, [], baseOpts);

        // same input, same output — a second call shouldn't be affected by state left over from the first
        expect(result1.assignments[0].start.getTime()).toBe(result2.assignments[0].start.getTime());
    });
});

describe("scheduleTasks — splittable tasks", () => {
    it("places a splittable task in a single slot when one big enough exists (equivalent to non-splittable)", () => {
        const tasks: Task[] = [
            { id: "t1", description: "Fits in one go", duration: 60, dueDate: new Date("2026-08-25T23:59:00"), computedPriority: 3, pushCount: 0, splittable: true },
        ];
        const result = scheduleTasks(tasks, [], baseOpts);

        expect(result.conflicts).toEqual([]);
        expect(result.assignments).toHaveLength(1);
        expect(result.assignments[0].end.getTime() - result.assignments[0].start.getTime()).toBe(60 * 60 * 1000);
    });

    it("splits a task across two non-contiguous gaps on the same day", () => {
        // window 16:00-22:00 (360 min); block 17:00-19:00 leaves gaps: 60min (16-17) + 180min (19-22)
        const fixedEvents: FixedEvent[] = [
            { id: "f1", start: new Date("2026-08-18T17:00:00"), end: new Date("2026-08-18T19:00:00") },
        ];
        const tasks: Task[] = [
            { id: "t1", description: "Split across gaps", duration: 150, dueDate: new Date("2026-08-25T23:59:00"), computedPriority: 3, pushCount: 0, splittable: true },
        ];
        const result = scheduleTasks(tasks, fixedEvents, baseOpts);

        expect(result.conflicts).toEqual([]);
        expect(result.assignments).toHaveLength(2);
        expect(result.assignments.every(a => a.taskId === "t1")).toBe(true);

        const totalMinutes = result.assignments.reduce(
            (sum, a) => sum + (a.end.getTime() - a.start.getTime()) / 60000, 0
        );
        expect(totalMinutes).toBe(150);
    });

    it("splits a task across multiple days when a single day's capacity isn't enough", () => {
        const tasks: Task[] = [
            { id: "t1", description: "Needs two days", duration: 500, dueDate: new Date("2026-08-25T23:59:00"), computedPriority: 3, pushCount: 0, splittable: true },
        ];
        const result = scheduleTasks(tasks, [], baseOpts);

        expect(result.conflicts).toEqual([]);
        const totalMinutes = result.assignments.reduce(
            (sum, a) => sum + (a.end.getTime() - a.start.getTime()) / 60000, 0
        );
        expect(totalMinutes).toBe(500);

        const distinctDays = new Set(result.assignments.map(a => a.start.getDate()));
        expect(distinctDays.size).toBeGreaterThan(1);
    });

    it("uses the smallest available gap first only if it's earliest — chunks appear in chronological order", () => {
        const fixedEvents: FixedEvent[] = [
            { id: "f1", start: new Date("2026-08-18T17:00:00"), end: new Date("2026-08-18T19:00:00") },
        ];
        const tasks: Task[] = [
            { id: "t1", description: "Split, check order", duration: 150, dueDate: new Date("2026-08-25T23:59:00"), computedPriority: 3, pushCount: 0, splittable: true },
        ];
        const result = scheduleTasks(tasks, fixedEvents, baseOpts);

        const sorted = byStart(result.assignments);
        expect(sorted[0].start.getHours()).toBe(16); // fills the earlier, smaller gap first
        expect(sorted[1].start.getHours()).toBe(19);
    });

    it("commits nothing at all when a splittable task cannot fully fit before its deadline", () => {
        const tasks: Task[] = [
            // only "today" available (due tomorrow), 360-min window, way more than that needed
            { id: "t1", description: "Too big even split", duration: 5000, dueDate: new Date("2026-08-19T23:59:00"), computedPriority: 3, pushCount: 0, splittable: true },
        ];
        const result = scheduleTasks(tasks, [], baseOpts);

        expect(result.assignments).toEqual([]); // no partial chunks left dangling
        expect(result.conflicts).toEqual(["t1"]);
    });

    it("does not leave partial chunks in busySlots/output if it ultimately conflicts", () => {
        // task A takes the splittable task's only real capacity if the engine wrongly commits partial chunks;
        // task B should still find its slot untouched if the splittable task correctly rolled back on failure
        const tasks: Task[] = [
            { id: "impossible", description: "Too big even split", duration: 5000, dueDate: new Date("2026-08-19T23:59:00"), computedPriority: 5, pushCount: 0, splittable: true },
            { id: "normal", description: "Should still fit fine", duration: 60, dueDate: new Date("2026-08-25T23:59:00"), computedPriority: 3, pushCount: 0, splittable: false },
        ];
        const result = scheduleTasks(tasks, [], baseOpts);

        expect(result.conflicts).toEqual(["impossible"]);
        expect(result.assignments.map(a => a.taskId)).toEqual(["normal"]);
    });

    it("does not create a chunk shorter than the remaining duration needs, when a bigger gap would do", () => {
        // gap is 360 min; task needs only 90 — should be one single chunk, not artificially split
        const tasks: Task[] = [
            { id: "t1", description: "No need to split here", duration: 90, dueDate: new Date("2026-08-25T23:59:00"), computedPriority: 3, pushCount: 0, splittable: true },
        ];
        const result = scheduleTasks(tasks, [], baseOpts);

        expect(result.assignments).toHaveLength(1);
        expect(result.assignments[0].end.getTime() - result.assignments[0].start.getTime()).toBe(90 * 60 * 1000);
    });

    // disagree: the sooner due date should force it to be placed first, meaning the flexible splitter task can be wrapped between the rest of today and day after.
    // it("treats already-placed chunks from this run as busy time for subsequent tasks", () => {
    //     const tasks: Task[] = [
    //         { id: "splitter", description: "Splits and fills today", duration: 300, dueDate: new Date("2026-08-25T23:59:00"), computedPriority: 5, pushCount: 0, splittable: true },
    //         { id: "other", description: "Needs remaining room today", duration: 100, dueDate: new Date("2026-08-19T23:59:00"), computedPriority: 3, pushCount: 0, splittable: false },
    //     ];
    //     const result = scheduleTasks(tasks, [], baseOpts);

    //     console.log(result);

    //     // splitter (higher urgency) takes 300 of today's 360 min; other needs 100 but only 60 remains today,
    //     // and other's deadline is tomorrow — so other should conflict, not overlap splitter's chunk
    //     expect(result.conflicts).toEqual(["other"]);
    // });
});