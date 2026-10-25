import type { Metadata } from "next";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import Footer from "@/components/Footer";
import content from "@/content";

export const metadata: Metadata = {
  title: `${content.appName} — ${content.appTagline}`,
  description: content.appDescription,
};

export default function Home() {
  return (
    <>
      <Header />
      <main id="main">
        <Hero />
        <HowItWorks />
      </main>
      <Footer />
    </>
  );
}
