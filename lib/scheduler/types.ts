export type Task = {
    id: string;
    description: string;
    duration: number;
    dueDate: Date | null;
    computedPriority: number;
    pushCount: number;
    splittable: boolean;
}

export type WeightedTask = {
    task: Task,
    weight: number;
}

export type FixedEvent = {
    id: string;
    start: Date;
    end: Date;
}

export type ScheduleAssignment = {
    taskId: string;
    start: Date;
    end: Date;
}

export type ScheduleResult = {
    assignments: ScheduleAssignment[];
    conflicts: string[];
}

export type WorkingHours = {
    weekDayStart: string;
    weekDayEnd: string;
    weekendStart: string;
    weekendEnd: string;
}

export type TimeSlot = {
    start: Date;
    end: Date;
}