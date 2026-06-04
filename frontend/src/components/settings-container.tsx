import { Box, Option, Select } from '@mui/joy'
import { FC } from 'react'

export enum ExpertModelOption {
  VCTK_FREEVC24 = 'vctk/freevc24',
  OPENVOICE_V1_1226 = 'openvoice_v1/1226',
  OPENVOICE_V2_0417 = 'openvoice_v2/0417',
}
const expertModels: { key: ExpertModelOption; name: string }[] = [
  { key: ExpertModelOption.VCTK_FREEVC24, name: 'vctk/freevc24' },
  { key: ExpertModelOption.OPENVOICE_V1_1226, name: 'openvoice_v1/1226' },
  { key: ExpertModelOption.OPENVOICE_V2_0417, name: 'openvoice_v2/0417' },
]

export enum AudioSpeedOption {
  '0,25' = '0.25',
  '0,5' = '0.5',
  '0,75' = '0.75',
  '1,0' = '1.0',
  '1,25' = '1.25',
  '1,5' = '1.5',
  '1,75' = '1.75',
  '2,0' = '2.0',
}
const audioSpeedOptions: { key: AudioSpeedOption; name: string }[] = [
  { key: AudioSpeedOption['0,25'], name: '0.25x' },
  { key: AudioSpeedOption['0,5'], name: '0.5x' },
  { key: AudioSpeedOption['0,75'], name: '0.75x' },
  { key: AudioSpeedOption['1,0'], name: '1.0x' },
  { key: AudioSpeedOption['1,25'], name: '1.25x' },
  { key: AudioSpeedOption['1,5'], name: '1.5x' },
  { key: AudioSpeedOption['1,75'], name: '1.75x' },
  { key: AudioSpeedOption['2,0'], name: '2.0x' },
]

export const SettingsContainer: FC<{
  expertModel: ExpertModelOption
  setExpertModel: (value: ExpertModelOption) => void
  audioSpeed: AudioSpeedOption
  setAudioSpeed: (value: AudioSpeedOption) => void
}> = ({ expertModel, setExpertModel, audioSpeed, setAudioSpeed }) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'row',
      width: '100%',
      gap: 1,
    }}
  >
    <Select
      color='primary'
      placeholder='wuzwol sebi ekspertny model'
      variant='soft'
      sx={{ flex: 1 }}
      value={expertModel}
      onChange={(e, values) => {
        if (values) setExpertModel(values)
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
    <Select
      color='primary'
      placeholder='wuzwol sebi spěšnosc'
      variant='soft'
      sx={{ flex: 1 }}
      value={audioSpeed}
      onChange={(e, values) => {
        if (values) setAudioSpeed(values)
      }}
    >
      {audioSpeedOptions.map(option => {
        return (
          <Option value={option.key} key={option.key}>
            {option.name}
          </Option>
        )
      })}
    </Select>
  </Box>
)
