import { useEffect, useRef, useState } from 'react'

import { max_textlen_chunks, url } from '../../../config.js'
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

  const synthesizeItemBlob = async (item, index) => {
    setDownloadingIndex(index)
    setDownloadProgress(0)

    const textPayload = `${item.title}\n\n${item.text}`
    const chunks = chunkText(textPayload, max_textlen_chunks)

    const audioBlobs = []
    for (let i = 0; i < chunks.length; i++) {
      const blob = await synthesizeChunk({
        apiUrl: url,
        chunk: chunks[i],
        speakerId,
        timbreId,
      })
      audioBlobs.push(blob)
      setDownloadProgress(((i + 1) / chunks.length) * 100)
    }

    const combinedBlob = new Blob(audioBlobs, { type: 'audio/mpeg' })
    const previous = downloadedAudioByIndex[index]
    if (previous?.audioUrl) {
      window.URL.revokeObjectURL(previous.audioUrl)
    }

    const playbackUrl = window.URL.createObjectURL(combinedBlob)
    setDownloadedAudioByIndex(previousState => ({
      ...previousState,
      [index]: {
        audioUrl: playbackUrl,
      },
    }))

    return combinedBlob
  }

  const downloadItem = async (item, index) => {
    if (!speakerId || !timbreId) {
      setParseError('Prošu rěčnika a timbre wuzwolić.')
      return
    }

    setParseError('')

    try {
      const blob = await synthesizeItemBlob(item, index)
      triggerBlobDownload(blob, `${sanitizeFilename(item.title)}.mp3`)
    } catch (error) {
      setParseError(error.message || 'Njemóžach audio sćahnyć.')
    } finally {
      setDownloadingIndex(null)
      setDownloadProgress(0)
    }
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
          const blob = await synthesizeItemBlob({ title, text }, i)
          allBlobs.push(blob)
        }
        const combinedAllBlob = new Blob(allBlobs, { type: 'audio/mpeg' })
        triggerBlobDownload(combinedAllBlob, 'bamborak_html_wse_artikle.mp3')
        return
      }

      for (let i = 0; i < sections.length; i++) {
        const item = sections[i]
        const title = item.title || `Sekcija ${i + 1}`
        const text = item.text || ''
        await downloadItem({ title, text }, i)
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
    handleItemAction,
    handleDownloadAll,
  }
}

export default useArticleAudio
