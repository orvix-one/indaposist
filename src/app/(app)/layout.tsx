import { Bell, CircleHelp } from "lucide-react";
import type { ReactNode } from "react";
import { CatalogsProvider } from "@/modules/catalogs";
import { IntakeProvider, SuppliersProvider } from "@/modules/intake";
import { AppShell, Button, SearchInput, Topbar } from "@/shared/ui";
import { AppSidebar } from "./app-sidebar";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <CatalogsProvider>
      <SuppliersProvider>
        <IntakeProvider>
          <AppShell
            sidebar={<AppSidebar />}
            topbar={
              <Topbar
                start={<SearchInput placeholder="Búsqueda global (pronto)" aria-label="Búsqueda global" disabled style={{ width: 380 }} />}
                end={
                  <>
                    <Button variant="ghost" iconOnly aria-label="Ayuda" disabled>
                      <CircleHelp aria-hidden />
                    </Button>
                    <Button variant="ghost" iconOnly aria-label="Notificaciones" disabled>
                      <Bell aria-hidden />
                    </Button>
                  </>
                }
              />
            }
          >
            {children}
          </AppShell>
        </IntakeProvider>
      </SuppliersProvider>
    </CatalogsProvider>
  );
}
