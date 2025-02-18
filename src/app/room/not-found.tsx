import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { HomeIcon } from "lucide-react";

export default function NotFound() {
    return (
        <div className="min-h-[80vh] grid place-items-center px-4">
            <Card className="w-full max-w-md">
                <CardContent className="pt-6">
                    <div className="text-center space-y-6">
                        <p className="text-8xl font-bold text-primary font-mono">404</p>

                        <div className="space-y-2">
                            <h1 className="text-2xl font-bold tracking-tight">Room not found</h1>
                            <p className="text-muted-foreground">The room you're looking for doesn't exist.</p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Button variant="default" asChild>
                                <Link href="/">
                                    <HomeIcon className="mr-2 size-4" />
                                    Back to Home
                                </Link>
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}