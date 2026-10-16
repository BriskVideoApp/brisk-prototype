import { redirect } from "next/navigation";

export default function StudioTeamAccessRoute() {
  redirect("/people?view=Studio%20Staff");
}
