import { Download, ArrowUpRight, MapPin } from "lucide-react";
import { Portrait } from "./portrait";
import { NavigationMenu } from "./navigation-menu";
import {
  educationPeriod,
  experiencePeriod,
  publicContent,
  sectionOrder,
  academicResult,
  projectPeriod,
  type PortfolioContent,
} from "@/lib/portfolio";
function External({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      className="recruiter-external"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      <span>{children}</span>
      <ArrowUpRight size={14} aria-hidden="true" />
    </a>
  );
}
function Bullets({ items }: { items: string[] }) {
  return items.length ? (
    <ul>
      {items.map((e, i) => (
        <li key={i}>{e}</li>
      ))}
    </ul>
  ) : null;
}
export function PortfolioView({
  content,
  preview = false,
}: {
  content: PortfolioContent;
  preview?: boolean;
}) {
  const d = publicContent(content),
    p = d.profile,
    resume = preview ? "/admin/resume" : "/api/resume";
  const sections: { id: string; title: string; body: React.ReactNode }[] = [];
  for (const id of sectionOrder(d, "website")) {
    let title = "",
      body: React.ReactNode = null;
    if (id === "projects" && d.projects.length) {
      title = "Projects";
      body = (
        <div className="recruiter-projects">
          {d.projects.map((e) => (
            <article className="recruiter-card" key={e.id}>
              <div className="project-title-row">
                <h3>{e.name}</h3>
                {e.status && <span className="badge">{e.status}</span>}
              </div>
              {projectPeriod(e) && <p>{projectPeriod(e)}</p>}
              <p>
                {e.summary.length > 260
                  ? `${e.summary.slice(0, 260).trim()}…`
                  : e.summary}
              </p>
              {(e.summary.length > 260 || e.bullets.length > 0) && (
                <details>
                  <summary>Read more about {e.name}</summary>
                  {e.summary.length > 260 && <p>{e.summary}</p>}
                  <Bullets items={e.bullets} />
                </details>
              )}
              <div className="tags">
                {e.technologies.map((t, i) => (
                  <span key={i}>{t}</span>
                ))}
              </div>
              <div className="project-links">
                {e.githubUrl && (
                  <External href={e.githubUrl}>
                    {new URL(e.githubUrl).pathname.split("/").filter(Boolean)
                      .length >= 2
                      ? "Source code"
                      : "GitHub profile"}
                  </External>
                )}
                {e.demoUrl && <External href={e.demoUrl}>Live demo</External>}
              </div>
            </article>
          ))}
        </div>
      );
    }
    if (id === "experiences" && d.experiences.length) {
      title = "Experience";
      body = d.experiences.map((e) => (
        <article className="recruiter-entry" key={e.id}>
          <h3>{e.company}</h3>
          <p>
            <strong>{e.role}</strong>
          </p>
          <p>{[experiencePeriod(e), e.location].filter(Boolean).join(" · ")}</p>
          <Bullets items={e.bullets} />
        </article>
      ));
    }
    if (id === "skillGroups" && d.skillGroups.length) {
      title = "Skills";
      body = (
        <div className="recruiter-skills">
          {d.skillGroups.map((e) => (
            <article key={e.id}>
              <h3>{e.name}</h3>
              <div className="tags">
                {e.skills.map((t, i) => (
                  <span key={i}>{t}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
      );
    }
    if (
      id === "credentials" &&
      (d.education.length || d.certifications.length || d.languages.length)
    ) {
      title = "Education and credentials";
      body = (
        <div className="recruiter-credentials">
          <div>
            {d.education.map((e) => (
              <article className="recruiter-entry" key={e.id}>
                <h3>{e.qualification}</h3>
                <p>{e.institution}</p>
                <p>{educationPeriod(e)}</p>
                {[e.board, e.location, academicResult(e)].filter(Boolean)
                  .length > 0 && (
                  <p>
                    {[e.board, e.location, academicResult(e)]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
                <Bullets items={e.highlights || []} />
              </article>
            ))}
          </div>
          <div>
            {d.certifications.length > 0 && <h3>Certifications</h3>}
            {d.certifications.map((e) => (
              <article className="recruiter-entry" key={e.id}>
                <p>
                  {e.url ? (
                    <External href={e.url}>{e.name}</External>
                  ) : (
                    <strong>{e.name}</strong>
                  )}
                </p>
                <p>{[e.issuer, e.year].filter(Boolean).join(" · ")}</p>
                {e.credentialId && <p>Credential ID: {e.credentialId}</p>}
              </article>
            ))}
            {d.languages.length > 0 && (
              <>
                <h3>Languages</h3>
                <p>
                  {d.languages
                    .map((e) =>
                      e.proficiency ? `${e.name}: ${e.proficiency}` : e.name,
                    )
                    .join(", ")}
                </p>
              </>
            )}
          </div>
        </div>
      );
    }
    if (id.startsWith("custom:")) {
      const s = d.customSections?.find((s) => `custom:${s.id}` === id);
      if (s?.showOnWebsite && s.entries.length) {
        title = s.title;
        body = s.entries.map((e) => (
          <article className="recruiter-entry" key={e.id}>
            <h3>{e.title}</h3>
            {(e.organization || e.date) && (
              <p>{[e.organization, e.date].filter(Boolean).join(" · ")}</p>
            )}
            {e.description && <p>{e.description}</p>}
            <Bullets items={e.bullets} />
            {e.url && <External href={e.url}>View details</External>}
          </article>
        ));
      }
    }
    if (body) sections.push({ id: id.replace(":", "-"), title, body });
  }
  return (
    <div className="recruiter-site">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {preview && (
        <div className="preview-banner">
          Private draft preview · <a href="/admin">Return to editor</a>
        </div>
      )}
      <header className="recruiter-header">
        <div className="container">
          <NavigationMenu
            sections={sections.map(({ id, title }) => ({ id, title }))}
          />
        </div>
      </header>
      <main id="main">
        <section
          className={`container recruiter-hero ${!p.photoPath ? "no-portrait" : ""}`}
        >
          <div>
            <h1>{p.name}</h1>
            <p className="recruiter-role">{p.title}</p>
            {p.location && (
              <p className="recruiter-location">
                <MapPin size={16} aria-hidden="true" />
                {p.location}
              </p>
            )}
            {p.availability && (
              <p className="recruiter-availability">{p.availability}</p>
            )}
            <div className="hero-actions">
              <a className="button primary" href={resume}>
                <Download size={17} /> Download resume
              </a>
              <a className="recruiter-contact-link" href="#contact">
                Contact me
              </a>
            </div>
            <p className="recruiter-intro">{p.summary}</p>
            <div className="hero-socials">
              {p.github && <External href={p.github}>GitHub</External>}
              {p.linkedin && <External href={p.linkedin}>LinkedIn</External>}
            </div>
          </div>
          {p.photoPath && (
            <Portrait
              src={`${preview ? "/admin/profile-photo" : "/api/profile-photo"}?v=${encodeURIComponent(p.photoPath)}`}
              name={p.name}
            />
          )}
        </section>
        {sections.map((s) => (
          <section className="container recruiter-section" id={s.id} key={s.id}>
            <h2>{s.title}</h2>
            {s.body}
          </section>
        ))}
        <section
          className="container recruiter-section recruiter-contact"
          id="contact"
        >
          <h2>Contact me</h2>
          <p>
            Interested in discussing a role or project? I’d be happy to hear
            from you.
          </p>
          <a href={`mailto:${p.email}`}>{p.email}</a>
          {p.phone && (
            <a href={`tel:${p.phone.replace(/[^+\d]/g, "")}`}>{p.phone}</a>
          )}
          {(p.github || p.linkedin) && (
            <div className="recruiter-contact-socials">
              {p.github && <External href={p.github}>GitHub</External>}
              {p.github && p.linkedin && <span aria-hidden="true">·</span>}
              {p.linkedin && <External href={p.linkedin}>LinkedIn</External>}
            </div>
          )}
        </section>
      </main>
      <footer className="container recruiter-footer">
        <span>
          © {new Date().getUTCFullYear()} {p.name}
        </span>
        <a href="#main">Back to top ↑</a>
      </footer>
    </div>
  );
}
