"use client";

import {
  Banknote,
  ChartColumn,
  FileText,
  House,
  Inbox,
  Landmark,
  LogOut,
  Receipt,
  Scale,
  Settings,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { currentUser } from "@/modules/access";
import { campaignLabel, useCatalogs } from "@/modules/catalogs";
import { useIntakeSummary } from "@/modules/intake";
import { Button, NavItem, NavSection, Sidebar, SidebarContext, SidebarUser } from "@/shared/ui";

export function AppSidebar() {
  const pathname = usePathname();
  const { drafts } = useIntakeSummary();
  const { campaigns, products, currentCampaignId, setCurrentCampaignId } = useCatalogs();
  const campaignOptions = campaigns
    .filter((campaign) => campaign.status === "open" || campaign.id === currentCampaignId)
    .map((campaign) => ({ value: campaign.id, label: campaignLabel(campaign, products) }));

  return (
    <Sidebar
      context={
        <SidebarContext
          label="Campaña"
          value={currentCampaignId}
          options={campaignOptions}
          onValueChange={setCurrentCampaignId}
          placeholder="Sin campaña abierta"
        />
      }
      footer={
        <SidebarUser
          name={currentUser.name}
          role={currentUser.role}
          action={
            <Button variant="ghost" size="sm" iconOnly aria-label="Cerrar sesión" disabled style={{ color: "var(--sidebar-fg)" }}>
              <LogOut aria-hidden />
            </Button>
          }
        />
      }
    >
      <NavSection>
        <NavItem href="/" icon={<House aria-hidden />} label="Inicio" active={pathname === "/"} />
        <NavItem href="#" icon={<Inbox aria-hidden />} label="Bandeja" disabled />
      </NavSection>
      <NavSection label="Recepción">
        <NavItem
          href="/boletas"
          icon={<Receipt aria-hidden />}
          label="Boletas"
          count={drafts || undefined}
          alert
          active={pathname.startsWith("/boletas")}
        />
        <NavItem
          href="/proveedores"
          icon={<Users aria-hidden />}
          label="Proveedores"
          active={pathname.startsWith("/proveedores")}
        />
        <NavItem href="#" icon={<FileText aria-hidden />} label="Documentos" disabled />
      </NavSection>
      <NavSection label="Compras">
        <NavItem href="#" icon={<Scale aria-hidden />} label="Liquidaciones" disabled />
        <NavItem href="#" icon={<Wallet aria-hidden />} label="Pagos" disabled />
      </NavSection>
      <NavSection label="Ventas">
        <NavItem href="#" icon={<Landmark aria-hidden />} label="Clientes" disabled />
        <NavItem href="#" icon={<Truck aria-hidden />} label="Despachos" disabled />
        <NavItem href="#" icon={<Banknote aria-hidden />} label="Cobros" disabled />
      </NavSection>
      <NavSection label="Análisis">
        <NavItem href="#" icon={<ChartColumn aria-hidden />} label="Reportes" disabled />
        <NavItem
          href="/configuracion"
          icon={<Settings aria-hidden />}
          label="Configuración"
          active={pathname.startsWith("/configuracion")}
        />
      </NavSection>
    </Sidebar>
  );
}
