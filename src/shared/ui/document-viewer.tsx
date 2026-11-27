"use client";

/* Visor de documentos (imagen o PDF) con zoom relativo al ancho, ajuste a página, rotación, paginación y arrastre para desplazar. */

import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileWarning,
  Maximize,
  MoveHorizontal,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { Button } from "./button";
import { cx } from "./cx";
import styles from "./document-viewer.module.css";
import { Separator, Spinner } from "./primitives";

export type DocumentKind = "image" | "pdf";

type Size = { width: number; height: number };
type FitMode = "width" | "page" | "custom";
type Rotation = 0 | 90 | 180 | 270;

const ZOOM_STEPS = [0.25, 0.5, 0.67, 0.8, 1, 1.25, 1.5, 2, 3, 4];
const STAGE_PADDING = 24;

let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;

function loadPdfjs() {
  pdfjsPromise ??= import("pdfjs-dist").then((pdfjs) => {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
    return pdfjs;
  });
  return pdfjsPromise;
}

type ViewerProps = {
  src: string;
  kind: DocumentKind;
  name: string;
  toolbarEnd?: ReactNode;
  className?: string;
};

export function DocumentViewer(props: ViewerProps) {
  return <ViewerBody key={`${props.kind}:${props.src}`} {...props} />;
}

function ViewerBody({ src, kind, name, toolbarEnd, className }: ViewerProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const [viewport, setViewport] = useState<Size>({ width: 0, height: 0 });
  const [natural, setNatural] = useState<Size | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [rotation, setRotation] = useState<Rotation>(0);
  const [mode, setMode] = useState<FitMode>("width");
  const [zoom, setZoom] = useState(1);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [pageNumber, setPageNumber] = useState(1);

  useLayoutEffect(() => {
    const element = canvasRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setViewport({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (kind === "image") {
      const image = new Image();
      image.onload = () => {
        setNatural({ width: image.naturalWidth || 1000, height: image.naturalHeight || 1400 });
        setStatus("ready");
      };
      image.onerror = () => setStatus("error");
      image.src = src;
      return;
    }

    let cancelled = false;
    let loadingTask: PDFDocumentLoadingTask | null = null;
    loadPdfjs()
      .then((pdfjs) => {
        if (cancelled) return null;
        loadingTask = pdfjs.getDocument({ url: src });
        return loadingTask.promise;
      })
      .then((doc) => {
        if (doc && !cancelled) setPdf(doc);
      })
      .catch(() => !cancelled && setStatus("error"));

    return () => {
      cancelled = true;
      setPdf(null);
      void loadingTask?.destroy();
    };
  }, [src, kind]);

  useEffect(() => {
    if (!pdf) return;
    let cancelled = false;
    pdf
      .getPage(pageNumber)
      .then((page) => {
        if (cancelled) return;
        const base = page.getViewport({ scale: 1 });
        setNatural({ width: base.width, height: base.height });
        setStatus("ready");
      })
      .catch(() => !cancelled && setStatus("error"));
    return () => {
      cancelled = true;
    };
  }, [pdf, pageNumber]);

  const quarterTurn = rotation % 180 !== 0;
  const rotated = natural && (quarterTurn ? { width: natural.height, height: natural.width } : natural);
  const availableWidth = Math.max(viewport.width - STAGE_PADDING * 2, 1);
  const availableHeight = Math.max(viewport.height - STAGE_PADDING * 2, 1);
  const fitWidthScale = rotated ? availableWidth / rotated.width : 1;
  const fitPageScale = rotated ? Math.min(fitWidthScale, availableHeight / rotated.height) : 1;
  const scale = mode === "page" ? fitPageScale : fitWidthScale * (mode === "width" ? 1 : zoom);
  const relativeZoom = scale / fitWidthScale;

  useEffect(() => {
    const canvas = pdfCanvasRef.current;
    if (!pdf || !canvas || !natural || viewport.width === 0) return;
    let task: RenderTask | null = null;
    let cancelled = false;

    pdf.getPage(pageNumber).then((page) => {
      if (cancelled) return;
      const ratio = window.devicePixelRatio || 1;
      const view = page.getViewport({ scale: scale * ratio, rotation });
      canvas.width = Math.floor(view.width);
      canvas.height = Math.floor(view.height);
      const context = canvas.getContext("2d");
      if (!context) return;
      task = page.render({ canvas, canvasContext: context, viewport: view });
      task.promise.catch(() => undefined);
    });

    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [pdf, pageNumber, natural, scale, rotation, viewport.width]);

  const applyZoom = useCallback((next: number) => {
    setMode("custom");
    setZoom(Math.min(Math.max(next, ZOOM_STEPS[0]), ZOOM_STEPS[ZOOM_STEPS.length - 1]));
  }, []);

  const zoomIn = useCallback(() => {
    applyZoom(ZOOM_STEPS.find((step) => step > relativeZoom + 0.01) ?? ZOOM_STEPS[ZOOM_STEPS.length - 1]);
  }, [applyZoom, relativeZoom]);

  const zoomOut = useCallback(() => {
    applyZoom([...ZOOM_STEPS].reverse().find((step) => step < relativeZoom - 0.01) ?? ZOOM_STEPS[0]);
  }, [applyZoom, relativeZoom]);

  const rotate = useCallback((direction: 1 | -1) => {
    setRotation((current) => (((current + direction * 90 + 360) % 360) as Rotation));
  }, []);

  useEffect(() => {
    const element = canvasRef.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      applyZoom(relativeZoom * (event.deltaY < 0 ? 1.1 : 1 / 1.1));
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [applyZoom, relativeZoom]);

  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const stageWidth = rotated ? rotated.width * scale : 0;
  const stageHeight = rotated ? rotated.height * scale : 0;
  const pannable = stageWidth > availableWidth + 1 || stageHeight > availableHeight + 1;

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const element = canvasRef.current;
    if (!element || !pannable || event.button !== 0) return;
    drag.current = { x: event.clientX, y: event.clientY, left: element.scrollLeft, top: element.scrollTop };
    element.setPointerCapture(event.pointerId);
    setDragging(true);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const element = canvasRef.current;
    if (!element || !drag.current) return;
    element.scrollLeft = drag.current.left - (event.clientX - drag.current.x);
    element.scrollTop = drag.current.top - (event.clientY - drag.current.y);
  };

  const endDrag = () => {
    drag.current = null;
    setDragging(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || event.metaKey || event.ctrlKey || event.altKey) return;
    const actions: Record<string, () => void> = {
      "+": zoomIn,
      "=": zoomIn,
      "-": zoomOut,
      "0": () => setMode("width"),
      r: () => rotate(1),
      R: () => rotate(-1),
    };
    const action = actions[event.key];
    if (action) {
      event.preventDefault();
      action();
    }
  };

  const pageCount = pdf?.numPages ?? 1;
  const ready = status === "ready";

  return (
    <div className={cx(styles.viewer, className)}>
      <div className={styles.toolbar} role="toolbar" aria-label="Controles del documento">
        <span className={styles.name} title={name}>
          {name}
        </span>
        {kind === "pdf" && pageCount > 1 && (
          <>
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              aria-label="Página anterior"
              disabled={pageNumber <= 1}
              onClick={() => setPageNumber((page) => page - 1)}
            >
              <ChevronLeft aria-hidden />
            </Button>
            <span className={styles.pages}>
              {pageNumber} / {pageCount}
            </span>
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              aria-label="Página siguiente"
              disabled={pageNumber >= pageCount}
              onClick={() => setPageNumber((page) => page + 1)}
            >
              <ChevronRight aria-hidden />
            </Button>
            <Separator orientation="vertical" />
          </>
        )}
        <Button variant="ghost" size="sm" iconOnly aria-label="Alejar" title="Alejar (−)" disabled={!ready} onClick={zoomOut}>
          <ZoomOut aria-hidden />
        </Button>
        <button
          type="button"
          className={styles.zoomValue}
          onClick={() => setMode("width")}
          disabled={!ready}
          title="Restablecer al ancho (0)"
        >
          {Math.round(relativeZoom * 100)}%
        </button>
        <Button variant="ghost" size="sm" iconOnly aria-label="Acercar" title="Acercar (+)" disabled={!ready} onClick={zoomIn}>
          <ZoomIn aria-hidden />
        </Button>
        <Separator orientation="vertical" />
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          aria-label="Ajustar al ancho"
          aria-pressed={mode === "width"}
          title="Ajustar al ancho"
          disabled={!ready}
          onClick={() => setMode("width")}
          className={cx(mode === "width" && styles.pressed)}
        >
          <MoveHorizontal aria-hidden />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          aria-label="Ajustar a la página"
          aria-pressed={mode === "page"}
          title="Ajustar a la página"
          disabled={!ready}
          onClick={() => setMode("page")}
          className={cx(mode === "page" && styles.pressed)}
        >
          <Maximize aria-hidden />
        </Button>
        <Separator orientation="vertical" />
        <Button variant="ghost" size="sm" iconOnly aria-label="Rotar a la izquierda" title="Rotar a la izquierda (⇧R)" disabled={!ready} onClick={() => rotate(-1)}>
          <RotateCcw aria-hidden />
        </Button>
        <Button variant="ghost" size="sm" iconOnly aria-label="Rotar a la derecha" title="Rotar a la derecha (R)" disabled={!ready} onClick={() => rotate(1)}>
          <RotateCw aria-hidden />
        </Button>
        <Separator orientation="vertical" />
        <a
          href={src}
          target="_blank"
          rel="noreferrer"
          aria-label="Abrir en otra pestaña"
          title="Abrir en otra pestaña"
          className={styles.iconLink}
        >
          <ExternalLink aria-hidden />
        </a>
        {toolbarEnd}
      </div>

      <div
        ref={canvasRef}
        className={cx(styles.canvas, pannable && styles.pannable, dragging && styles.dragging)}
        tabIndex={0}
        aria-label={`Documento ${name}. Atajos: más y menos para zoom, 0 para ajustar, R para rotar.`}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {status === "loading" && (
          <div className={styles.state}>
            <Spinner label="Cargando documento" />
          </div>
        )}
        {status === "error" && (
          <div className={styles.state}>
            <FileWarning aria-hidden />
            <p>No se pudo abrir el documento.</p>
          </div>
        )}
        {ready && rotated && natural && (
          <div className={styles.inner} style={{ padding: STAGE_PADDING }}>
            <div className={styles.stage} style={{ width: stageWidth, height: stageHeight }}>
              {kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element -- object URLs y data URLs locales, sin optimización de next/image.
                <img
                  src={src}
                  alt={name}
                  draggable={false}
                  className={styles.image}
                  style={{
                    width: natural.width * scale,
                    height: natural.height * scale,
                    transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                  }}
                />
              ) : (
                <canvas ref={pdfCanvasRef} className={styles.pdf} style={{ width: stageWidth, height: stageHeight }} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
