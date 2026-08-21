import { Suspense } from "react";
import { PeoplePage } from "@/components/people/PeoplePage";

export default function PeopleRoute() {
  return <Suspense fallback={null}><PeoplePage /></Suspense>;
}
