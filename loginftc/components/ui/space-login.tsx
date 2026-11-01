"use client";

import React, { useState, useEffect, useRef, useId, useMemo, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, KeyRound, Loader2, Check } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Clean self-contained cn utility
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Dark mode helper
export const useDarkMode = (): boolean => {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkDark = () => {
      const isHtmlDark = document.documentElement.classList.contains("dark");
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      return isHtmlDark || mediaQuery.matches;
    };

    setIsDark(checkDark());

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => setIsDark(checkDark());
    mediaQuery.addEventListener("change", handler);

    const observer = new MutationObserver(() => setIsDark(checkDark()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    return () => {
      mediaQuery.removeEventListener("change", handler);
      observer.disconnect();
    };
  }, []);

  return isDark;
};

// Liquid Glass Presets
export const GLASS_PRESETS = {
  subtle: {
    backgroundOpacity: 0.06,
    saturation: 1.1,
    brightness: 55,
    blur: 8,
    displace: 0.3,
    distortionScale: -20,
    redOffset: -1,
    greenOffset: 1,
    blueOffset: 3,
    mixBlendMode: "difference",
  },
  default: {
    backgroundOpacity: 0.1,
    saturation: 1.4,
    brightness: 55,
    blur: 10,
    displace: 0.4,
    distortionScale: -35,
    redOffset: 0,
    greenOffset: 2,
    blueOffset: 4,
    mixBlendMode: "difference",
  },
  bold: {
    backgroundOpacity: 0.18,
    saturation: 1.8,
    brightness: 60,
    blur: 12,
    displace: 0.6,
    distortionScale: -55,
    redOffset: 1,
    greenOffset: 3,
    blueOffset: 6,
    mixBlendMode: "screen",
  },
  ghost: {
    backgroundOpacity: 0,
    saturation: 1,
    brightness: 55,
    blur: 6,
    displace: 0,
    distortionScale: 0,
    redOffset: 0,
    greenOffset: 0,
    blueOffset: 0,
    mixBlendMode: "difference",
  },
};

export type GlassVariant = keyof typeof GLASS_PRESETS;

export const GLASS_DEFAULTS = {
  width: "auto",
  height: "auto",
  borderRadius: 16,
  borderWidth: 0.03,
  opacity: 0.93,
  xChannel: "R",
  yChannel: "G",
};

export interface GlassProps {
  variant?: GlassVariant;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  borderWidth?: number;
  brightness?: number;
  opacity?: number;
  blur?: number;
  displace?: number;
  backgroundOpacity?: number;
  saturation?: number;
  distortionScale?: number;
  redOffset?: number;
  greenOffset?: number;
  blueOffset?: number;
  xChannel?: "R" | "G" | "B" | "A";
  yChannel?: "R" | "G" | "B" | "A";
  mixBlendMode?: string;
  dark?: boolean;
}

export const Glass: React.FC<GlassProps> = (rawProps) => {
  const {
    variant = "default",
    children,
    className = "",
    style = {},
    width,
    height,
    borderRadius,
    borderWidth,
    brightness,
    opacity,
    blur,
    displace,
    backgroundOpacity,
    saturation,
    distortionScale,
    redOffset,
    greenOffset,
    blueOffset,
    xChannel,
    yChannel,
    mixBlendMode,
    dark,
  } = rawProps;

  const uniqueId = useId().replace(/:/g, "-");
  const filterId = `glass-filter-${uniqueId}`;
  const redGradId = `red-grad-${uniqueId}`;
  const blueGradId = `blue-grad-${uniqueId}`;

  const containerRef = useRef<HTMLDivElement>(null);
  const feImageRef = useRef<SVGFEImageElement>(null);
  const redChannelRef = useRef<SVGFEDisplacementMapElement>(null);
  const greenChannelRef = useRef<SVGFEDisplacementMapElement>(null);
  const blueChannelRef = useRef<SVGFEDisplacementMapElement>(null);
  const gaussianBlurRef = useRef<SVGFEGaussianBlurElement>(null);

  const systemDarkMode = useDarkMode();
  const isDarkMode = dark !== undefined ? dark : systemDarkMode;

  const v = useMemo(() => {
    const p = GLASS_PRESETS[variant] ?? GLASS_PRESETS.default;
    return {
      ...GLASS_DEFAULTS,
      ...p,
      ...(width !== undefined && { width }),
      ...(height !== undefined && { height }),
      ...(borderRadius !== undefined && { borderRadius }),
      ...(borderWidth !== undefined && { borderWidth }),
      ...(brightness !== undefined && { brightness }),
      ...(opacity !== undefined && { opacity }),
      ...(blur !== undefined && { blur }),
      ...(displace !== undefined && { displace }),
      ...(backgroundOpacity !== undefined && { backgroundOpacity }),
      ...(saturation !== undefined && { saturation }),
      ...(distortionScale !== undefined && { distortionScale }),
      ...(redOffset !== undefined && { redOffset }),
      ...(greenOffset !== undefined && { greenOffset }),
      ...(blueOffset !== undefined && { blueOffset }),
      ...(xChannel !== undefined && { xChannel }),
      ...(yChannel !== undefined && { yChannel }),
      ...(mixBlendMode !== undefined && { mixBlendMode }),
    };
  }, [
    variant,
    width,
    height,
    borderRadius,
    borderWidth,
    brightness,
    opacity,
    blur,
    displace,
    backgroundOpacity,
    saturation,
    distortionScale,
    redOffset,
    greenOffset,
    blueOffset,
    xChannel,
    yChannel,
    mixBlendMode,
  ]);

  const generateDisplacementMap = () => {
    const rect = containerRef.current?.getBoundingClientRect();
    const actualWidth = rect?.width || 400;
    const actualHeight = rect?.height || 200;
    const edgeSize = Math.min(actualWidth, actualHeight) * (v.borderWidth * 0.5);

    const svgContent = `
      <svg viewBox="0 0 ${actualWidth} ${actualHeight}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="${redGradId}" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stop-color="#0000"/>
            <stop offset="100%" stop-color="red"/>
          </linearGradient>
          <linearGradient id="${blueGradId}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#0000"/>
            <stop offset="100%" stop-color="blue"/>
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" fill="black"></rect>
        <rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" rx="${v.borderRadius}" fill="url(#${redGradId})" />
        <rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" rx="${v.borderRadius}" fill="url(#${blueGradId})" style="mix-blend-mode: ${v.mixBlendMode}" />
        <rect x="${edgeSize}" y="${edgeSize}" width="${
      actualWidth - edgeSize * 2
    }" height="${
      actualHeight - edgeSize * 2
    }" rx="${v.borderRadius}" fill="hsl(0 0% ${v.brightness}% / ${
      v.opacity
    })" style="filter:blur(${v.blur}px)" />
      </svg>
    `;

    return `data:image/svg+xml,${encodeURIComponent(svgContent)}`;
  };

  const updateDisplacementMap = () => {
    if (feImageRef.current) {
      feImageRef.current.setAttribute("href", generateDisplacementMap());
    }
  };

  useEffect(() => {
    updateDisplacementMap();
    [
      { ref: redChannelRef, offset: v.redOffset },
      { ref: greenChannelRef, offset: v.greenOffset },
      { ref: blueChannelRef, offset: v.blueOffset },
    ].forEach(({ ref, offset }) => {
      if (ref.current) {
        ref.current.setAttribute(
          "scale",
          (v.distortionScale + offset).toString()
        );
        ref.current.setAttribute("xChannelSelector", v.xChannel);
        ref.current.setAttribute("yChannelSelector", v.yChannel);
      }
    });

    if (gaussianBlurRef.current) {
      gaussianBlurRef.current.setAttribute(
        "stdDeviation",
        v.displace.toString()
      );
    }
  }, [
    v.width,
    v.height,
    v.borderRadius,
    v.borderWidth,
    v.brightness,
    v.opacity,
    v.blur,
    v.displace,
    v.distortionScale,
    v.redOffset,
    v.greenOffset,
    v.blueOffset,
    v.xChannel,
    v.yChannel,
    v.mixBlendMode,
    variant,
  ]);

  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      setTimeout(updateDisplacementMap, 0);
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    setTimeout(updateDisplacementMap, 0);
  }, [v.width, v.height]);

  const [svgFilterSupported, setSvgFilterSupported] = useState(true);

  useEffect(() => {
    const checkSupport = () => {
      const isWebkit =
        typeof navigator !== "undefined" &&
        /Safari/.test(navigator.userAgent) &&
        !/Chrome/.test(navigator.userAgent);
      const isFirefox = typeof navigator !== "undefined" && /Firefox/.test(navigator.userAgent);
      setSvgFilterSupported(!isWebkit && !isFirefox);
    };
    checkSupport();
  }, [filterId]);

  const getContainerStyles = (): React.CSSProperties => {
    const baseStyles = {
      ...style,
      ...(v.width && v.width !== "auto" && { width: typeof v.width === "number" ? `${v.width}px` : v.width }),
      ...(v.height && v.height !== "auto" && { height: typeof v.height === "number" ? `${v.height}px` : v.height }),
      borderRadius: `${v.borderRadius}px`,
      "--glass-frost": v.backgroundOpacity,
      "--glass-saturation": v.saturation,
    };

    if (svgFilterSupported) {
      return {
        ...baseStyles,
        background: isDarkMode
          ? `hsl(0 0% 0% / ${v.backgroundOpacity})`
          : `hsl(0 0% 100% / ${v.backgroundOpacity})`,
        backdropFilter: `url(#${filterId}) saturate(${v.saturation})`,
        border: isDarkMode
          ? "1px solid rgba(255, 255, 255, 0.08)"
          : "1px solid rgba(0, 0, 0, 0.06)",
        boxShadow: isDarkMode
          ? `0 0 1px 0 rgba(255, 255, 255, 0.1) inset,
             0px 4px 16px rgba(17, 17, 26, 0.05)`
          : `0 0 1px 0 rgba(0, 0, 0, 0.05) inset,
             0px 4px 16px rgba(17, 17, 26, 0.05)`,
      } as React.CSSProperties;
    } else {
      return {
        ...baseStyles,
        background: isDarkMode
          ? "rgba(0, 0, 0, 0.3)"
          : "rgba(255, 255, 255, 0.2)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: isDarkMode ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.06)",
      } as React.CSSProperties;
    }
  };

  const glassClasses =
    "relative flex items-center justify-center overflow-hidden transition-all duration-[260ms] ease-out";

  return (
    <div
      ref={containerRef}
      className={cn(glassClasses, className)}
      style={getContainerStyles()}
    >
      <svg
        className="w-full h-full pointer-events-none absolute inset-0 opacity-0 -z-10"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter
            id={filterId}
            colorInterpolationFilters="sRGB"
            x="0%"
            y="0%"
            width="100%"
            height="100%"
          >
            <feImage
              ref={feImageRef}
              href={
                generateDisplacementMap() ||
                "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'%3E%3C/svg%3E"
              }
              x="0"
              y="0"
              width="100%"
              height="100%"
              preserveAspectRatio="none"
              result="map"
            />
            <feDisplacementMap
              ref={redChannelRef}
              in="SourceGraphic"
              in2="map"
              id="redchannel"
              result="dispRed"
            />
            <feColorMatrix
              in="dispRed"
              type="matrix"
              values="1 0 0 0 0
                      0 0 0 0 0
                      0 0 0 0 0
                      0 0 0 1 0"
              result="red"
            />
            <feDisplacementMap
              ref={greenChannelRef}
              in="SourceGraphic"
              in2="map"
              id="greenchannel"
              result="dispGreen"
            />
            <feColorMatrix
              in="dispGreen"
              type="matrix"
              values="0 0 0 0 0
                      0 1 0 0 0
                      0 0 0 0 0
                      0 0 0 1 0"
              result="green"
            />
            <feDisplacementMap
              ref={blueChannelRef}
              in="SourceGraphic"
              in2="map"
              id="bluechannel"
              result="dispBlue"
            />
            <feColorMatrix
              in="dispBlue"
              type="matrix"
              values="0 0 0 0 0
                      0 0 0 0 0
                      0 0 1 0 0
                      0 0 0 1 0"
              result="blue"
            />
            <feBlend in="red" in2="green" mode="screen" result="rg" />
            <feBlend in="rg" in2="blue" mode="screen" result="output" />
            <feGaussianBlur
              ref={gaussianBlurRef}
              in="output"
              stdDeviation="0.7"
            />
          </filter>
        </defs>
      </svg>

      <div className="w-full h-full flex items-center justify-center p-0 rounded-[inherit] relative z-10">
        {children}
      </div>
    </div>
  );
};

export interface GlassInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  variant?: GlassVariant;
  containerClassName?: string;
  rightElement?: React.ReactNode;
  borderRadius?: number;
  height?: number | string;
  glassProps?: Partial<GlassProps>;
}

export const GlassInput = forwardRef<HTMLInputElement, GlassInputProps>(
  (
    {
      variant = "default",
      className = "",
      containerClassName = "",
      rightElement,
      borderRadius = 14,
      height = 52,
      glassProps,
      ...inputProps
    },
    ref
  ) => {
    return (
      <Glass
        variant={variant}
        borderRadius={borderRadius}
        dark={true}
        height={height}
        className={cn(
          "w-full h-[52px] min-h-[52px] transition-all duration-200",
          containerClassName
        )}
        {...glassProps}
      >
        <div className="relative w-full h-[52px] min-h-[52px] flex items-center px-4">
          <input
            ref={ref}
            className={cn(
              "w-full h-full bg-transparent text-neutral-100 placeholder:text-neutral-400/70 border-none outline-none text-[15px] font-medium leading-none",
              rightElement ? "pr-10" : "pr-0",
              className
            )}
            {...inputProps}
          />
          {rightElement && (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center">
              {rightElement}
            </div>
          )}
        </div>
      </Glass>
    );
  }
);

GlassInput.displayName = "GlassInput";

export interface SpaceLoginProps {
  title?: string;
  subtitle?: string;
  astronautSrc?: string;
  onSubmit?: (data: { email: string; password: string; rememberMe: boolean }) => Promise<void> | void;
  onForgotPassword?: () => void;
  onSignUp?: () => void;
  onSocialLogin?: (provider: "google" | "github" | "facebook" | "windows" | "passkey") => void;
  className?: string;
  defaultEmail?: string;
  showSocialButtons?: boolean;
  glassVariant?: GlassVariant;
}

// Sparkle Star SVG Component for the glowing stars (like in Figma design)
function SparkleStar({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn("w-4 h-4 pointer-events-none select-none", className)}
      style={style}
    >
      <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
    </svg>
  );
}

// Social Icons SVGs for accurate brand representations
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("w-4 h-4", className)} viewBox="0 0 24 24">
      <path
        fill="currentColor"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="currentColor"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="currentColor"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="currentColor"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("w-4 h-4", className)} fill="currentColor" viewBox="0 0 24 24">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("w-4 h-4", className)} fill="currentColor" viewBox="0 0 24 24">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function WindowsIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("w-4 h-4", className)} fill="currentColor" viewBox="0 0 24 24">
      <path d="M0 3.449L9.75 2.1v9.451H0V3.449zm10.75-1.551L24 0v11.551h-13.25V1.898zM0 12.449h9.75v9.451L0 20.551v-8.102zm10.75 0H24V24l-13.25-1.898v-9.653z" />
    </svg>
  );
}

// Dynamic Starfield with Canvas for high-performance and interactive cosmic feel
function CosmicStarfield() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);

    // Stars collection
    const starCount = Math.floor((width * height) / 4000);
    const stars: Array<{
      x: number;
      y: number;
      size: number;
      baseAlpha: number;
      alpha: number;
      color: string;
      layer: number;
    }> = [];

    const starColors = [
      "rgba(255, 255, 255, ",
      "rgba(224, 238, 255, ",
      "rgba(195, 222, 255, ",
      "rgba(255, 246, 228, ",
    ];

    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 1.5 + 0.4,
        baseAlpha: Math.random() * 0.3 + 0.2,
        alpha: Math.random() * 0.3 + 0.2,
        color: starColors[Math.floor(Math.random() * starColors.length)],
        layer: Math.random() * 0.5 + 0.5,
      });
    }

    // Solo star blink system (1 at a time: brightens and dims back)
    let blinkStarIndex = Math.floor(Math.random() * stars.length);
    let blinkProgress = 0;
    let blinkPhase: "brightening" | "dimming" = "brightening";

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Render calm background stars
      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `${star.color}${star.alpha})`;
        ctx.fill();
      }

      // Solo blinking star
      if (stars[blinkStarIndex]) {
        const bStar = stars[blinkStarIndex];
        if (blinkPhase === "brightening") {
          blinkProgress += 0.035;
          if (blinkProgress >= 1) {
            blinkProgress = 1;
            blinkPhase = "dimming";
          }
        } else {
          blinkProgress -= 0.03;
          if (blinkProgress <= 0) {
            blinkProgress = 0;
            blinkPhase = "brightening";
            blinkStarIndex = Math.floor(Math.random() * stars.length);
          }
        }

        const currentAlpha = bStar.baseAlpha + blinkProgress * (1 - bStar.baseAlpha);
        const flareSize = bStar.size * (1 + blinkProgress * 1.8);

        // Radiant halo
        const glowRadius = Math.max(6, flareSize * 4 * blinkProgress);
        const grad = ctx.createRadialGradient(bStar.x, bStar.y, 0, bStar.x, bStar.y, glowRadius);
        grad.addColorStop(0, `rgba(255, 255, 255, ${0.9 * blinkProgress})`);
        grad.addColorStop(0.4, `rgba(186, 230, 253, ${0.5 * blinkProgress})`);
        grad.addColorStop(1, "rgba(56, 189, 248, 0)");

        ctx.beginPath();
        ctx.arc(bStar.x, bStar.y, glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // 4-point cross diffraction flare
        const rayLen = (14 + bStar.size * 8) * blinkProgress;
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.85 * blinkProgress})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(bStar.x - rayLen, bStar.y);
        ctx.lineTo(bStar.x + rayLen, bStar.y);
        ctx.moveTo(bStar.x, bStar.y - rayLen);
        ctx.lineTo(bStar.x, bStar.y + rayLen);
        ctx.stroke();

        // Core
        ctx.beginPath();
        ctx.arc(bStar.x, bStar.y, flareSize, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
}

export function SpaceLogin({
  title = "Sign In",
  subtitle,
  astronautSrc,
  onSubmit,
  onForgotPassword,
  onSignUp,
  onSocialLogin,
  className,
  defaultEmail = "",
  showSocialButtons = true,
  glassVariant = "default",
}: SpaceLoginProps) {
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setIsLoading(true);
    try {
      if (onSubmit) {
        await onSubmit({ email, password, rememberMe });
      }
    } catch (err: any) {
      setError(err?.message || "Authentication failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleMode = () => {
    setIsSignUpMode(!isSignUpMode);
    setError(null);
    if (onSignUp) onSignUp();
  };

  const displayTitle = isSignUpMode ? "Sign Up" : title;

  return (
    <div
      className={cn(
        "min-h-screen w-full relative flex items-center justify-center bg-[#070911] text-white overflow-hidden p-4 select-none",
        className
      )}
    >
      {/* Dynamic Starfield Background */}
      <CosmicStarfield />

      {/* Cosmic ambient glow */}
      <div className="fixed -top-32 -right-32 w-96 h-96 rounded-full bg-indigo-500/20 blur-[120px] pointer-events-none" />
      <div className="fixed -bottom-32 -left-32 w-96 h-96 rounded-full bg-sky-500/15 blur-[120px] pointer-events-none" />

      {/* Main Glassmorphism Card */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[420px] relative z-10"
      >
        <div className="relative rounded-[28px] border border-white/10 bg-[#0e121d]/60 backdrop-blur-2xl p-8 sm:p-10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)]">
          {/* Header with Title and Shooting Star Streak */}
          <div className="relative text-center mb-8">
            <h1 className="text-4xl font-extrabold tracking-tight text-white drop-shadow-sm inline-block relative">
              {displayTitle}
              {/* Shooting Star Streak matching screenshot */}
              <span
                aria-hidden="true"
                className="absolute -top-1 -right-8 w-12 h-[2px] bg-gradient-to-r from-white via-white/40 to-transparent rotate-[50deg] rounded-full drop-shadow-[0_0_6px_rgba(255,255,255,0.9)] before:content-[''] before:absolute before:left-0 before:-top-[1px] before:w-1 before:h-1 before:rounded-full before:bg-white before:shadow-[0_0_8px_#ffffff]"
              />
            </h1>
            {subtitle && (
              <p className="text-sm text-neutral-400 mt-2 font-medium">{subtitle}</p>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Email Field */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-[15px] font-semibold text-white tracking-tight">
                Email
              </label>
              <GlassInput
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                variant={glassVariant}
                borderRadius={16}
                containerClassName="bg-[#151926]/75 border border-white/10 focus-within:border-white/40"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-[15px] font-semibold text-white tracking-tight">
                Password
              </label>
              <GlassInput
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                variant={glassVariant}
                borderRadius={16}
                containerClassName="bg-[#151926]/75 border border-white/10 focus-within:border-white/40"
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-neutral-400 hover:text-white transition-colors p-1"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                }
              />
            </div>

            {/* Error Message */}
            {error && (
              <p className="text-sm text-red-400 font-medium">{error}</p>
            )}

            {/* Remember Me & Forgot Password Row */}
            <div className="flex items-center justify-between text-sm pt-1">
              <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="sr-only peer"
                />
                <span className="w-4 h-4 rounded-[4px] border border-white/30 bg-white/5 flex items-center justify-center transition-all peer-checked:bg-white peer-checked:border-white">
                  <Check className="w-3 h-3 text-[#070911] opacity-0 peer-checked:opacity-100 transition-opacity" />
                </span>
                <span className="text-neutral-300 font-medium">Remember me</span>
              </label>

              {!isSignUpMode && (
                <button
                  type="button"
                  onClick={onForgotPassword}
                  className="text-neutral-300 hover:text-white font-medium transition-colors"
                >
                  Forget Password ?
                </button>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-[52px] rounded-[16px] bg-[#232737] hover:bg-[#2b3044] border border-white/15 text-white font-bold text-[16px] shadow-[0_8px_24px_rgba(0,0,0,0.4)] transition-all duration-150 flex items-center justify-center hover:-translate-y-0.5 active:translate-y-0"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isSignUpMode ? (
                "Create Account"
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Footer with Sign Up Toggle */}
          <div className="mt-6 text-center">
            <p className="text-sm text-neutral-400 font-medium">
              {isSignUpMode ? "Already Have an Account ? " : "Don’t Have an Account ? "}
              <button
                type="button"
                onClick={handleToggleMode}
                className="text-white font-bold hover:underline transition-opacity"
              >
                {isSignUpMode ? "Sign In" : "Sign Up"}
              </button>
            </p>

            {showSocialButtons && (
              <>
                {/* Subtle Divider */}
                <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-6" />

                {/* 5 Social Buttons */}
                <div className="flex items-center justify-between gap-2.5">
                  <button
                    type="button"
                    onClick={() => onSocialLogin?.("google")}
                    aria-label="Sign in with Google"
                    className="flex-1 h-12 max-w-[56px] rounded-[14px] bg-[#1b1f2c]/80 hover:bg-[#282e41] border border-white/10 hover:border-white/25 flex items-center justify-center text-white transition-all hover:-translate-y-0.5 shadow-sm"
                  >
                    <GoogleIcon className="w-5 h-5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onSocialLogin?.("github")}
                    aria-label="Sign in with GitHub"
                    className="flex-1 h-12 max-w-[56px] rounded-[14px] bg-[#1b1f2c]/80 hover:bg-[#282e41] border border-white/10 hover:border-white/25 flex items-center justify-center text-white transition-all hover:-translate-y-0.5 shadow-sm"
                  >
                    <GitHubIcon className="w-5 h-5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onSocialLogin?.("facebook")}
                    aria-label="Sign in with Facebook"
                    className="flex-1 h-12 max-w-[56px] rounded-[14px] bg-[#1b1f2c]/80 hover:bg-[#282e41] border border-white/10 hover:border-white/25 flex items-center justify-center text-white transition-all hover:-translate-y-0.5 shadow-sm"
                  >
                    <FacebookIcon className="w-5 h-5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onSocialLogin?.("windows")}
                    aria-label="Sign in with Microsoft / Windows"
                    className="flex-1 h-12 max-w-[56px] rounded-[14px] bg-[#1b1f2c]/80 hover:bg-[#282e41] border border-white/10 hover:border-white/25 flex items-center justify-center text-white transition-all hover:-translate-y-0.5 shadow-sm"
                  >
                    <WindowsIcon className="w-5 h-5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onSocialLogin?.("passkey")}
                    aria-label="Sign in with Passkey / Security Key"
                    className="flex-1 h-12 max-w-[56px] rounded-[14px] bg-[#1b1f2c]/80 hover:bg-[#282e41] border border-white/10 hover:border-white/25 flex items-center justify-center text-white transition-all hover:-translate-y-0.5 shadow-sm"
                  >
                    <KeyRound className="w-5 h-5" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default SpaceLogin;

