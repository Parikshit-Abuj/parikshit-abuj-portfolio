"use client";
import { useRef } from "react";
export function NavigationMenu({
  sections,
}: {
  sections: { id: string; title: string }[];
}) {
  const menu = useRef<HTMLDetailsElement>(null);
  return (
    <details
      className="recruiter-menu"
      ref={menu}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          menu.current!.open = false;
          menu.current!.querySelector("summary")?.focus();
        }
      }}
    >
      <summary>Menu</summary>
      <nav aria-label="Main navigation">
        {[...sections, { id: "contact", title: "Contact" }].map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            onClick={() => {
              if (menu.current) menu.current.open = false;
            }}
          >
            {section.title}
          </a>
        ))}
      </nav>
    </details>
  );
}
