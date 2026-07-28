import { redirect } from "next/navigation";

/** Promotions live only in the PromoPopout — no standalone page. */
export default function PromotionsRedirect() {
  redirect("/rooms");
}
