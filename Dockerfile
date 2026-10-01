# syntax=docker/dockerfile:1
# Build and verify only the reviewed public export. The final image contains no build tools or source.
FROM node:24-bookworm-slim AS build
WORKDIR /app
ENV CI=true NG_CLI_ANALYTICS=false
RUN npm install --global pnpm@11.25.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN node tools/check-public.cjs && pnpm build && pnpm test && pnpm prune --prod

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production MGMT_HOST=0.0.0.0 MGMT_PORT=3333 MGMT_DATA_DIR=/data
# Docker initializes a fresh named volume from this directory with the node user's ownership.
RUN mkdir /data && chown node:node /data
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/tools/healthcheck.cjs ./tools/healthcheck.cjs
COPY --from=build /app/tools/sandbox.cjs ./tools/sandbox.cjs
COPY --from=build /app/LICENSE /app/THIRD_PARTY_NOTICES.md ./
USER node
EXPOSE 3333
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD ["node", "tools/healthcheck.cjs"]
CMD ["node", "dist/api/apps/api/src/main.js"]
