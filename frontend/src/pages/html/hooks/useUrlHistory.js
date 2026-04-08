import { useEffect, useState } from 'react'

const URL_HISTORY_KEY = 'bamborak_html_url_history_v1'
const URL_HISTORY_LIMIT = 10

function useUrlHistory() {
  const [urlHistory, setUrlHistory] = useState([])

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(URL_HISTORY_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        setUrlHistory(
          parsed
            .filter(value => typeof value === 'string')
            .slice(0, URL_HISTORY_LIMIT),
        )
      }
    } catch {
      // ignore invalid localStorage payload
    }
  }, [])

  const rememberUrl = value => {
    const normalized = (value || '').trim()
    if (!normalized) return

    setUrlHistory(previous => {
      const next = [
        normalized,
        ...previous.filter(item => item !== normalized),
      ].slice(0, URL_HISTORY_LIMIT)
      window.localStorage.setItem(URL_HISTORY_KEY, JSON.stringify(next))
      return next
    })
  }

  return { urlHistory, rememberUrl }
}

export default useUrlHistory
