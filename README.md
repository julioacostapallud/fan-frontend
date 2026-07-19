# Fan! Bienal 2026 — Frontend

React + Vite + TypeScript + Reactstrap. Deploy: Netlify.

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

`VITE_API_URL` debe apuntar a la API (ej. `http://localhost:3000/api` o la URL de Vercel).

## Scripts

```bash
npm run dev
npm run build
npm test
```

## Netlify

- Base: raíz de este repo
- Build: `npm run build`
- Publish: `dist`
- Env: `VITE_API_URL`
