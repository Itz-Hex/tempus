"use client";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { IconBrandGithub } from "@tabler/icons-react";

export function GithubSignInButton() {
    return (
        <Button variant="outline" type="button" onClick={() => authClient.signIn.social({ provider: "github" })}>
            <IconBrandGithub />
            Sign in with Github
        </Button>
    );
}