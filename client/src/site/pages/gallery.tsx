import { SiteLayout } from "../SiteLayout";
import { gallery } from "../content";

export default function GalleryPage() {
  return (
    <SiteLayout title="Gallery">
      <div className="bg-[#0c0a09] px-5 pb-16 pt-28 text-white">
        <div className="mx-auto max-w-6xl">
          <p className="text-[11px] tracking-[0.22em] uppercase text-[#c4a574]">Studio</p>
          <h1 className="mt-3 font-serif text-5xl sm:text-6xl">Set, served, photographed</h1>
          <p className="mt-4 max-w-xl text-white/65">
            Food photography and table styling sit alongside hire — so the same pieces that leave the warehouse are the ones on camera.
          </p>
        </div>
      </div>
      <div className="mx-auto columns-1 gap-3 px-5 py-12 sm:columns-2 lg:columns-3 max-w-6xl">
        {gallery.map((src) => (
          <img key={src} src={src} alt="Switch Rental tableware" className="mb-3 w-full break-inside-avoid object-cover" />
        ))}
      </div>
    </SiteLayout>
  );
}
