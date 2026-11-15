import React, { useEffect, useRef, useState } from 'react';
import { gibsImages, type GibsImage } from '../engineAdapter';

/** Dry HLS baseline of the scenario's place (Jeddah: 2024 dry baseline, never the flood). */
export const gibsKey = (scenarioId: string): string => (scenarioId === 'jeddah-flood' ? 'jeddah_hls' : 'angola');

/** The scenario's 30 m (or finer) GIBS image, or null if none; undefined while loading. */
export function useGibsImage(scenarioId: string): GibsImage | null | undefined {
  const [img, setImg] = useState<GibsImage | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    gibsImages().then((list) => {
      if (live) setImg(list.find((g) => g.file.includes(gibsKey(scenarioId)) && g.resolutionM <= 30) ?? list[0] ?? null);
    });
    return () => {
      live = false;
    };
  }, [scenarioId]);
  return img;
}

/** How much coarser the camera is than the image (>= 1). */
export const blurFactor = (gsdM: number, img: GibsImage): number => Math.max(1, gsdM / img.resolutionM);

const loaded = new Map<string, Promise<HTMLImageElement>>();
function loadImage(url: string): Promise<HTMLImageElement> {
  let p = loaded.get(url);
  if (!p) {
    p = new Promise((res, rej) => {
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => res(im);
      im.onerror = rej;
      im.src = url;
    });
    loaded.set(url, p);
  }
  return p;
}

/**
 * Draw the image into the canvas, blurred so that one blur radius equals the camera's ground resolution
 * (the Report's SatelliteView logic). `crop` (0..1] draws only the central part of the image, zoomed.
 */
export function useBlurredCanvas(canvas: React.RefObject<HTMLCanvasElement | null>, img: GibsImage | null | undefined, gsdM: number, width = 640, crop = 1): void {
  useEffect(() => {
    if (!img || !canvas.current) return;
    let live = true;
    const factor = blurFactor(gsdM, img);
    loadImage(img.url)
      .then((im) => {
        const c = canvas.current;
        if (!live || !c) return;
        const sw = im.width * crop;
        const sh = im.height * crop;
        const sx = (im.width - sw) / 2;
        const sy = (im.height - sh) / 2;
        const w = width;
        const h = Math.round((sh / sw) * w);
        c.width = w;
        c.height = h;
        const ctx = c.getContext('2d');
        if (!ctx) return;
        const px = ((factor - 1) * w) / sw;
        ctx.filter = factor > 1 ? `blur(${px.toFixed(2)}px)` : 'none';
        ctx.drawImage(im, sx, sy, sw, sh, 0, 0, w, h);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [canvas, img, gsdM, width, crop]);
}

/** One blurred view of the scenario image (canvas, role img). */
export function CameraView({ img, gsdM, label, crop = 1, width = 640 }: { img: GibsImage; gsdM: number; label: string; crop?: number; width?: number }): React.JSX.Element {
  const ref = useRef<HTMLCanvasElement>(null);
  useBlurredCanvas(ref, img, gsdM, width, crop);
  return <canvas ref={ref} role="img" aria-label={label} />;
}
