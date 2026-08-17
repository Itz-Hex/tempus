import { AppSidebar } from "@/components/sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) {
        redirect("/sign-in");
    }

    return (
        <div className="flex">
            <SidebarProvider defaultOpen={false}>
                <AppSidebar user={session.user} />
                <main className="flex-1 m-2">{children}</main>
            </SidebarProvider>
        </div>
    );
}