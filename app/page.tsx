import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { Services } from "@/components/Services";
import { CaseStudy } from "@/components/CaseStudy";
import { BrandStory } from "@/components/BrandStory";
import { Process } from "@/components/Process";
import { Contact } from "@/components/Contact";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Services />
        <CaseStudy />
        <BrandStory />
        <Process />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
