const DATABASE_NAME = 'labx-roadmap-prototype-uploads';
const DATABASE_VERSION = 1;
const STORE_NAME = 'mission-attachments';
export const MAX_MISSION_UPLOADS = 5;
export const MAX_MISSION_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MISSION_UPLOAD_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.webp';

const ALLOWED_EXTENSIONS = new Set(MISSION_UPLOAD_ACCEPT.split(','));
const TYPES_BY_EXTENSION = {
  '.pdf': ['application/pdf'],
  '.doc': ['application/msword'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  '.xls': ['application/vnd.ms-excel'],
  '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  '.ppt': ['application/vnd.ms-powerpoint'],
  '.pptx': ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  '.txt': ['text/plain'],
  '.png': ['image/png'],
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.webp': ['image/webp'],
};

export function validateMissionFiles(files) {
  const selected = Array.from(files || []);
  if (!selected.length) return 'Upload at least one document or image.';
  if (selected.length > MAX_MISSION_UPLOADS) return `Upload up to ${MAX_MISSION_UPLOADS} files per mission.`;
  for (const file of selected) {
    if (!file.size) return `${file.name} is empty. Choose a file with content.`;
    if (file.size > MAX_MISSION_UPLOAD_BYTES) return `${file.name} exceeds the 10 MB per-file limit.`;
    const extension = `.${file.name.split('.').pop()?.toLowerCase()}`;
    const supportedTypes = TYPES_BY_EXTENSION[extension];
    if (!ALLOWED_EXTENSIONS.has(extension) || !supportedTypes
      || (file.type && file.type !== 'application/octet-stream' && !supportedTypes.includes(file.type))) {
      return `${file.name} is not a supported document or image type.`;
    }
  }
  return '';
}

function openDatabase(indexedDBProvider) {
  if (!indexedDBProvider) return Promise.reject(new Error('File uploads are not available in this browser.'));
  return new Promise((resolve, reject) => {
    const request = indexedDBProvider.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Unable to open local file storage for this mission.'));
    request.onblocked = () => reject(new Error('Local file storage is busy. Close other LabX tabs and try again.'));
  });
}

export function createRoadmapUploadStore(indexedDBProvider = globalThis.indexedDB) {
  async function save(projectId, userId, missionId, files) {
    const selected = Array.from(files || []);
    const validationError = validateMissionFiles(selected);
    if (validationError) throw new Error(validationError);
    const database = await openDatabase(indexedDBProvider);
    const attachments = selected.map((file, index) => ({
      id: `${encodeURIComponent(userId)}:${encodeURIComponent(projectId)}:${encodeURIComponent(missionId)}:${Date.now()}:${index}:${encodeURIComponent(file.name)}`,
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size,
      lastModified: file.lastModified,
    }));
    try {
      await new Promise((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        selected.forEach((file, index) => store.put({ ...attachments[index], blob: file }));
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(new Error('Unable to save the uploaded mission files.'));
        transaction.onabort = () => reject(new Error('Saving the uploaded mission files was cancelled.'));
      });
      return attachments;
    } finally {
      database.close();
    }
  }

  async function read(attachments) {
    const references = Array.from(attachments || []).filter((attachment) => attachment?.id && !attachment.mockContent);
    if (!references.length) return [];
    const database = await openDatabase(indexedDBProvider);
    try {
      return await new Promise((resolve, reject) => {
        const found = new Map();
        const transaction = database.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        references.forEach((reference) => {
          const request = store.get(reference.id);
          request.onsuccess = () => { if (request.result) found.set(reference.id, request.result); };
          request.onerror = () => reject(new Error(`Unable to read ${reference.name} from local file storage.`));
        });
        transaction.oncomplete = () => {
          const missing = references.find(({ id }) => !found.has(id));
          if (missing) reject(new Error(`${missing.name} is no longer available in this browser.`));
          else resolve(references.map(({ id }) => found.get(id)));
        };
        transaction.onerror = () => reject(new Error('Unable to read mission files from local storage.'));
      });
    } finally {
      database.close();
    }
  }

  async function remove(attachments) {
    const ids = Array.from(attachments || []).map(({ id }) => id).filter(Boolean);
    if (!ids.length) return;
    const database = await openDatabase(indexedDBProvider);
    try {
      await new Promise((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        ids.forEach((id) => store.delete(id));
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(new Error('Unable to clean up uploaded mission files.'));
        transaction.onabort = () => reject(new Error('Cleaning up uploaded mission files was cancelled.'));
      });
    } finally {
      database.close();
    }
  }

  return { save, read, remove };
}

export const roadmapUploadStore = createRoadmapUploadStore();
