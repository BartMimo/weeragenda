import { headers } from "next/headers";
import TopBar from "./components/TopBar";
import Generator from "./components/Generator";
import Instructions from "./components/Instructions";
import Features from "./components/Features";
import Footer from "./components/Footer";

export default function Home() {
  // Resolve our own origin so the generated iCal URLs match the
  // deployment they're being served from (preview, prod, localhost).
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "weeragenda.app";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const origin = `${proto}://${host}`;

  return (
    <>
      <TopBar />
      <Generator originUrl={origin} />
      <Instructions />
      <Features />
      <Footer />
    </>
  );
}
