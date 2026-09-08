import type { Metadata } from "next";
import { stub } from "@tando/copy";
import { StubPage } from "@/components/stub-page";

export const metadata: Metadata = {
  title: "Employés disponibles",
  description: stub.catalogue.body,
  alternates: { canonical: "/employes-virtuels" },
  robots: { index: false, follow: true },
};

export default function EmployesVirtuelsPage() {
  return <StubPage title={stub.catalogue.title} body={stub.catalogue.body} />;
}
