import { getDraft } from "@/lib/data";
import { PortfolioView } from "@/components/portfolio-view";
export default async function Preview() {
  return <PortfolioView content={(await getDraft()).content} preview />;
}
