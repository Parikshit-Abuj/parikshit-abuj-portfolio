"use client";
import { useEffect, useRef } from "react";
export function NavigationMenu({
  sections,
}: {
  sections: { id: string; title: string }[];
}) {
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    function closeOutside(event: PointerEvent) {
      const current = menu.current;
      if (current?.open && !event.composedPath().includes(current)) {
        current.open = false;
      }
    }
    document.addEventListener("pointerdown", closeOutside, true);
    return () =>
      document.removeEventListener("pointerdown", closeOutside, true);
  }, []);
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
          <a key={section.id} href={`#${section.id}`}>
            {section.title}
          </a>
        ))}
      </nav>
    </details>
  );
}
