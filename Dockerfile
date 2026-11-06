FROM node:22-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

COPY .next/standalone ./
COPY .next/static ./.next/static
COPY public ./public

RUN mkdir -p /app/data

EXPOSE 3000

CMD ["node", "server.js"]
