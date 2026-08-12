"use client";

import { useEffect, useRef, useState } from "react";

/**
 * BlueMeshyBackground
 * ---------------------------------------------------------------------------
 * The S47 DIGITAL hero's primary atmospheric effect: a WebGL2 fragment shader
 * that warps a thin connective grid with flow noise and lights sparse "node"
 * points at its intersections — meant to read as a network of synchronized
 * systems, not water, lava, or a gaming particle field.
 *
 * Design constraints this component honors:
 * - Single WebGL2 context, created once, fully torn down on unmount.
 * - requestAnimationFrame loop, cancelled on unmount and paused when the tab
 *   is hidden (Page Visibility API).
 * - devicePixelRatio capped so 3-4x phones don't render 4x the pixels.
 * - Mobile gets a cheaper shader variant (fewer FBM octaves, sparser grid).
 * - prefers-reduced-motion freezes the animation on a single static frame.
 * - No WebGL2 -> premium static CSS gradient fallback, never a blank/broken
 *   hero.
 */

const VERTEX_SHADER = `#version 300 es
  layout(location = 0) in vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

// Fragment shader — S47 palette flow mesh.
// u_quality: 0 = mobile/low-power (cheaper), 1 = desktop (full detail).
const FRAGMENT_SHADER = `#version 300 es
  precision highp float;

  uniform vec2 u_resolution;
  uniform float u_time;
  uniform float u_quality;

  out vec4 outColor;

  // Hash / noise helpers (cheap, no texture lookups).
  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  float fbm(vec2 p, int octaves) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
      if (i >= octaves) break;
      value += amplitude * noise(p);
      p *= 2.02;
      amplitude *= 0.55;
    }
    return value;
  }

  // S47 brand colors.
  const vec3 NEARBLACK = vec3(0.024, 0.024, 0.039);
  const vec3 NAVY      = vec3(0.043, 0.071, 0.125);
  const vec3 INDIGO    = vec3(0.075, 0.102, 0.20);
  const vec3 COBALT    = vec3(0.239, 0.42, 1.0);
  const vec3 VIOLET    = vec3(0.545, 0.361, 0.965);
  const vec3 CYAN      = vec3(0.133, 0.827, 0.933);

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    vec2 p = uv - 0.5;
    p.x *= u_resolution.x / u_resolution.y;

    float t = u_time * 0.045;
    int octaves = u_quality > 0.5 ? 4 : 2;

    // Domain-warped flow field: gives the grid a slow, connected drift
    // instead of a rigid static lattice.
    vec2 warp = vec2(
      fbm(p * 1.4 + vec2(t, -t * 0.6), octaves),
      fbm(p * 1.4 + vec2(-t * 0.5, t), octaves)
    );
    vec2 flowUv = p + (warp - 0.5) * 0.35;

    // Base gradient: near-black canvas warming toward navy/indigo at center.
    float centerFalloff = smoothstep(0.95, 0.0, length(p));
    vec3 color = mix(NEARBLACK, mix(NAVY, INDIGO, 0.6), centerFalloff * 0.85);

    // Connective grid, warped by the flow field.
    float gridScale = u_quality > 0.5 ? 9.0 : 6.0;
    vec2 grid = abs(fract(flowUv * gridScale) - 0.5);
    float lineWidth = 0.028;
    float lines = smoothstep(lineWidth, 0.0, min(grid.x, grid.y));

    float lineTone = fbm(flowUv * 0.8 + t, 2);
    vec3 lineColor = mix(COBALT, VIOLET, lineTone);
    color += lines * lineColor * 0.4 * centerFalloff;

    // Node points at grid intersections — sparse, staggered pulse, mostly
    // cobalt/violet with only an occasional controlled cyan highlight.
    vec2 cell = floor(flowUv * gridScale);
    float nodeSeed = hash21(cell);
    if (nodeSeed > 0.82) {
      vec2 cellUv = fract(flowUv * gridScale) - 0.5;
      float dist = length(cellUv);
      float pulse = 0.5 + 0.5 * sin(t * 6.0 + nodeSeed * 20.0);
      float node = smoothstep(0.14, 0.0, dist) * (0.35 + 0.65 * pulse);
      vec3 nodeColor = nodeSeed > 0.965 ? CYAN : mix(COBALT, VIOLET, fract(nodeSeed * 7.0));
      color += node * nodeColor * centerFalloff;
    }

    // Two soft directional glows echoing the logo's cobalt/violet lighting.
    float glowA = smoothstep(0.9, 0.0, length(p - vec2(-0.32, 0.22)));
    float glowB = smoothstep(0.95, 0.0, length(p - vec2(0.36, -0.18)));
    color += glowA * VIOLET * 0.12;
    color += glowB * COBALT * 0.12;

    // Vignette keeps edges settled at near-black so foreground text always
    // reads cleanly regardless of layout.
    float vignette = smoothstep(1.05, 0.25, length(p));
    color = mix(NEARBLACK, color, vignette);

    outColor = vec4(color, 1.0);
  }
`;

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("[BlueMeshyBackground] shader compile error:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl: WebGL2RenderingContext): WebGLProgram | null {
  const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  if (!vs || !fs) return null;

  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);

  // Shaders are flagged for deletion but stay alive until the program using
  // them is deleted — safe to detach/delete immediately after linking.
  gl.deleteShader(vs);
  gl.deleteShader(fs);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("[BlueMeshyBackground] program link error:", gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

export function BlueMeshyBackground({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl2", {
      antialias: false,
      alpha: false,
      powerPreference: "low-power",
    });
    if (!gl) {
      setSupported(false);
      return;
    }

    const program = createProgram(gl);
    if (!program) {
      setSupported(false);
      return;
    }

    // Single fullscreen triangle — cheaper than a quad, no unused fragments.
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW
    );
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const u_resolution = gl.getUniformLocation(program, "u_resolution");
    const u_time = gl.getUniformLocation(program, "u_time");
    const u_quality = gl.getUniformLocation(program, "u_quality");

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    const quality = isMobile ? 0 : 1;
    const dprCap = isMobile ? 1.5 : 2;

    let rafId = 0;
    const startTime = performance.now();
    const frozenTime = 0.4; // a pleasant static frame when motion is reduced
    let destroyed = false;

    function resize() {
      if (!canvas || !gl) return;
      const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
      const width = Math.round(canvas.clientWidth * dpr);
      const height = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
    }

    function render(now: number) {
      if (destroyed || !gl) return;
      resize();
      gl.useProgram(program);
      gl.uniform2f(u_resolution, canvas!.width, canvas!.height);
      gl.uniform1f(u_quality, quality);
      gl.uniform1f(u_time, reducedMotion ? frozenTime : (now - startTime) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!reducedMotion) {
        rafId = requestAnimationFrame(render);
      }
    }

    function handleVisibility() {
      if (document.hidden) {
        cancelAnimationFrame(rafId);
      } else if (!reducedMotion) {
        // A time jump after being paused is fine for an ambient background —
        // just resume the loop rather than reconciling elapsed time.
        rafId = requestAnimationFrame(render);
      }
    }

    resize();
    rafId = requestAnimationFrame(render);
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      destroyed = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", handleVisibility);
      gl.deleteBuffer(positionBuffer);
      gl.deleteProgram(program);
      const lossExt = gl.getExtension("WEBGL_lose_context");
      lossExt?.loseContext();
    };
  }, []);

  if (!supported) {
    return (
      <div
        aria-hidden
        className={`absolute inset-0 ${className}`}
        style={{
          background:
            "radial-gradient(60% 50% at 30% 25%, rgba(139,92,246,0.16), transparent 70%)," +
            "radial-gradient(55% 45% at 72% 70%, rgba(61,107,255,0.16), transparent 70%)," +
            "linear-gradient(180deg, #0b1220 0%, #06060a 70%)",
        }}
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={`absolute inset-0 h-full w-full ${className}`}
    />
  );
}
