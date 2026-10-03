import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { ThreeMFLoader } from "three/examples/jsm/loaders/3MFLoader.js";
import { AMFLoader } from "three/examples/jsm/loaders/AMFLoader.js";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Box } from "lucide-react";

/* Every 3D-print file type we preview exactly as-uploaded. */
export const SUPPORTED_MODEL_EXTS = ["stl", "obj", "3mf", "amf", "ply", "glb", "gltf"];
export const SUPPORTED_MODEL_ACCEPT = ".stl,.obj,.3mf,.amf,.ply,.glb,.gltf";

/**
 * Pull every mesh geometry out of a parsed object (OBJ/3MF/AMF/GLTF…),
 * baking each mesh's world transform so the merged result matches the
 * file exactly — position, rotation and scale included.
 */
function extractGeometriesFromObject(obj) {
  const list = [];
  if (!obj) return list;
  obj.updateWorldMatrix(true, true);
  obj.traverse((child) => {
    if (child.isMesh && child.geometry && child.geometry.attributes?.position) {
      const g = child.geometry.clone();
      g.applyMatrix4(child.matrixWorld);
      // Drop empty shells (some exporters emit zero-triangle groups).
      if (g.attributes.position.count > 0) list.push(g.toNonIndexed ? g.toNonIndexed() : g);
      else g.dispose?.();
    }
  });
  return list;
}

/**
 * Merge a list of (non-indexed) BufferGeometries into one, so volume /
 * area / support analysis and the preview all describe the WHOLE model —
 * not just the first solid. Returns null when there is nothing to merge.
 */
function mergeGeometries(geometries) {
  const valid = (geometries || []).filter(
    (g) => g && g.attributes && g.attributes.position && g.attributes.position.count > 0
  );
  if (valid.length === 0) return null;
  if (valid.length === 1) return valid[0].index ? valid[0].toNonIndexed() : valid[0];
  let total = 0;
  const nonIndexed = valid.map((g) => (g.index ? g.toNonIndexed() : g));
  nonIndexed.forEach((g) => {
    total += g.attributes.position.count;
  });
  const mergedPos = new Float32Array(total * 3);
  let offset = 0;
  nonIndexed.forEach((g) => {
    const arr = g.attributes.position.array;
    mergedPos.set(arr, offset);
    offset += arr.length;
  });
  const merged = new THREE.BufferGeometry();
  merged.setAttribute("position", new THREE.BufferAttribute(mergedPos, 3));
  merged.computeVertexNormals();
  return merged;
}

/**
 * Calculates the exact signed volume of a 3D BufferGeometry in mm^3.
 * Uses the Divergence Theorem / signed tetrahedrons summation.
 */
function calculateMeshVolume(geometry) {
  if (!geometry || !geometry.attributes || !geometry.attributes.position) {
    return 0;
  }
  const pos = geometry.attributes.position;
  const index = geometry.index;
  let totalVolume = 0;

  const p1 = new THREE.Vector3();
  const p2 = new THREE.Vector3();
  const p3 = new THREE.Vector3();

  if (index) {
    for (let i = 0; i < index.count; i += 3) {
      p1.fromBufferAttribute(pos, index.getX(i));
      p2.fromBufferAttribute(pos, index.getX(i + 1));
      p3.fromBufferAttribute(pos, index.getX(i + 2));
      totalVolume += p1.dot(p2.cross(p3)) / 6.0;
    }
  } else {
    for (let i = 0; i < pos.count; i += 3) {
      p1.fromBufferAttribute(pos, i);
      p2.fromBufferAttribute(pos, i + 1);
      p3.fromBufferAttribute(pos, i + 2);
      totalVolume += p1.dot(p2.cross(p3)) / 6.0;
    }
  }

  const vol = Math.abs(totalVolume);
  return Number.isFinite(vol) ? vol : 0;
}

/**
 * Calculates the exact surface area of a 3D BufferGeometry in mm^2.
 * Slicers use this (with the volume) to derive the solid shell.
 */
function calculateMeshArea(geometry) {
  if (!geometry || !geometry.attributes || !geometry.attributes.position) {
    return 0;
  }
  const pos = geometry.attributes.position;
  const index = geometry.index;
  let totalArea = 0;

  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const cross = new THREE.Vector3();

  const addTri = (i1, i2, i3) => {
    a.fromBufferAttribute(pos, i1);
    b.fromBufferAttribute(pos, i2);
    c.fromBufferAttribute(pos, i3);
    ab.subVectors(b, a);
    ac.subVectors(c, a);
    cross.crossVectors(ab, ac);
    totalArea += cross.length() / 2.0;
  };

  if (index) {
    for (let i = 0; i < index.count; i += 3) {
      addTri(index.getX(i), index.getX(i + 1), index.getX(i + 2));
    }
  } else {
    for (let i = 0; i < pos.count; i += 3) {
      addTri(i, i + 1, i + 2);
    }
  }

  return Number.isFinite(totalArea) ? totalArea : 0;
}

/* Support constants (Bambu Studio-style auto-support profile).
 * Faces steeper than SUPPORT_ANGLE_DEG from horizontal need supports;
 * sparse support columns print at SUPPORT_DENSITY with a dense interface. */
const SUPPORT_ANGLE_DEG = 30;
const SUPPORT_DENSITY = 0.2;
const SUPPORT_INTERFACE_MM = 0.6;
const SUPPORT_GRID_MM = 2.0;

/**
 * Estimates support-filament volume (mm^3) the way Bambu Studio does:
 * detect downward overhang faces, project them onto a coarse build-plate
 * grid (unioning overlaps), grow sparse columns up to each cell's highest
 * overhang, and add a dense interface skin under the overhang area.
 *
 * Runs on the ORIGINAL (unscaled, real-mm) geometry with Y-up heights
 * measured from the model's lowest point (the build plate).
 * Returns { overhangAreaCm2, supportVolumeCm3 }.
 */
function calculateSupportVolume(geometry, minY) {
  const fallback = { overhangAreaCm2: 0, supportVolumeCm3: 0 };
  if (!geometry || !geometry.attributes || !geometry.attributes.position) {
    return fallback;
  }
  const pos = geometry.attributes.position;
  const index = geometry.index;
  const triCount = index ? index.count / 3 : pos.count / 3;
  if (!Number.isFinite(triCount) || triCount <= 0) return fallback;

  const threshold = -Math.cos((SUPPORT_ANGLE_DEG * Math.PI) / 180); // nz below this = overhang
  const grid = SUPPORT_GRID_MM;

  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const normal = new THREE.Vector3();

  // Bounding box in XZ for grid sizing
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }
  if (!Number.isFinite(minX) || maxX <= minX || maxZ <= minZ) return fallback;
  const cols = Math.max(1, Math.ceil((maxX - minX) / grid));
  const rows = Math.max(1, Math.ceil((maxZ - minZ) / grid));
  if (cols * rows > 40000) return fallback; // absurdly large — skip, don't hang
  const cellTop = new Float32Array(cols * rows); // highest overhang Y per cell

  let overhangAreaMm2 = 0;

  const getVerts = (i1, i2, i3) => {
    a.fromBufferAttribute(pos, i1);
    b.fromBufferAttribute(pos, i2);
    c.fromBufferAttribute(pos, i3);
  };

  const processTri = (i1, i2, i3) => {
    getVerts(i1, i2, i3);
    ab.subVectors(b, a);
    ac.subVectors(c, a);
    normal.crossVectors(ab, ac);
    const len = normal.length();
    if (len <= 0) return;
    const area = len / 2.0;
    normal.divideScalar(len);
    // Downward face steeper than the threshold, floating above the plate
    const topY = Math.max(a.y, b.y, c.y);
    const heightAbovePlate = topY - minY;
    if (normal.y >= threshold || heightAbovePlate <= 0.5) return;
    overhangAreaMm2 += area;
    // Rasterize the triangle footprint into grid cells (union by max height)
    const tx0 = Math.max(0, Math.floor((Math.min(a.x, b.x, c.x) - minX) / grid));
    const tx1 = Math.min(cols - 1, Math.floor((Math.max(a.x, b.x, c.x) - minX) / grid));
    const tz0 = Math.max(0, Math.floor((Math.min(a.z, b.z, c.z) - minZ) / grid));
    const tz1 = Math.min(rows - 1, Math.floor((Math.max(a.z, b.z, c.z) - minZ) / grid));
    for (let cx = tx0; cx <= tx1; cx++) {
      for (let cz = tz0; cz <= tz1; cz++) {
        const k = cz * cols + cx;
        if (heightAbovePlate > cellTop[k]) cellTop[k] = heightAbovePlate;
      }
    }
  };

  if (index) {
    for (let i = 0; i < index.count; i += 3) {
      processTri(index.getX(i), index.getX(i + 1), index.getX(i + 2));
    }
  } else {
    for (let i = 0; i < pos.count; i += 3) {
      processTri(i, i + 1, i + 2);
    }
  }

  if (overhangAreaMm2 <= 0) return fallback;

  const cellAreaMm2 = grid * grid;
  let columnVolMm3 = 0;
  for (let k = 0; k < cellTop.length; k++) {
    if (cellTop[k] > 0) columnVolMm3 += cellTop[k] * cellAreaMm2;
  }
  // Sparse columns + dense interface skin under the overhang
  const supportVolMm3 =
    columnVolMm3 * SUPPORT_DENSITY + overhangAreaMm2 * SUPPORT_INTERFACE_MM;

  if (!Number.isFinite(supportVolMm3) || supportVolMm3 <= 0) return fallback;
  return {
    overhangAreaCm2: +(overhangAreaMm2 / 100).toFixed(1),
    supportVolumeCm3: +(supportVolMm3 / 1000).toFixed(2),
  };
}

/**
 * Procedurally generates a clean 3D Rocket model matching the reference design.
 * Scaled to approx 80 x 80 x 150 mm.
 */
function createRocketGeometry() {
  // Fuselage (tapered cylinder)
  const bodyGeo = new THREE.CylinderGeometry(18, 22, 90, 32);
  bodyGeo.translate(0, 55, 0);

  // Nose cone
  const noseGeo = new THREE.ConeGeometry(18, 45, 32);
  noseGeo.translate(0, 122.5, 0);

  // Cabin window ring / portal
  const ringGeo = new THREE.TorusGeometry(8, 2.2, 16, 32);
  ringGeo.rotateX(Math.PI / 2);
  ringGeo.translate(0, 75, 18);

  // Inner window glass
  const glassGeo = new THREE.CylinderGeometry(7, 7, 2, 32);
  glassGeo.rotateX(Math.PI / 2);
  glassGeo.translate(0, 75, 18);

  // Bottom nozzle
  const nozzleGeo = new THREE.CylinderGeometry(15, 12, 15, 32);
  nozzleGeo.translate(0, 7.5, 0);

  // 4 swept fins
  const finShape = new THREE.Shape();
  finShape.moveTo(0, 0);
  finShape.lineTo(26, -10);
  finShape.lineTo(24, 25);
  finShape.lineTo(0, 45);
  finShape.closePath();

  const extrudeSettings = { depth: 3, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.8, bevelThickness: 0.8 };
  const finGeo = new THREE.ExtrudeGeometry(finShape, extrudeSettings);
  finGeo.center();

  // Merge into single buffer geometry for unified volume and color
  const geometries = [
    bodyGeo.toNonIndexed(),
    noseGeo.toNonIndexed(),
    ringGeo.toNonIndexed(),
    glassGeo.toNonIndexed(),
    nozzleGeo.toNonIndexed(),
  ];

  // 4 fins rotated 90 deg around Y
  for (let i = 0; i < 4; i++) {
    const fin = finGeo.clone();
    fin.rotateY((i * Math.PI) / 2);
    const angle = (i * Math.PI) / 2;
    fin.translate(Math.cos(angle) * 26, 25, Math.sin(angle) * 26);
    geometries.push(fin.toNonIndexed());
  }

  // Combine geometries
  let totalVerts = 0;
  geometries.forEach((g) => {
    totalVerts += g.attributes.position.count;
  });

  const mergedPos = new Float32Array(totalVerts * 3);
  let offset = 0;
  geometries.forEach((g) => {
    const pos = g.attributes.position.array;
    mergedPos.set(pos, offset);
    offset += pos.length;
  });

  const mergedGeo = new THREE.BufferGeometry();
  mergedGeo.setAttribute("position", new THREE.BufferAttribute(mergedPos, 3));
  mergedGeo.computeVertexNormals();

  // Scale to match 80 x 80 x 150 mm
  mergedGeo.computeBoundingBox();
  const bb = mergedGeo.boundingBox;
  const currentHeight = bb.max.y - bb.min.y;
  const targetHeight = 150;
  const s = targetHeight / currentHeight;
  mergedGeo.scale(s, s, s);
  mergedGeo.computeBoundingBox();

  // Place bottom on bed (y = 0)
  const minY = mergedGeo.boundingBox.min.y;
  mergedGeo.translate(0, -minY, 0);
  mergedGeo.computeVertexNormals();

  return mergedGeo;
}

export default function ModelViewer3D({
  file = null,
  color = "#1E88E5",
  materialType = "pla",
  density = 1.24,
  useSample = true,
  onAnalysis = () => {},
  onThumbnail = () => {},
  onError = () => {},
  className = "",
}) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const currentMeshRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Stable references to avoid infinite render loops
  const onAnalysisRef = useRef(onAnalysis);
  useEffect(() => {
    onAnalysisRef.current = onAnalysis;
  }, [onAnalysis]);

  const colorRef = useRef(color);
  colorRef.current = color;

  const densityRef = useRef(density);
  densityRef.current = density;

  // Stores geometry analysis base data (independent of material or infill density)
  const baseModelDataRef = useRef(null);
  // Monotonic load id — stale async parses (previous file) can never
  // overwrite the newest upload. This is what guarantees every file shows
  // its OWN exact geometry instead of the previous ("same") model.
  const loadIdRef = useRef(0);

  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // Live thumbnail of whatever is actually loaded (shown in Order Summary).
  const onThumbnailRef = useRef(null);
  useEffect(() => {
    onThumbnailRef.current = onThumbnail;
  }, [onThumbnail]);

  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const captureThumbnail = useCallback(() => {
    const renderer = rendererRef.current;
    if (!renderer || !currentMeshRef.current) return;
    // Rendered continuously, so the next frame already shows the new mesh.
    requestAnimationFrame(() => {
      try {
        const url = renderer.domElement.toDataURL("image/png");
        onThumbnailRef.current?.(url);
      } catch {
        /* canvas unavailable — summary keeps the fallback image */
      }
    });
  }, []);

  /* =========================================================
     INIT THREE.JS SCENE (Runs only once on mount)
     ========================================================= */
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 340;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#F8FAFC");
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(150, 130, 180);
    cameraRef.current = camera;

    // 3. Renderer (preserveDrawingBuffer so the summary thumbnail can snap it)
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    // PCFSoftShadowMap was removed in newer three.js — fall back to PCFShadowMap.
    renderer.shadowMap.type = THREE.PCFSoftShadowMap ?? THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    // Clear existing children
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 40;
    controls.maxDistance = 600;
    controls.maxPolarAngle = Math.PI / 2 + 0.02; // prevent going below build bed
    controls.target.set(0, 50, 0);
    controlsRef.current = controls;

    // 5. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xe2e8f0, 0.8);
    hemiLight.position.set(0, 200, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
    keyLight.position.set(120, 220, 140);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.8);
    fillLight.position.set(-120, 140, -100);
    scene.add(fillLight);

    // 6. Build Plate / Grid
    const bedSize = 220; // 220x220 mm build plate
    const divisions = 22; // 10mm per line

    const gridHelper = new THREE.GridHelper(bedSize, divisions, 0x94a3b8, 0xe2e8f0);
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    // Subtle build plate surface under grid
    const plateGeo = new THREE.PlaneGeometry(bedSize, bedSize);
    const plateMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.9,
      metalness: 0.1,
      depthWrite: false,
    });
    const plateMesh = new THREE.Mesh(plateGeo, plateMat);
    plateMesh.rotation.x = -Math.PI / 2;
    plateMesh.position.y = -0.1;
    plateMesh.receiveShadow = true;
    scene.add(plateMesh);

    // Build plate border line
    const borderGeo = new THREE.BufferGeometry();
    const half = bedSize / 2;
    const borderPoints = [
      new THREE.Vector3(-half, 0.2, -half),
      new THREE.Vector3(half, 0.2, -half),
      new THREE.Vector3(half, 0.2, half),
      new THREE.Vector3(-half, 0.2, half),
      new THREE.Vector3(-half, 0.2, -half),
    ];
    borderGeo.setFromPoints(borderPoints);
    const borderMat = new THREE.LineBasicMaterial({ color: 0x64748b, linewidth: 2 });
    const borderLine = new THREE.Line(borderGeo, borderMat);
    scene.add(borderLine);

    // 7. Animation Loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // 8. Resize Observer
    const resizeObserver = new ResizeObserver(() => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w > 0 && h > 0) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    });
    resizeObserver.observe(container);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      resizeObserver.disconnect();
      renderer.dispose();
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
    };
  }, []);

  /* =========================================================
     FIT CAMERA TO CURRENT MODEL (every file frames exactly)
     ========================================================= */
  const fitCameraToSize = useCallback((sizeY, maxDim) => {
    if (!cameraRef.current || !controlsRef.current) return;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const span = Math.max(60, maxDim || 120);
    const dist = span * 1.55 + 90;
    const h = span * 0.75 + 60;
    camera.position.set(dist * 0.62, h, dist * 0.75);
    camera.near = Math.max(0.5, span / 500);
    camera.far = Math.max(2000, span * 12);
    camera.updateProjectionMatrix();
    controls.target.set(0, (sizeY || span) / 2, 0);
    controls.minDistance = Math.max(15, span * 0.35);
    controls.maxDistance = Math.max(600, span * 5);
    controls.update();
  }, []);

  /* =========================================================
     RESET CAMERA ORIENTATION
     ========================================================= */
  const handleResetCamera = useCallback(() => {
    if (!cameraRef.current || !controlsRef.current) return;
    const base = baseModelDataRef.current;
    if (base?.displayMaxDim) {
      fitCameraToSize(base.displayHeight, base.displayMaxDim);
      return;
    }
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    camera.position.set(150, 130, 180);
    controls.target.set(0, 50, 0);
    controls.update();
  }, [fitCameraToSize]);

  /* =========================================================
     UPDATE MESH COLOR IN REALTIME (Does not reload geometry)
     ========================================================= */
  useEffect(() => {
    if (currentMeshRef.current?.material) {
      currentMeshRef.current.material.color.set(color);
      currentMeshRef.current.material.needsUpdate = true;
      captureThumbnail();
    }
  }, [color, captureThumbnail]);

  /* =========================================================
     UPDATE WEIGHT WHEN DENSITY CHANGES (solid weight only)
     Infill scaling is applied once in Printing.jsx / server calculator,
     so the viewer always reports volume × density (no infill here).
     ========================================================= */
  useEffect(() => {
    if (!baseModelDataRef.current) return;
    const { fileName, fileSizeMB, dimensions, volumeCm3, surfaceAreaCm2, supportVolumeCm3, overhangAreaCm2, isSample } = baseModelDataRef.current;

    const calculatedWeight = isSample ? 20 : Math.max(2, Math.round(volumeCm3 * density));

    const updatedStats = {
      fileName,
      fileSizeMB,
      dimensions,
      volumeCm3,
      surfaceAreaCm2,
      supportVolumeCm3,
      overhangAreaCm2,
      weightGrams: calculatedWeight,
    };

    onAnalysisRef.current?.(updatedStats);
  }, [density]);

  /* =========================================================
     LOAD FILE OR SAMPLE ROCKET (Only runs when file/useSample changes)
     Every attached file renders its OWN exact geometry: all solids are
     merged with their transforms baked, stale async parses are ignored
     via loadId, and the camera reframes per model.
     ========================================================= */
  useEffect(() => {
    if (!sceneRef.current) return;

    const myLoadId = ++loadIdRef.current;
    let cancelled = false;
    const isStale = () => cancelled || loadIdRef.current !== myLoadId;

    const failLoad = (message, err) => {
      if (isStale()) return;
      if (err) console.error(message, err);
      else console.error(message);
      setLoading(false);
      setLoadError(message);
      onErrorRef.current?.(message);
    };

    const processGeometry = (geometry, fileName, fileSizeMB, isSample = false) => {
      if (isStale() || !sceneRef.current) return;
      if (!geometry || !geometry.attributes?.position || geometry.attributes.position.count === 0) {
        failLoad(`Could not read any mesh from ${fileName}. The file may be empty or corrupt.`);
        return;
      }

      // Remove existing model mesh
      if (currentMeshRef.current) {
        sceneRef.current.remove(currentMeshRef.current);
        if (currentMeshRef.current.geometry) currentMeshRef.current.geometry.dispose();
        if (currentMeshRef.current.material) currentMeshRef.current.material.dispose();
        currentMeshRef.current = null;
      }

      geometry.computeVertexNormals();
      geometry.computeBoundingBox();

      // Measure FIRST on the original geometry (real millimetres, like a
      // slicer) — display auto-fit below must never change the weight.
      const rawSize = new THREE.Vector3();
      geometry.boundingBox.getSize(rawSize);

      // Exact Volume in mm^3 of the unscaled model
      let rawVolumeMm3 = calculateMeshVolume(geometry);
      if (rawVolumeMm3 <= 0 || !Number.isFinite(rawVolumeMm3)) {
        rawVolumeMm3 = rawSize.x * rawSize.y * rawSize.z * 0.35;
      }
      const volumeCm3 = +(rawVolumeMm3 / 1000).toFixed(1);

      // Exact surface area in cm^2 of the unscaled model — slicers derive
      // the solid shell (walls + top/bottom skins) from this + the volume.
      const rawAreaMm2 = calculateMeshArea(geometry);
      const surfaceAreaCm2 = +(rawAreaMm2 / 100).toFixed(1);

      // Bambu-style support analysis on the unscaled model: overhang faces
      // get sparse support columns from the build plate + dense interface.
      const support = calculateSupportVolume(geometry, geometry.boundingBox.min.y);
      const overhangAreaCm2 = support.overhangAreaCm2;
      const supportVolumeCm3 = support.supportVolumeCm3;

      const finalDim = {
        x: Math.round(rawSize.x),
        y: Math.round(rawSize.z), // bed depth
        z: Math.round(rawSize.y), // height
      };

      // Display-only auto-fit (tiny models scaled up, huge models scaled
      // down so they frame nicely — measurement above is unaffected).
      const displaySize = rawSize.clone();
      const maxDim = Math.max(rawSize.x, rawSize.y, rawSize.z);
      if (maxDim < 5) {
        geometry.scale(1000, 1000, 1000);
        displaySize.multiplyScalar(1000);
      } else if (maxDim > 200) {
        const s = 180 / maxDim;
        geometry.scale(s, s, s);
        displaySize.multiplyScalar(s);
      }

      geometry.computeBoundingBox();
      const bb = geometry.boundingBox;
      bb.getSize(displaySize);

      // Center geometry on X and Z, and place base on build plate (y = 0)
      const center = new THREE.Vector3();
      bb.getCenter(center);
      geometry.translate(-center.x, -bb.min.y, -center.z);
      geometry.computeBoundingBox();

      // Solid weight = volume × density (infill applied later by pricing engine)
      const calculatedWeight = isSample ? 20 : Math.max(2, Math.round(volumeCm3 * densityRef.current));

      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(colorRef.current),
        roughness: 0.35,
        metalness: 0.15,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      sceneRef.current.add(mesh);
      currentMeshRef.current = mesh;

      // Reframe so THIS file fills the viewport — different files can no
      // longer look like the "same" model stuck at a fixed distance.
      const displayMaxDim = Math.max(displaySize.x, displaySize.y, displaySize.z);
      fitCameraToSize(displaySize.y, displayMaxDim);

      // Cache base analysis data
      baseModelDataRef.current = {
        fileName,
        fileSizeMB,
        dimensions: finalDim,
        volumeCm3,
        surfaceAreaCm2,
        overhangAreaCm2,
        supportVolumeCm3,
        isSample,
        displayHeight: displaySize.y,
        displayMaxDim,
      };

      const stats = {
        fileName,
        fileSizeMB,
        dimensions: finalDim,
        volumeCm3,
        surfaceAreaCm2,
        overhangAreaCm2,
        supportVolumeCm3,
        weightGrams: calculatedWeight,
      };

      onAnalysisRef.current?.(stats);
      setLoading(false);
      setLoadError(null);
      captureThumbnail();
    };

    const parseAndShow = async (buffer, ext, fileName, fileSizeMB) => {
      try {
        if (ext === "stl") {
          const geometry = new STLLoader().parse(buffer.slice(0));
          processGeometry(geometry, fileName, fileSizeMB, false);
        } else if (ext === "obj") {
          const text = new TextDecoder().decode(buffer);
          const obj = new OBJLoader().parse(text);
          const merged = mergeGeometries(extractGeometriesFromObject(obj));
          if (!merged) throw new Error("empty OBJ");
          processGeometry(merged, fileName, fileSizeMB, false);
        } else if (ext === "3mf") {
          const group = new ThreeMFLoader().parse(buffer.slice(0));
          const merged = mergeGeometries(extractGeometriesFromObject(group));
          if (!merged) throw new Error("empty 3MF");
          processGeometry(merged, fileName, fileSizeMB, false);
        } else if (ext === "amf") {
          const group = new AMFLoader().parse(buffer.slice(0));
          const merged = mergeGeometries(extractGeometriesFromObject(group));
          if (!merged) throw new Error("empty AMF");
          processGeometry(merged, fileName, fileSizeMB, false);
        } else if (ext === "ply") {
          const geometry = new PLYLoader().parse(buffer.slice(0));
          processGeometry(geometry.index ? geometry.toNonIndexed() : geometry, fileName, fileSizeMB, false);
        } else if (ext === "glb" || ext === "gltf") {
          const loader = new GLTFLoader();
          const gltf = await loader.parseAsync(buffer.slice(0), "");
          const merged = mergeGeometries(extractGeometriesFromObject(gltf.scene));
          if (!merged) throw new Error("empty GLTF");
          processGeometry(merged, fileName, fileSizeMB, false);
        } else {
          failLoad(`Unsupported file type ".${ext}". Please upload ${SUPPORTED_MODEL_EXTS.map((e) => "." + e.toUpperCase()).join(", ")}.`);
        }
      } catch (err) {
        failLoad(`Could not parse ${fileName}. The file may be corrupt or use an unsupported variant.`, err);
      }
    };

    if (file) {
      setLoading(true);
      setLoadError(null);
      const ext = (file.name.split(".").pop() || "").toLowerCase();
      const fileSizeMB = +(file.size / (1024 * 1024)).toFixed(2);
      const fileName = file.name;

      if (!SUPPORTED_MODEL_EXTS.includes(ext)) {
        failLoad(`Unsupported file type ".${ext}". Please upload ${SUPPORTED_MODEL_EXTS.map((e) => "." + e.toUpperCase()).join(", ")}.`);
        return () => {
          cancelled = true;
        };
      }

      // Assign handlers BEFORE reading (correct FileReader order) and guard
      // every async hop with the load id so rapid re-uploads can't mix up.
      const reader = new FileReader();
      reader.onload = (e) => {
        if (isStale()) return;
        parseAndShow(e.target.result, ext, fileName, fileSizeMB);
      };
      reader.onerror = () => {
        failLoad(`Could not read ${fileName}. Please try again.`);
      };
      reader.readAsArrayBuffer(file);
    } else if (useSample) {
      setLoading(true);
      setLoadError(null);
      const timer = setTimeout(() => {
        if (isStale()) return;
        try {
          const rocketGeo = createRocketGeometry();
          processGeometry(rocketGeo, "rocket.stl", 2.45, true);
        } catch (err) {
          failLoad("Could not generate the sample model.", err);
        }
      }, 50);
      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    } else {
      // No file and no sample (user pressed Remove): clear the viewport so a
      // stale model is never mistaken for the next upload.
      if (currentMeshRef.current && sceneRef.current) {
        sceneRef.current.remove(currentMeshRef.current);
        currentMeshRef.current.geometry?.dispose();
        currentMeshRef.current.material?.dispose();
        currentMeshRef.current = null;
      }
      baseModelDataRef.current = null;
      setLoading(false);
      setLoadError(null);
    }

    return () => {
      cancelled = true;
    };
  }, [file, useSample, fitCameraToSize]);

  return (
    <div className={`model-viewer-wrapper ${className}`}>
      {/* 3D Canvas Mount Point */}
      <div className="model-viewer-canvas" ref={mountRef} />

      {/* Loading Overlay */}
      {loading && (
        <div className="model-viewer-loading">
          <div className="spinner-border spinner-border-sm" role="status" style={{ color: "#FF7508" }} />
          <span>Processing 3D Geometry...</span>
        </div>
      )}

      {/* Parse error — never silently keep the previous ("same") model */}
      {!loading && loadError && (
        <div
          className="model-viewer-loading"
          style={{ background: "rgba(254,242,242,0.95)", color: "#b91c1c" }}
        >
          <span>{loadError}</span>
        </div>
      )}

      {/* Top-Right Control Buttons */}
      <div className="model-viewer-controls">
        <button
          type="button"
          className="viewer-ctrl-btn"
          onClick={handleResetCamera}
          title="Reset Camera Angle (Isometric View)"
          aria-label="Reset View"
        >
          <Box size={18} strokeWidth={2.2} />
        </button>
      </div>

      {/* Interactive Helper Hint */}
      <div className="viewer-hint">
        <span>Drag to rotate • Scroll to zoom • Right-click to pan</span>
      </div>
    </div>
  );
}
