import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import { StatsSection } from "@/components/StatsSection";
import { CategoriesSection } from "@/components/CategoriesSection";
import { FeaturedProductsSection } from "@/components/FeaturedProductsSection";
import { CustomerReviewsSection } from "@/components/CustomerReviewsSection";
import { CTASection } from "@/components/CTASection";
import { Footer } from "@/components/Footer";
import NewsletterSignup from "@/components/NewsletterSignup";
import { OnboardingTour, useOnboardingTour } from "@/components/OnboardingTour";
import { useAuth } from "@/hooks/useAuth";
import { getAuthRedirectPath } from "@/lib/authRedirect";

const Index = () => {
  const { showTour, closeTour, completeTour } = useOnboardingTour();
  const { user, loading, roles } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect authenticated users to their dashboard
  useEffect(() => {
    if (!loading && user) {
      const redirectPath = getAuthRedirectPath(roles);
      // Only redirect if we're on the landing page (not if user explicitly navigated here)
      if (location.pathname === "/") {
        navigate(redirectPath, { replace: true });
      }
    }
  }, [user, loading, roles, navigate, location.pathname]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        {/* Hero - Product Search Focus */}
        <HeroSection />
        
        {/* Categories - Quick Navigation */}
        <CategoriesSection />
        
        {/* Featured Products - Shop Now */}
        <FeaturedProductsSection />
        
        {/* Trust Indicators */}
        <StatsSection />
        
        {/* Customer Reviews - Social Proof */}
        <CustomerReviewsSection />
        
        {/* Newsletter */}
        <section className="py-16 px-4 md:px-8 lg:px-16 max-w-7xl mx-auto">
          <NewsletterSignup />
        </section>
        
        {/* Seller CTA */}
        <CTASection />
      </main>
      <Footer />
      <OnboardingTour isOpen={showTour} onClose={closeTour} onComplete={completeTour} />
    </div>
  );
};

export default Index;
