// IndexedDB store for local captured photos (not uploaded)
// Key: `${planId}/${shotId}`, value: Blob[]

const DB_NAME = 'shot-planner-photos'
const STORE = 'captures'
const DB_VERSION = 1

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function key(planId: string, shotId: number) {
  return `${planId}/${shotId}`
}

export async function savePhoto(planId: string, shotId: number, blob: Blob): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const k = key(planId, shotId)
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    const getReq = store.get(k)
    getReq.onsuccess = () => {
      const existing: Blob[] = getReq.result || []
      const putReq = store.put([...existing, blob], k)
      putReq.onsuccess = () => resolve()
      putReq.onerror = () => reject(putReq.error)
    }
    getReq.onerror = () => reject(getReq.error)
  })
}

export async function loadPhotos(planId: string, shotId: number): Promise<string[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(key(planId, shotId))
    req.onsuccess = () => {
      const blobs: Blob[] = req.result || []
      resolve(blobs.map((b) => URL.createObjectURL(b)))
    }
    req.onerror = () => reject(req.error)
  })
}

export async function deletePhoto(planId: string, shotId: number, index: number): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const k = key(planId, shotId)
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    const getReq = store.get(k)
    getReq.onsuccess = () => {
      const blobs: Blob[] = getReq.result || []
      blobs.splice(index, 1)
      const putReq = store.put(blobs, k)
      putReq.onsuccess = () => resolve()
      putReq.onerror = () => reject(putReq.error)
    }
    getReq.onerror = () => reject(getReq.error)
  })
}
