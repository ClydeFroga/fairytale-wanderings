import type { IAboutPage, ISellerInfo } from "@global/database/shema";
import type { AboutPageData } from "@global/database/methods/aboutPage";
import type { SellerInfoData } from "@global/database/methods/sellerInfo";
import type { AboutForm } from "./validator";

/** Ответ GET/PATCH /content/about: служебные id и updated_at наружу не отдаём. */
export type AboutResponse = { about: AboutPageData; seller: SellerInfoData };

// Строк может ещё не быть (страницу не сохраняли) — тогда всё пустое.
export function toAboutResponse(about: IAboutPage | null, seller: ISellerInfo | null): AboutResponse {
  return {
    about: {
      title: about?.title ?? "",
      body: about?.body ?? "",
      images: about?.images ?? [],
    },
    seller: {
      fullName: seller?.fullName ?? "",
      inn: seller?.inn ?? "",
      phone: seller?.phone ?? "",
      email: seller?.email ?? "",
      links: seller?.links ?? [],
    },
  };
}

export function sellerFromForm(form: AboutForm): SellerInfoData {
  return {
    fullName: form.fullName,
    inn: form.inn,
    phone: form.phone,
    email: form.email,
    links: form.links,
  };
}
