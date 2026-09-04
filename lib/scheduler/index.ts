import type {
  Task,
  WeightedTask,
  FixedEvent,
  ScheduleResult,
  WorkingHours,
  TimeSlot,
  ScheduleAssignment,
} from "./types";
import {
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
} from "date-fns";

const PUSH_MULTIPLIER = 0.2;
const DECAY_CONSTANT = 1; // tune
const NO_DEADLINE_URGENCY_FACTOR = 0.1; // tune
const OVERDUE_URGENCY_FACTOR = 1;

function isWeekday(date: Date) {
  return date.getDay() % 6 !== 0;
}

function setTime(date: Date, time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  date.setHours(hours, minutes, 0, 0);
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function scheduleTasks(
  tasks: Task[],
  fixedEvents: FixedEvent[],
  opts: { today: Date; horizonDays: number; workingHours: WorkingHours },
): ScheduleResult {
  let result: ScheduleResult = { assignments: [], conflicts: [] };

  const weightedTasks: WeightedTask[] = [];

  tasks.forEach((task) => {
    let deadlineProximityFactor = 0;
    if (task.dueDate === null) {
      deadlineProximityFactor = NO_DEADLINE_URGENCY_FACTOR;
    } else {
      const daysDifference = differenceInDays(task.dueDate, opts.today);

      if (daysDifference <= 0) {
        deadlineProximityFactor = OVERDUE_URGENCY_FACTOR;
      } else {
        deadlineProximityFactor = Math.exp(-daysDifference / DECAY_CONSTANT);
      }
    }

    let urgency =
      task.computedPriority *
      deadlineProximityFactor *
      (1 + task.pushCount * PUSH_MULTIPLIER);

    weightedTasks.push({ task: task, weight: urgency });
  });

  let busySlots: TimeSlot[] = []; // is this in chronological order? if not, make it

  fixedEvents.forEach((fixedEvent) =>
    busySlots.push({ start: fixedEvent.start, end: fixedEvent.end }),
  );

  // possibly sort busy slots in chronological order and then end determine relevance once known that future busy slots wont be relevant (either on each pass of task, or when adding a new task, put it in the right place)

  const horizonDate = new Date(opts.today);
  horizonDate.setDate(horizonDate.getDate() + opts.horizonDays);

  weightedTasks.sort((a, b) => b.weight - a.weight);

  weightedTasks.forEach((task) => {
    const overdue =
      differenceInDays(task.task.dueDate ?? horizonDate, opts.today) < 0;

    let numberOfDaysAvailable = 0;

    if (overdue || !task.task.dueDate) {
      // if overdue or no due date, the days available is the horizon date
      numberOfDaysAvailable = differenceInDays(horizonDate, opts.today);
    } else {
      // otherwise, days available is up to due date
      numberOfDaysAvailable = differenceInDays(
        new Date(Math.min(horizonDate.getTime(), task.task.dueDate.getTime())),
        opts.today,
      );
    }

    let assigned = false;
    let remaining = task.task.duration;
    let candidateSlots: TimeSlot[] = []; // for splittable tasks

    // forech day available
    for (let i = 0; i < numberOfDaysAvailable; i++) {
      const day = new Date(opts.today);
      day.setDate(day.getDate() + i);
      const weekday = isWeekday(day);

      let dayBoundary = { start: day, end: day }; // get the time available for that day

      let currentTime = formatTime(day);

      let startTime = weekday
        ? opts.workingHours.weekDayStart
        : opts.workingHours.weekendStart;

      if (i > 0 || currentTime < startTime) {
        // so day is not today (otherwise leave start time as is as events can't be scheduled for before right now)
        const startDay = new Date(day);

        setTime(
          startDay,
          weekday
            ? opts.workingHours.weekDayStart
            : opts.workingHours.weekendStart,
        );

        dayBoundary.start = startDay;
      }

      const endDay = new Date(day);

      setTime(
        endDay,
        weekday ? opts.workingHours.weekDayEnd : opts.workingHours.weekendEnd,
      );

      dayBoundary.end = endDay;

      // get the slots on this day between the start and end times which will be busy
      let relevantBusySlots: TimeSlot[] = [];
      busySlots.forEach((slot) => {
        if (slot.start < dayBoundary.end && slot.end > dayBoundary.start) {
          relevantBusySlots.push(slot);
        }
      });

      relevantBusySlots.sort((a, b) => a.start.getTime() - b.start.getTime());

      // merge together overlapping or touching lots for simplification
      let mergedSlots: TimeSlot[] = [];
      relevantBusySlots.forEach((slot) => {
        if (mergedSlots.length == 0) {
          mergedSlots.push({
            start: new Date(slot.start),
            end: new Date(slot.end),
          });
        } else {
          const lastIndex = mergedSlots.length - 1;
          if (slot.start <= mergedSlots[lastIndex].end) {
            mergedSlots[lastIndex].end.setTime(
              Math.max(
                mergedSlots[lastIndex].end.getTime(),
                slot.end.getTime(),
              ),
            );
          } else {
            mergedSlots.push({
              start: new Date(slot.start),
              end: new Date(slot.end),
            });
          }
        }
      });

      let freeSlots: TimeSlot[] = [];
      let cursor = new Date(dayBoundary.start);

      mergedSlots.forEach((slot) => {
        if (slot.start > cursor) {
          // if a busy slot starts after the position we're checking
          freeSlots.push({ start: new Date(cursor), end: slot.start }); // push the current position and start of the busy slot as a free slot
        }
        cursor.setTime(Math.max(cursor.getTime(), slot.end.getTime())); // set the cursor to be the end of the busy slot
      });

      if (cursor < dayBoundary.end) {
        freeSlots.push({ start: new Date(cursor), end: dayBoundary.end }); // add the rest of the day if needed
      }

      if (!task.task.splittable) {
        // handle non splittable tasks
        for (let i = 0; i < freeSlots.length; i++) {
          // foreach free slot
          const slot = freeSlots[i]; // get the slot
          const slotDuration = differenceInMinutes(slot.end, slot.start); // find its duration
          if (slotDuration >= task.task.duration) {
            // check if it is long enough
            const end = new Date(
              slot.start.getTime() + task.task.duration * 60 * 1000,
            ); // find the end time based on task duration
            const assignment: ScheduleAssignment = {
              taskId: task.task.id,
              start: slot.start,
              end: end,
            }; // schedule the task
            result.assignments.push(assignment);
            busySlots.push({ start: assignment.start, end: assignment.end });
            assigned = true;
            break; // once scheduled, stop checking slots
          }
        }
      } else {
        for (let i = 0; i < freeSlots.length; i++) {
          // for each free slot
          const slot = freeSlots[i];
          const slotDuration = differenceInMinutes(slot.end, slot.start); // get the slot and its duration

          const end = new Date();

          if (slotDuration <= remaining) {
            end.setTime(slot.end.getTime()); // slot isn't big enough for full task, so fill the slot
          } else {
            end.setTime(slot.start.getTime() + remaining * 60 * 1000); // slot is big enough for full task, so fill required space
          }

          candidateSlots.push({ start: new Date(slot.start), end: end }); // add the slot to potential slots

          remaining -= differenceInMinutes(end, slot.start); // remove the time scheduled

          if (remaining <= 0) {
            assigned = true; // assigned if no time remaining to be scheduled
            break;
          }
        }
        if (assigned) {
          candidateSlots.forEach((slot) => {
            // assign each candidate slot once we know that it isn't a conflict
            const assignment: ScheduleAssignment = {
              taskId: task.task.id,
              start: slot.start,
              end: slot.end,
            };
            result.assignments.push(assignment);
            busySlots.push({
              start: new Date(slot.start),
              end: new Date(slot.end),
            });
          });
        }
      }

      if (assigned) {
        break;
      } // no need to check more days if assigned
    }

    if (!assigned) {
      // if not assigned then it is a confliced
      result.conflicts.push(task.task.id);
    }
  });

  return result;
}
