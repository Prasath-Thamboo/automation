import { Hero } from "@/components/landing/hero";
import { Problem } from "@/components/landing/problem";
import { Solution } from "@/components/landing/solution";
import { Pocket } from "@/components/landing/pocket";
import { TwoPaths } from "@/components/landing/two-paths";
import { Reassurance } from "@/components/landing/reassurance";
import { FinalCta } from "@/components/landing/final-cta";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Problem />
      <Solution />
      <Pocket />
      <TwoPaths />
      <Reassurance />
      <FinalCta />
    </>
  );
}
