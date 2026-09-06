# ═══════════════════════════════════════════════════════════════
#  Pizza Hub — backend konteyneri
# ═══════════════════════════════════════════════════════════════
#
#  Bu Dockerfile har qanday konteyner platformasida ishlaydi:
#  Northflank, Render, Fly.io, Railway, Google Cloud Run, oddiy VPS.
#
#  Doimiy jarayon bo'lgani uchun bot LONG POLLING rejimida ishlaydi —
#  webhook sozlash kerak emas, DB heartbeat va katalog keshi tirik qoladi.

FROM node:22-alpine

# `dumb-init` — PID 1 muammosini hal qiladi va SIGTERM ni to'g'ri uzatadi,
# ya'ni platforma servisni to'xtatganda graceful shutdown ishlaydi.
RUN apk add --no-cache dumb-init

WORKDIR /app

# Bog'liqliklar alohida qatlamda — kod o'zgarganda qayta o'rnatilmaydi
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY . .

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

# root'dan ishlamaymiz
USER node

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/index.js"]
