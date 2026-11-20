# Central SAMU 192

Estação web de apoio à consulta de cobertura do Recife e apoio regional da I Macrorregião de Pernambuco.

## Executar

Use Node.js 24 (a versão também está registrada em `.nvmrc`) e instale a cópia exata das dependências:

```powershell
npm ci
npm run dev
```

Abra o endereço exibido no terminal. A aplicação inclui as páginas /, /despacho e /regional. Para validar o projeto inteiro:

```powershell
npm run verify
```

O build usa TanStack Start com SSR. Para Netlify, `netlify.toml` seleciona o preset Nitro correto: o build gera `dist` e a função SSR necessária automaticamente. Não publique `.output/public` isoladamente em um host estático, pois isso perderia as rotas renderizadas pelo servidor.

## Fluxo de despacho

1. Escolha o bairro. Se souber a rua, preencha o endereço; Buscar endereço consulta sugestões apenas quando solicitado.
2. Consulte a cobertura. A indicação segue responsável disponível, apoio protocolar e alternativa disponível por menor distância em linha reta.
3. A rota é calculada da base indicada até o destino. Tempo e previsão são estimativas do provedor, sem trânsito em tempo real ou perfil de prioridade de ambulância.
4. Se não localizar o endereço, o destino será a referência do bairro, claramente identificada. Confirme o ponto real antes de decidir o despacho.
5. Alterações de disponibilidade exigem confirmação no diálogo. Consulte rádio/sistema oficial antes de confirmar.

O apoio regional ordena referências por linha reta. A linha tracejada e os minutos a 60 km/h não representam rota viária, disponibilidade ou tempo real de resposta. Fernando de Noronha não recebe referência terrestre.

## Status, privacidade e armazenamento

No modo local, os status ficam em localStorage deste navegador/origem. Abas do mesmo navegador recebem mudanças; computadores, perfis e operadores diferentes não sincronizam entre si. O adaptador de central compartilhada existe, mas só é ativado após o provisionamento e a homologação descritos abaixo. O servidor existente renderiza páginas SSR.

A consulta é mantida em sessionStorage por aba e contém endereço. Não digite nomes de pacientes, telefone, quadro clínico ou outros dados pessoais nos campos de busca. Endereços consultados e coordenadas de rota são enviados aos provedores configurados.

Se o armazenamento falhar, os status permanecem em memória e a interface avisa que serão perdidos ao fechar. O indicador Rede disponível reflete navigator.onLine; não garante a saúde dos provedores externos. O relógio e as previsões usam America/Recife.

## Provedores

Copie .env.example para .env.local para configurar um gateway OSRM compatível e um endpoint de geocodificação Nominatim compatível. Não use credenciais secretas em variáveis VITE_: elas são públicas no navegador. Refaça o build após mudar essas variáveis.

Serviços públicos permanecem como contingência. A busca tem cache limitado, intervalo mínimo por estação e exige uma ação explícita. O Nominatim público proíbe autocomplete, limita o tráfego total da aplicação a uma requisição por segundo e não deve receber dados confidenciais. Veja a política: https://operations.osmfoundation.org/policies/nominatim/ . O limite por estação não garante o limite agregado de várias estações; para uso multiestação, configure gateway central com controle agregado, cache e serviço autorizado.

VITE_PUBLIC_ROUTING_FALLBACK=false desativa provedores públicos de rota. VITE_ROUTING_URL deve apontar para uma base HTTPS compatível com /route/v1/driving. O mapa usa Esri/OSM sem chave de API.

## Antes do uso operacional

Homologue cobertura, endereços, coordenadas, regras de contingência e protocolo com a coordenação/regulação. Configure e teste a infraestrutura de rotas/endereço, disponibilidade oficial, controle de acesso e continuidade de rede necessários à operação. Os testes do software não equivalem à homologação do serviço SAMU.

## Integração central preparada nesta revisão

Use Node.js 22.12+; a verificação desta etapa usou Node 24. A instalação reproduzível usa npm e package-lock.json (npm ci). O bun.lock original pertence à versão anterior e não deve ser usado para esta entrega.

O adaptador Supabase, login por operador, perfis de consulta/edição, leitura de histórico e atualização central estão implementados. A ativação depende do provisionamento do banco e das funções pelo Lovable no projeto confirmado. O modo padrão continua local; esta entrega não configura nem presume uma fonte oficial de disponibilidade.

Leia docs/BACKEND-CENTRAL.md para o contrato completo das RPCs, políticas de acesso, concorrência, auditoria e os testes obrigatórios do banco. No modo shared, a interface bloqueia indicações e alterações quando a central não confirma acesso e disponibilidade.

## GitHub e Netlify

Esta pasta já pode ser enviada ao GitHub. Não inclua `node_modules`, `.output`, `.netlify` nem arquivos `.env`: todos já estão protegidos pelo `.gitignore`.

```powershell
git init
git add .
git commit -m "Preparar Central SAMU 192 para Netlify"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
git push -u origin main
```

No Netlify, importe esse repositório. O arquivo `netlify.toml` já define o comando `npm run build`, a publicação de `dist`, Node 24 e o preset SSR do Netlify. Não configure uma pasta de funções manualmente.

Para começar, mantenha `VITE_SAMU_MODE=local`. Só após o backend estar homologado, cadastre no painel do Netlify `VITE_SAMU_MODE=shared`, `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`. Essas variáveis são públicas no navegador; nunca cadastre senha, chave `service_role`, `sb_secret_*` ou token administrativo.
