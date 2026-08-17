import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "./logo";

export function Navbar() {
    return (
        <header className="border-b">
            <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
                <Logo />

                <div className="flex items-center gap-3">
                    <Button render={<Link href="/sign-in" />} variant="ghost">
                        Log in
                    </Button>
                    <Button render={<Link href="/sign-up" />}>
                        Sign up
                    </Button>
                </div>
            </div>
        </header>
    );
}