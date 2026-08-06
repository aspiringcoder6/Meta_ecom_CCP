import 'dotenv/config'
import { createPrismaClient } from '../src/lib/create-prisma-client.js'

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL
if (!connectionString) throw new Error('DATABASE_URL is required to seed the database.')

const prisma = createPrismaClient(connectionString)

const creators = [
  { name: 'Linh Ngô', tiktokId: 'linhngo.daily', tiktokLink: 'https://www.tiktok.com/@linhngo.daily', segment: 'MASSIVE', category: 'LIFESTYLE', type: 'VIDEO', cost: 42000000, extraCost: 2000000, followers: 845000, gmvMonth: 1250000000, scope: '01 TikTok video review sản phẩm', contact: 'linh.ngo@example.com · 0912 345 682', historicalCampaign: 'Đã hợp tác', mcnNote: 'Phản hồi nhanh, đúng deadline.', engagement: 6.8, status: 'Active', email: 'linh.ngo@example.com', phone: '+84 912 345 682', bookingPrice: 42000000 },
  { name: 'Minh Anh', tiktokId: 'minhanh.review', tiktokLink: 'https://www.tiktok.com/@minhanh.review', segment: 'TOP', category: 'BEAUTY', type: 'VIDEO / LIVESTREAM', cost: 28000000, extraCost: 3000000, followers: 286000, gmvMonth: 780000000, scope: '01 video review + 01 phiên livestream', contact: 'minhanh@example.com · 0938 122 909', historicalCampaign: 'Đã hợp tác', mcnNote: 'Ưu tiên booking trước 14 ngày.', engagement: 8.4, status: 'In campaign', email: 'minhanh@example.com', phone: '+84 938 122 909', bookingPrice: 28000000 },
  { name: 'Tuấn Kiệt', tiktokId: 'tuan.travel', tiktokLink: 'https://www.tiktok.com/@tuan.travel', segment: 'MASSIVE', category: 'LIFESTYLE', type: 'VIDEO', cost: 46000000, extraCost: 5000000, followers: 654000, gmvMonth: 920000000, scope: '01 video trải nghiệm thực tế', contact: 'tuan.kiet@example.com · 0904 771 126', historicalCampaign: 'Đã hợp tác', engagement: 5.9, status: 'Active', email: 'tuan.kiet@example.com', phone: '+84 904 771 126', bookingPrice: 46000000 },
  { name: 'Gia Hân', tiktokId: 'han.eats', tiktokLink: 'https://www.tiktok.com/@han.eats', segment: 'MINI', category: 'FOOD', type: 'VIDEO', cost: 12500000, extraCost: 500000, followers: 92000, gmvMonth: 345000000, scope: '01 video review món ăn', contact: 'giahan@example.com · 0979 308 441', historicalCampaign: 'Chưa hợp tác', mcnNote: 'Có thể hỗ trợ quay tại TP.HCM.', engagement: 11.2, status: 'Available', email: 'giahan@example.com', phone: '+84 979 308 441', bookingPrice: 12500000 },
  { name: 'Hoàng Nam', tiktokId: 'namtech', tiktokLink: 'https://www.tiktok.com/@namtech', segment: 'TOP', category: 'TECH', type: 'VIDEO / LIVESTREAM', cost: 32000000, extraCost: 4000000, followers: 318000, gmvMonth: 1680000000, scope: '01 video unbox + 01 livestream 60 phút', contact: 'hoangnam@example.com · 0913 662 187', historicalCampaign: 'Đã hợp tác', mcnNote: 'Cần gửi sản phẩm test trước 7 ngày.', engagement: 7.3, status: 'In campaign', email: 'hoangnam@example.com', phone: '+84 913 662 187', bookingPrice: 32000000 },
  { name: 'Mai Phương', tiktokId: 'maiphuong.home', tiktokLink: 'https://www.tiktok.com/@maiphuong.home', segment: 'MINI', category: 'MOM&BABY', type: 'VIDEO', cost: 10500000, extraCost: 1000000, followers: 76000, gmvMonth: 285000000, scope: '01 video chia sẻ trải nghiệm mẹ và bé', contact: 'maiphuong@example.com · 0907 115 924', historicalCampaign: 'Chưa hợp tác', engagement: 9.6, status: 'Available', email: 'maiphuong@example.com', phone: '+84 907 115 924', bookingPrice: 10500000 },
  { name: 'Bảo Trâm', tiktokId: 'baotram.fit', tiktokLink: 'https://www.tiktok.com/@baotram.fit', segment: 'MINI', category: 'LIFESTYLE', type: 'LIVESTREAM', cost: 7500000, extraCost: 0, followers: 38000, gmvMonth: 190000000, scope: '01 livestream 90 phút', contact: 'baotram@example.com · 0889 443 762', historicalCampaign: 'Đã hợp tác', mcnNote: 'Khung giờ tốt: 20:00–22:00.', engagement: 13.1, status: 'Active', email: 'baotram@example.com', phone: '+84 889 443 762', bookingPrice: 7500000 },
  { name: 'Đức Thịnh', tiktokId: 'thinh.gaming', tiktokLink: 'https://www.tiktok.com/@thinh.gaming', segment: 'TOP', category: 'TECH', type: 'LIVESTREAM', cost: 35000000, extraCost: 5000000, followers: 415000, gmvMonth: 2100000000, scope: '02 livestream, mỗi phiên 120 phút', contact: 'ducthinh@example.com · 0901 247 553', historicalCampaign: 'Đã hợp tác', mcnNote: 'Tạm ngưng nhận booking trong tháng.', engagement: 7.9, status: 'Archived', email: 'ducthinh@example.com', phone: '+84 901 247 553', bookingPrice: 35000000 },
]

for (const creator of creators) {
  await prisma.creator.upsert({ where: { tiktokId: creator.tiktokId }, update: creator, create: creator })
}

console.log(`Seeded ${creators.length} creators.`)
await prisma.$disconnect()
