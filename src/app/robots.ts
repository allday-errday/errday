import type { MetadataRoute } from "next";

// Errday is a private, single-user app — keep it out of search engines.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
