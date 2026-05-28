import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/app/components/ui/dialog";

export interface RoutePhoto {
  src: string;
  alt?: string;
  caption?: string;
  caption_en?: string;
}

export default function PhotoStrip({ photos }: { photos?: RoutePhoto[] }) {
  if (!photos || photos.length === 0) return null;

  return (
    <div data-photo-strip="true" className="flex flex-wrap gap-2">
      {photos.map((p, i) => {
        const caption = p.caption;
        const label = p.alt ?? caption ?? "photo";
        return (
          <Dialog key={`${p.src}-${i}`}>
            <DialogTrigger asChild>
              <button
                type="button"
                data-photo-thumb="true"
                className="group relative h-16 w-16 overflow-hidden rounded-lg border border-[#e5dfd3] cursor-pointer"
                aria-label={label}
              >
                <img
                  src={p.src}
                  alt={label}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-110"
                />
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl border-none bg-black/90 p-3">
              <DialogTitle className="sr-only">{label}</DialogTitle>
              <img src={p.src} alt={label} className="h-auto w-full rounded-lg" />
              {caption && <p className="mt-2 text-center text-xs text-neutral-300">{caption}</p>}
            </DialogContent>
          </Dialog>
        );
      })}
    </div>
  );
}
