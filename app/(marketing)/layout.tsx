import { Navbar } from "@/components/navbar";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function Layout({ children }: { children: React.ReactNode }) {
    const session = await auth.api.getSession({ headers: await headers() });

    if (session) {
        redirect("/dashboard");
    }

    return (
        <>
            <Navbar />
            {children}
        </>
    );
}
