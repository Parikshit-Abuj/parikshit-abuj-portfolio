import {
  Document,
  Page,
  Text,
  View,
  Link,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  educationPeriod,
  experiencePeriod,
  publicContent,
  sectionOrder,
  academicResult,
  projectPeriod,
  type PortfolioContent,
} from "@/lib/portfolio";
Font.registerHyphenationCallback((word) => [word]);
function urlText(value: string) {
  const text = value.replace(/^https?:\/\//, "");
  // Explicit line breaks preserve every URL character without adding hyphens.
  return text.length > 110 ? text.match(/.{1,50}/g)!.join("\n") : text;
}
const styles = StyleSheet.create({
  page: {
    paddingTop: 45.35,
    paddingBottom: 45.35,
    paddingHorizontal: 45.35,
    fontFamily: "Times-Roman",
    fontSize: 11,
    color: "#000000",
    lineHeight: 1.2,
  },
  identity: { marginBottom: 4, textAlign: "center" },
  name: { fontFamily: "Times-Bold", fontSize: 22, lineHeight: 1.2 },
  contacts: { marginTop: 4, fontSize: 10 },
  link: { color: "#000000", textDecoration: "underline" },
  section: { marginTop: 11 },
  heading: {
    fontFamily: "Times-Bold",
    fontSize: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#000000",
    paddingBottom: 2,
    marginBottom: 5,
  },
  entry: { marginBottom: 7 },
  title: { fontFamily: "Times-Bold" },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  rowTitle: { flexGrow: 1, flexShrink: 1 },
  date: { fontSize: 11, textAlign: "right", maxWidth: 130, flexShrink: 0 },
  subtitle: { fontFamily: "Times-Italic", marginTop: 1 },
  meta: { fontSize: 10, marginTop: 2 },
  body: { marginTop: 3 },
  bulletRow: { flexDirection: "row", marginTop: 2 },
  bulletMark: { width: 10 },
  bulletText: { flex: 1 },
});
function Bullets({ items }: { items: string[] }) {
  return (
    <>
      {items.map((text, i) => (
        <View key={i} style={styles.bulletRow}>
          <Text style={styles.bulletMark}>•</Text>
          <Text style={styles.bulletText} orphans={2} widows={2}>
            {text}
          </Text>
        </View>
      ))}
    </>
  );
}
function EntryHeading({ title, date }: { title: string; date?: string }) {
  return (
    <View style={styles.row} wrap={false}>
      <Text style={[styles.title, styles.rowTitle]}>{title}</Text>
      {date && <Text style={styles.date}>{date}</Text>}
    </View>
  );
}
function EntrySubtitle({ title, side }: { title: string; side?: string }) {
  return (
    <View style={[styles.row, styles.subtitle]} wrap={false}>
      <Text style={styles.rowTitle}>{title}</Text>
      {side && <Text style={styles.date}>{side}</Text>}
    </View>
  );
}
function Heading({ children }: { children: string }) {
  return (
    <Text style={styles.heading} minPresenceAhead={55}>
      {children}
    </Text>
  );
}
export function ResumeDocument({ content }: { content: PortfolioContent }) {
  const data = publicContent(content),
    p = data.profile;
  function section(id: string) {
    let title = "",
      body: React.ReactNode = null;
    if (id === "summary") {
      title = "Summary";
      body = (
        <Text orphans={2} widows={2}>
          {p.summary}
        </Text>
      );
    }
    if (id === "skillGroups" && data.skillGroups.length) {
      title = "Technical Skills";
      body = data.skillGroups.map((e) =>
        e.skills.join(", ").length > 500 ? (
          <View key={e.id} style={styles.body}>
            <Text style={styles.title} minPresenceAhead={30}>
              {e.name}
            </Text>
            <Text orphans={2} widows={2}>
              {e.skills.join(", ")}
            </Text>
          </View>
        ) : (
          <Text key={e.id} style={styles.body}>
            <Text style={styles.title}>{e.name}: </Text>
            {e.skills.join(", ")}
          </Text>
        ),
      );
    }
    if (id === "education" && data.education.length) {
      title = "Education";
      body = data.education.map((e) => (
        <View key={e.id} style={styles.entry}>
          <View wrap={false}>
            <EntryHeading title={e.institution} date={educationPeriod(e)} />
            <EntrySubtitle title={e.qualification} side={e.location} />
            {[e.board, academicResult(e)].filter(Boolean).length > 0 && (
              <Text style={styles.meta}>
                {[e.board, academicResult(e)].filter(Boolean).join(" | ")}
              </Text>
            )}
          </View>
          <Bullets items={e.highlights || []} />
        </View>
      ));
    }
    if (id === "experiences" && data.experiences.length) {
      title = "Experience";
      body = data.experiences.map((e) => (
        <View key={e.id} style={styles.entry}>
          <View wrap={false} minPresenceAhead={28}>
            <EntryHeading title={e.company} date={experiencePeriod(e)} />
            <EntrySubtitle title={e.role} side={e.location} />
          </View>
          <Bullets items={e.bullets} />
        </View>
      ));
    }
    if (id === "projects" && data.projects.length) {
      title = "Projects";
      body = data.projects.map((e) => (
        <View
          key={e.id}
          style={styles.entry}
          wrap={
            [
              e.name,
              e.technologies.join(", "),
              e.summary,
              ...e.bullets,
              e.githubUrl,
              e.demoUrl,
            ].join(" ").length > 1400 || e.bullets.length > 10
          }
        >
          <View wrap={false} minPresenceAhead={28}>
            <EntryHeading title={e.name} date={projectPeriod(e)} />
            <Text style={styles.subtitle}>{e.technologies.join(", ")}</Text>
          </View>
          <Text style={styles.body} orphans={2} widows={2}>
            {e.summary}
          </Text>
          <Bullets items={e.bullets} />
          {e.githubUrl && (
            <Text style={styles.meta}>
              <Link style={styles.link} src={e.githubUrl}>
                {urlText(e.githubUrl)}
              </Link>
            </Text>
          )}
          {e.demoUrl && (
            <Text style={styles.meta}>
              <Link style={styles.link} src={e.demoUrl}>
                {urlText(e.demoUrl)}
              </Link>
            </Text>
          )}
        </View>
      ));
    }
    if (id === "certifications" && data.certifications.length) {
      title = "Certifications";
      body = data.certifications.map((e) => (
        <View key={e.id} style={styles.entry} wrap={false}>
          <View style={styles.row}>
            <Text style={[styles.title, styles.rowTitle]}>
              {e.url ? (
                <Link style={styles.link} src={e.url}>
                  {e.name}
                </Link>
              ) : (
                e.name
              )}
            </Text>
            {e.year && <Text style={styles.date}>{e.year}</Text>}
          </View>
          <Text style={styles.meta}>
            {[
              e.issuer,
              e.credentialId ? `Credential ID: ${e.credentialId}` : "",
            ]
              .filter(Boolean)
              .join(" | ")}
          </Text>
        </View>
      ));
    }
    if (id === "languages" && data.languages.length) {
      title = "Languages";
      body = (
        <Text>
          {data.languages
            .map((e) =>
              e.proficiency ? `${e.name}: ${e.proficiency}` : e.name,
            )
            .join(" | ")}
        </Text>
      );
    }
    if (id.startsWith("custom:")) {
      const s = data.customSections?.find((s) => `custom:${s.id}` === id);
      if (s?.showOnResume && s.entries.length) {
        title = s.title;
        body = s.entries.map((e) => (
          <View key={e.id} style={styles.entry}>
            <View wrap={false} minPresenceAhead={28}>
              <EntryHeading title={e.title} date={e.date} />
              {e.organization && (
                <Text style={styles.meta}>{e.organization}</Text>
              )}
            </View>
            {e.description && (
              <Text style={styles.body} orphans={2} widows={2}>
                {e.description}
              </Text>
            )}
            <Bullets items={e.bullets} />
            {e.url && (
              <Text style={styles.meta}>
                <Link style={styles.link} src={e.url}>
                  {urlText(e.url)}
                </Link>
              </Text>
            )}
          </View>
        ));
      }
    }
    if (!body) return null;
    const blocks = Children.toArray(body);
    const first = blocks[0] as ReactElement<{
      children?: ReactNode;
      wrap?: boolean;
    }>;
    const nested =
      isValidElement(first) && first.type === View && first.props.wrap !== false
        ? Children.toArray(first.props.children)
        : [];
    // Keep the section heading with the first entry's title block. The remaining
    // description/bullets can wrap freely, even for entries longer than a page.
    const lead = nested.length ? nested[0] : first;
    const tail = nested.length
      ? cloneElement(first, {}, nested.slice(1))
      : null;
    return (
      <View key={id} style={styles.section}>
        <View wrap={false} minPresenceAhead={28}>
          <Heading>{title}</Heading>
          {lead}
        </View>
        {tail}
        {blocks.slice(1)}
      </View>
    );
  }
  return (
    <Document title={`${p.name} - Resume`} author={p.name} language="en">
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.identity} wrap={false}>
          <Text style={styles.name}>{p.name}</Text>
          <Text style={styles.contacts}>
            {p.phone && (
              <>
                <Link style={styles.link} src={`tel:${p.phone}`}>
                  {p.phone}
                </Link>
                {" | "}
              </>
            )}
            <Link style={styles.link} src={`mailto:${p.email}`}>
              {p.email}
            </Link>
            {p.linkedin && (
              <>
                {" | "}
                <Link style={styles.link} src={p.linkedin}>
                  LinkedIn
                </Link>
              </>
            )}
            {p.github && (
              <>
                {" | "}
                <Link style={styles.link} src={p.github}>
                  GitHub
                </Link>
              </>
            )}
            {p.location ? ` | ${p.location}` : ""}
          </Text>
        </View>
        {sectionOrder(data, "resume").map(section)}
      </Page>
    </Document>
  );
}
