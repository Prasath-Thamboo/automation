import type { Metadata } from "next";
import { stub } from "@tando/copy";
import { StubPage } from "@/components/stub-page";

export const metadata: Metadata = {
  title: "Parler à un humain",
  description: stub.contact.body,
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return <StubPage title={stub.contact.title} body={stub.contact.body} />;
}
