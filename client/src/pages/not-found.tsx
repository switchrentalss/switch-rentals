import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-8 text-center space-y-3">
          <p className="text-sm tracking-widest uppercase text-muted-foreground">Switch Rentals</p>
          <h1 className="font-serif text-3xl">Page not found</h1>
          <p className="text-sm text-muted-foreground">That page isn’t on the site or in operations.</p>
          <div className="flex justify-center gap-2">
            <Link href="/site">
              <Button className="mt-2">Website</Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="mt-2">Mill</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
