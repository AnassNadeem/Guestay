import { Amenities } from "@/components/home/Amenities";
import { GoogleReviews } from "@/components/home/GoogleReviews";
import { Hero } from "@/components/home/Hero";
import { LocateUs } from "@/components/home/LocateUs";
import { PromoStrip } from "@/components/home/PromoStrip";
import { RoomsPreview } from "@/components/home/RoomsPreview";
import { getRooms, getSiteContact } from "@/lib/mock";

export default async function HomePage() {
  const [contact, allRooms] = await Promise.all([
    getSiteContact(),
    getRooms(),
  ]);

  const featured = allRooms.filter((r) => r.featured).slice(0, 3);
  const previewRooms = featured.length > 0 ? featured : allRooms.slice(0, 3);
  const teaserRoom =
    allRooms.length > 3
      ? (allRooms.find((r) => !previewRooms.some((p) => p.id === r.id)) ??
        null)
      : null;

  return (
    <>
      <Hero />
      <PromoStrip />
      <RoomsPreview rooms={previewRooms} teaserRoom={teaserRoom} />
      <Amenities />
      <GoogleReviews />
      <LocateUs contact={contact} mapEmbedUrl={contact.mapEmbedUrl} nearby={[]} />
    </>
  );
}
