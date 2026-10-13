export function NavigationMenu({
  sections,
}: {
  sections: { id: string; title: string }[];
}) {
  return (
    <nav className="recruiter-navigation" aria-label="Main navigation">
      {[...sections, { id: "contact", title: "Contact" }].map((section) => (
        <a key={section.id} href={`#${section.id}`}>
          {section.title}
        </a>
      ))}
    </nav>
  );
}
