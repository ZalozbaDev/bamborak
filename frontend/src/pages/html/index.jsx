import { Warning } from '@mui/icons-material'
import { Alert, Box, Button, Option, Select, Stack, Typography } from '@mui/joy'
import { useEffect, useMemo, useState } from 'react'

import { url } from '../../config.js'
import ParseControls from './components/ParseControls.jsx'
import SectionCard from './components/SectionCard.jsx'
import useArticleAudio from './hooks/useArticleAudio.js'
import useUrlHistory from './hooks/useUrlHistory.js'

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
  const { urlHistory, rememberUrl } = useUrlHistory()

  const {
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
  } = useArticleAudio({
    sections,
    speakerId,
    timbreId,
    setParseError,
  })

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

    rememberUrl(targetUrl)

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

  const handleParseHtmlFile = async file => {
    if (!file) {
      return
    }

    setIsParsing(true)
    setParseError('')
    setSections([])
    setExpandedItems({})

    try {
      const html = await file.text()
      if (!html.trim()) {
        throw new Error('HTML dataja je prózdna.')
      }

      const response = await fetch(`${urlDEBUG}/parse_html`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          html,
          source_url: file.name,
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Njemóžach HTML dataju parsować.')
      }

      setSections(Array.isArray(data) ? data : [])
    } catch (error) {
      setParseError(error.message || 'Njemóžach HTML dataju parsować.')
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
          Zapodaj URL, potom dóstanješ lisćinu nadpismow a tekstow.
        </Typography>

        <ParseControls
          targetUrl={targetUrl}
          onTargetUrlChange={setTargetUrl}
          urlHistory={urlHistory}
          onSelectHistoryUrl={setTargetUrl}
          speakerId={speakerId}
          onSpeakerChange={setSpeakerId}
          speakers={speakers}
          timbreId={timbreId}
          onTimbreChange={setTimbreId}
          timbres={timbres}
          isParsing={isParsing}
          onParse={handleParse}
          onUploadHtmlFile={handleParseHtmlFile}
        />

        <Typography level='body-sm'>{itemCountLabel}</Typography>

        {sections.length > 0 ? (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '220px 1fr' },
              gap: 1,
            }}
          >
            <Select
              value={downloadAllMode}
              onChange={(event, value) =>
                setDownloadAllMode(value || 'individual')
              }
            >
              <Option value='individual'>Wotdźělne MP3</Option>
              <Option value='combined'>Jedna MP3 (wšitko)</Option>
            </Select>
            <Button
              variant='soft'
              loading={isDownloadingAll}
              disabled={downloadingIndex !== null && !isDownloadingAll}
              onClick={handleDownloadAll}
            >
              Wšě artikle sćahnyć
            </Button>
          </Box>
        ) : null}

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
