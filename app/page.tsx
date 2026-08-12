import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { IndustrialSection } from "@/components/IndustrialSection";
import { Problem } from "@/components/Problem";
import { Transformation } from "@/components/Transformation";
import { Services } from "@/components/Services";
import { UseCases } from "@/components/UseCases";
import { InterfaceShowcase } from "@/components/InterfaceShowcase";
import { Differentiator } from "@/components/Differentiator";
import { ScopeClarity } from "@/components/ScopeClarity";
import { Process } from "@/components/Process";
import { Industries } from "@/components/Industries";
import { About } from "@/components/About";
import { Contact } from "@/components/Contact";
import { FinalCta } from "@/components/FinalCta";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <IndustrialSection />
        <Problem />
        <Transformation />
        <Services />
        <UseCases />
        <InterfaceShowcase />
        <Differentiator />
        <ScopeClarity />
        <Process />
        <Industries />
        <About />
        <Contact />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
