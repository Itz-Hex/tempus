import { IconCalendarEvent } from "@tabler/icons-react"

export function Logo({ variant = "full" }: { variant?: "icon" | "full" }) {
    return (
        <a href="/" className="flex items-center gap-2 self-center font-medium">
            <div className={`flex ${variant == "full" ? "size-6" : "size-8"} items-center justify-center rounded-md bg-primary text-primary-foreground`}>
                <IconCalendarEvent className={variant == "full" ? "size-4" : "size-5"} />
            </div>
            {variant == "full" ? "Tempus" : ""}
        </a>
    )
}