import BgCanvas from './components/BgCanvas.jsx';
import Nav from './components/Nav.jsx';
import Hero from './components/Hero.jsx';
import Problem from './components/Problem.jsx';
import Detector from './components/Detector.jsx';
import MetricsExplained from './components/MetricsExplained.jsx';
import HowItWorks from './components/HowItWorks.jsx';
import Cases from './components/Cases.jsx';
import CTA from './components/CTA.jsx';
import Footer from './components/Footer.jsx';
import { useReveal } from './hooks/useReveal.js';

export default function App() {
  // Reveal-on-scroll for the same selectors as the original site.
  useReveal('.section-head, .card, .explain-card, .step, .case, .cta-box, .detector');

  return (
    <>
      <BgCanvas />
      <Nav />
      <Hero />
      <Problem />
      <Detector />
      <MetricsExplained />
      <HowItWorks />
      <Cases />
      <CTA />
      <Footer />
    </>
  );
}
