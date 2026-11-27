import {
  Bell,
  CircleCheck,
  CircleHelp,
  Download,
  Ellipsis,
  FileText,
  Banknote,
  House,
  Inbox,
  Landmark,
  LogOut,
  Package,
  Plus,
  Receipt,
  ChartColumn,
  Scale,
  Settings,
  Trash2,
  Truck,
  Upload,
  Users,
  Wallet,
} from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  Alert,
  AppShell,
  Badge,
  BulkAction,
  BulkActionBar,
  Button,
  ButtonGroup,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CellStack,
  Checkbox,
  EmptyState,
  Field,
  FilterChip,
  FormGrid,
  FormSection,
  Input,
  Kbd,
  Mono,
  NavItem,
  NavSection,
  PageHeader,
  Pagination,
  Radio,
  SearchInput,
  SegmentedControl,
  Select,
  Separator,
  Sidebar,
  SidebarContext,
  SidebarUser,
  Spinner,
  Stat,
  StatGrid,
  Switch,
  TBody,
  THead,
  Table,
  Tabs,
  Td,
  Textarea,
  Th,
  Toolbar,
  ToolbarGroup,
  ToolbarSpacer,
  Topbar,
  Tr,
  formLayout,
  type Tone,
} from "@/shared/ui";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Sistema de diseño · INDAPO" };

const ROUTE = "/design-system";

type TicketStatus = "review" | "approved" | "observed" | "settled";

const statusMeta: Record<TicketStatus, { label: string; tone: Tone }> = {
  review: { label: "Por revisar", tone: "warning" },
  approved: { label: "Aprobada", tone: "success" },
  observed: { label: "Observada", tone: "danger" },
  settled: { label: "Liquidada", tone: "neutral" },
};

const tickets: Array<{
  id: string;
  supplier: string;
  taxId: string;
  site: string;
  date: string;
  netKg: number;
  amount: number;
  status: TicketStatus;
}> = [
  { id: "BL-2026-04812", supplier: "Agropecuaria San Julián", taxId: "NIT 1028374019", site: "Acopio Norte", date: "26 nov 2026", netKg: 28_450, amount: 61_167.5, status: "review" },
  { id: "BL-2026-04811", supplier: "Cooperativa El Porvenir", taxId: "NIT 3847201015", site: "Acopio Norte", date: "26 nov 2026", netKg: 31_120, amount: 66_908.0, status: "review" },
  { id: "BL-2026-04807", supplier: "Hnos. Quiroga Vaca", taxId: "NIT 5928374012", site: "Acopio Cuatro Cañadas", date: "25 nov 2026", netKg: 26_980, amount: 58_007.0, status: "approved" },
  { id: "BL-2026-04803", supplier: "Agrícola Los Troncos S.R.L.", taxId: "NIT 2093847016", site: "Acopio Sur", date: "25 nov 2026", netKg: 29_760, amount: 63_984.0, status: "observed" },
  { id: "BL-2026-04798", supplier: "Productores Unidos Pailón", taxId: "NIT 7738291010", site: "Acopio Cuatro Cañadas", date: "24 nov 2026", netKg: 30_015, amount: 64_532.25, status: "approved" },
  { id: "BL-2026-04790", supplier: "Ganadera Santa Rosa", taxId: "NIT 4410293018", site: "Acopio Sur", date: "23 nov 2026", netKg: 27_340, amount: 58_781.0, status: "settled" },
];

const kg = new Intl.NumberFormat("es-BO", { maximumFractionDigits: 0 });
const bob = new Intl.NumberFormat("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const palette = [
  {
    name: "Forest",
    hint: "Marca, primario, sidebar",
    tokens: ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900"].map((step) => `--forest-${step}`),
  },
  {
    name: "Olive",
    hint: "Acento, foco, selección",
    tokens: ["50", "100", "200", "300", "400", "500", "600", "700"].map((step) => `--olive-${step}`),
  },
  {
    name: "Stone",
    hint: "Superficies, bordes, texto",
    tokens: ["0", "25", "50", "100", "150", "200", "300", "400", "500", "600", "700", "900"].map((step) => `--stone-${step}`),
  },
  {
    name: "Gold",
    hint: "Destacados, advertencias",
    tokens: ["50", "100", "200", "300", "500", "700"].map((step) => `--gold-${step}`),
  },
  {
    name: "Red",
    hint: "Errores, acciones destructivas",
    tokens: ["50", "100", "200", "500", "600", "700"].map((step) => `--red-${step}`),
  },
];

const typeScale = [
  { token: "--text-2xl", meta: "24 / 600 · Títulos de página", sample: "Liquidación de compras", weight: 600 },
  { token: "--text-lg", meta: "16 / 600 · Secciones", sample: "Condiciones comerciales", weight: 600 },
  { token: "--text-md", meta: "14 / 400 · Cuerpo", sample: "La boleta queda sujeta a revisión antes de liquidarse.", weight: 400 },
  { token: "--text-sm", meta: "13 / 400 · Tablas y controles", sample: "Agropecuaria San Julián · Acopio Norte", weight: 400 },
  { token: "--text-xs", meta: "12 / 500 · Etiquetas y metadatos", sample: "Actualizado hace 4 minutos", weight: 500 },
];

function Block({
  overline,
  title,
  description,
  children,
}: {
  overline: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className={styles.block}>
      <header className={styles.blockHeader}>
        <span className={styles.overline}>{overline}</span>
        <h2 className={styles.blockTitle}>{title}</h2>
        {description && <p className={styles.blockDescription}>{description}</p>}
      </header>
      {children}
    </section>
  );
}

function AppSidebar() {
  return (
    <Sidebar
      context={<SidebarContext label="Campaña" value="Verano 2026 · Acopio Norte" />}
      footer={
        <SidebarUser
          name="Lucía Méndez"
          role="Administración"
          action={
            <Button variant="ghost" size="sm" iconOnly aria-label="Cerrar sesión" style={{ color: "var(--sidebar-fg)" }}>
              <LogOut aria-hidden />
            </Button>
          }
        />
      }
    >
      <NavSection>
        <NavItem href="#" icon={<House aria-hidden />} label="Inicio" />
        <NavItem href="#" icon={<Inbox aria-hidden />} label="Bandeja" count={7} />
      </NavSection>
      <NavSection label="Recepción">
        <NavItem href={ROUTE} icon={<Receipt aria-hidden />} label="Boletas" count={18} alert active />
        <NavItem href="#" icon={<Users aria-hidden />} label="Proveedores" />
        <NavItem href="#" icon={<FileText aria-hidden />} label="Documentos" />
      </NavSection>
      <NavSection label="Compras">
        <NavItem href="#" icon={<Scale aria-hidden />} label="Liquidaciones" />
        <NavItem href="#" icon={<Wallet aria-hidden />} label="Pagos" />
      </NavSection>
      <NavSection label="Ventas">
        <NavItem href="#" icon={<Landmark aria-hidden />} label="Clientes" />
        <NavItem href="#" icon={<Truck aria-hidden />} label="Despachos" />
        <NavItem href="#" icon={<Banknote aria-hidden />} label="Cobros" />
      </NavSection>
      <NavSection label="Análisis">
        <NavItem href="#" icon={<ChartColumn aria-hidden />} label="Reportes" />
        <NavItem href="#" icon={<Settings aria-hidden />} label="Configuración" />
      </NavSection>
    </Sidebar>
  );
}

function AppTopbar() {
  return (
    <Topbar
      start={<SearchInput placeholder="Buscar boletas, proveedores, despachos…" shortcut="⌘K" aria-label="Búsqueda global" style={{ width: 380 }} />}
      end={
        <>
          <Button variant="ghost" iconOnly aria-label="Ayuda">
            <CircleHelp aria-hidden />
          </Button>
          <Button variant="ghost" iconOnly aria-label="Notificaciones">
            <Bell aria-hidden />
          </Button>
        </>
      }
    />
  );
}

function TicketsTable() {
  return (
    <Card>
      <Toolbar bordered label="Filtros de boletas">
        <ToolbarGroup>
          <SearchInput placeholder="N° de boleta o proveedor" controlSize="sm" aria-label="Buscar boletas" />
          <FilterChip label="Estado" value="Por revisar" />
          <FilterChip label="Acopio" />
          <FilterChip label="Fecha" />
        </ToolbarGroup>
        <ToolbarSpacer />
        <ToolbarGroup>
          <SegmentedControl
            name="view"
            label="Agrupar por"
            defaultValue="truck"
            options={[
              { value: "truck", label: "Fecha camión" },
              { value: "office", label: "Fecha oficina" },
            ]}
          />
          <Button size="sm" leadingIcon={<Download aria-hidden />}>
            Exportar
          </Button>
        </ToolbarGroup>
      </Toolbar>
      <Table>
        <THead>
          <tr>
            <Th checkbox>
              <Checkbox aria-label="Seleccionar todas" />
            </Th>
            <Th sort="desc">N° boleta</Th>
            <Th>Proveedor</Th>
            <Th>Acopio</Th>
            <Th sort="none">Fecha</Th>
            <Th numeric>Peso neto (kg)</Th>
            <Th numeric>Importe (Bs)</Th>
            <Th>Estado</Th>
            <Th shrink>
              <span className="sr-only">Acciones</span>
            </Th>
          </tr>
        </THead>
        <TBody>
          {tickets.map((ticket, index) => (
            <Tr key={ticket.id} selected={index === 1}>
              <Td checkbox>
                <Checkbox aria-label={`Seleccionar ${ticket.id}`} defaultChecked={index === 1} />
              </Td>
              <Td>
                <Mono>{ticket.id}</Mono>
              </Td>
              <Td>
                <CellStack primary={ticket.supplier} secondary={ticket.taxId} />
              </Td>
              <Td muted>{ticket.site}</Td>
              <Td muted>{ticket.date}</Td>
              <Td numeric>{kg.format(ticket.netKg)}</Td>
              <Td numeric>{bob.format(ticket.amount)}</Td>
              <Td>
                <Badge tone={statusMeta[ticket.status].tone} dot>
                  {statusMeta[ticket.status].label}
                </Badge>
              </Td>
              <Td shrink>
                <div className={styles.tableActions}>
                  <Button variant="ghost" size="sm" iconOnly aria-label={`Acciones de ${ticket.id}`}>
                    <Ellipsis aria-hidden />
                  </Button>
                </div>
              </Td>
            </Tr>
          ))}
        </TBody>
      </Table>
      <Pagination from={1} to={25} total={312} nextHref={`${ROUTE}?page=2`}>
        <Select controlSize="sm" defaultValue="25" aria-label="Filas por página" style={{ width: 120 }}>
          <option value="25">25 por página</option>
          <option value="50">50 por página</option>
          <option value="100">100 por página</option>
        </Select>
      </Pagination>
    </Card>
  );
}

function SupplierForm() {
  return (
    <Card>
      <CardHeader
        title="Nuevo proveedor"
        description="Los datos fiscales se validan contra el padrón antes de habilitar pagos."
        actions={<Badge tone="accent">Borrador</Badge>}
      />
      <div className={styles.formBody}>
        <FormSection title="Identificación" description="Razón social y documento tal como figuran en la factura.">
          <FormGrid>
            <Field label="Razón social" htmlFor="supplier-name" className={formLayout.span2}>
              <Input id="supplier-name" defaultValue="Agropecuaria San Julián" />
            </Field>
            <Field label="NIT" htmlFor="supplier-tax" error="El NIT ya está registrado para otro proveedor.">
              <Input id="supplier-tax" defaultValue="1028374019" invalid aria-describedby="supplier-tax-error" />
            </Field>
            <Field label="Tipo de proveedor" htmlFor="supplier-kind">
              <Select id="supplier-kind" defaultValue="producer">
                <option value="producer">Productor</option>
                <option value="cooperative">Cooperativa</option>
                <option value="broker">Intermediario</option>
              </Select>
            </Field>
            <Field label="Teléfono" htmlFor="supplier-phone" optional>
              <Input id="supplier-phone" type="tel" placeholder="7XX XXXXX" leading="+591" />
            </Field>
            <Field label="Correo" htmlFor="supplier-email" optional hint="Recibe comprobantes de pago.">
              <Input id="supplier-email" type="email" placeholder="contacto@empresa.bo" aria-describedby="supplier-email-hint" />
            </Field>
          </FormGrid>
        </FormSection>
        <FormSection title="Condiciones comerciales" description="Se versionan: un cambio aplica solo a boletas nuevas.">
          <FormGrid columns={3}>
            <Field label="Precio base" htmlFor="price" hint="Por tonelada métrica.">
              <Input id="price" numeric defaultValue="2.150,00" leading="Bs" aria-describedby="price-hint" />
            </Field>
            <Field label="Humedad máx." htmlFor="moisture">
              <Input id="moisture" numeric defaultValue="14,0" trailing="%" />
            </Field>
            <Field label="Plazo de pago" htmlFor="term">
              <Input id="term" numeric defaultValue="15" trailing="días" />
            </Field>
            <Field label="Observaciones" htmlFor="notes" optional className={formLayout.spanFull}>
              <Textarea id="notes" placeholder="Acuerdos particulares, descuentos por calidad…" />
            </Field>
          </FormGrid>
        </FormSection>
        <FormSection title="Pagos y avisos">
          <div className={styles.choices}>
            <div className={styles.radioRow} role="radiogroup" aria-label="Medio de pago">
              <Radio name="payment" value="transfer" label="Transferencia" defaultChecked />
              <Radio name="payment" value="check" label="Cheque" />
              <Radio name="payment" value="cash" label="Efectivo" disabled />
            </div>
            <Separator />
            <Checkbox
              label="Agrupar boletas por beneficiario"
              description="Un solo pago para proveedores vinculados al mismo titular."
              defaultChecked
            />
            <Switch label="Notificar liquidaciones por correo" description="Envía el detalle al confirmar cada liquidación." />
          </div>
        </FormSection>
      </div>
      <CardFooter start={<span className={styles.blockDescription}>Último guardado hace 2 min</span>}>
        <Button variant="ghost">Cancelar</Button>
        <Button>Guardar borrador</Button>
        <Button variant="primary">Crear proveedor</Button>
      </CardFooter>
    </Card>
  );
}

function Swatches() {
  return (
    <Card>
      <CardBody>
        <div className={styles.swatchGroups}>
          {palette.map((group) => (
            <div key={group.name} className={styles.swatchGroup}>
              <div>
                <p className={styles.swatchGroupName}>{group.name}</p>
                <p className={styles.swatchGroupHint}>{group.hint}</p>
              </div>
              <div className={styles.swatches}>
                {group.tokens.map((token) => (
                  <div key={token} className={styles.swatch}>
                    <span className={styles.swatchChip} style={{ background: `var(${token})` }} />
                    <span className={styles.swatchMeta}>
                      <span>{token.split("-").at(-1)}</span>
                      <span>{token}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

export default function DesignSystemPage() {
  return (
    <AppShell sidebar={<AppSidebar />} topbar={<AppTopbar />}>
      <PageHeader
        breadcrumbs={[{ label: "Recepción", href: "#" }, { label: "Boletas" }]}
        title="Boletas"
        description="Revisión y aprobación de boletas de balanza antes de liquidar."
        actions={
          <>
            <Button leadingIcon={<Upload aria-hidden />}>Importar</Button>
            <Button variant="primary" leadingIcon={<Plus aria-hidden />}>
              Nueva boleta
            </Button>
          </>
        }
      >
        <Tabs
          label="Estados de boleta"
          current={ROUTE}
          items={[
            { href: ROUTE, label: "Todas", count: 312 },
            { href: `${ROUTE}?status=review`, label: "Por revisar", count: 18 },
            { href: `${ROUTE}?status=approved`, label: "Aprobadas", count: 241 },
            { href: `${ROUTE}?status=observed`, label: "Observadas", count: 6 },
          ]}
        />
      </PageHeader>

      <div className={styles.stack}>
        <StatGrid>
          <Stat
            label="Por revisar"
            icon={<Receipt aria-hidden />}
            value="18"
            meta={
              <>
                <Badge tone="warning">5 con más de 48 h</Badge>
              </>
            }
          />
          <Stat label="Peso recibido" icon={<Package aria-hidden />} value="1.284.560" unit="kg" meta="Campaña en curso" />
          <Stat
            label="Por liquidar"
            icon={<Scale aria-hidden />}
            value="482.310,00"
            unit="Bs"
            meta={
              <>
                <Badge tone="success">+12,4 %</Badge>vs. semana anterior
              </>
            }
          />
          <Stat label="Pagado en noviembre" icon={<Wallet aria-hidden />} value="1.932.004,50" unit="Bs" meta="146 pagos confirmados" />
        </StatGrid>

        <Block overline="Patrón" title="Listado operativo" description="Toolbar con búsqueda, filtros y vistas; tabla densa con cifras tabulares y paginación.">
          <TicketsTable />
          <div className={styles.bulkWrap}>
            <BulkActionBar count={3}>
              <BulkAction>
                <CircleCheck aria-hidden />
                Aprobar
              </BulkAction>
              <BulkAction>
                <Download aria-hidden />
                Exportar
              </BulkAction>
              <BulkAction>
                <Trash2 aria-hidden />
                Descartar
              </BulkAction>
            </BulkActionBar>
          </div>
        </Block>

        <Block overline="Patrón" title="Formulario por secciones" description="Etiqueta arriba, ayuda debajo, campos opcionales marcados y error en línea.">
          <SupplierForm />
        </Block>

        <Block overline="Componentes" title="Controles y estados">
          <div className={styles.gallery}>
            <Card>
              <CardHeader title="Botones" description="Un solo primario por vista." />
              <CardBody className={styles.specimen}>
                <div className={styles.row}>
                  <span className={styles.rowLabel}>Variantes</span>
                  <Button variant="primary">Confirmar pago</Button>
                  <Button>Secundario</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="danger">Anular</Button>
                </div>
                <div className={styles.row}>
                  <span className={styles.rowLabel}>Tamaños</span>
                  <Button size="sm">Pequeño</Button>
                  <Button>Mediano</Button>
                  <Button size="lg">Grande</Button>
                </div>
                <div className={styles.row}>
                  <span className={styles.rowLabel}>Estados</span>
                  <Button variant="primary" loading>
                    Guardando
                  </Button>
                  <Button disabled>Deshabilitado</Button>
                  <Button iconOnly aria-label="Más acciones">
                    <Ellipsis aria-hidden />
                  </Button>
                </div>
                <div className={styles.row}>
                  <span className={styles.rowLabel}>Grupo</span>
                  <ButtonGroup label="Periodo">
                    <Button size="sm">Día</Button>
                    <Button size="sm">Semana</Button>
                    <Button size="sm">Mes</Button>
                  </ButtonGroup>
                  <Button size="sm" variant="ghost" trailingIcon={<Kbd>N</Kbd>}>
                    Nueva
                  </Button>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Badges" description="Estado siempre con texto, nunca solo color." />
              <CardBody className={styles.specimen}>
                <div className={styles.row}>
                  <Badge tone="warning" dot>Por revisar</Badge>
                  <Badge tone="success" dot>Aprobada</Badge>
                  <Badge tone="danger" dot>Observada</Badge>
                  <Badge tone="info" dot>En OCR</Badge>
                  <Badge dot>Liquidada</Badge>
                </div>
                <div className={styles.row}>
                  <Badge tone="accent">Productor</Badge>
                  <Badge tone="solid" dot>Campaña activa</Badge>
                  <Badge square>v3</Badge>
                  <Badge tone="info" square>FIFO</Badge>
                </div>
                <div className={styles.row}>
                  <Spinner />
                  <span className={styles.blockDescription}>Procesando 4 documentos…</span>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Alertas" />
              <CardBody className={styles.specimen}>
                <Alert tone="info" title="Vista previa">
                  El saldo puede cambiar si otro usuario confirma un pago antes.
                </Alert>
                <Alert tone="warning" title="Posible boleta duplicada" actions={<Button size="sm">Comparar</Button>}>
                  BL-2026-04811 coincide en peso, fecha y placa con BL-2026-04806.
                </Alert>
                <Alert tone="danger" title="No se pudo confirmar la liquidación">
                  La versión de condiciones cambió. Recarga la vista previa.
                </Alert>
                <Alert tone="success">Pago registrado y asignado a 3 boletas.</Alert>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Estado vacío" />
              <CardBody flush>
                <EmptyState
                  icon={<Inbox aria-hidden />}
                  title="Sin boletas observadas"
                  description="Las boletas con diferencias de peso o datos incompletos aparecerán aquí."
                  actions={
                    <Button size="sm" leadingIcon={<Plus aria-hidden />}>
                      Registrar boleta
                    </Button>
                  }
                />
              </CardBody>
            </Card>
          </div>
        </Block>

        <Block overline="Fundamentos" title="Color" description="Derivado de la web de INDAPO: verde bosque, oliva, papel y dorados de grano.">
          <Swatches />
        </Block>

        <Block overline="Fundamentos" title="Tipografía" description="Geist para interfaz y Geist Mono para identificadores. Cifras siempre tabulares.">
          <Card>
            <CardBody className={styles.typeScale}>
              {typeScale.map((item) => (
                <div key={item.token} className={styles.typeRow}>
                  <span className={styles.typeMeta}>
                    {item.token}
                    <br />
                    {item.meta}
                  </span>
                  <span style={{ fontSize: `var(${item.token})`, fontWeight: item.weight, letterSpacing: item.weight === 600 ? "-0.015em" : undefined }}>
                    {item.sample}
                  </span>
                </div>
              ))}
              <div className={styles.typeRow}>
                <span className={styles.typeMeta}>
                  --font-mono
                  <br />
                  Identificadores
                </span>
                <Mono>BL-2026-04812 · NIT 1028374019</Mono>
              </div>
            </CardBody>
          </Card>
        </Block>
      </div>
    </AppShell>
  );
}
