import { Plus } from "lucide-react";
import { Button, PageHeader, Tabs } from "@/shared/ui";
import type { CatalogKind } from "../domain/types";
import { CATALOG_ORDER, catalogLabels } from "./labels";

export function CatalogHeader({ kind, onCreate }: { kind: CatalogKind; onCreate: () => void }) {
  const labels = catalogLabels[kind];
  return (
    <PageHeader
      breadcrumbs={[{ label: "Configuración" }, { label: labels.title }]}
      title={labels.title}
      description={labels.description}
      actions={
        <Button variant="primary" leadingIcon={<Plus aria-hidden />} onClick={onCreate}>
          {labels.create}
        </Button>
      }
    >
      <Tabs
        label="Catálogos"
        current={labels.href}
        items={CATALOG_ORDER.map((item) => ({ href: catalogLabels[item].href, label: catalogLabels[item].title }))}
      />
    </PageHeader>
  );
}
