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
  type PortfolioContent,
} from "@/lib/portfolio";
Font.registerHyphenationCallback((word) => [word]);
const styles = StyleSheet.create({
  page: {
    paddingTop: 42.5,
    paddingBottom: 52,
    paddingHorizontal: 42.5,
    fontFamily: "Helvetica",
    fontSize: 11,
    color: "#000000",
    lineHeight: 1.35,
  },
  identity: { marginBottom: 6 },
  name: { fontFamily: "Helvetica-Bold", fontSize: 20 },
  role: { marginTop: 4 },
  contacts: { marginTop: 5, fontSize: 10 },
  link: { color: "#000000", textDecoration: "underline" },
  section: { marginTop: 14 },
  heading: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#bbbbbb",
    paddingBottom: 4,
    marginBottom: 7,
  },
  entry: { marginBottom: 9 },
  title: { fontFamily: "Helvetica-Bold" },
  meta: { fontSize: 10, marginTop: 2 },
  body: { marginTop: 3 },
  bullet: { marginTop: 3, paddingLeft: 10 },
});
function Bullets({ items }: { items: string[] }) {
  return (
    <>
      {items.map((text, i) => (
        <Text key={i} style={styles.bullet} orphans={2} widows={2}>
          - {text}
        </Text>
      ))}
    </>
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
      title = "Professional Summary";
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
        <View key={e.id} style={styles.entry} wrap={false}>
          <Text style={styles.title}>{e.qualification}</Text>
          <Text>{e.institution}</Text>
          <Text style={styles.meta}>{educationPeriod(e)}</Text>
        </View>
      ));
    }
    if (id === "experiences" && data.experiences.length) {
      title = "Experience";
      body = data.experiences.map((e) => (
        <View key={e.id} style={styles.entry}>
          <View wrap={false}>
            <Text style={styles.title}>{e.role}</Text>
            <Text>{e.company}</Text>
            <Text style={styles.meta}>
              {[experiencePeriod(e), e.location].filter(Boolean).join(" | ")}
            </Text>
          </View>
          <Bullets items={e.bullets} />
        </View>
      ));
    }
    if (id === "projects" && data.projects.length) {
      title = "Projects";
      body = data.projects.map((e) => (
        <View key={e.id} style={styles.entry}>
          <View wrap={false}>
            <Text style={styles.title}>
              {e.name}
              {e.status ? ` | ${e.status}` : ""}
            </Text>
            <Text style={styles.meta}>{e.technologies.join(", ")}</Text>
          </View>
          <Text style={styles.body} orphans={2} widows={2}>
            {e.summary}
          </Text>
          <Bullets items={e.bullets} />
          {e.githubUrl && (
            <Text style={styles.meta}>
              <Link style={styles.link} src={e.githubUrl}>
                {e.githubUrl.replace(/^https?:\/\//, "")}
              </Link>
            </Text>
          )}
          {e.demoUrl && (
            <Text style={styles.meta}>
              <Link style={styles.link} src={e.demoUrl}>
                {e.demoUrl.replace(/^https?:\/\//, "")}
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
          <Text style={styles.title}>
            {e.url ? (
              <Link style={styles.link} src={e.url}>
                {e.name}
              </Link>
            ) : (
              e.name
            )}
          </Text>
          <Text style={styles.meta}>
            {[e.issuer, e.year].filter(Boolean).join(" | ")}
          </Text>
        </View>
      ));
    }
    if (id === "languages" && data.languages.length) {
      title = "Languages";
      body = <Text>{data.languages.map((e) => e.name).join(", ")}</Text>;
    }
    if (id.startsWith("custom:")) {
      const s = data.customSections?.find((s) => `custom:${s.id}` === id);
      if (s?.showOnResume && s.entries.length) {
        title = s.title;
        body = s.entries.map((e) => (
          <View key={e.id} style={styles.entry}>
            <View wrap={false}>
              <Text style={styles.title}>{e.title}</Text>
              {(e.organization || e.date) && (
                <Text style={styles.meta}>
                  {[e.organization, e.date].filter(Boolean).join(" | ")}
                </Text>
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
                  {e.url.replace(/^https?:\/\//, "")}
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
        <View wrap={false}>
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
          <Text style={styles.role}>{p.title}</Text>
          <Text style={styles.contacts}>
            <Link style={styles.link} src={`mailto:${p.email}`}>
              {p.email}
            </Link>
            {p.phone ? ` | ${p.phone}` : ""}
            {p.location ? ` | ${p.location}` : ""}
          </Text>
          {p.linkedin && (
            <Text style={styles.contacts}>
              <Link style={styles.link} src={p.linkedin}>
                {p.linkedin.replace(/^https?:\/\//, "")}
              </Link>
            </Text>
          )}
          {p.github && (
            <Text style={styles.contacts}>
              <Link style={styles.link} src={p.github}>
                {p.github.replace(/^https?:\/\//, "")}
              </Link>
            </Text>
          )}
        </View>
        {sectionOrder(data, "resume").map(section)}
      </Page>
    </Document>
  );
}
