import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <Container className="flex flex-col gap-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Hacktrack</h1>
      <p className="text-muted-foreground">
        Starter scaffold — theme not announced yet.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
      </div>
    </Container>
  );
}
