import { Amenities } from "@/components/home/Amenities";
import { FeaturedRooms } from "@/components/home/FeaturedRooms";
import { Hero } from "@/components/home/Hero";
import { LivingBand } from "@/components/home/LivingBand";
import { PromoStrip } from "@/components/home/PromoStrip";
import { Testimonials } from "@/components/home/Testimonials";
import { getFeaturedRooms, getTestimonials } from "@/lib/mock";

export default async function HomePage() {
  const [rooms, testimonials] = await Promise.all([
    getFeaturedRooms(4),
    getTestimonials(),
  ]);

  return (
    <>
      <Hero />
      <PromoStrip />
      <FeaturedRooms rooms={rooms} />
      <LivingBand />
      <Amenities />
      <Testimonials items={testimonials} />
    </>
  );
}
