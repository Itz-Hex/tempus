type CalendarItem = {
    id: string;              // assignment.id or fixedEvent.id
    kind: "task" | "fixed";
    sourceId: string;        // task.id (for click-through/editing) or fixedEvent.id
    title: string;           // task.description or fixedEvent.description
    start: Date;
    end: Date;
    categoryId: string;
    status?: string;         // only meaningful for task-backed items
    editable: {
        move: boolean;         // fixed events: freely movable; assignments: maybe re-schedulable
        resize: boolean;
    };
};