# Gerador de Comunicado de Despedida · Interplan

Ferramenta interna da Interplan para gerar a arte de comunicado de falecimento sempre no padrão da marca. A pessoa envia a foto e preenche os dados, e o sistema gera a arte em três formatos:

| Formato | Tamanho |
|---|---|
| Feed | 1080 × 1350 px |
| Story | 1080 × 1920 px |
| Horizontal | 1200 × 628 px |

## Como usar

1. Envie a foto e ajuste o enquadramento arrastando a imagem na prévia (há controle de zoom e opção de preto e branco).
2. Preencha o nome e as datas de nascimento e falecimento.
3. Escolha o local do velório e do sepultamento na lista. Se o local não estiver cadastrado, use **“local não cadastrado”** e digite nome, endereço e cidade.
4. Confira a prévia nas três abas e clique em **Baixar os 3 formatos (.zip)**, ou baixe só o formato aberto em PNG/JPG.

## Estrutura

```
index.html            página (formulário, prévia, navbar e rodapé)
css/style.css         estilos da interface
js/config.js          links das redes sociais do rodapé (editar aqui)
js/logo-data.js       logo embutido usado na arte (canvas)
js/locais.js          lista de velórios e cemitérios (gerada a partir do CSV)
js/app.js             lógica: formulário, busca de locais, desenho das artes e download
assets/               logos
data/locais.csv       mapeamento de velórios e cemitérios (fonte da lista)
scripts/gerar_locais.py  converte data/locais.csv em js/locais.js
```

É um site estático: não precisa de build nem de servidor. Funciona no GitHub Pages.

## Atualizar a lista de velórios e cemitérios

1. Edite `data/locais.csv` (separado por `;`, colunas `Categoria;Cidade;UF;Nome;Endereço;CEP;Observações / Horário`).
   - `Categoria`: `Unidade Interplan`, `Velório Municipal`, `Casa de Velório` ou `Cemitério`.
   - Linhas de `Unidade Interplan` que são só escritório (sem “Velório” no nome) ficam fora da lista.
2. Rode:
   ```bash
   python3 scripts/gerar_locais.py
   ```
3. Faça commit de `data/locais.csv` e `js/locais.js`.

## Redes sociais do rodapé

Preencha as URLs em `js/config.js`. Ícone com URL vazia não aparece.

## Rodar localmente

Abra o `index.html` no navegador, ou sirva a pasta:

```bash
python3 -m http.server 8000
# http://localhost:8000
```

## Publicar no GitHub Pages

No repositório: **Settings → Pages → Build and deployment → Deploy from a branch**, escolha a branch `main` e a pasta `/ (root)`.

## Dependências externas (CDN)

- Google Fonts: Montserrat (interface) e Yellowtail (nome na arte)
- JSZip 3.10.1 (cdnjs), para o download dos três formatos em .zip

---
Dúvidas, sugestões ou evoluções: departamento de Marketing · WhatsApp (18) 99733-0972
