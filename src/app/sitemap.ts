import type { MetadataRoute } from "next";
import { getRooms } from "@/lib/mock";
import { SITE_ORIGIN } from "@/lib/seo/site";

/** Always render at request time so Supabase room inventory stays current. */
export const dynamic = "force-dynamic";

/**
 * Dynamic sitemap — rooms pulled live (Supabase via getRooms).
 * Excludes checkout, account, admin, login, set-password, API routes.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const rooms = await getRooms({ status: "active" });

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_ORIGIN,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_ORIGIN}/rooms`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.95,
    },
    {
      url: `${SITE_ORIGIN}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_ORIGIN}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_ORIGIN}/request-quote`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.65,
    },
    {
      url: `${SITE_ORIGIN}/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${SITE_ORIGIN}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${SITE_ORIGIN}/cancellation`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];

  const roomPages: MetadataRoute.Sitemap = rooms.map((room) => ({
    url: `${SITE_ORIGIN}/rooms/${room.slug}`,
    lastModified: room.updatedAt ? new Date(room.updatedAt) : new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.85,
  }));

  return [...staticPages, ...roomPages];
}
