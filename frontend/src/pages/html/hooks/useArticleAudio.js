import { useEffect, useRef, useState } from 'react'

import {
  config
} from '../../../config.js'
const {
  url,
  max_textlen_chunks,
} = config;

import { chunkText, synthesizeChunk } from '../utils/audioSynthesis.js'

function sanitizeFilename(value) {
  return (value || 'bamborak_html').replace(/[^a-zA-Z0-9-_]/g, '_')
}

function triggerBlobDownload(blob, fileName) {
  const anchor = document.createElement('a')
  document.body.appendChild(anchor)
  anchor.style = 'display: none'
  const objectUrl = window.URL.createObjectURL(blob)
  anchor.href = objectUrl
  anchor.download = fileName
  anchor.target = '_blank'
  anchor.rel = 'noopener noreferrer'
  anchor.click()
  window.setTimeout(() => {
    window.URL.revokeObjectURL(objectUrl)
    document.body.removeChild(anchor)
  }, 1500)
}

function useArticleAudio({ sections, speakerId, timbreId, setParseError }) {
  const [downloadingIndex, setDownloadingIndex] = useState(null)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [downloadedAudioByIndex, setDownloadedAudioByIndex] = useState({})

  const [activeAudioIndex, setActiveAudioIndex] = useState(null)
  const [isAudioPlaying, setIsAudioPlaying] = useState(false)
  const [isDownloadingAll, setIsDownloadingAll] = useState(false)
  const [downloadAllMode, setDownloadAllMode] = useState('individual')

  const downloadedAudioRef = useRef({})
  const audioPlayerRef = useRef(null)
  const downloadControlRef = useRef({ canceled: false })

  useEffect(() => {
    downloadedAudioRef.current = downloadedAudioByIndex
  }, [downloadedAudioByIndex])

  useEffect(() => {
    return () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause()
        audioPlayerRef.current = null
      }
      Object.values(downloadedAudioRef.current).forEach(item => {
        if (item?.audioUrl) {
          window.URL.revokeObjectURL(item.audioUrl)
        }
      })
    }
  }, [])

  const resetAllDownloadState = () => {
    downloadControlRef.current = { canceled: false }
    setDownloadingIndex(null)
    setDownloadProgress(0)
    setIsDownloadingAll(false)

    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause()
      audioPlayerRef.current.currentTime = 0
    }
    setActiveAudioIndex(null)
    setIsAudioPlaying(false)

    Object.values(downloadedAudioRef.current).forEach(item => {
      if (item?.audioUrl) {
        window.URL.revokeObjectURL(item.audioUrl)
      }
    })
    setDownloadedAudioByIndex({})
  }

  const storeBlobForPlayback = (blob, index) => {
    const previous = downloadedAudioByIndex[index]
    if (previous?.audioUrl) {
      window.URL.revokeObjectURL(previous.audioUrl)
    }

    const playbackUrl = window.URL.createObjectURL(blob)
    setDownloadedAudioByIndex(previousState => ({
      ...previousState,
      [index]: {
        audioUrl: playbackUrl,
      },
    }))
  }

  const synthesizeItemBlob = async (item, index) => {
    setDownloadingIndex(index)
    setDownloadProgress(0)
    downloadControlRef.current = { canceled: false }

    const textPayload = `${item.title}\n\n${item.text}`
    const chunks = chunkText(textPayload, max_textlen_chunks)

    const audioBlobs = []
    for (let i = 0; i < chunks.length; i++) {
      if (downloadControlRef.current.canceled) {
        break
      }

      const blob = await synthesizeChunk({
        apiUrl: url,
        chunk: chunks[i],
        speakerId,
        timbreId,
      })
      audioBlobs.push(blob)
      setDownloadProgress(((i + 1) / chunks.length) * 100)
    }

    const canceled = downloadControlRef.current.canceled

    if (audioBlobs.length === 0 || canceled) {
      return {
        blob: null,
        canceled,
      }
    }

    const combinedBlob = new Blob(audioBlobs, { type: 'audio/mpeg' })
    storeBlobForPlayback(combinedBlob, index)

    return {
      blob: combinedBlob,
      canceled,
    }
  }

  const downloadItem = async (item, index) => {
    if (!speakerId || !timbreId) {
      setParseError('Prošu rěčnika a timbre wuzwolić.')
      return
    }

    setParseError('')

    try {
      const result = await synthesizeItemBlob(item, index)
      if (!result.blob) {
        return { canceled: result.canceled }
      }

      triggerBlobDownload(result.blob, `${sanitizeFilename(item.title)}.mp3`)
      return { canceled: result.canceled }
    } catch (error) {
      setParseError(error.message || 'Njemóžach audio sćahnyć.')
      return { canceled: false, failed: true }
    } finally {
      downloadControlRef.current = { canceled: false }
      setDownloadingIndex(null)
      setDownloadProgress(0)
    }
  }

  const cancelCurrentDownload = () => {
    if (downloadingIndex === null) {
      return
    }
    downloadControlRef.current.canceled = true
  }

  const togglePlayback = index => {
    const existingAudio = downloadedAudioByIndex[index]
    if (!existingAudio?.audioUrl) {
      return
    }

    const isCurrentTrack = activeAudioIndex === index

    if (isCurrentTrack && audioPlayerRef.current) {
      if (isAudioPlaying) {
        audioPlayerRef.current.pause()
        setIsAudioPlaying(false)
      } else {
        const playPromise = audioPlayerRef.current.play()
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(() => {
            setParseError('Njemóžach audio wothrać.')
          })
        }
        setIsAudioPlaying(true)
      }
      return
    }

    if (!audioPlayerRef.current) {
      audioPlayerRef.current = new Audio()
      audioPlayerRef.current.addEventListener('ended', () => {
        setIsAudioPlaying(false)
      })
    }

    audioPlayerRef.current.pause()
    audioPlayerRef.current.src = existingAudio.audioUrl
    audioPlayerRef.current.currentTime = 0

    const playPromise = audioPlayerRef.current.play()
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        setParseError('Njemóžach audio wothrać.')
      })
    }

    setActiveAudioIndex(index)
    setIsAudioPlaying(true)
  }

  const handleItemAction = (item, index) => {
    if (downloadedAudioByIndex[index]?.audioUrl) {
      togglePlayback(index)
      return
    }

    downloadItem(item, index)
  }

  const handleDownloadAll = async () => {
    if (sections.length === 0 || isDownloadingAll) {
      return
    }

    setIsDownloadingAll(true)
    setParseError('')

    try {
      if (!speakerId || !timbreId) {
        setParseError('Prošu rěčnika a timbre wuzwolić.')
        return
      }

      if (downloadAllMode === 'combined') {
        const allBlobs = []
        for (let i = 0; i < sections.length; i++) {
          const item = sections[i]
          const title = item.title || `Sekcija ${i + 1}`
          const text = item.text || ''
          const result = await synthesizeItemBlob({ title, text }, i)
          if (result.blob) {
            allBlobs.push(result.blob)
          }
          if (result.canceled) {
            break
          }
        }
        if (allBlobs.length > 0) {
          const combinedAllBlob = new Blob(allBlobs, { type: 'audio/mpeg' })
          triggerBlobDownload(combinedAllBlob, 'bamborak_html_wse_artikle.mp3')
        }
        return
      }

      for (let i = 0; i < sections.length; i++) {
        const item = sections[i]
        const title = item.title || `Sekcija ${i + 1}`
        const text = item.text || ''
        const result = await downloadItem({ title, text }, i)
        if (result?.canceled) {
          break
        }
      }
    } catch (error) {
      setParseError(error.message || 'Njemóžach wšě artikle sćahnyć.')
    } finally {
      setDownloadingIndex(null)
      setDownloadProgress(0)
      setIsDownloadingAll(false)
    }
  }

  return {
    downloadingIndex,
    downloadProgress,
    downloadedAudioByIndex,
    activeAudioIndex,
    isAudioPlaying,
    isDownloadingAll,
    downloadAllMode,
    setDownloadAllMode,
    resetAllDownloadState,
    cancelCurrentDownload,
    handleItemAction,
    handleDownloadAll,
  }
}

export default useArticleAudio
