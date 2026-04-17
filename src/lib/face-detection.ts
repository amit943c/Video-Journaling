const SCRIPT_URL = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js';
const WEIGHTS_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

let loadPromise: Promise<any> | null = null;

function getFaceApi(): any {
  return (window as any).faceapi;
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

export async function loadFaceDetection(): Promise<any> {
  const existing = getFaceApi();
  if (existing?.nets?.tinyFaceDetector?.isLoaded) return existing;

  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    await loadScript(SCRIPT_URL);
    const faceapi = getFaceApi();
    if (!faceapi) throw new Error('face-api.js not available after script load');
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(WEIGHTS_URL),
      faceapi.nets.faceExpressionNet.loadFromUri(WEIGHTS_URL),
    ]);
    return faceapi;
  })();

  try {
    return await loadPromise;
  } catch (err) {
    loadPromise = null;
    throw err;
  }
}

export async function loadFaceLandmarks(): Promise<any> {
  await loadFaceDetection();
  const faceapi = getFaceApi();
  if (!faceapi.nets.faceLandmark68TinyNet.isLoaded) {
    await faceapi.nets.faceLandmark68TinyNet.loadFromUri(WEIGHTS_URL);
  }
  return faceapi;
}
