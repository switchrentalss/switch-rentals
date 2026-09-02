import { SiteLayout } from "../SiteLayout";
import { collections } from "../content";

export default function CollectionsPage() {
  return (
    <SiteLayout title="Collection">
      <div className="bg-[#0c0a09] px-5 pb-16 pt-28 text-white">
        <div className="mx-auto max-w-6xl">
          <p className="text-[11px] tracking-[0.22em] uppercase text-[#c4a574]">Hire by line</p>
          <h1 className="mt-3 max-w-3xl font-serif text-5xl sm:text-6xl">Crockery, glass, buffet and the kit around it</h1>
          <p className="mt-4 max-w-xl text-white/65">
            Categories from the live Switch Rental catalogue. Quantities, finishes and the full book are issued after we know your covers.
          </p>
        </div>
      </div>
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-16 sm:grid-cols-2">
        {collections.map((item) => (
          <article key={item.name} className="group">
            <div className="aspect-[16/10] overflow-hidden">
              <img src={item.image} alt={item.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
            </div>
            <h2 className="mt-4 font-serif text-3xl">{item.name}</h2>
            <p className="mt-2 text-sm text-[#4a3f38]">{item.blurb}</p>
          </article>
        ))}
      </div>
    </SiteLayout>
  );
}
