import { Amenities } from "@/components/home/Amenities";
import { GoogleReviews } from "@/components/home/GoogleReviews";
import { Hero } from "@/components/home/Hero";
import { LocateUs } from "@/components/home/LocateUs";
import { PromoStrip } from "@/components/home/PromoStrip";
import { RoomsCircularGallery } from "@/components/home/RoomsCircularGallery";
import { getSiteContact, getTestimonials } from "@/lib/mock";

export default async function HomePage() {
  const [testimonials, contact] = await Promise.all([
    getTestimonials(),
    getSiteContact(),
  ]);

  return (
    <>
      <Hero />
      <PromoStrip />
      <RoomsCircularGallery />
      <Amenities />
      <GoogleReviews items={testimonials} />
      <LocateUs contact={contact} />
    </>
  );
}
