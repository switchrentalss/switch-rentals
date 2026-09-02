import { Link } from "wouter";
import { SiteLayout } from "../SiteLayout";
import { collections, gallery, pillars, site } from "../content";
import { ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <SiteLayout>
      <section className="relative min-h-[92vh] flex items-end">
        <img
          src={site.hero}
          alt="White tableware stacked for service"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/25" />
        <div className="relative mx-auto w-full max-w-6xl px-5 pb-20 pt-32">
          <p className="text-[12px] tracking-[0.28em] uppercase text-[#c4a574]">Mumbai · Hotels · Banquets · Caterers</p>
          <h1 className="mt-4 max-w-3xl font-serif text-5xl leading-[1.05] text-white sm:text-7xl">
            Tables that look owned. Hire that runs like a hotel.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-white/80">
            {site.description}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/contact">
              <span className="inline-flex cursor-pointer items-center rounded-full bg-[#c4a574] px-6 py-3 text-sm font-semibold text-[#1c1410]">
                Request a proposal
              </span>
            </Link>
            <Link href="/collections">
              <span className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/30 px-6 py-3 text-sm text-white">
                Browse the collection <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-20 md:grid-cols-4">
        {pillars.map((pillar) => (
          <div key={pillar.title}>
            <p className="text-[11px] tracking-[0.2em] uppercase text-[#8a5a32]">{pillar.title}</p>
            <p className="mt-3 text-sm leading-relaxed text-[#4a3f38]">{pillar.body}</p>
          </div>
        ))}
      </section>

      <section className="bg-[#0c0a09] py-20 text-white">
        <div className="mx-auto max-w-6xl px-5">
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="text-[11px] tracking-[0.2em] uppercase text-[#c4a574]">Collection</p>
              <h2 className="mt-2 font-serif text-4xl sm:text-5xl">The table, fully dressed</h2>
            </div>
            <Link href="/collections">
              <span className="hidden cursor-pointer text-sm text-white/70 hover:text-white sm:inline">View all lines</span>
            </Link>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {collections.slice(0, 4).map((item) => (
              <Link key={item.name} href="/collections">
                <article className="group cursor-pointer">
                  <div className="aspect-[4/5] overflow-hidden">
                    <img src={item.image} alt={item.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  </div>
                  <h3 className="mt-3 font-serif text-2xl">{item.name}</h3>
                  <p className="mt-1 text-sm text-white/60">{item.blurb}</p>
                </article>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-6xl px-5">
          <p className="text-[11px] tracking-[0.2em] uppercase text-[#8a5a32]">How we work</p>
          <h2 className="mt-2 font-serif text-4xl sm:text-5xl">Specify. Deliver. Collect clean.</h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              { n: "01", t: "Specify the table", d: "Covers, cuisine, venue and finish. We pull from glassware, plates, buffet, cutlery and utility lines." },
              { n: "02", t: "Deliver on cue", d: "Packed, counted and timed to your banquet or hotel service window." },
              { n: "03", t: "Wash and reset", d: "Industrial dishwashing and sanitisation so the next event starts service-ready." },
            ].map((step) => (
              <div key={step.n} className="border-t border-[#1c1410]/15 pt-6">
                <p className="font-serif text-3xl text-[#8a5a32]">{step.n}</p>
                <h3 className="mt-3 font-serif text-2xl">{step.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#4a3f38]">{step.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="overflow-hidden pb-8">
        <div className="flex gap-3 overflow-x-auto px-5 pb-4">
          {gallery.slice(0, 8).map((src) => (
            <img key={src} src={src} alt="" className="h-56 w-72 shrink-0 object-cover sm:h-72 sm:w-96" />
          ))}
        </div>
        <div className="mx-auto max-w-6xl px-5 text-right">
          <Link href="/gallery">
            <span className="cursor-pointer text-sm uppercase tracking-[0.16em] text-[#8a5a32]">Full gallery</span>
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="rounded-[2rem] bg-[#1c1410] px-8 py-14 text-center text-white sm:px-16">
          <p className="text-[11px] tracking-[0.22em] uppercase text-[#c4a574]">Catalogue</p>
          <h2 className="mt-3 font-serif text-4xl sm:text-5xl">The complete line is shared on request</h2>
          <p className="mx-auto mt-4 max-w-lg text-white/70">
            Tell us the event date and covers. We send a tailored selection — not a generic PDF dump.
          </p>
          <Link href="/contact">
            <span className="mt-8 inline-flex cursor-pointer rounded-full bg-[#c4a574] px-6 py-3 text-sm font-semibold text-[#1c1410]">
              Talk to Switch
            </span>
          </Link>
        </div>
      </section>
    </SiteLayout>
  );
}
