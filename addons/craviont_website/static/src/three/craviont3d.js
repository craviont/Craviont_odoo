/**
 * Craviont website - home hero 3D object (three.js r160, procedural).
 *
 * A modular precision cube: 27 rounded modules (satin titanium, graphite
 * corners) around a green core. Every few seconds one layer turns 90
 * degrees, and the gaps between modules breathe open so the core glows
 * through: engineered systems with intelligence at the centre.
 *
 * Loaded as a native ES module (outside Odoo's asset bundle) so it never
 * delays the page. It only appends a <canvas> to [data-cv-3d="cube"] and
 * toggles classes; it never runs in the website editor.
 */
import * as THREE from "../../lib/three/three.module.min.js";

const html = document.documentElement;
const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const MOBILE = window.matchMedia("(max-width: 767px)").matches;

const MODULE = 0.62; // module size
const PITCH = 0.665; // centre-to-centre distance when closed
const TWIST_EVERY = 3.4; // seconds between layer turns
const TWIST_TIME = 1.1; // seconds per turn

function webglAvailable() {
    try {
        const canvas = document.createElement("canvas");
        return !!(window.WebGLRenderingContext && (canvas.getContext("webgl2") || canvas.getContext("webgl")));
    } catch {
        return false;
    }
}

const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// ---------------------------------------------------------------------------
// Materials, lighting, geometry
// ---------------------------------------------------------------------------
function makeMaterials() {
    return {
        titanium: new THREE.MeshPhysicalMaterial({ color: 0xd6d8d3, metalness: 1, roughness: 0.32 }),
        graphite: new THREE.MeshPhysicalMaterial({
            color: 0x6b706b, metalness: 1, roughness: 0.38, clearcoat: 0.4, clearcoatRoughness: 0.3,
        }),
        core: new THREE.MeshPhysicalMaterial({
            color: 0x1f7a3a, emissive: 0x1f7a3a, emissiveIntensity: 0.55, metalness: 0.1, roughness: 0.3,
            clearcoat: 1, clearcoatRoughness: 0.1,
        }),
    };
}

// Neutral studio lighting baked into an environment map (soft boxes in a
// grey room), which is what makes metal read as metal.
function studioEnvironment(renderer) {
    const env = new THREE.Scene();
    env.add(new THREE.Mesh(
        new THREE.BoxGeometry(12, 8, 12),
        new THREE.MeshBasicMaterial({ color: 0x4a4c4a, side: THREE.BackSide })
    ));
    const panel = (w, h, x, y, z, ry, rx, v) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(v, v, v) }));
        m.position.set(x, y, z);
        m.rotation.set(rx || 0, ry || 0, 0);
        env.add(m);
    };
    panel(6, 1.4, 0, 3.9, 0, 0, Math.PI / 2, 4.5); // ceiling strip
    panel(3, 5, -5.9, 0.5, 0, Math.PI / 2, 0, 2.6); // left soft box
    panel(2.4, 5, 5.9, 0.5, -1.5, -Math.PI / 2, 0, 1.6); // right soft box
    panel(5, 2, 0, 0.6, -5.9, 0, 0, 1.0); // back
    const pmrem = new THREE.PMREMGenerator(renderer);
    const texture = pmrem.fromScene(env, 0.035).texture;
    pmrem.dispose();
    return texture;
}

/** A cube with rounded edges: a rounded square extruded with a bevel. */
function roundedCube(size, radius, bevel) {
    const inner = size - 2 * bevel;
    const r = Math.min(radius, inner / 2);
    const h = inner / 2;
    const s = new THREE.Shape();
    s.moveTo(-h + r, -h);
    s.lineTo(h - r, -h);
    s.quadraticCurveTo(h, -h, h, -h + r);
    s.lineTo(h, h - r);
    s.quadraticCurveTo(h, h, h - r, h);
    s.lineTo(-h + r, h);
    s.quadraticCurveTo(-h, h, -h, h - r);
    s.lineTo(-h, -h + r);
    s.quadraticCurveTo(-h, -h, -h + r, -h);
    const geo = new THREE.ExtrudeGeometry(s, {
        depth: inner,
        bevelEnabled: true,
        bevelThickness: bevel,
        bevelSize: bevel,
        bevelSegments: 4,
        curveSegments: MOBILE ? 4 : 6,
    });
    geo.translate(0, 0, -inner / 2);
    geo.computeVertexNormals();
    return geo;
}

// ---------------------------------------------------------------------------
// The modular cube
// ---------------------------------------------------------------------------
const AXES = ["x", "y", "z"];
const AXIS_VECTORS = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };

function buildCube(m) {
    const geo = roundedCube(MODULE, 0.09, 0.05);
    const modules = [];
    for (let x = -1; x <= 1; x++) {
        for (let y = -1; y <= 1; y++) {
            for (let z = -1; z <= 1; z++) {
                const corner = Math.abs(x) + Math.abs(y) + Math.abs(z) === 3;
                const centre = x === 0 && y === 0 && z === 0;
                modules.push({
                    kind: centre ? "core" : corner ? "graphite" : "titanium",
                    cell: new THREE.Vector3(x, y, z),
                    quat: new THREE.Quaternion(),
                });
            }
        }
    }
    const group = new THREE.Group();
    const meshes = {};
    for (const kind of ["titanium", "graphite", "core"]) {
        const list = modules.filter((mod) => mod.kind === kind);
        const mesh = new THREE.InstancedMesh(geo, m[kind], list.length);
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        list.forEach((mod, i) => { mod.mesh = mesh; mod.index = i; });
        meshes[kind] = mesh;
        group.add(mesh);
    }
    // Light from the core: shows on the inner faces when the gaps open.
    const glow = new THREE.PointLight(0x3fbf6a, 0, 2.2, 2);
    group.add(glow);
    return { group, modules, meshes, glow };
}

function cubeScene(container) {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MOBILE ? 1.5 : 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.domElement.setAttribute("aria-hidden", "true");
    const scene = new THREE.Scene();
    scene.environment = studioEnvironment(renderer);
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    camera.position.set(0, 0.2, MOBILE ? 9 : 7.8);
    camera.lookAt(0, 0, 0);
    const key = new THREE.DirectionalLight(0xffffff, 1.3);
    key.position.set(3, 4, 5);
    scene.add(key, new THREE.AmbientLight(0xffffff, 0.12));

    const cube = buildCube(makeMaterials());
    const holder = new THREE.Group();
    holder.add(cube.group);
    holder.rotation.set(0.5, -0.65, 0); // three faces towards the viewer
    scene.add(holder);
    container.appendChild(renderer.domElement);

    const resize = () => {
        const w = container.clientWidth || 1;
        const h = container.clientHeight || 1;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
    };
    resize();
    new ResizeObserver(resize).observe(container);

    // Pointer tilt and horizontal drag with inertia (vertical page scroll still works).
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    window.addEventListener("pointermove", (ev) => {
        pointer.tx = (ev.clientX / window.innerWidth) * 2 - 1;
        pointer.ty = (ev.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });
    const drag = { on: false, x: 0, v: 0, turn: 0 };
    container.addEventListener("pointerdown", (ev) => {
        drag.on = true;
        drag.x = ev.clientX;
        drag.v = 0;
        container.classList.add("is-grabbing");
    });
    window.addEventListener("pointermove", (ev) => {
        if (drag.on) {
            drag.v = (ev.clientX - drag.x) * 0.008;
            drag.x = ev.clientX;
            drag.turn += drag.v;
        }
    }, { passive: true });
    const release = () => {
        drag.on = false;
        container.classList.remove("is-grabbing");
    };
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);

    // Layer turns: pick an axis and layer, turn it 90 degrees, then snap the
    // modules to their new cells so the next turn starts from a clean grid.
    let twist = null;
    let nextTwist = 1.6;
    let lastAxis = null;
    const startTwist = () => {
        const axis = AXES.filter((a) => a !== lastAxis)[Math.floor(Math.random() * 2)];
        lastAxis = axis;
        twist = {
            axis,
            layer: Math.floor(Math.random() * 3) - 1,
            dir: Math.random() < 0.5 ? 1 : -1,
            t: 0,
        };
    };
    const endTwist = () => {
        const q = new THREE.Quaternion().setFromAxisAngle(AXIS_VECTORS[twist.axis], (twist.dir * Math.PI) / 2);
        for (const mod of cube.modules) {
            if (Math.round(mod.cell[twist.axis]) === twist.layer) {
                mod.cell.applyQuaternion(q).round();
                mod.quat.premultiply(q);
            }
        }
        twist = null;
    };

    const matrix = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const turnQ = new THREE.Quaternion();
    const unit = new THREE.Vector3(1, 1, 1);
    const place = (gap) => {
        if (twist) {
            turnQ.setFromAxisAngle(AXIS_VECTORS[twist.axis], twist.dir * (Math.PI / 2) * easeInOut(twist.t));
        }
        for (const mod of cube.modules) {
            pos.copy(mod.cell);
            quat.copy(mod.quat);
            if (twist && Math.round(mod.cell[twist.axis]) === twist.layer) {
                pos.applyQuaternion(turnQ);
                quat.premultiply(turnQ);
            }
            pos.multiplyScalar(PITCH + gap);
            mod.mesh.setMatrixAt(mod.index, matrix.compose(pos, quat, unit));
        }
        Object.values(cube.meshes).forEach((mesh) => { mesh.instanceMatrix.needsUpdate = true; });
    };

    // Render only while the hero is on screen.
    const clock = new THREE.Clock();
    const start = performance.now();
    let visible = false;
    let running = false;
    const tick = () => {
        if (!visible) {
            running = false;
            return;
        }
        const dt = Math.min(clock.getDelta(), 0.05);
        const t = clock.elapsedTime;
        pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 3);
        pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 3);
        if (!drag.on && Math.abs(drag.v) > 0.0001) {
            drag.turn += drag.v;
            drag.v *= Math.pow(0.9, dt * 60);
        }
        if (!REDUCED) {
            nextTwist -= dt;
            if (!twist && nextTwist <= 0) {
                startTwist();
            }
            if (twist) {
                twist.t = Math.min(1, twist.t + dt / TWIST_TIME);
                if (twist.t >= 1) {
                    endTwist();
                    nextTwist = TWIST_EVERY;
                }
            }
        }
        // Gaps breathe open slowly; the core light follows them.
        const breath = REDUCED ? 0.35 : 0.5 - 0.5 * Math.cos(t * 0.55);
        const gap = 0.012 + 0.075 * breath;
        cube.glow.intensity = 0.6 + 3.2 * breath;
        place(gap);

        const intro = easeOut(Math.min(1, (performance.now() - start) / 1600));
        cube.group.rotation.y = (REDUCED ? 0 : t * 0.12) + drag.turn + pointer.x * 0.25 - 0.6 * (1 - intro);
        cube.group.rotation.x = pointer.y * 0.12;
        holder.position.y = REDUCED ? 0 : Math.sin(t * 0.7) * 0.05;
        holder.scale.setScalar(0.88 + 0.12 * intro);
        renderer.render(scene, camera);
        requestAnimationFrame(tick);
    };
    new IntersectionObserver((entries) => {
        visible = entries[0].isIntersecting;
        if (visible && !running) {
            running = true;
            clock.getDelta();
            requestAnimationFrame(tick);
        }
    }, { rootMargin: "120px" }).observe(container);
    place(0.03);
    renderer.render(scene, camera);
    requestAnimationFrame(() => container.classList.add("is-3d-ready"));
}

function boot() {
    const editing = document.body.classList.contains("editor_enable")
        || /[?&](enable_editor|edit_translations)=/.test(window.location.search);
    const container = document.querySelector('[data-cv-3d="cube"]');
    if (!container) {
        return;
    }
    if (editing || !webglAvailable()) {
        html.classList.add("cv-no3d"); // website editor or no WebGL: the hero drops the 3D column
        return;
    }
    try {
        cubeScene(container);
    } catch (err) {
        console.warn("Craviont 3D cube failed", err);
        html.classList.add("cv-no3d");
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
    boot();
}
