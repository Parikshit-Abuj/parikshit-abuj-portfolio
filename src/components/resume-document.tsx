import { Document, Page, Text, View, Link, StyleSheet } from "@react-pdf/renderer";
import { educationPeriod, experiencePeriod, publicContent, type PortfolioContent } from "@/lib/portfolio";

const styles = StyleSheet.create({
  page: { paddingTop: 35, paddingBottom: 48, paddingHorizontal: 38, fontFamily: "Helvetica", fontSize: 9, color: "#233448", lineHeight: 1.48 },
  header: { backgroundColor: "#152d46", color: "#ffffff", padding: 17, marginBottom: 5 },
  name: { fontSize: 18, fontFamily: "Helvetica-Bold", lineHeight: 1.25 },
  role: { fontSize: 10, color: "#d2dde8", marginTop: 5 },
  contacts: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginTop: 9, fontSize: 8 },
  contact: { color: "#ffffff", textDecoration: "none" },
  section: { marginTop: 12 },
  sectionTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#152d46", borderBottomWidth: 0.6, borderBottomColor: "#cbd7e2", paddingBottom: 4, marginBottom: 6, letterSpacing: 0.5 },
  entry: { marginBottom: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  title: { fontSize: 9.5, fontFamily: "Helvetica-Bold", flexShrink: 1 },
  date: { fontSize: 8, color: "#607184", flexShrink: 0 },
  subtitle: { color: "#3e637f", fontSize: 8.5, marginTop: 2 },
  body: { marginTop: 3 },
  bullet: { flexDirection: "row", marginTop: 2, paddingLeft: 3 },
  bulletDot: { width: 10, fontSize: 9 },
  bulletText: { flex: 1 },
  skillRow: { marginBottom: 3 },
  bold: { fontFamily: "Helvetica-Bold" },
  link: { color: "#325d7c", fontSize: 8, textDecoration: "underline" },
  links: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 3 },
  tech: { color: "#607184", fontSize: 8, marginTop: 3 },
  footer: { position: "absolute", left: 38, right: 38, bottom: 24, borderTopWidth: 0.5, borderTopColor: "#d7e0e7", paddingTop: 6, flexDirection: "row", justifyContent: "space-between", color: "#7a8897", fontSize: 7 },
});
function Heading({ children }: { children: string }) { return <Text style={styles.sectionTitle} minPresenceAhead={35}>{children}</Text>; }
function Bullets({ items }: { items: string[] }) { return <>{items.map((item, index) => <View style={styles.bullet} key={index}><Text style={styles.bulletDot}>•</Text><Text style={styles.bulletText} orphans={2} widows={2}>{item}</Text></View>)}</>; }

export function ResumeDocument({ content }: { content: PortfolioContent }) {
  const data = publicContent(content);
  const p = data.profile;
  return <Document title={`${p.name} - Resume`} author={p.name} subject={`${p.title} - experience, projects, and skills`} language="en"><Page size="A4" style={styles.page} wrap>
    <View style={styles.header} wrap={false}><Text style={styles.name}>{p.name.toUpperCase()}</Text><Text style={styles.role}>{p.title}</Text><View style={styles.contacts}><Link style={styles.contact} src={`mailto:${p.email}`}>{p.email}</Link>{p.phone && <Link style={styles.contact} src={`tel:${p.phone.replace(/[^+\d]/g, "")}`}>{p.phone}</Link>}{p.linkedin && <Link style={styles.contact} src={p.linkedin}>LinkedIn</Link>}{p.github && <Link style={styles.contact} src={p.github}>GitHub</Link>}{p.location && <Text>{p.location}</Text>}</View></View>
    <View style={styles.section}><Heading>PROFESSIONAL SUMMARY</Heading><Text orphans={2} widows={2}>{p.summary}</Text></View>
    {data.skillGroups.length > 0 && <View style={styles.section}><Heading>TECHNICAL SKILLS</Heading>{data.skillGroups.map((entry) => <Text key={entry.id} style={styles.skillRow}><Text style={styles.bold}>{entry.name}: </Text>{entry.skills.join(", ")}</Text>)}</View>}
    {data.experiences.length > 0 && <View style={styles.section}><Heading>EXPERIENCE</Heading>{data.experiences.map((entry) => <View style={styles.entry} key={entry.id}><View style={styles.row} wrap={false} minPresenceAhead={30}><Text style={styles.title}>{entry.company}</Text><Text style={styles.date}>{experiencePeriod(entry)}</Text></View><Text style={styles.subtitle}>{entry.role}{entry.location ? ` | ${entry.location}` : ""}</Text><Bullets items={entry.bullets} /></View>)}</View>}
    {data.projects.length > 0 && <View style={styles.section}><Heading>PROJECTS</Heading>{data.projects.map((entry) => <View style={styles.entry} key={entry.id}><View style={styles.row} wrap={false} minPresenceAhead={35}><Text style={styles.title}>{entry.name}</Text>{entry.status && <Text style={styles.date}>{entry.status}</Text>}</View>{(entry.demoUrl || entry.githubUrl) && <View style={styles.links}>{entry.demoUrl && <Link style={styles.link} src={entry.demoUrl}>Live demo</Link>}{entry.githubUrl && <Link style={styles.link} src={entry.githubUrl}>GitHub / Source</Link>}</View>}<Text style={styles.body} orphans={2} widows={2}>{entry.summary}</Text><Bullets items={entry.bullets} />{entry.technologies.length > 0 && <Text style={styles.tech}>Technologies: {entry.technologies.join(", ")}</Text>}</View>)}</View>}
    {data.education.length > 0 && <View style={styles.section}><Heading>EDUCATION</Heading>{data.education.map((entry) => <View style={styles.entry} key={entry.id} wrap={false}><View style={styles.row}><Text style={styles.title}>{entry.qualification}</Text><Text style={styles.date}>{educationPeriod(entry)}</Text></View><Text style={styles.subtitle}>{entry.institution}</Text></View>)}</View>}
    {data.certifications.length > 0 && <View style={styles.section}><Heading>CERTIFICATIONS</Heading>{data.certifications.map((entry) => <View style={styles.entry} key={entry.id} wrap={false}><Text><Text style={styles.bold}>{entry.name}</Text>{entry.issuer ? ` - ${entry.issuer}` : ""}{entry.year ? ` (${entry.year})` : ""}</Text>{entry.url && <Link style={styles.link} src={entry.url}>View certificate</Link>}</View>)}</View>}
    {data.languages.length > 0 && <View style={styles.section}><Heading>LANGUAGES</Heading><Text>{data.languages.map((entry) => entry.name).join(", ")}</Text></View>}
    <View style={styles.footer} fixed><Text>{p.name}</Text><Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} /></View>
  </Page></Document>;
}
