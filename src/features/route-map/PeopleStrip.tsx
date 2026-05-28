export interface RoutePerson {
  name: string;
  name_en?: string;
  role?: string;
  role_en?: string;
  image?: string;
  bio?: string;
  bio_en?: string;
}

export default function PeopleStrip({ people }: { people?: RoutePerson[] }) {
  if (!people || people.length === 0) return null;

  return (
    <div data-people-strip="true" className="flex flex-col gap-2.5">
      {people.map((p, i) => {
        const name = p.name;
        const role = p.role;
        const bio = p.bio;
        return (
          <div
            key={`${p.name}-${i}`}
            data-people-card="true"
            className="flex items-start gap-3 rounded-xl border border-[#e5dfd3]/50 bg-[#f5f2eb]/60 p-2.5"
          >
            {p.image && (
              <img
                src={p.image}
                alt={name}
                loading="lazy"
                className="h-10 w-10 flex-shrink-0 rounded-full object-cover"
              />
            )}
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-[13px] font-semibold text-neutral-800">{name}</span>
                {role && <span className="text-[10px] font-medium text-amber-700">{role}</span>}
              </div>
              {bio && <p className="mt-0.5 text-[11px] leading-snug text-neutral-600">{bio}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
