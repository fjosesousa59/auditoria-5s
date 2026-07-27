# Auditoria 5S — Passo a passo simples

Duas partes: **1) criar o banco gratuito (Firebase)** e **2) publicar o site (Vercel)**.
Nenhuma das duas exige saber programar. Leva uns 10-15 minutos.

---

## PARTE 1 — Criar o banco compartilhado (Firebase)

1. Acesse **console.firebase.google.com** e entre com uma conta Google.
2. Clique em **"Adicionar projeto"** → dê um nome (ex.: `auditoria-5s-mg25`) → siga os passos padrão até criar.
3. No menu lateral, clique em **"Build" → "Realtime Database"**.
4. Clique em **"Criar banco de dados"**.
   - Escolha a localização (qualquer uma serve).
   - Selecione **"Iniciar em modo de teste"** (isso libera leitura/escrita por 30 dias — ótimo pra piloto; depois ajustamos a segurança).
5. Ainda no Firebase, clique no ícone de engrenagem (canto superior esquerdo) → **"Configurações do projeto"**.
6. Role até **"Seus apps"** → clique no ícone **`</>`** (Web) → dê um nome ao app → **"Registrar app"**.
7. O Firebase vai mostrar um bloco de código chamado `firebaseConfig` parecido com isto:

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "auditoria-5s-mg25.firebaseapp.com",
  databaseURL: "https://auditoria-5s-mg25-default-rtdb.firebaseio.com",
  projectId: "auditoria-5s-mg25",
  storageBucket: "auditoria-5s-mg25.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef",
};
```

8. Abra o arquivo **`src/firebase.js`** deste pacote e **substitua** o bloco `firebaseConfig` por esse que o Firebase te deu (copie e cole tudo).

---

## PARTE 2 — Publicar o site (Vercel)

1. Acesse **vercel.com** e crie uma conta gratuita (dá pra usar login do Google/GitHub).
2. Se ainda não tiver, crie uma conta grátis em **github.com** também.
3. No GitHub, crie um repositório novo (botão verde **"New"**) → dê um nome (ex.: `auditoria-5s`) → **"Create repository"**.
4. Suba os arquivos deste pacote pro repositório:
   - Mais fácil: na página do repositório, clique em **"uploading an existing file"** e arraste todos os arquivos e pastas deste pacote (incluindo a pasta `src`).
   - Confirme o upload (**"Commit changes"**).
5. Volte pra Vercel → **"Add New" → "Project"** → escolha o repositório que você acabou de criar → **"Import"**.
6. Deixe as configurações padrão (a Vercel detecta automaticamente que é um projeto Vite) → clique em **"Deploy"**.
7. Em 1-2 minutos a Vercel te dá uma URL do tipo `auditoria-5s.vercel.app` — esse é o link definitivo do app, acessível de qualquer celular.

---

## Testando

Abra a URL da Vercel no celular, preencha uma auditoria e salve. Se der erro ao salvar, confira se colou certinho o `firebaseConfig` no passo 8 da Parte 1.

## Sobre segurança (importante pro piloto)

O "modo de teste" do Firebase libera acesso de leitura/escrita pra qualquer um com o link do banco por 30 dias — suficiente pra validar com a equipe. Antes de rodar isso oficialmente na unidade por muito tempo, me chama que ajusto as regras de acesso (**Realtime Database → Regras**) pra travar melhor.

## Próximo passo (Teams)

Com a URL da Vercel em mãos, já dá pra transformar em aba fixa do Teams — é só eu montar o manifest apontando pra essa URL. Me avisa quando tiver o link publicado.
