import { Link as LinkIcon } from '@mui/icons-material'
import { Box, Button, Input, Option, Select, Sheet, Typography } from '@mui/joy'
import { useMemo, useState } from 'react'

function ParseControls({
  targetUrl,
  onTargetUrlChange,
  urlHistory,
  onSelectHistoryUrl,
  speakerId,
  onSpeakerChange,
  speakers,
  timbreId,
  onTimbreChange,
  timbres,
  isParsing,
  onParse,
  onUploadHtmlFile,
}) {
  const [showHistory, setShowHistory] = useState(false)
  const [parseSource, setParseSource] = useState('url')

  const normalizeForPrefix = value => {
    return (value || '')
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
  }

  const filteredHistory = useMemo(() => {
    const queryRaw = (targetUrl || '').trim().toLowerCase()
    if (!queryRaw) {
      return urlHistory
    }

    const queryNormalized = normalizeForPrefix(queryRaw)
    return urlHistory.filter(item => {
      const itemRaw = item.toLowerCase()
      const itemNormalized = normalizeForPrefix(item)
      return (
        itemRaw.startsWith(queryRaw) ||
        itemNormalized.startsWith(queryRaw) ||
        itemNormalized.startsWith(queryNormalized)
      )
    })
  }, [targetUrl, urlHistory])

  return (
    <>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '180px 1fr' },
          gap: 1,
        }}
      >
        <Select
          value={parseSource}
          onChange={(event, value) => setParseSource(value || 'url')}
        >
          <Option value='url'>URL</Option>
          <Option value='html'>HTML upload</Option>
        </Select>

        {parseSource === 'url' ? (
          <Box sx={{ position: 'relative', display: 'flex', gap: 0.5 }}>
            <Input
              startDecorator={<LinkIcon />}
              placeholder='https://...'
              value={targetUrl}
              sx={{ flex: 1 }}
              onFocus={() => setShowHistory(true)}
              onBlur={() => {
                window.setTimeout(() => setShowHistory(false), 120)
              }}
              onChange={event => onTargetUrlChange(event.target.value)}
            />
            <Button loading={isParsing} onClick={onParse}>
              Parsować
            </Button>

            {showHistory && filteredHistory.length > 0 ? (
              <Sheet
                variant='outlined'
                sx={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  right: 0,
                  zIndex: 1200,
                  borderRadius: '10px',
                  maxHeight: '220px',
                  overflowY: 'auto',
                  p: 0.5,
                  boxShadow: 'sm',
                }}
              >
                {filteredHistory.map(item => (
                  <Button
                    key={item}
                    variant='plain'
                    color='neutral'
                    onMouseDown={event => {
                      event.preventDefault()
                      onSelectHistoryUrl(item)
                      setShowHistory(false)
                    }}
                    sx={{
                      width: '100%',
                      justifyContent: 'flex-start',
                      textAlign: 'left',
                      whiteSpace: 'normal',
                    }}
                  >
                    <Typography level='body-sm'>{item}</Typography>
                  </Button>
                ))}
              </Sheet>
            ) : null}
          </Box>
        ) : (
          <Button component='label' variant='outlined' disabled={isParsing}>
            HTML dataju nahrać
            <input
              hidden
              type='file'
              accept='.html,text/html'
              onChange={event => {
                const file = event.target.files?.[0]
                if (file) {
                  onUploadHtmlFile(file)
                }
                event.target.value = ''
              }}
            />
          </Button>
        )}
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          gap: 1,
        }}
      >
        <Select
          placeholder='Rěčnik'
          value={speakerId}
          onChange={(event, value) => {
            onSpeakerChange(value || '')
          }}
        >
          {speakers.map(speaker => (
            <Option key={speaker.id} value={speaker.id}>
              {speaker.name}
            </Option>
          ))}
        </Select>

        <Select
          placeholder='Timbre'
          value={timbreId}
          onChange={(event, value) => {
            onTimbreChange(value || '')
          }}
        >
          {timbres.map(timbre => (
            <Option key={timbre.id} value={timbre.id}>
              {timbre.name}
            </Option>
          ))}
        </Select>
      </Box>
    </>
  )
}

export default ParseControls
