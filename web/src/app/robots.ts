import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Keep logged-in app pages and admin out of search results
        disallow: ["/app/", "/admin/"],
      },
    ],
    sitemap: "https://sardinewatch.co.za/sitemap.xml",
  };
}
