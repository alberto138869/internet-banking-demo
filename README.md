# Vitta — conta digital demonstrativa

Protótipo front-end de uma conta digital responsiva, com acesso demonstrativo, painel de saldo, Pix, transferências e extrato.

## Como executar

Não é necessário instalar dependências. Abra `index.html` em um navegador moderno. Para servir os arquivos localmente, você também pode iniciar um servidor estático na pasta do projeto, por exemplo:

```bash
python -m http.server 8000
```

Em seguida, acesse <http://localhost:8000>.

## Funcionalidades

- Tela de acesso com opção de entrar na conta demonstrativa.
- Painel com saldo, entradas, saídas e movimentações recentes.
- Pix com formatos de chave, validação e formatação dos valores em reais.
- Transferências com validação de CPF/CNPJ e dados bancários, conferência antes de confirmar e aviso de saldo insuficiente.
- Extrato com filtros por período e tipo de movimentação e opção de baixar CSV.
- Layout adaptável a celular, tablet e desktop.
- Dados das operações demonstrativas salvos localmente no navegador.

## Tecnologias

- HTML, CSS e JavaScript sem dependências de build.
- `Intl.NumberFormat` para exibir valores em reais.
- `localStorage` para persistir as alterações da demonstração no navegador.

## Aviso importante

Este projeto é somente uma demonstração de interface. O login não autentica usuários, e Pix, transferências, saldo e extrato são simulados no próprio navegador. Não conecte dados bancários reais nem use credenciais ou informações pessoais reais.
