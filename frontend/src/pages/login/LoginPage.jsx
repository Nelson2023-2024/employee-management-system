import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "../../components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTheme } from "../../components/theme-provider";
import { Moon, Sun } from "lucide-react"; // Import icons for theme toggle

const LoginPage = () => {

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4">
      <Card className="w-full max-w-md border shadow-sm">
        <form>
          <CardHeader className="pb-4 text-center">
            <CardTitle className="text-2xl font-semibold">Login</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
              />
            </div>

            <CardDescription className="text-xs text-muted-foreground flex items-center space-x-1">
              <span>⚠️</span>
              <span>Never share your password with anyone. We will never ask you for it.</span>
            </CardDescription>
          </CardContent>

          <CardFooter className="pt-2">
            <Button type="submit" className="w-full">
              Sign In
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default LoginPage;