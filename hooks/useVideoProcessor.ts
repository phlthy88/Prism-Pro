import { useEffect, useRef, useState, useCallback } from 'react';
import { FilterState, AppSettings, PerfMetrics, FrameStats } from '../types';

// -------------------------------------------------------------------------
// WORKER CODE (Embedded)
// -------------------------------------------------------------------------

const WORKER_SCRIPT = `
// -------------------------------------------------------------------------
// WEBGL SHADERS
// -------------------------------------------------------------------------
const VERTEX_SHADER_GL = \`
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;
  uniform float u_mirror; // 0.0 or 1.0
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    // Mirroring logic
    vec2 coord = a_texCoord;
    if (u_mirror > 0.5) {
        coord.x = 1.0 - coord.x;
    }
    v_texCoord = coord;
  }
\`;

const FRAGMENT_SHADER_GL = \`
  precision mediump float;
  varying vec2 v_texCoord;
  uniform sampler2D u_image;
  uniform sampler2D u_lut; // 3D LUT (512x512)
  uniform sampler2D u_mask; // Segmentation Mask
  uniform vec2 u_resolution;

  // Filters
  uniform float u_brightness;
  uniform float u_contrast;
  uniform float u_saturation;
  uniform float u_hue;
  uniform float u_sepia;
  uniform float u_vignette;
  uniform float u_zoom;
  uniform float u_pan;
  uniform float u_tilt;
  uniform float u_blurStrength; 
  uniform float u_portraitLighting; 
  
  // Pro Sim Filters
  uniform float u_noise; // ISO Grain
  uniform bool u_falseColor; // IRE Heatmap
  uniform bool u_logProfile; // Flat Log Curve
  uniform float u_lowLightBoost; // Dynamic AI Boost
  
  // Strength controls
  uniform float u_lutIntensity; 
  uniform bool u_hasLut;
  uniform bool u_hasMask;

  // Assists
  uniform bool u_zebra;
  uniform bool u_peaking;

  // Helper for hue rotation
  vec3 hueShift(vec3 color, float angle) {
      float rad = angle * 3.14159 / 180.0;
      float c = cos(rad);
      float s = sin(rad);
      mat3 m = mat3(
          vec3(0.213 + c*0.787 - s*0.213, 0.715 - c*0.715 - s*0.715, 0.072 - c*0.072 + s*0.928),
          vec3(0.213 - c*0.213 + s*0.143, 0.715 + c*0.285 + s*0.140, 0.072 - c*0.072 - s*0.283),
          vec3(0.213 - c*0.213 - s*0.787, 0.715 - c*0.715 + s*0.715, 0.072 + c*0.928 + s*0.072)
      );
      return color * m;
  }
  
  // PRNG for Noise
  float rand(vec2 co){
      return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
  }

  // Sample from 512x512 2D texture simulating 64x64x64 3D LUT
  vec3 lookupTable(vec3 color) {
    float size = 64.0;
    float sliceSize = 1.0 / 8.0; 
    float slicePixelSize = sliceSize / 64.0;
    float width = 512.0;
    
    float blue = color.b * (size - 1.0);
    
    float slice0 = floor(blue);
    float slice1 = min(slice0 + 1.0, 63.0);
    
    float xOffset0 = mod(slice0, 8.0) * sliceSize;
    float yOffset0 = floor(slice0 / 8.0) * sliceSize;
    
    float xOffset1 = mod(slice1, 8.0) * sliceSize;
    float yOffset1 = floor(slice1 / 8.0) * sliceSize;
    
    vec2 uv0 = vec2(
       xOffset0 + (color.r * (size - 1.0) + 0.5) / width,
       yOffset0 + (color.g * (size - 1.0) + 0.5) / width
    );
    
    vec2 uv1 = vec2(
       xOffset1 + (color.r * (size - 1.0) + 0.5) / width,
       yOffset1 + (color.g * (size - 1.0) + 0.5) / width
    );
    
    vec3 c0 = texture2D(u_lut, uv0).rgb;
    vec3 c1 = texture2D(u_lut, uv1).rgb;
    
    return mix(c0, c1, fract(blue));
  }

  // Simple Box Blur
  vec3 blurSample(sampler2D image, vec2 uv, vec2 resolution, float strength) {
    vec3 color = vec3(0.0);
    float total = 0.0;
    float spread = strength * 4.0;
    for(float x = -2.0; x <= 2.0; x++) {
        for(float y = -2.0; y <= 2.0; y++) {
            vec2 offset = vec2(x, y) * spread / resolution;
            color += texture2D(image, uv + offset).rgb;
            total += 1.0;
        }
    }
    return color / total;
  }

  void main() {
    // Zoom & Pan Logic
    vec2 uv = v_texCoord;
    uv = (uv - 0.5) / u_zoom + 0.5 - vec2(u_pan * 0.5 / u_zoom, u_tilt * 0.5 / u_zoom);

    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
       gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
       return;
    }

    vec4 color = texture2D(u_image, uv);
    vec3 originalRgb = color.rgb;
    vec3 rgb = originalRgb;

    // --- BLUR / MASKING / PORTRAIT LIGHTING ---
    if (u_hasMask) {
       float m = texture2D(u_mask, uv).r; 
       m = smoothstep(0.3, 0.7, m); 

       if (u_blurStrength > 0.0) {
           vec3 blurred = blurSample(u_image, uv, u_resolution, u_blurStrength);
           rgb = mix(blurred, originalRgb, m);
           originalRgb = rgb; 
       }
       if (u_portraitLighting > 0.0) {
           vec3 litPerson = rgb * (1.0 + u_portraitLighting * 0.25);
           litPerson = (litPerson - 0.5) * (1.0 + u_portraitLighting * 0.15) + 0.5;
           rgb = mix(rgb, litPerson, m);
       }
    }

    // --- GRADING ---
    
    // Auto Low Light Boost (Pre-Grading gain)
    rgb *= (1.0 + u_lowLightBoost);

    rgb *= u_brightness;
    rgb = (rgb - 0.5) * u_contrast + 0.5;

    float luma = dot(rgb, vec3(0.299, 0.587, 0.114));
    rgb = mix(vec3(luma), rgb, u_saturation);

    if (u_hue != 0.0) rgb = hueShift(rgb, u_hue);

    if (u_sepia > 0.0) {
       vec3 sepiaColor = vec3(
          dot(rgb, vec3(0.393, 0.769, 0.189)),
          dot(rgb, vec3(0.349, 0.686, 0.168)),
          dot(rgb, vec3(0.272, 0.534, 0.131))
       );
       rgb = mix(rgb, sepiaColor, u_sepia);
    }
    
    // --- PRO SIMULATION ---
    
    // Log Profile (Simulated Flat Gamma Curve)
    if (u_logProfile) {
        // Lift shadows, compress highlights, desaturate slightly
        rgb = pow(rgb, vec3(1.0 / 2.2)); // Convert to linear-ish
        rgb = log2(rgb * 15.0 + 1.0) / 4.0; // Basic Log approximation
    }
    
    // ISO Noise Simulation
    if (u_noise > 0.0) {
        float grain = rand(uv + vec2(u_noise, u_noise));
        // Blend noise based on luminance (more visible in shadows/mids)
        rgb += (grain - 0.5) * (u_noise * 0.3);
    }
    
    if (u_hasLut) {
       vec3 lutRgb = clamp(rgb, 0.0, 1.0);
       rgb = lookupTable(lutRgb);
    }
    
    rgb = mix(originalRgb, rgb, u_lutIntensity);

    if (u_vignette > 0.0) {
      float dist = distance(v_texCoord, vec2(0.5));
      rgb *= smoothstep(0.8, 0.8 - u_vignette * 0.5, dist);
    }

    // --- ASSISTS --- 
    
    // False Color (IRE Heatmap)
    if (u_falseColor) {
        float i = dot(rgb, vec3(0.299, 0.587, 0.114));
        if (i < 0.05) rgb = vec3(0.5, 0.0, 0.5); // Purple (Crushed Blacks)
        else if (i < 0.15) rgb = vec3(0.0, 0.0, 1.0); // Blue (Deep Shadow)
        else if (i < 0.25) rgb = vec3(0.0, 0.5, 1.0); // Cyan (Shadow)
        else if (i > 0.95) rgb = vec3(1.0, 0.0, 0.0); // Red (Clipping)
        else if (i > 0.85) rgb = vec3(1.0, 1.0, 0.0); // Yellow (Near Clip)
        else if (i > 0.45 && i < 0.55) rgb = vec3(0.0, 1.0, 0.0); // Green (Middle Grey)
        else rgb = vec3(i); // Grey scale for rest
    }

    if (u_zebra) {
       float zLuma = dot(rgb, vec3(0.299, 0.587, 0.114));
       if (zLuma > 0.95) {
          if (mod(gl_FragCoord.x + gl_FragCoord.y, 20.0) < 10.0) {
             rgb = vec3(1.0, 0.0, 0.0); 
          }
       }
    }

    if (u_peaking) {
       float dx = 1.0 / u_resolution.x;
       float dy = 1.0 / u_resolution.y;
       vec3 cLeft = texture2D(u_image, uv + vec2(-dx, 0.0)).rgb;
       vec3 cRight = texture2D(u_image, uv + vec2(dx, 0.0)).rgb;
       vec3 cUp = texture2D(u_image, uv + vec2(0.0, -dy)).rgb;
       vec3 cDown = texture2D(u_image, uv + vec2(0.0, dy)).rgb;
       float edge = length(cLeft - cRight) + length(cUp - cDown);
       if (edge > 0.2) { 
          rgb = vec3(0.0, 1.0, 0.0); 
       }
    }

    gl_FragColor = vec4(rgb, 1.0);
  }
\`;

const WGSL_SHADER = \`
struct Uniforms {
  brightness : f32,
  contrast : f32,
  saturation : f32,
  hue : f32,
  sepia : f32,
  vignette : f32,
  zoom : f32,
  pan : f32,
  tilt : f32,
  // Bools are passed as f32 (0.0 or 1.0) due to alignment
  mirror : f32,
  lowLightBoost : f32, 
}

@group(0) @binding(0) var mySampler : sampler;
@group(0) @binding(1) var myTexture : texture_external;
@group(0) @binding(2) var<uniform> u : Uniforms;

struct VertexOutput {
  @builtin(position) Position : vec4<f32>,
  @location(0) fragUV : vec2<f32>,
}

@vertex
fn vert_main(@builtin(vertex_index) VertexIndex : u32) -> VertexOutput {
  var pos = array<vec2<f32>, 6>(
    vec2(-1.0, -1.0), vec2(1.0, -1.0), vec2(-1.0, 1.0),
    vec2(-1.0, 1.0), vec2(1.0, -1.0), vec2(1.0, 1.0)
  );
  // UVs flipped Y for WebGPU coord system match
  var uv = array<vec2<f32>, 6>(
    vec2(0.0, 1.0), vec2(1.0, 1.0), vec2(0.0, 0.0),
    vec2(0.0, 0.0), vec2(1.0, 1.0), vec2(1.0, 0.0)
  );

  var output : VertexOutput;
  output.Position = vec4<f32>(pos[VertexIndex], 0.0, 1.0);
  output.fragUV = uv[VertexIndex];
  
  // Mirror Logic in Vertex
  if (u.mirror > 0.5) {
     output.fragUV.x = 1.0 - output.fragUV.x;
  }
  
  return output;
}

@fragment
fn frag_main(@location(0) fragUV : vec2<f32>) -> @location(0) vec4<f32> {
  // Zoom/Pan
  var uv = fragUV;
  uv = (uv - 0.5) / u.zoom + 0.5 - vec2(u.pan * 0.5 / u.zoom, u.tilt * 0.5 / u.zoom);
  
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
      return vec4<f32>(0.0, 0.0, 0.0, 1.0);
  }

  var color = textureSampleBaseClampToEdge(myTexture, mySampler, uv);
  var rgb = color.rgb;

  // Basic Grading 
  
  // Auto Low Light Boost
  rgb = rgb * (1.0 + u.lowLightBoost);
  
  // Brightness
  rgb = rgb * u.brightness;
  
  // Contrast
  rgb = (rgb - 0.5) * u.contrast + 0.5;
  
  // Saturation
  let luma = dot(rgb, vec3<f32>(0.299, 0.587, 0.114));
  rgb = mix(vec3<f32>(luma), rgb, u.saturation);
  
  // Vignette
  if (u.vignette > 0.0) {
      let dist = distance(fragUV, vec2<f32>(0.5));
      let v = smoothstep(0.8, 0.8 - u.vignette * 0.5, dist);
      rgb = rgb * v;
  }

  return vec4<f32>(rgb, 1.0);
}
\`;

// -------------------------------------------------------------------------
// WORKER GLOBALS
// -------------------------------------------------------------------------
let backend = 'webgl'; // 'webgl' or 'webgpu'

// WebGL Globals
let gl = null;
let program = null;
let positionLocation, texCoordLocation;
let positionBuffer, texCoordBuffer;
let texture = null;
let lutTexture = null;
let maskTexture = null; 
let u_resolution, u_brightness, u_contrast, u_saturation, u_hue, u_sepia, u_vignette, u_zoom, u_pan, u_tilt;
let u_zebra, u_peaking, u_blurStrength, u_portraitLighting, u_mirror;
let u_image, u_lut, u_mask, u_hasLut, u_hasMask, u_lutIntensity;
let u_noise, u_falseColor, u_logProfile, u_lowLightBoost;

// WebGPU Globals
let gpuDevice = null;
let gpuContext = null;
let gpuPipeline = null;
let gpuUniformBuffer = null;
let gpuSampler = null;
let gpuBindGroup = null;

let width = 1920;
let height = 1080;
let hasLut = false;
let maskTextureValid = false;
let histoCanvas = null;
let histoCtx = null;

// Luma Tracking for Auto Low Light
let smoothedLuma = 0.5;

// -------------------------------------------------------------------------
// WEBGL FUNCTIONS
// -------------------------------------------------------------------------
function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return null;
  return shader;
}

function createProgram(gl, vertexShader, fragmentShader) {
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  return program;
}

function initWebGL(canvas, w, h, config) {
  const contextAttributes = { 
    alpha: false, 
    desynchronized: config && config.crostiniSafe ? true : false, 
    powerPreference: 'high-performance', 
    antialias: false,
    preserveDrawingBuffer: false
  };

  gl = canvas.getContext('webgl2', contextAttributes) || canvas.getContext('webgl', contextAttributes);
  
  if (!gl) return false;
  width = w;
  height = h;
  gl.viewport(0, 0, width, height);

  const vs = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_GL);
  const fs = createShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER_GL);
  if (!vs || !fs) return false;

  program = createProgram(gl, vs, fs);
  if (!program) return false;

  gl.useProgram(program);

  // Attributes
  positionLocation = gl.getAttribLocation(program, "a_position");
  texCoordLocation = gl.getAttribLocation(program, "a_texCoord");

  // Uniforms
  u_resolution = gl.getUniformLocation(program, "u_resolution");
  u_mirror = gl.getUniformLocation(program, "u_mirror");
  u_brightness = gl.getUniformLocation(program, "u_brightness");
  u_contrast = gl.getUniformLocation(program, "u_contrast");
  u_saturation = gl.getUniformLocation(program, "u_saturation");
  u_hue = gl.getUniformLocation(program, "u_hue");
  u_sepia = gl.getUniformLocation(program, "u_sepia");
  u_vignette = gl.getUniformLocation(program, "u_vignette");
  u_zoom = gl.getUniformLocation(program, "u_zoom");
  u_pan = gl.getUniformLocation(program, "u_pan");
  u_tilt = gl.getUniformLocation(program, "u_tilt");
  u_blurStrength = gl.getUniformLocation(program, "u_blurStrength");
  u_portraitLighting = gl.getUniformLocation(program, "u_portraitLighting");
  u_zebra = gl.getUniformLocation(program, "u_zebra");
  u_peaking = gl.getUniformLocation(program, "u_peaking");
  u_image = gl.getUniformLocation(program, "u_image");
  u_lut = gl.getUniformLocation(program, "u_lut");
  u_mask = gl.getUniformLocation(program, "u_mask");
  u_hasLut = gl.getUniformLocation(program, "u_hasLut");
  u_hasMask = gl.getUniformLocation(program, "u_hasMask");
  u_lutIntensity = gl.getUniformLocation(program, "u_lutIntensity");
  u_noise = gl.getUniformLocation(program, "u_noise");
  u_falseColor = gl.getUniformLocation(program, "u_falseColor");
  u_logProfile = gl.getUniformLocation(program, "u_logProfile");
  u_lowLightBoost = gl.getUniformLocation(program, "u_lowLightBoost");

  // Buffers
  positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

  texCoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0]), gl.STATIC_DRAW);

  // Textures
  texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  
  maskTexture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, maskTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  return true;
}

function handleLutData(bitmap) {
  if (backend !== 'webgl' || !gl || !program) return;
  if (!lutTexture) lutTexture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, lutTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
  hasLut = true;
  bitmap.close();
}

function renderWebGL(msg, stats) {
  if (!gl || !program || !texture) return;
  const { bitmap, mask, filters, settings } = msg;

  gl.useProgram(program);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);

  if (mask) {
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, maskTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mask);
    maskTextureValid = true;
    mask.close();
  }
  
  const useMask = maskTextureValid && (filters.blur > 0 || filters.portraitLighting > 0);

  gl.enableVertexAttribArray(positionLocation);
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

  gl.enableVertexAttribArray(texCoordLocation);
  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
  gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);

  gl.uniform2f(u_resolution, width, height);
  gl.uniform1f(u_mirror, settings.mirror ? 1.0 : 0.0);
  gl.uniform1i(u_image, 0);
  gl.uniform1i(u_lut, 1);
  gl.uniform1i(u_mask, 2);
  
  const baseBrightness = 1.0 + (filters.exposure * 0.15); 
  const baseContrast = 1.0 + ((filters.iso - 400.0) / 3000.0) * 0.2;
  const tempSepia = filters.temp > 5600.0 ? (filters.temp - 5600.0) / 5000.0 : 0.0;
  const tempHue = filters.temp < 5600.0 ? (filters.temp - 5600.0) / 200.0 : 0.0;

  gl.uniform1f(u_brightness, baseBrightness * filters.brightness);
  gl.uniform1f(u_contrast, baseContrast * filters.contrast);
  gl.uniform1f(u_saturation, filters.saturation);
  gl.uniform1f(u_hue, tempHue + filters.hue);
  gl.uniform1f(u_sepia, Math.min(1.0, tempSepia + filters.sepia));
  gl.uniform1f(u_vignette, filters.vignette);
  gl.uniform1f(u_zoom, filters.zoom);
  gl.uniform1f(u_pan, filters.pan);
  gl.uniform1f(u_tilt, filters.tilt);
  gl.uniform1f(u_blurStrength, filters.blur);
  gl.uniform1f(u_portraitLighting, filters.portraitLighting);
  
  const normIso = (filters.iso - 100.0) / 3100.0;
  gl.uniform1f(u_noise, normIso); 
  gl.uniform1i(u_falseColor, filters.falseColor ? 1 : 0);
  gl.uniform1i(u_logProfile, filters.logProfile ? 1 : 0);
  
  // Calculate AI Low Light Boost
  let boost = 0.0;
  if (settings.autoLowLight && stats && stats.smoothedLuma !== undefined) {
      // Target Luma ~0.45. If below, boost.
      const target = 0.45;
      if (stats.smoothedLuma < target) {
          // Progressive boost curve
          boost = (target - stats.smoothedLuma) * 3.0; // Max boost around 1.35x gain if black
      }
  }
  gl.uniform1f(u_lowLightBoost, boost);
  
  gl.uniform1i(u_zebra, settings.zebraStripes ? 1 : 0);
  gl.uniform1i(u_peaking, settings.focusPeaking ? 1 : 0);
  
  gl.uniform1i(u_hasLut, hasLut ? 1 : 0);
  gl.uniform1i(u_hasMask, useMask ? 1 : 0);
  gl.uniform1f(u_lutIntensity, filters.lutIntensity);

  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

// -------------------------------------------------------------------------
// WEBGPU FUNCTIONS
// -------------------------------------------------------------------------
async function initWebGPU(canvas, w, h) {
  if (!navigator.gpu) return false;
  
  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) return false;
    
    gpuDevice = await adapter.requestDevice();
    gpuContext = canvas.getContext('webgpu');
    
    const format = navigator.gpu.getPreferredCanvasFormat();
    gpuContext.configure({
      device: gpuDevice,
      format: format,
      alphaMode: 'premultiplied', // Standard for canvas
    });
    
    width = w;
    height = h;

    // Create Shader Module
    const shaderModule = gpuDevice.createShaderModule({ code: WGSL_SHADER });
    
    // Create Uniform Buffer
    const uniformBufferSize = 64; 
    gpuUniformBuffer = gpuDevice.createBuffer({
      size: uniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Create Sampler
    gpuSampler = gpuDevice.createSampler({
      magFilter: 'linear',
      minFilter: 'linear',
    });

    // Create Pipeline
    gpuPipeline = gpuDevice.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: shaderModule,
        entryPoint: 'vert_main',
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'frag_main',
        targets: [{ format: format }],
      },
      primitive: {
        topology: 'triangle-list',
      },
    });
    
    return true;
  } catch (e) {
    console.error("WebGPU Init Failed:", e);
    return false;
  }
}

function renderWebGPU(msg, stats) {
  if (!gpuDevice || !gpuContext || !gpuPipeline) return;
  
  const { bitmap, filters, settings } = msg;
  
  // Calculate AI Low Light Boost
  let boost = 0.0;
  if (settings.autoLowLight && stats && stats.smoothedLuma !== undefined) {
      const target = 0.45;
      if (stats.smoothedLuma < target) {
          boost = (target - stats.smoothedLuma) * 3.0; 
      }
  }
  
  // 1. Update Uniforms
  const baseBrightness = 1.0 + (filters.exposure * 0.15); 
  const baseContrast = 1.0 + ((filters.iso - 400.0) / 3000.0) * 0.2;
  const tempSepia = filters.temp > 5600.0 ? (filters.temp - 5600.0) / 5000.0 : 0.0;
  
  const uniformData = new Float32Array([
    baseBrightness * filters.brightness, // brightness
    baseContrast * filters.contrast, // contrast
    filters.saturation, // saturation
    filters.hue, // hue
    Math.min(1.0, tempSepia + filters.sepia), // sepia
    filters.vignette, // vignette
    filters.zoom, // zoom
    filters.pan, // pan
    filters.tilt, // tilt
    settings.mirror ? 1.0 : 0.0, // mirror
    boost // lowLightBoost
  ]);
  
  gpuDevice.queue.writeBuffer(gpuUniformBuffer, 0, uniformData);

  // 2. Create Texture from Bitmap (Zero-Copy!)
  const externalTexture = gpuDevice.importExternalTexture({ source: bitmap });

  // 3. Create BindGroup (must be done per frame for externalTexture)
  const bindGroup = gpuDevice.createBindGroup({
    layout: gpuPipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: gpuSampler },
      { binding: 1, resource: externalTexture },
      { binding: 2, resource: { buffer: gpuUniformBuffer } },
    ],
  });

  // 4. Render Pass
  const commandEncoder = gpuDevice.createCommandEncoder();
  const textureView = gpuContext.getCurrentTexture().createView();
  
  const renderPassDescriptor = {
    colorAttachments: [{
      view: textureView,
      clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
      loadOp: 'clear',
      storeOp: 'store',
    }],
  };

  const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
  passEncoder.setPipeline(gpuPipeline);
  passEncoder.setBindGroup(0, bindGroup);
  passEncoder.draw(6);
  passEncoder.end();

  gpuDevice.queue.submit([commandEncoder.finish()]);
}

// -------------------------------------------------------------------------
// STATS CALCULATOR (Shared)
// -------------------------------------------------------------------------
function computeStats(bitmap, settings) {
  let stats = { histogram: [], lumaAvg: 0, smoothedLuma: 0 };
  
  if (!histoCanvas) {
     histoCanvas = new OffscreenCanvas(64, 64);
     histoCtx = histoCanvas.getContext('2d', { willReadFrequently: true });
  }
  
  if (histoCtx) {
    histoCtx.drawImage(bitmap, 0, 0, 64, 64);
    const data = histoCtx.getImageData(0, 0, 64, 64).data;
    
    const buckets = new Array(16).fill(0);
    let totalLuma = 0;
    
    for (let i = 0; i < data.length; i += 4) {
       const luma = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
       totalLuma += luma;
       if (settings.histogram) {
           const idx = Math.floor((luma / 255) * 16);
           if (idx < 16) buckets[idx]++;
       }
    }
    
    const currentAvg = (totalLuma / (64 * 64)) / 255;
    smoothedLuma = smoothedLuma * 0.9 + currentAvg * 0.1;
    stats.lumaAvg = currentAvg * 255; 
    stats.smoothedLuma = smoothedLuma;

    if (settings.histogram) {
        const max = Math.max(...buckets, 1);
        stats.histogram = buckets.map(b => (b / max) * 100);
    }
    
    if (settings.scopes) {
       const rBuckets = new Array(32).fill(0);
       const gBuckets = new Array(32).fill(0);
       const bBuckets = new Array(32).fill(0);
       
       for (let i = 0; i < data.length; i += 4) {
           const rIdx = Math.floor((data[i] / 255) * 32);
           const gIdx = Math.floor((data[i+1] / 255) * 32);
           const bIdx = Math.floor((data[i+2] / 255) * 32);
           if (rIdx < 32) rBuckets[rIdx]++;
           if (gIdx < 32) gBuckets[gIdx]++;
           if (bIdx < 32) bBuckets[bIdx]++;
       }
       const maxR = Math.max(...rBuckets, 1);
       const maxG = Math.max(...gBuckets, 1);
       const maxB = Math.max(...bBuckets, 1);
       
       stats.rgbParade = {
          r: rBuckets.map(b => (b / maxR) * 100),
          g: gBuckets.map(b => (b / maxG) * 100),
          b: bBuckets.map(b => (b / maxB) * 100)
       };
    }
  }
  return stats;
}

self.onmessage = async (e) => {
  const data = e.data;
  
  if (data.type === 'INIT') {
    const preferWebGPU = data.config && data.config.webGpuEnabled;
    let success = false;
    
    if (preferWebGPU && navigator.gpu) {
       success = await initWebGPU(data.canvas, data.width, data.height);
       if (success) backend = 'webgpu';
    }
    
    if (!success) {
       backend = 'webgl';
       initWebGL(data.canvas, data.width, data.height, data.config);
    }
    
  } else if (data.type === 'FRAME') {
    const stats = computeStats(data.bitmap, data.settings);
    
    if (backend === 'webgpu') {
       renderWebGPU(data, stats);
    } else {
       renderWebGL(data, stats);
    }
    
    data.bitmap.close();
    
    self.postMessage({ 
       type: 'FRAME_DONE', 
       timestamp: performance.now(),
       stats
    });
  } else if (data.type === 'LUT_DATA') {
    handleLutData(data.bitmap);
  }
};
`;

// -------------------------------------------------------------------------
// HOOK
// -------------------------------------------------------------------------

export const useVideoProcessor = (
    videoRef: React.RefObject<HTMLVideoElement>,
    canvas: HTMLCanvasElement | null,
    stream: MediaStream | null,
    filters: FilterState,
    settings: AppSettings,
    getLatestMask: () => ImageBitmap | null
) => {
  const workerRef = useRef<Worker | null>(null);
  const [metrics, setMetrics] = useState<PerfMetrics>({ fps: 0, frameTime: 0 });
  const [frameStats, setFrameStats] = useState<FrameStats>({ histogram: [] });
  const requestRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);
  const isWorkerBusyRef = useRef(false);
  const initializedCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initialize Worker
  useEffect(() => {
     try {
         const blob = new Blob([WORKER_SCRIPT], { type: 'application/javascript' });
         const url = URL.createObjectURL(blob);
         const worker = new Worker(url);
         
         worker.onmessage = (e) => {
             const { type, timestamp, stats } = e.data;
             if (type === 'FRAME_DONE') {
                 isWorkerBusyRef.current = false;
                 
                 const now = performance.now();
                 const frameTime = now - timestamp;
                 const fps = 1000 / (now - lastFrameTimeRef.current);
                 lastFrameTimeRef.current = now;
                 
                 setMetrics(prev => ({
                    fps: Math.round(fps),
                    frameTime: frameTime,
                    memory: (performance as any).memory ? Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024) : undefined
                 }));
                 
                 if (stats) setFrameStats(stats);
             }
         };
         
         workerRef.current = worker;
         
         return () => {
             worker.terminate();
             URL.revokeObjectURL(url);
             workerRef.current = null;
         };
     } catch(e) {
         console.error("Worker Init Error", e);
     }
  }, []);

  // Initialize Canvas in Worker
  useEffect(() => {
     if (canvas && workerRef.current && canvas !== initializedCanvasRef.current) {
         try {
             // Only transfer if we haven't already. 
             // Note: In StrictMode, this might fail on double invoke, so we need to be careful.
             // We check initializedCanvasRef to track the instance.
             const offscreen = canvas.transferControlToOffscreen();
             workerRef.current.postMessage({
                 type: 'INIT',
                 canvas: offscreen,
                 width: canvas.width,
                 height: canvas.height,
                 config: { 
                     crostiniSafe: settings.crostiniSafe,
                     webGpuEnabled: settings.webGpuEnabled
                 }
             }, [offscreen]);
             
             initializedCanvasRef.current = canvas;
         } catch(e) {
             console.warn("Canvas transfer failed (likely already transferred)", e);
         }
     }
  }, [canvas, settings.crostiniSafe, settings.webGpuEnabled]);

  // Frame Loop
  useEffect(() => {
     const loop = async () => {
         if (
             workerRef.current && 
             videoRef.current && 
             videoRef.current.readyState >= 2 && 
             !isWorkerBusyRef.current &&
             stream
         ) {
             try {
                 const video = videoRef.current;
                 const bitmap = await createImageBitmap(video);
                 
                 // Check for segmentation mask
                 const mask = getLatestMask();
                 const transfer = [bitmap];
                 if (mask) transfer.push(mask);
                 
                 isWorkerBusyRef.current = true;
                 
                 workerRef.current.postMessage({
                     type: 'FRAME',
                     bitmap,
                     mask,
                     filters,
                     settings: {
                         histogram: settings.histogram,
                         scopes: settings.scopes,
                         zebraStripes: settings.zebraStripes,
                         focusPeaking: settings.focusPeaking,
                         mirror: settings.mirror,
                         autoLowLight: settings.autoLowLight
                     }
                 }, transfer);
             } catch(e) {
                 isWorkerBusyRef.current = false;
                 // Frame skipped (e.g., video not ready or tab backgrounded)
             }
         }
         requestRef.current = requestAnimationFrame(loop);
     };
     
     if (stream) {
         requestRef.current = requestAnimationFrame(loop);
     }
     
     return () => cancelAnimationFrame(requestRef.current);
  }, [stream, filters, settings, getLatestMask]);

  const loadLut = useCallback((file: File) => {
      if (!workerRef.current) return;
      createImageBitmap(file).then(bitmap => {
          workerRef.current?.postMessage({ type: 'LUT_DATA', bitmap }, [bitmap]);
      }).catch(err => console.error("Failed to load LUT", err));
  }, []);

  return { metrics, loadLut, frameStats };
};
