import { useEffect, useRef, useState } from 'react'

export default function useCampaignReviewLink(campaign, onEnsureLink) {
  const ensureLink = useRef(onEnsureLink)
  const [link, setLink] = useState(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => { ensureLink.current = onEnsureLink }, [onEnsureLink])

  useEffect(() => {
    if (campaign.reviewToken) return
    let active = true
    const getLink = ensureLink.current
    setLink({ campaignId: campaign.id, token: '', status: 'loading' })
    Promise.resolve().then(() => getLink()).then((token) => {
      if (active) setLink({ campaignId: campaign.id, token: token || '', status: token ? 'ready' : 'error' })
    }).catch(() => {
      if (active) setLink({ campaignId: campaign.id, token: '', status: 'error' })
    })
    return () => { active = false }
  }, [campaign.id, campaign.reviewToken, attempt])

  const current = link?.campaignId === campaign.id ? link : null
  const token = campaign.reviewToken || current?.token || ''
  return {
    token,
    status: token ? 'ready' : current?.status || 'loading',
    retry: () => setAttempt((value) => value + 1),
  }
}
