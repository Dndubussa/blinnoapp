import { useEffect } from "react";
import { 
  getOrganizationSchema, 
  getWebsiteSchema, 
  injectSchemaMarkup 
} from "@/lib/seoSchema";

/**
 * SEO Schema Component - Injects organization and website structured data
 * This helps Google understand your brand and show sitelinks in search results
 */
export function SEOSchema() {
  useEffect(() => {
    const baseUrl = window.location.origin;

    // Inject Organization schema
    injectSchemaMarkup(getOrganizationSchema(baseUrl));

    // Inject Website schema with sitelinks
    injectSchemaMarkup(getWebsiteSchema(baseUrl));
  }, []);

  return null;
}
