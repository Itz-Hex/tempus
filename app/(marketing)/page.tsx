import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-6">
      <div className="max-w-xl text-center space-y-6">
        <h1 className="text-4xl font-bold tracking-tight">
          Stop planning your week. Let it plan itself.
        </h1>
        <p className="text-muted-foreground text-lg">
          Add what you need to do, when it's due, and how important it is —
          the schedule builds itself around your day, your deadlines, and
          your free time.
        </p>
        <div className="flex justify-center gap-3">
          <Button render={<Link href="/sign-up" />} size="lg">
            Get started
          </Button>
          <Button render={<Link href="/sign-in" />} variant="outline" size="lg">
            Sign in
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-16 max-w-3xl w-full">
        <Card>
          <CardContent>
            <h3 className="font-semibold mb-1">Automatic scheduling</h3>
            <p className="text-sm text-muted-foreground">
              Just add tasks with a deadline and priority — the rest is
              handled for you.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <h3 className="font-semibold mb-1">Deadlines that stick</h3>
            <p className="text-sm text-muted-foreground">
              Pushed-back tasks get bumped up in priority so nothing slips
              through forever.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <h3 className="font-semibold mb-1">Room to breathe</h3>
            <p className="text-sm text-muted-foreground">
              Free time and hobbies are protected, not squeezed out by
              everything else.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}