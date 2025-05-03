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

const LoginPage = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <form>
          <CardHeader className="pb-4 text-center">
            <CardTitle className="text-2xl">Login</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                className="mt-1"
                required
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                className="mt-1"
                required
              />
            </div>

            {/* >>> Add your warning description here <<< */}
            <CardDescription className="text-xs text-gray-600">
              ⚠️ Never share your password with anyone. We will never ask you
              for it.
            </CardDescription>
          </CardContent>

          <CardFooter className="pt-4">
            <Button type="submit" className="w-full">
              Submit
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default LoginPage;
