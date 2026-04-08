export const chunkText = (inputText, maxLength) => {
  const chunks = []
  let currentChunk = ''
  const sentences = inputText.split(/([.!?]+)/)

  const countWords = value => {
    return value
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 0).length
  }

  for (let i = 0; i < sentences.length; i += 2) {
    const sentence = sentences[i]
    const punctuation = sentences[i + 1] || ''
    const fullSentence = sentence + punctuation

    if (currentChunk === '') {
      currentChunk = fullSentence
    } else if (countWords(currentChunk + fullSentence) > maxLength) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim())
      }
      currentChunk = fullSentence
    } else {
      currentChunk += fullSentence
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }

  return chunks
}

export const synthesizeChunk = async ({
  apiUrl,
  chunk,
  speakerId,
  timbreId,
}) => {
  const response = await fetch(`${apiUrl}/api/tts/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: chunk,
      speaker_id: speakerId,
      timbre_id: timbreId,
      emotion: 'neutral',
      model: 'openvoice_v2/0417',
      format: 'mp3',
    }),
  })

  const blob = await response.blob()
  if (blob.type === 'application/json') {
    const details = await blob.text()
    throw new Error(details || 'TTS request failed')
  }

  return blob
}
