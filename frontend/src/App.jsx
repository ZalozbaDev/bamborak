import {
  Download,
  Info,
  Pause,
  PlayArrow,
  ReplayOutlined,
  VolumeUp,
  Warning,
  Settings,
} from '@mui/icons-material'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  IconButton,
  Modal,
  ModalClose,
  ModalDialog,
  Option,
  Select,
  Sheet,
  Tooltip,
  Typography,
} from '@mui/joy'

import Textarea from '@mui/joy/Textarea'
import { Stack } from '@mui/system'
import { useEffect, useRef, useState } from 'react'

import {
  realtime_factor,
  url,
  max_textlen,
  max_textlen_chunks,
} from './config.js'

const emotions = [
  { key: 'neutral', name: 'neutralne' },
  { key: 'happy', name: 'wjesele' },
  { key: 'excited', name: 'rozbudźene' },
  { key: 'sad', name: 'zrudne' },
  { key: 'angry', name: 'rozhorjene' },
  { key: 'frightened', name: 'zatrašene' },
  { key: 'screaming', name: 'škrěčo' },
  { key: 'whispering', name: 'šeptajo' },
]

const expertModels = [
  { key: 'vctk/freevc24', name: 'vctk/freevc24' },
  { key: 'openvoice_v1/1226', name: 'openvoice_v1/1226' },
  { key: 'openvoice_v2/0417', name: 'openvoice_v2/0417' },
]

function App() {
  const [isLoading, setIsLoading] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speakers, setSpeakers] = useState([])
  const [timbres, setTimbres] = useState([])
  const [text, setText] = useState('')
  const [ID, setID] = useState('')
  const [timbreID, setTimbreID] = useState('')
  const [emotion, setEmotion] = useState('neutral')
  const [expertModel, setExpertModel] = useState('openvoice_v2/0417')
  const [showExpertOptions, setShowExpertOptions] = useState(false)
  const [hasEmotions, setHasEmotions] = useState(false)
  const [isLongText, setIsLongText] = useState(false)
  const [textChunks, setTextChunks] = useState([])
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0)
  const [isProcessingChunks, setIsProcessingChunks] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressDownload, setProgressDownload] = useState(0)
  const [estimatedTime, setEstimatedTime] = useState(0)
  const [infoOpen, setInfoOpen] = useState(false)
  const [infoText, setInfoText] = useState('')

  const audio = useRef()

  const audio_blob = useRef()

  // Robust audio/chunk playback refs
  const audioRef = useRef(null)
  const chunkEndHandlerRef = useRef(null)
  const currentUrlRef = useRef(null)
  const preloadedRef = useRef(new Map())
  const isUnmountedRef = useRef(false)
  const currentChunkRef = useRef(0)
  const chunksRef = useRef([])

  const isPlayingRef = useRef(false)
  const autoPausedRef = useRef(false)

  const timbreHasEmotions = timbre => {
    const value = timbre?.emotions
    if (Array.isArray(value)) return value.length > 0
    return Boolean(value)
  }

  const chunkText = (text, maxLength = max_textlen_chunks) => {
    const chunks = []
    let currentChunk = ''

    const sentences = text.split(/([.!?]+)/)

    // Helper to count words in a string
    const countWords = str => {
      return str
        .trim()
        .split(/\s+/)
        .filter(word => word.length > 0).length
    }

    for (let i = 0; i < sentences.length; i += 2) {
      const sentence = sentences[i]
      const punctuation = sentences[i + 1] || ''
      const fullSentence = sentence + punctuation

      // If current chunk is empty, add the sentence even if it's longer than maxLength
      // (we can't split a sentence in the middle)
      if (currentChunk === '') {
        currentChunk = fullSentence
      }
      // If adding this sentence would exceed maxLength (word count), save current chunk and start new one
      else if (countWords(currentChunk + fullSentence) > maxLength) {
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim())
        }
        currentChunk = fullSentence
      }
      // Otherwise, add the sentence to current chunk
      else {
        currentChunk += fullSentence
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim())
    }

    return chunks
  }

  const synthesizeChunk = (chunkText, chunkIndex) => {
    return new Promise((resolve, reject) => {
      fetch(`${url}/api/tts/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: chunkText,
          speaker_id: ID,
          timbre_id: timbreID,
          emotion: emotion,
          model: expertModel,
        }),
      })
        .then(response => {
          response.blob().then(blob => {
            if (blob.type === 'application/json') {
              var myReader = new FileReader()
              myReader.onload = function (event) {
                reject(new Error('' + myReader.result))
              }
              myReader.readAsText(blob)
            } else {
              resolve(blob)
            }
          })
        })
        .catch(reject)
    })
  }

  // --- helpers for safe URL lifecycle & preloading ---
  const revokeCurrentUrl = () => {
    if (currentUrlRef.current) {
      URL.revokeObjectURL(currentUrlRef.current)
      currentUrlRef.current = null
    }
  }

  const clearPreloaded = () => {
    preloadedRef.current.forEach(url => URL.revokeObjectURL(url))
    preloadedRef.current.clear()
  }

  const getChunkUrl = async index => {
    if (preloadedRef.current.has(index)) {
      return preloadedRef.current.get(index)
    }
    const blob = await synthesizeChunk(chunksRef.current[index], index)
    const urlObj = URL.createObjectURL(blob)
    preloadedRef.current.set(index, urlObj)
    return urlObj
  }

  // --- start chunked playback from currentChunkIndex ---
  const startChunkedPlayback = async () => {
    try {
      // pause previous and remove handler
      if (audioRef.current) {
        audioRef.current.pause()
        if (chunkEndHandlerRef.current) {
          audioRef.current.removeEventListener(
            'ended',
            chunkEndHandlerRef.current,
          )
        }
      }
      revokeCurrentUrl()

      // ensure we have the first URL
      const firstUrl = await getChunkUrl(currentChunkRef.current)

      // init audio element
      audioRef.current = new Audio(firstUrl)
      currentUrlRef.current = firstUrl

      // stable ended handler that advances by ref
      chunkEndHandlerRef.current = async () => {
        const nextIndex = currentChunkRef.current + 1
        if (nextIndex >= chunksRef.current.length) {
          // finished - keep chunks cached for replay
          audioRef.current.removeEventListener(
            'ended',
            chunkEndHandlerRef.current,
          )
          setIsPlaying(false)
          return
        }

        setCurrentChunkIndex(nextIndex)
        currentChunkRef.current = nextIndex

        try {
          const nextUrl = await getChunkUrl(nextIndex)
          revokeCurrentUrl()
          audioRef.current.src = nextUrl
          currentUrlRef.current = nextUrl
          audioRef.current.play()
          setIsPlaying(true)

          // lookahead preload
          const lookahead = nextIndex + 1
          if (
            lookahead < chunksRef.current.length &&
            !preloadedRef.current.has(lookahead)
          ) {
            getChunkUrl(lookahead).catch(e =>
              console.error('Error preloading lookahead chunk:', e),
            )
          }
        } catch (err) {
          console.error('Error switching chunk:', err)
          setIsProcessingChunks(false)
          setIsPlaying(false)
        }
      }

      audioRef.current.addEventListener('ended', chunkEndHandlerRef.current)
      audioRef.current.play()
      setIsLoaded(true)
      setIsPlaying(true)
    } catch (error) {
      setOpen(true)
      setError('Error synthesizing chunk: ' + error.message)
      setIsLoading(false)
      setIsProcessingChunks(false)
    }
  }

  const synthesize = () => {
    if (ID === '') {
      setOpen(true)
      setError('Dyrbiš sebi rěčnika wuzwolić!')
      return
    }
    if (text === '') {
      setOpen(true)
      setError('Dyrbiš tekst zapodać!')
      return
    }
    if (text.length > max_textlen && !isLongText) {
      setOpen(true)
      setError('Zapodaj tekst z <= ' + max_textlen + ' znamješkami!')
      return
    }

    if (isLongText) {
      // Chunked path
      const chunks = chunkText(text)
      chunksRef.current = chunks
      setTextChunks(chunks)
      setCurrentChunkIndex(0)
      currentChunkRef.current = 0
      setIsProcessingChunks(true)
      setIsLoading(true)
      setOpen(false)

      // cleanup before starting a new session
      if (audioRef.current) {
        audioRef.current.pause()
        if (chunkEndHandlerRef.current) {
          audioRef.current.removeEventListener(
            'ended',
            chunkEndHandlerRef.current,
          )
        }
      }
      revokeCurrentUrl()
      clearPreloaded()
      ;(async () => {
        try {
          // preload first two chunks
          await getChunkUrl(0)
          if (chunks.length > 1) {
            await getChunkUrl(1)
          }
          // begin playback
          await startChunkedPlayback()
          setIsLoading(false)
        } catch (error) {
          setOpen(true)
          setError('Error synthesizing chunk: ' + error.message)
          setIsLoading(false)
          setIsProcessingChunks(false)
        }
      })()
    } else {
      // Handle normal text synthesis
      setIsLoading(true)
      setProgress(0)
      setOpen(false)
      setEstimatedTime(((text.length / 11) * realtime_factor).toFixed())
      let estimated_time = ((text.length / 11) * realtime_factor).toFixed()
      console.log('est.time: ' + estimatedTime)
      let elapsed_time = 0
      let interval = setInterval(() => {
        elapsed_time++
        setProgress((elapsed_time / estimated_time) * 100)
        console.log(
          'el.time vs. est.time: ' +
            elapsed_time +
            ' / ' +
            estimated_time +
            ' = ' +
            (elapsed_time / estimated_time) * 100 +
            '%',
        )
      }, 1000)

      fetch(`${url}/api/tts/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          speaker_id: ID,
          timbre_id: timbreID,
          emotion: emotion,
          model: expertModel,
        }),
      }).then(response => {
        response.blob().then(blob => {
          console.log('result blob (' + blob.type + '): ')
          console.log(blob)
          clearInterval(interval)
          setIsLoading(false)
          if (blob.type == 'application/json') {
            var myReader = new FileReader()
            myReader.onload = function (event) {
              setOpen(true)
              setError('' + myReader.result)
              console.log('error: ' + myReader.result)
            }
            myReader.readAsText(blob)
          } else {
            // clean previous
            if (audioRef.current) {
              audioRef.current.pause()
              if (chunkEndHandlerRef.current) {
                audioRef.current.removeEventListener(
                  'ended',
                  chunkEndHandlerRef.current,
                )
              }
            }
            revokeCurrentUrl()
            clearPreloaded()

            audio_blob.current = blob
            const urlObj = URL.createObjectURL(blob)
            audioRef.current = new Audio(urlObj)
            currentUrlRef.current = urlObj
            audioRef.current.play()
            setIsLoaded(true)
            setIsPlaying(true)

            // keep legacy ref for download button
            audio.current = audioRef.current
          }
        })
      })
    }
  }

  const startDownload = () => {
    if (ID === '') {
      setOpen(true)
      setError('Dyrbiš sebi rěčnika wuzwolić!')
      return
    }
    if (text === '') {
      setOpen(true)
      setError('Dyrbiš tekst zapodać!')
      return
    }

    setIsLoading(true)
    setProgressDownload(0)
    setOpen(false)

    const chunks = chunkText(text)
    ;(async () => {
      try {
        // Synthesize all chunks
        const audioBlobs = []
        for (let i = 0; i < chunks.length; i++) {
          const blob = await synthesizeChunk(chunks[i], i)
          audioBlobs.push(blob)
          // Update progress
          setProgressDownload(((i + 1) / chunks.length) * 100)
        }

        // Combine all audio blobs into one
        const combinedBlob = new Blob(audioBlobs, { type: 'audio/mpeg' })

        // Download the combined file
        const a = document.createElement('a')
        document.body.appendChild(a)
        a.style = 'display: none'
        const url = window.URL.createObjectURL(combinedBlob)
        a.href = url
        a.download = 'bamborak_cyły_tekst.mp3'
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)

        setIsLoading(false)
        setProgressDownload(0)
      } catch (error) {
        setOpen(true)
        setError('Error synthesizing text: ' + error.message)
        setIsLoading(false)
        setProgressDownload(0)
      }
    })()
  }

  useEffect(() => {
    fetch(`${url}/api/fetch_speakers/`).then(response =>
      response.json().then(data => {
        const defaultSpeaker = Object.values(data)[0]
        setID(defaultSpeaker.id)
        setInfoText(defaultSpeaker.info)
        setTimbreID(defaultSpeaker.id)
        setSpeakers(data)
      }),
    )
    fetch(`${url}/api/fetch_timbres/`).then(response =>
      response.json().then(data => {
        setTimbres(data)
      }),
    )
  }, [])

  // keep refs in sync with state
  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])

  // Enable/disable emotions based on selected timbre (also on initial load)
  useEffect(() => {
    if (!timbres || timbres.length === 0) return

    const selected = timbres.find(t => t.id === timbreID)
    const fallback = timbres[0]

    // If we don't have a valid selection yet, pick the first timbre.
    if (!selected && !timbreID && fallback?.id) {
      setTimbreID(fallback.id)
      const enabled = timbreHasEmotions(fallback)
      setHasEmotions(enabled)
      if (!enabled) setEmotion('neutral')
      return
    }

    const enabled = timbreHasEmotions(selected)
    setHasEmotions(enabled)
    if (!enabled) setEmotion('neutral')
  }, [timbres, timbreID])

  // keep ref in sync with state
  useEffect(() => {
    currentChunkRef.current = currentChunkIndex
  }, [currentChunkIndex])

  // Auto-pause on tab/app background; auto-resume on return (only if it was playing)
  useEffect(() => {
    const pauseIfPlaying = () => {
      if (!audioRef.current) return
      const shouldPause =
        isPlayingRef.current &&
        !audioRef.current.paused &&
        !audioRef.current.ended

      if (shouldPause) {
        autoPausedRef.current = true
        audioRef.current.pause()
        setIsPlaying(false)
      }
    }

    const resumeIfAutoPaused = () => {
      if (!autoPausedRef.current) return
      if (!audioRef.current) return
      if (audioRef.current.ended) {
        autoPausedRef.current = false
        return
      }

      const playPromise = audioRef.current.play()
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise
          .then(() => {
            setIsPlaying(true)
            autoPausedRef.current = false
          })
          .catch(() => {
            // autoplay policies may block; keep paused state
            autoPausedRef.current = false
          })
      } else {
        setIsPlaying(true)
        autoPausedRef.current = false
      }
    }

    const onVisibilityChange = () => {
      if (document.hidden) pauseIfPlaying()
      else resumeIfAutoPaused()
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('blur', pauseIfPlaying)
    window.addEventListener('focus', resumeIfAutoPaused)

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('blur', pauseIfPlaying)
      window.removeEventListener('focus', resumeIfAutoPaused)
    }
  }, [])

  // cleanup on unmount
  useEffect(() => {
    return () => {
      isUnmountedRef.current = true
      if (audioRef.current) {
        audioRef.current.pause()
        if (chunkEndHandlerRef.current) {
          audioRef.current.removeEventListener(
            'ended',
            chunkEndHandlerRef.current,
          )
        }
      }
      revokeCurrentUrl()
      clearPreloaded()
    }
  }, [])

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
          maxWidth: '500px',
          display: 'flex',
          justifyContent: 'center',
          width: '100%',
          flexDirection: 'column',
        }}
      >
        <Typography level='display1' textAlign={'center'}>
          bamborak
        </Typography>
        <Typography level='h5' textAlign={'center'}>
          TTS-system za hornjoserbšćinu
        </Typography>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            width: '100%',
          }}
        >
          <Select
            color='primary'
            placeholder='wuzwol sebi hłós'
            variant='soft'
            sx={{ flex: 1 }}
            value={ID}
            onChange={(e, values) => {
              setID(values)
              setTimbreID(values)
              speakers.map(speaker => {
                if (speaker.id === values) {
                  setInfoText(speaker.info)
                }
              })
            }}
          >
            {speakers.map(speaker => {
              return (
                <Option value={speaker.id} key={speaker.id}>
                  {speaker.name}
                </Option>
              )
            })}
          </Select>
          <Tooltip title={'informacije k rěčnikej'} sx={{ ml: 1 }}>
            <IconButton
              onClick={() => {
                setInfoOpen(true)
              }}
            >
              <Info />
            </IconButton>
          </Tooltip>
        </Box>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            width: '100%',
          }}
        >
          <Select
            color='primary'
            placeholder='wuzwol sebi timbre'
            variant='soft'
            sx={{ flex: 1 }}
            value={timbreID}
            onChange={(e, values) => {
              const selected = timbres.find(timbre => timbre.id === values)
              const enabled = timbreHasEmotions(selected)
              setHasEmotions(enabled)
              if (!enabled) setEmotion('neutral')
              setTimbreID(values)
            }}
          >
            {timbres.map(timbre => {
              return (
                <Option value={timbre.id} key={timbre.id}>
                  {timbre.name}
                </Option>
              )
            })}
          </Select>
        </Box>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            width: '100%',
          }}
        >
          <Select
            color='primary'
            placeholder='wuzwol sebi emociju'
            variant='soft'
            disabled={!hasEmotions}
            sx={{ flex: 1 }}
            value={emotion}
            onChange={(e, values) => {
              setEmotion(values)
            }}
          >
            {emotions.map(emotionOption => {
              return (
                <Option value={emotionOption.key} key={emotionOption.key}>
                  {emotionOption.name}
                </Option>
              )
            })}
          </Select>
        </Box>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            width: '100%',
            justifyContent: 'flex-end',
            alignItems: 'center',
          }}
        >
          <Tooltip title={'ekspertne opcije'}>
            <IconButton
              size='sm'
              variant='outlined'
              color='neutral'
              onClick={() => setShowExpertOptions(!showExpertOptions)}
            >
              <Settings />
            </IconButton>
          </Tooltip>
        </Box>
        {showExpertOptions && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'row',
              width: '100%',
            }}
          >
            <Select
              color='primary'
              placeholder='wuzwol sebi ekspertny model'
              variant='soft'
              sx={{ flex: 1 }}
              value={expertModel}
              onChange={(e, values) => {
                setExpertModel(values)
              }}
            >
              {expertModels.map(modelOption => {
                return (
                  <Option value={modelOption.key} key={modelOption.key}>
                    {modelOption.name}
                  </Option>
                )
              })}
            </Select>
          </Box>
        )}

        <Modal open={infoOpen}>
          <ModalDialog color='primary' layout='center' size='sm' variant='soft'>
            <ModalClose
              onClick={() => {
                setInfoOpen(false)
              }}
            />
            <Typography level='h5'>Informacije k modelej</Typography>
            <Typography>
              <article dangerouslySetInnerHTML={{ __html: infoText }} />
            </Typography>
          </ModalDialog>
        </Modal>
        <Textarea
          color='primary'
          minRows={3}
          placeholder='zapisaj tu twój tekst'
          size='lg'
          variant='soft'
          sx={{ width: '100%' }}
          value={text}
          onChange={e => {
            setText(e.target.value)
          }}
        />
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            width: '100%',
            alignItems: 'center',
          }}
        >
          <Checkbox
            checked={isLongText}
            onChange={e => setIsLongText(e.target.checked)}
            label='Dolhi tekst'
            color='primary'
            variant='soft'
          />
        </Box>
        <Button
          onClick={synthesize}
          variant='soft'
          startDecorator={
            isLoading ? (
              <CircularProgress variant='soft' determinate value={progress} />
            ) : (
              <VolumeUp />
            )
          }
        >
          tekst sebi naposkać
        </Button>
        {isLongText && (
          <Button
            onClick={startDownload}
            variant='soft'
            startDecorator={
              isLoading ? (
                <CircularProgress
                  variant='soft'
                  determinate
                  value={progressDownload}
                />
              ) : (
                <Download />
              )
            }
          >
            cyły tekst wutworić
          </Button>
        )}
        {isLoading ? (
          <Typography>trochowany čas: {estimatedTime}s</Typography>
        ) : null}
        {isProcessingChunks && textChunks.length > 0 ? (
          <Typography>
            Chunk {currentChunkIndex + 1} z {textChunks.length}
          </Typography>
        ) : null}
        {isLoaded && !isLongText ? (
          <Sheet
            color='primary'
            variant='soft'
            sx={{
              height: '50px',
              padding: '5px',
              borderRadius: '20px',
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-evenly',
              alignItems: 'center',
            }}
          >
            <Button
              onClick={() => {
                if (isPlaying) {
                  audioRef.current?.pause()
                  setIsPlaying(false)
                } else {
                  if (isProcessingChunks) {
                    // Check if playback has finished (no active audio or audio has ended)
                    const hasFinished =
                      !audioRef.current ||
                      audioRef.current.ended ||
                      currentChunkRef.current >= chunksRef.current.length

                    if (hasFinished) {
                      // Restart from beginning
                      setCurrentChunkIndex(0)
                      currentChunkRef.current = 0
                      startChunkedPlayback()
                    } else {
                      // Resume current chunk
                      audioRef.current.play()
                      setIsPlaying(true)
                    }
                  } else {
                    audioRef.current?.play()
                    setIsPlaying(true)
                  }
                }
              }}
            >
              {isPlaying ? <Pause /> : <PlayArrow />}
            </Button>
            <Button
              onClick={() => {
                if (isProcessingChunks) {
                  // restart chunked playback from beginning
                  setCurrentChunkIndex(0)
                  currentChunkRef.current = 0
                  startChunkedPlayback()
                } else {
                  if (audioRef.current) {
                    audioRef.current.currentTime = 0
                    audioRef.current.play()
                    setIsPlaying(true)
                  }
                }
              }}
            >
              <ReplayOutlined />
            </Button>
            <Button
              disabled={isLongText}
              onClick={() => {
                var a = document.createElement('a')
                document.body.appendChild(a)
                a.style = 'display: none'
                let url = window.URL.createObjectURL(audio_blob.current)
                a.href = url
                a.download = 'bamborak.mp3'
                a.click()
                window.URL.revokeObjectURL(url)
              }}
            >
              <Download />
            </Button>
          </Sheet>
        ) : null}
        {open ? (
          <Alert
            color='danger'
            size='lg'
            variant='soft'
            startDecorator={<Warning />}
          >
            {error}
          </Alert>
        ) : null}
        <Typography level='h2'>Što je bamborak?</Typography>
        <Typography>
          Bamborak je TTS-system za hornjoserbšćinu. TTS je jendźelsce a stej za
          tekst k rěči. Bamborak je TTS-system na basy neuronalneje syće. Z
          neuronalnej syću móže bamborak přirodnu syntezu stworić.
        </Typography>
        <Typography level='h2'>
          Kak móžu bamborak za swójske projekty wužiwać?
        </Typography>
        <Typography>
          Namakaće projekt bamborak tež na{' '}
          <a href='https://github.com/Korla-tech/bamborak'>Github</a>. Tam so
          potom wšitko dalše wopisuje.
        </Typography>
        <Typography level='h2'>Kak funguje bamborak?</Typography>
        <Typography>
          Bamborak funguje na basy neuronalneje syće. To rěka, zo sym dyrbjał
          tysacore sady nahrawać. Z tutymi sadami sym potom model picował. Na
          kóncu maš potom model z kotrymž móžeš sebi kóždu serbsku sadu
          předčitać dać - a to potom tež zrozumić.
        </Typography>
        <Typography>
          ✉️{' '}
          <a
            title='přez mejlowy program'
            href='mailto:bamborak@gaussia.de?subject=M%C3%B3j%20feedback%20za%20bamboraka'
          >
            kontakt/feedback
          </a>
        </Typography>
      </Stack>
    </Box>
  )
}

export default App
