import { redirect } from "next/navigation";

/** App “More” menu removed — send visitors to About. */
export default function MorePage() {
  redirect("/about");
}
