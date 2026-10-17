const profileFields = ['creatorId', 'revision', 'createdAt', 'name', 'tiktokLink', 'tiktokId', 'segment', 'category', 'type', 'followers', 'gmvMonth', 'expense', 'metaEcomNote', 'brandProducts', 'kocDecision', 'clientDecision', 'clientNote', 'creatorConfirmed']
const deliverableFields = ['id', 'product', 'progress', 'sdha', 'demoLink', 'metaEcomNote', 'brandFeedback', 'airTime', 'airLink', 'codeAds', 'codeAdsExpiry']
const pick = (value: Record<string, unknown>, fields: string[]) => Object.fromEntries(fields.filter((field) => value[field] !== undefined).map((field) => [field, value[field]]))
export function publicReviewDto(campaign: Record<string, unknown>) {
  return { ...pick(campaign, ['id', 'name', 'client', 'description', 'startDate', 'endDate', 'status', 'submissionResult']),
    creators: ((campaign.creators || []) as Record<string, unknown>[]).map((creator) => ({ ...pick(creator, profileFields),
      expense: creator.actualPrice !== '' && creator.actualPrice != null ? creator.actualPrice : creator.expense,
      deliverables: ((creator.deliverables || []) as Record<string, unknown>[]).map((item) => pick(item, deliverableFields)),
    })),
  }
}
