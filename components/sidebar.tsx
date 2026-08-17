"use client";

import { User } from "better-auth";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "./ui/sidebar";
import { Logo } from "./logo";
import Link from "next/link";
import { IconBell, IconCategory, IconCreditCard, IconHome, IconLogout, IconSettings, IconSparkle, IconUser } from "@tabler/icons-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

const links = [
    {
        link: "dashboard",
        icon: <IconHome />,
        tooltip: "Dashboard",
    },
    {
        link: "categories",
        icon: <IconCategory />,
        tooltip: "Categories",
    },
    {
        link: "settings",
        icon: <IconSettings />,
        tooltip: "Settings",
    },
]

export function AppSidebar({ user }: { user: User }) {
    const router = useRouter();

    return (
        <Sidebar variant="floating" collapsible="icon">
            <SidebarHeader>
                <Logo variant="icon" />
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {links.map((link) => (
                                <Tooltip key={link.link}>
                                    <TooltipTrigger>
                                        <SidebarMenuItem>
                                            <SidebarMenuButton render={<Link href={`/${link.link}`} />}>
                                                {link.icon}
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    </TooltipTrigger>
                                    <TooltipContent side="right">
                                        <p>{link.tooltip}</p>
                                    </TooltipContent>
                                </Tooltip>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <DropdownMenu>
                            <DropdownMenuTrigger render={<SidebarMenuButton size="lg" />}>
                                <Avatar>
                                    <AvatarImage src={user.image ?? ""} alt={user.name} />
                                    <AvatarFallback><IconUser /></AvatarFallback>
                                </Avatar>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg" side="right">
                                <DropdownMenuGroup>
                                    <DropdownMenuLabel className="p-0 font-normal">
                                        <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                                            <Avatar className="h-8 w-8 rounded-lg">
                                                <AvatarImage src={user.image ?? ""} alt={user.name} />
                                                <AvatarFallback className="rounded-lg"><IconUser /></AvatarFallback>
                                            </Avatar>
                                            <div className="grid flex-1 text-left text-sm leading-tight">
                                                <span className="truncate font-medium text-foreground">{user.name}</span>
                                                <span className="truncate text-xs text-foreground">{user.email}</span>
                                            </div>
                                        </div>
                                    </DropdownMenuLabel>
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuGroup>
                                    <DropdownMenuItem>
                                        <IconUser />
                                        Account
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                        <IconCreditCard />
                                        Billing
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                        <IconBell />
                                        Notifications
                                    </DropdownMenuItem>
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={async () => {
                                    await authClient.signOut({
                                        fetchOptions: {
                                            onSuccess: () => {
                                                router.push("/");
                                            }
                                        }
                                    })
                                }}>
                                    <IconLogout />
                                    Log out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
}