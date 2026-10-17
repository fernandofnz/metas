# Sala de Metas CREW — como colocar no ar (grátis)

O site fica hospedado no **GitHub Pages**. O login, os dados e as imagens ficam no **Supabase** (plano grátis).
O GitHub sozinho não guarda login nem imagens, por isso precisamos dos dois.

> Enquanto o `config.js` estiver vazio, o site abre em **MODO DEMONSTRAÇÃO**: você cria um acesso de teste e os dados ficam só no seu navegador. Serve para testar.

---

## 1. Criar o banco (Supabase)

1. Crie uma conta em https://supabase.com e clique em **New project** (pode usar o plano Free).
2. No Supabase, abra **SQL Editor** no menu da esquerda, clique em **New query**, cole **todo** o conteúdo do `supabase.sql` e clique em **Run**.
   Isso cria as tabelas, as permissões, a pasta das imagens e já cadastra os 39 moradores com a meta paga (verde).

## 2. Ajustar o login

Em **Authentication → Sign In / Providers → Email**:
- **Desligue "Confirm email".** O login é por ID, então não existe e-mail para confirmar.
- Deixe **"Allow new users to sign up"** ligado, para que a gerência consiga criar o próprio acesso pelo site.

## 3. Pegar as chaves

Em **Project Settings → API Keys** (ou **Data API**), copie:
- **Project URL** (ex.: `https://abcdefgh.supabase.co`)
- a chave **anon public** / **publishable**

Cole as duas no `config.js`:

```js
SUPABASE_URL: 'https://abcdefgh.supabase.co',
SUPABASE_ANON_KEY: 'eyJhbGciOi...',
```

Essa chave pode ficar pública: sem login ela não dá acesso a nada.
**Nunca** coloque a chave `service_role` / `secret` no site.

## 4. Publicar no GitHub Pages

1. Crie um repositório novo no GitHub (ex.: `sala-de-metas`).
2. Clique em **Add file → Upload files** e envie estes arquivos: `index.html`, `app.js`, `style.css`, `config.js` e `membros.js`.
3. Vá em **Settings → Pages**. Em **Source**, escolha **Deploy from a branch**, depois a branch **main** e a pasta **/ (root)**, e clique em **Save**.
4. Em 1 ou 2 minutos o site estará em `https://SEU-USUARIO.github.io/sala-de-metas/`.

---

## Acessos

- Na tela de login, a pessoa da gerência clica em **Criar acesso**, preenche **Nome e ID**.
- Depois disso, ela entra digitando **só o nome**, sem senha. Maiúsculas, acentos e espaços não importam: "Victor Oliveira" e "victor oliveira" entram na mesma conta.
- Cada nome só pode ter um acesso. Se o nome já existir, use um diferente (ex.: com o sobrenome).
- O site lembra quem entrou, então a pessoa só precisa digitar o nome de novo se clicar em **Sair** ou trocar de navegador.
- **Todo mundo que tem acesso pode tudo:** criar, editar e excluir salas, mudar a cor, marcar semanas e anexar ou remover imagens. Ninguém consegue mexer na estrutura do site, porque ela só muda pelos arquivos no GitHub.
- **Atenção:** como não há senha, qualquer pessoa que tiver o link do site consegue criar um acesso, ou entrar com o nome de alguém que já tem acesso. Passe o link só para a gerência e confira de vez em quando a lista em **Authentication → Users**.
- **Para impedir novos cadastros** (por exemplo, quando toda a gerência já tiver criado o acesso), desligue **"Allow new users to sign up"** em **Authentication → Sign In / Providers**. Para liberar de novo, é só ligar.
- **Para tirar o acesso de alguém**, vá em **Authentication → Users** no Supabase, encontre o nome da pessoa (aparece como `nome@crew.local`, ex.: `victor-oliveira@crew.local`) e apague o usuário.

## Como usar

- **Painel inicial:** salas separadas por Gerência, Soldados, Membros e Moradores, com busca por nome ou ID e o total de verdes, amarelos e vermelhos.
- **Linha colorida embaixo de cada sala:**
  - 🟢 **Meta paga** ou **Meta adiantada**
  - 🟡 **Meta atrasada** ou **Off**
  - 🔴 **Atrasada há mais de 1 semana**
- **Dentro da sala:** você escolhe a situação (a cor) e vê o calendário com **uma linha por semana** (de segunda a domingo). Em cada semana dá para:
  - marcar **Entregou / Não entregou / Pendente**;
  - anexar imagens: clique em **+ Anexar**, **arraste** a imagem até a semana, ou **clique na semana e cole com Ctrl+V** (dá para copiar a imagem direto do Discord);
  - escrever uma observação.
- **+ Nova sala:** cria uma sala. Em "Adicionar vários de uma vez" você cola uma lista `ID Nome`, uma por linha.
- **Dados da sala** (no fim da página do membro): editar nome, ID, cargo e meta semanal, ou excluir a sala.

## Limites do plano grátis do Supabase

- 1 GB de imagens. O site reduz cada imagem antes de enviar (fica com uns 200 a 400 KB), então cabem alguns milhares de imagens.
- Se o projeto ficar **uma semana inteira sem nenhum acesso**, o Supabase pausa o projeto. Nada é perdido: é só entrar no painel do Supabase e clicar em **Restore**. Com o uso de toda semana, isso não acontece.
- Se, ao criar acesso, aparecer erro de **e-mail inválido**, troque `LOGIN_DOMAIN` no `config.js` para `crew.app` antes de alguém criar acesso.
