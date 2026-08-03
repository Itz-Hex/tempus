# Vision

Tempus is a personal scheduling application which takes a flat list of tasks with deadlines and priorities and automatically produces a day-by-day schedule, rearranging as needed when new tasks come up. It is not for collaboration, habit tracking or coaching. It is purely a deterministic scheduling engine with a clean UI on top.

# Core use case

Before using the app, the user will need to input any fixed time blocks where tasks cannot be scheduled, e.g. school, work (unless used for work), recurring appointments or known appointments.

To begin using the app, a user will add a list of tasks. Each task will require a brief description of the task, a category, a generous estimated duration, whether the task can be split into multiple time blocks, a due date, and a priority level. These tasks will be scheduled based on their due date, priority and any fixed time blocks.

When a user completes a task, the app will prompt them to mark it as complete when the allotted time is complete. (notifications could be added) The user will also have the option to say that the task has overran, and for it to be rescheduled for another time, or extended. In both cases the calendar will need to be rescheduled. 

Adding, editing or deleting tasks will trigger a reschedule so changes can be handled accordingly.

# Features

## Core

- [ ] Create/edit/delete tasks
- [ ] Automatic scheduling into available time
- [ ] Manual override / drag-to-reschedule
- [ ] Mark task as complete

## Version 1

- [ ] Push-back weighting (delayed tasks get harder to delay again)
- [ ] Protected free-time / hobby blocks + encouragement
- [ ] Fixed events
- [ ] Conflict surfacing (deadlines which physically cannot be met)
- [ ] Recurring tasks
- [ ] Completion tracking (rate) + mindset logging (purely tacking, no logic)

- [ ] Hobbies

## Version 2+

- [ ] Adaptive scheduling based on completion history
- [ ] Mindset-based pattern detection
- [ ] Smart suggestions

- [ ] PWA
- [ ] Notifications

# Data model

## Entities

- User
    - handled by better-auth
- Task
    - uuid (pk)
    - user_id (fk)
    - description
    - category (fk)
    - duration
    - due_date (optional) // if optional, rescheduled until weight too great
    - user_priority (1-5)
    - computed_priority (1-5, default: userPriority)
    - push_count
    - splittable (default: false)
    - status (pending/scheduled/completed/overran/skipped/conflict)
    - archived_at
- FixedEvent
    - uuid (pk)
    - user_id (fk)
    - description
    - category (fk)
    - start (date+time)
    - end (date + time)
    - archived_at
- CompletionLog
    - uuid (pk)
    - task_id (fk)
    - assignment_id (fk)
    - mindset
    - completed_at
    - actual_duration
- ScheduleAssignment
    - uuid (pk)
    - task (fk)
    - start (date+time)
    - end (date+time)
    - status (active/superseded)
- Cateogry
    - uuid (pk)
    - user_id (fk)
    - description
    - color
    - type
- UserSettings
    - uuid (pk)
    - user_id (fk)
    - week_day_start_time (time)
    - week_day_end_time (time)
    - weekend_day_start_time (time, default: week_day_start_time)
    - weekend_day_end_time (time, default: week_day_end_time)
    - week_start (Monday/Sunday)
    - timezone

# Scheduling algorithm specification

HORIZON_DAYS = 28
PUSH_MULTIPLIER = 0.2
DECAY_K = <tune>
NO_DEADLINE_URGENCY_FACTOR = 0.1 // tune
OVERDUE_URGENCY_FACTOR = 1

tasks = all tasks for user where status = (pending, scheduled, conflict) and not archived
fixedEvents = all fixed events for user where not archived and is between today and HORIZON_DAYS

for v1, clear all active ScheduleAssignment for user within the horizon
-> by marking as superseded
in v2, migrate to incremental patching here instead

weightedTasks = []

for each task:
    if task due date is null:
        deadlineProximityFactor = NO_DEADLINE_URGENCY_FACTOR
    else:
        x = days between today and due_date
        if x <= 0:
            deadlineProximityFactor = OVERDUE_URGENCY_FACTOR
        else:
            deadlineProximityFactor = e^(-x / DECAY_K)
    urgency = task computed priority * deadlineProximityFactor * (1 + task push count * PUSH_MULTIPLIER)

sort weightedTasks by urgency descending then by created at ascending

for each task, urgency in weightedTasks:
    availableSlots = compute free time from today to due date or horizon date, whatever is sooner
    by subtracting:
        - fixed events,
        - already-placed assignments in this run
        - time outside of working hours
    if task not splittable:
        slot = earliest contiguous available slot >= task duration
        if slot exists:
            create schedule assignment for this task
            update status to scheduled
        else:
            update status to conflict
    else:
        remaining = task.duration
        chunks = []
        for slot in availableSlots (earliest first):
            if remaining <= 0: stop
            chunkSize = minimum of remaining and slot length
            add chunk to chunks
            remaining -= chunk chunkSize
        if remaining <= 0:
            create a ScheduleAssignment for each chunk 
            update status to scheduled
        else:
            update status to conflict
    if task was already assigned and has a new assignment after the previous:
        increment the push count

return the updated schedule and list of conflicted tasks for review

# Non-functional requirements

# Test scenarios

# Open questions

How to handle recurring tasks?
How to handle hobbies?

# Adaptive layer

# Milestones

