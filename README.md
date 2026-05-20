# B3 Signal Compass

Plataforma web para análise de ativos da B3 (Bolsa de Valores do Brasil). A aplicação consome dados de mercado em tempo real via BRAPI e apresenta indicadores técnicos e sinais de negociação em uma interface responsiva.

## Stack

| Tecnologia | Papel |
|---|---|
| React 18 + TypeScript | Framework UI |
| Vite | Bundler e servidor de desenvolvimento |
| Tailwind CSS | Estilização utilitária |
| shadcn/ui | Biblioteca de componentes |
| BRAPI | API de dados de mercado (B3) |

## Configuração

Crie um arquivo `.env` na raiz do projeto com a seguinte variável:

```env
VITE_BRAPI_TOKEN=seu_token_brapi
```

Obtenha sua chave em [brapi.dev](https://brapi.dev).

## Execução local

```bash
npm install
npm run dev
```

A aplicação estará disponível em `http://localhost:5173`.

## Deploy

O build estático é gerado com `npm run build` e pode ser servido por qualquer CDN ou hospedagem estática. O projeto está configurado com GitHub Pages.
