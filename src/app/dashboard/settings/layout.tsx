import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Configurações - O Inspetor",
  description: "Configurações do sistema O Inspetor",
};

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}