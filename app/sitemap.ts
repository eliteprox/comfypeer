import type { MetadataRoute } from "next";
import { SITE } from "@/lib/constants";

const MARKETING_PATHS = ["/", "/docs", "/pricing", "/pipelines", "/agents", "/network", "/changelog"];

export default function sitemap(): MetadataRoute.Sitemap {
  const updated = new Date();
  return MARKETING_PATHS.map((pathname) => ({
    url: new URL(pathname, SITE.url).toString(),
    lastModified: updated,
  }));
}
