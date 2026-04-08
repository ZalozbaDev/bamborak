import { Link as LinkIcon } from '@mui/icons-material'
import { Box, Button, Input, Option, Select } from '@mui/joy'

function ParseControls({
  targetUrl,
  onTargetUrlChange,
  speakerId,
  onSpeakerChange,
  speakers,
  timbreId,
  onTimbreChange,
  timbres,
  isParsing,
  onParse,
}) {
  return (
    <>
      <Input
        startDecorator={<LinkIcon />}
        placeholder='https://...'
        value={targetUrl}
        onChange={event => onTargetUrlChange(event.target.value)}
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' },
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

        <Button loading={isParsing} onClick={onParse}>
          Parsować
        </Button>
      </Box>
    </>
  )
}

export default ParseControls
