import { SiteLayout } from "../SiteLayout";
import { partners, site } from "../content";

export default function AboutPage() {
  return (
    <SiteLayout title="Studio">
      <div className="bg-[#0c0a09] px-5 pb-16 pt-28 text-white">
        <div className="mx-auto max-w-6xl">
          <p className="text-[11px] tracking-[0.22em] uppercase text-[#c4a574]">The house</p>
          <h1 className="mt-3 max-w-3xl font-serif text-5xl sm:text-6xl">Hospitality people, running a rental floor</h1>
          <p className="mt-5 max-w-2xl text-lg text-white/70">{site.description}</p>
        </div>
      </div>
      <div className="mx-auto grid max-w-6xl gap-16 px-5 py-20 md:grid-cols-2">
        {partners.map((person) => (
          <article key={person.name}>
            <div className="aspect-[4/5] overflow-hidden bg-black">
              <img src={person.photo} alt={person.name} className="h-full w-full object-cover object-top" />
            </div>
            <p className="mt-5 text-[11px] tracking-[0.2em] uppercase text-[#8a5a32]">{person.role}</p>
            <h2 className="mt-1 font-serif text-4xl">{person.name}</h2>
            <p className="mt-3 text-sm leading-relaxed text-[#4a3f38]">{person.bio}</p>
          </article>
        ))}
      </div>
    </SiteLayout>
  );
}
