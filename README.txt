GARIMPA CORTES - como colocar no ar (Render, gratuito)

1) CHAVE DO YOUTUBE
   - Entre em console.cloud.google.com, crie um projeto.
   - Menu "APIs e serviços" > "Biblioteca" > ative "YouTube Data API v3".
   - "Credenciais" > "Criar credenciais" > "Chave de API". Copie a chave.

2) GITHUB
   - Crie conta em github.com, crie um repositório novo e envie estes arquivos
     (server.js, package.json, index.html - todos na raiz).

3) RENDER
   - Entre em render.com com sua conta do GitHub.
   - New > Web Service > escolha o repositório.
   - Build Command: (deixe vazio ou "npm install")   Start Command: npm start
   - Em "Environment", adicione YOUTUBE_API_KEY = sua chave.
   - Clique em Create. Quando terminar, o Render dá o link do seu site.

Cota: cada garimpagem gasta ~200 dos 10.000 pontos diários da chave (uns 50 garimpos por dia).
Teste local (opcional): YOUTUBE_API_KEY=sua_chave node server.js  e abra http://localhost:3000
