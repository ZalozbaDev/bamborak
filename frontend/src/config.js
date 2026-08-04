
export const config = {
  url: window.RUNTIME_CONFIG?.VITE_URL ?? "http://dummy",
  urlRAG: window.RUNTIME_CONFIG?.VITE_URL_RAG ?? "http://dummy",
  realtime_factor: 0.025,
  max_textlen: 10000,
  max_textlen_chunks: 10,
};


//export const realtime_factor = Number(import.meta.env.VITE_REALTIME_FACTOR)

//export const max_textlen = Number(import.meta.env.VITE_MAX_TEXTLEN)

//export const max_textlen_chunks = Number(import.meta.env.VITE_MAX_TEXTLEN_CHUNKS)
