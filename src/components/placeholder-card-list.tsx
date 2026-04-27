type PlaceholderCardListProps = {
  items: string[];
  description: string;
};

export function PlaceholderCardList({
  description,
  items,
}: PlaceholderCardListProps) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <article
          className="rounded-lg border border-white/10 bg-[#151515] p-5 shadow-lg shadow-black/20"
          key={item}
        >
          <h2 className="text-lg font-semibold text-white">{item}</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">{description}</p>
        </article>
      ))}
    </div>
  );
}
