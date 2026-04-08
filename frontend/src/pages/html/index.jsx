import { Warning } from '@mui/icons-material'
import { Alert, Box, Button, Stack, Typography } from '@mui/joy'
import { useEffect, useMemo, useRef, useState } from 'react'

import { max_textlen_chunks, url } from '../../config.js'
import ParseControls from './components/ParseControls.jsx'
import SectionCard from './components/SectionCard.jsx'
import { chunkText, synthesizeChunk } from './utils/audioSynthesis.js'

function HtmlPage() {
  const [targetUrl, setTargetUrl] = useState('')
  const [sections, setSections] = useState([])
  const [expandedItems, setExpandedItems] = useState({})
  const [isParsing, setIsParsing] = useState(false)
  const [parseError, setParseError] = useState('')

  const [speakers, setSpeakers] = useState([])
  const [timbres, setTimbres] = useState([])
  const [speakerId, setSpeakerId] = useState('')
  const [timbreId, setTimbreId] = useState('')

  const [downloadingIndex, setDownloadingIndex] = useState(null)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [downloadedAudioByIndex, setDownloadedAudioByIndex] = useState({})

  const [activeAudioIndex, setActiveAudioIndex] = useState(null)
  const [isAudioPlaying, setIsAudioPlaying] = useState(false)

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

  useEffect(() => {
    fetch(`${url}/api/fetch_speakers/`)
      .then(response => response.json())
      .then(data => {
        setSpeakers(data)
        if (data.length > 0) {
          setSpeakerId(data[0].id)
          setTimbreId(data[0].id)
        }
      })
      .catch(() => {
        setParseError('Njemóžach rěčnikow začitać.')
      })

    fetch(`${url}/api/fetch_timbres/`)
      .then(response => response.json())
      .then(data => {
        setTimbres(data)
      })
      .catch(() => {
        setParseError('Njemóžach timbres začitać.')
      })
  }, [])

  const itemCountLabel = useMemo(() => {
    if (sections.length === 0) {
      return 'Žane zapiski namakane.'
    }
    return `${sections.length} zapiskow namakane`
  }, [sections])

  const handleParse = async () => {
    if (!targetUrl.trim()) {
      setParseError('Prošu URL zapodać.')
      return
    }

    setIsParsing(true)
    setParseError('')
    setSections([])
    setExpandedItems({})

    try {
      const response = await fetch(
        `${url}/parse?url=${encodeURIComponent(targetUrl.trim())}`,
      )
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Njemóžach stronu parsować.')
      }

      setSections(Array.isArray(data) ? data : [])
    } catch (error) {
      setParseError(error.message || 'Njemóžach stronu parsować.')
    } finally {
      setIsParsing(false)
    }
  }

  const toggleExpanded = index => {
    setExpandedItems(previous => ({
      ...previous,
      [index]: !previous[index],
    }))
  }

  const handleDownload = async (item, index) => {
    if (!speakerId || !timbreId) {
      setParseError('Prošu rěčnika a timbre wuzwolić.')
      return
    }

    setParseError('')
    setDownloadingIndex(index)
    setDownloadProgress(0)

    const textPayload = `${item.title}\n\n${item.text}`
    const chunks = chunkText(textPayload, max_textlen_chunks)

    try {
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

      const anchor = document.createElement('a')
      document.body.appendChild(anchor)
      anchor.style = 'display: none'
      const objectUrl = window.URL.createObjectURL(combinedBlob)
      anchor.href = objectUrl
      anchor.download = `${(item.title || 'bamborak_html').replace(/[^a-zA-Z0-9-_]/g, '_')}.mp3`
      anchor.target = '_blank'
      anchor.rel = 'noopener noreferrer'
      anchor.click()
      window.setTimeout(() => {
        window.URL.revokeObjectURL(objectUrl)
        document.body.removeChild(anchor)
      }, 1500)
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

    handleDownload(item, index)
  }

  return (
    <Box
      sx={{
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <Stack
        spacing={2}
        sx={{
          maxWidth: '840px',
          width: '100%',
          px: { xs: 1, sm: 2 },
          py: 2,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 1,
            flexWrap: 'wrap',
          }}
        >
          <Typography level='h2'>HTML parser</Typography>
          <Button component='a' href='/' variant='outlined' size='sm'>
            K TTS
          </Button>
        </Box>

        <Typography>
          URL zapodaj, potom dóstaneš lisćinu nadpismow a tekstow.
        </Typography>

        <ParseControls
          targetUrl={targetUrl}
          onTargetUrlChange={setTargetUrl}
          speakerId={speakerId}
          onSpeakerChange={setSpeakerId}
          speakers={speakers}
          timbreId={timbreId}
          onTimbreChange={setTimbreId}
          timbres={timbres}
          isParsing={isParsing}
          onParse={handleParse}
        />

        <Typography level='body-sm'>{itemCountLabel}</Typography>

        {parseError ? (
          <Alert color='danger' variant='soft' startDecorator={<Warning />}>
            {parseError}
          </Alert>
        ) : null}

        <Stack spacing={1.5}>
          {sections.map((item, index) => {
            const title = item.title || `Sekcija ${index + 1}`
            const text = item.text || ''
            const isDownloading = downloadingIndex === index
            const hasDownloadedAudio = Boolean(downloadedAudioByIndex[index])
            const isItemPlaying = activeAudioIndex === index && isAudioPlaying
            const disableAction =
              downloadingIndex !== null && !isDownloading && !hasDownloadedAudio

            return (
              <SectionCard
                key={`${title}-${index}`}
                title={title}
                text={text}
                expanded={Boolean(expandedItems[index])}
                isDownloading={isDownloading}
                downloadProgress={downloadProgress}
                hasDownloadedAudio={hasDownloadedAudio}
                isItemPlaying={isItemPlaying}
                disableAction={disableAction}
                onAction={() => handleItemAction({ title, text }, index)}
                onToggleExpanded={() => toggleExpanded(index)}
              />
            )
          })}
        </Stack>
      </Stack>
    </Box>
  )
}

export default HtmlPage
