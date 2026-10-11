import type { Metadata } from "next";
import { getPublished } from "@/lib/data";
import { PortfolioView } from "@/components/portfolio-view";
export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const snapshot = await getPublished();
  if (!snapshot) return {};
  const { profile } = snapshot.content;
  return {
    title: { absolute: `${profile.name} | ${profile.title}` },
    description: profile.summary.slice(0, 155),
    openGraph: {
      title: `${profile.name} | ${profile.title}`,
      description: profile.summary.slice(0, 155),
      type: "profile",
    },
  };
}
export default async function Home() {
  const snapshot = await getPublished();
  if (!snapshot)
    return (
      <main className="state-page">
        <span className="eyebrow">Parikshit Abuj</span>
        <h1>A new chapter is taking shape.</h1>
        <p>The portfolio is being prepared. Please check back soon.</p>
        <a className="text-link" href="/admin">
          Owner sign in →
        </a>
      </main>
    );
  return <PortfolioView content={snapshot.content} />;
}
