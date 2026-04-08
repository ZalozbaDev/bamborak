import {
  Download,
  KeyboardArrowDown,
  KeyboardArrowUp,
  Pause,
  PlayArrow,
  Stop,
} from '@mui/icons-material'
import { Box, CircularProgress, IconButton, Typography } from '@mui/joy'
import { useEffect, useRef, useState } from 'react'

const SIZE_DOWNLOAD_BUTTON = 30

function SectionCard({
  title,
  text,
  expanded,
  isDownloading,
  downloadProgress,
  hasDownloadedAudio,
  isItemPlaying,
  disableAction,
  onAction,
  onCancelDownload,
  onToggleExpanded,
}) {
  const measureRef = useRef(null)
  const [hasMoreThanFiveLines, setHasMoreThanFiveLines] = useState(false)

  useEffect(() => {
    const updateLineState = () => {
      const el = measureRef.current
      if (!el) return

      const style = window.getComputedStyle(el)
      const parsedLineHeight = Number.parseFloat(style.lineHeight)
      const lineHeight = Number.isFinite(parsedLineHeight)
        ? parsedLineHeight
        : Number.parseFloat(style.fontSize) * 1.2
      const estimatedLines = Math.round(el.scrollHeight / lineHeight)

      setHasMoreThanFiveLines(estimatedLines > 5)
    }

    updateLineState()

    const observer = new ResizeObserver(() => {
      updateLineState()
    })

    if (measureRef.current) {
      observer.observe(measureRef.current)
    }

    return () => {
      observer.disconnect()
    }
  }, [text])

  const stylingButtons = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: SIZE_DOWNLOAD_BUTTON,
    height: SIZE_DOWNLOAD_BUTTON,
    minHeight: SIZE_DOWNLOAD_BUTTON,
  }

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'neutral.outlinedBorder',
        borderRadius: '12px',
        p: 1.5,
        backgroundColor: 'background.surface',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 1,
        }}
      >
        <Typography level='h4'>{title}</Typography>
        <Box
          sx={{
            position: 'relative',
            width: SIZE_DOWNLOAD_BUTTON,
            height: SIZE_DOWNLOAD_BUTTON,
          }}
        >
          {isDownloading ? (
            <CircularProgress
              determinate
              value={downloadProgress}
              size='sm'
              sx={{
                ...stylingButtons,
                '--CircularProgress-size': `${SIZE_DOWNLOAD_BUTTON}px`,
              }}
            />
          ) : null}
          <IconButton
            variant='plain'
            color='primary'
            disabled={disableAction}
            onClick={isDownloading ? onCancelDownload : onAction}
            sx={{
              ...stylingButtons,
              borderRadius: '50%',
              backgroundColor: 'transparent',
              '&:hover': {
                backgroundColor: 'transparent',
              },
              '&:active': {
                backgroundColor: 'transparent',
              },
            }}
          >
            {isDownloading ? (
              <Stop size='sm' />
            ) : hasDownloadedAudio ? (
              isItemPlaying ? (
                <Pause />
              ) : (
                <PlayArrow />
              )
            ) : (
              <Download />
            )}
          </IconButton>
        </Box>
      </Box>

      <Typography
        level='body-md'
        sx={
          expanded || !hasMoreThanFiveLines
            ? undefined
            : {
                display: '-webkit-box',
                WebkitLineClamp: 5,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }
        }
      >
        {text}
      </Typography>

      {/* Hidden text probe to detect whether content exceeds five lines. */}
      <Typography
        level='body-md'
        ref={measureRef}
        sx={{
          position: 'absolute',
          visibility: 'hidden',
          pointerEvents: 'none',
          width: 'calc(100% - 24px)',
          zIndex: -1,
          overflow: 'visible',
          whiteSpace: 'normal',
        }}
      >
        {text}
      </Typography>

      {hasMoreThanFiveLines ? (
        <Box
          sx={{
            mt: 0.5,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <IconButton size='sm' variant='plain' onClick={onToggleExpanded}>
            {expanded ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
          </IconButton>
        </Box>
      ) : null}
    </Box>
  )
}

export default SectionCard
