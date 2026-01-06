/**
 * SEO Schema.org structured data helpers
 * Generates JSON-LD markup for Google Search Console sitelinks and rich snippets
 */

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface SiteLink {
  url: string;
  name: string;
}

/**
 * Organization Schema - Appears in branded searches
 * Includes company info, logos, social profiles, and contact details
 */
export const getOrganizationSchema = (baseUrl: string) => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${baseUrl}/#organization`,
  name: "Blinno",
  alternateName: "Blinno Marketplace",
  description: "The Everything Marketplace - Sell products, e-books, courses, creative works, and services",
  url: baseUrl,
  logo: {
    "@type": "ImageObject",
    url: `${baseUrl}/favicon.png`,
    width: 512,
    height: 512,
  },
  image: `${baseUrl}/favicon.png`,
  sameAs: [
    "https://twitter.com/blinno",
    "https://facebook.com/blinno",
    "https://instagram.com/blinno",
    "https://linkedin.com/company/blinno",
  ],
  contact: {
    "@type": "ContactPoint",
    contactType: "Customer Service",
    email: "support@blinno.app",
    url: `${baseUrl}/contact`,
  },
  foundingDate: "2025-01-01",
  headquarterRegion: "TZ",
  areaServed: [
    {
      "@type": "Country",
      name: "Tanzania",
    },
    {
      "@type": "Country",
      name: "Kenya",
    },
    {
      "@type": "Country",
      name: "Uganda",
    },
    {
      "@type": "Country",
      name: "Rwanda",
    },
  ],
});

/**
 * Website Schema - For sitelinks in Google Search results
 * Includes potential actions and SearchAction
 */
export const getWebsiteSchema = (baseUrl: string) => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${baseUrl}/#website`,
  url: baseUrl,
  name: "Blinno",
  description: "The Everything Marketplace",
  publisher: {
    "@id": `${baseUrl}/#organization`,
  },
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${baseUrl}/search?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
  // Sitelinks - Key pages Google should show in search results
  sitelinks: [
    {
      "@type": "WebPage",
      url: `${baseUrl}/products`,
      name: "Browse Products",
      description: "Shop from thousands of products",
    },
    {
      "@type": "WebPage",
      url: `${baseUrl}/seller-onboarding`,
      name: "Start Selling",
      description: "Become a seller and start your business",
    },
    {
      "@type": "WebPage",
      url: `${baseUrl}/help`,
      name: "Help & Support",
      description: "Get help and support",
    },
    {
      "@type": "WebPage",
      url: `${baseUrl}/about`,
      name: "About Us",
      description: "Learn about Blinno",
    },
  ],
});

/**
 * Breadcrumb Schema - Helps with navigation clarity and SERP display
 */
export const getBreadcrumbSchema = (items: BreadcrumbItem[], baseUrl: string) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: item.url.startsWith("http") ? item.url : `${baseUrl}${item.url}`,
  })),
});

/**
 * Product Schema - For individual product pages
 */
export const getProductSchema = (product: {
  id: string;
  title: string;
  description?: string;
  price: number;
  currency: string;
  images?: string[];
  rating?: number;
  reviewCount?: number;
}, baseUrl: string) => ({
  "@context": "https://schema.org",
  "@type": "Product",
  "@id": `${baseUrl}/product/${product.id}`,
  name: product.title,
  description: product.description || product.title,
  url: `${baseUrl}/product/${product.id}`,
  image: product.images && product.images.length > 0 
    ? product.images.map(img => img.startsWith("http") ? img : `${baseUrl}${img}`)
    : [`${baseUrl}/placeholder.svg`],
  offers: {
    "@type": "Offer",
    price: product.price.toString(),
    priceCurrency: product.currency,
    availability: "https://schema.org/InStock",
  },
  ...(product.rating && product.reviewCount && {
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: product.rating.toString(),
      reviewCount: product.reviewCount.toString(),
    },
  }),
});

/**
 * FAQPage Schema - For FAQ pages
 */
export const getFAQSchema = (faqs: Array<{ question: string; answer: string }>) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map(faq => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
});

/**
 * Insert schema.org JSON-LD into document head
 */
export const injectSchemaMarkup = (schema: object) => {
  if (typeof document === "undefined") return;

  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(schema);
  document.head.appendChild(script);
};

/**
 * Get all organization-related schemas combined
 */
export const getFullOrganizationMarkup = (baseUrl: string) => [
  getOrganizationSchema(baseUrl),
  getWebsiteSchema(baseUrl),
];
