import { FormEvent, useState } from "react";
import { SiteLayout } from "../SiteLayout";
import { site } from "../content";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function ContactPage() {
  const { toast } = useToast();
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    setPending(true);
    try {
      const res = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("failed");
      form.reset();
      toast({
        title: "Received",
        description: "Switch will reply on phone or WhatsApp with a tailored selection.",
      });
    } catch {
      toast({
        title: "Could not send",
        description: "Call or WhatsApp us directly — the numbers are on this page.",
        variant: "destructive",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <SiteLayout title="Contact">
      <div className="bg-[#0c0a09] px-5 pb-16 pt-28 text-white">
        <div className="mx-auto max-w-6xl">
          <p className="text-[11px] tracking-[0.22em] uppercase text-[#c4a574]">Mazgaon, Mumbai</p>
          <h1 className="mt-3 font-serif text-5xl sm:text-6xl">Tell us the date and the covers</h1>
        </div>
      </div>
      <div className="mx-auto grid max-w-6xl gap-14 px-5 py-16 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-6 text-sm leading-relaxed">
          <p>{site.address}</p>
          <p>
            <a className="underline" href={site.maps} target="_blank" rel="noreferrer">
              Gupta Mills Estate on Maps
            </a>
          </p>
          <div className="space-y-1">
            {site.phones.map((p) => (
              <p key={p.href}>
                <a href={p.href} className="hover:underline">{p.display}</a>
              </p>
            ))}
          </div>
          <a
            href={site.whatsapp}
            className="inline-flex rounded-full bg-[#1c1410] px-5 py-2.5 text-white"
            target="_blank"
            rel="noreferrer"
          >
            WhatsApp
          </a>
          <div className="space-y-1 pt-4">
            {site.emails.map((e) => (
              <p key={e}>
                <a href={`mailto:${e}`}>{e}</a>
              </p>
            ))}
          </div>
        </div>
        <form onSubmit={onSubmit} className="space-y-4 rounded-3xl bg-white p-6 shadow-sm sm:p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input required name="name" placeholder="Name" />
            <Input name="company" placeholder="Hotel / company" />
            <Input name="eventDate" type="date" />
            <Input name="covers" placeholder="Covers / pax" />
          </div>
          <Input name="phone" placeholder="Phone or WhatsApp" />
          <Input name="email" type="email" placeholder="Email (optional)" />
          <Textarea name="message" placeholder="Cuisine, venue, finishes you already like…" rows={5} />
          <Button type="submit" disabled={pending} className="rounded-full px-6">
            {pending ? "Sending…" : "Send enquiry"}
          </Button>
        </form>
      </div>
    </SiteLayout>
  );
}
