# Backend central: contrato e ativação

## Situação

A interface e o adaptador Supabase estão implementados. O banco, as funções, as políticas e os operadores ainda precisam ser criados e validados no projeto Lovable escolhido. Até essa etapa terminar, não há sincronização central ativa. O modo padrão continua sendo local, sem enviar os status locais ao servidor.

As regras do AGENTS.md reservam alterações de banco ao Lovable. Este documento especifica o contrato para essa implementação; não é uma migração executada.

## Configuração pública

Com Node.js 22.12 ou superior (validado com Node 24), configure no ambiente de hospedagem ou em `.env.local`:

```dotenv
VITE_SAMU_MODE=shared
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=CHAVE_PUBLICAVEL
```

Gere uma nova versão depois de alterar as variáveis. Nunca coloque senha, chave secreta ou service_role em variáveis VITE_. A integração recusa chaves administrativas. A URL precisa ser HTTPS.

O modo `shared` não reutiliza os status locais para indicar bases. Sem autenticação, autorização ou snapshot completo, todas as bases ficam como não confirmadas e não geram indicação. A sessão do operador fica no sessionStorage da aba. Nenhum operador é criado automaticamente pelo aplicativo.

## Dados e autorização obrigatórios no servidor

- Cadastro de operadores vinculado a `auth.users.id`, nome, ativo e perfil (`viewer`, `operator`, `supervisor`). Não confiar em `user_metadata` editável pelo usuário. Somente administração autorizada pode conceder, revogar ou alterar perfis.
- Dez bases com IDs `pcr`, `central`, `bandeira`, `arnaldo`, `barroslima`, `albertsabin`, `salomao`, `ceasa`, `hmr`, `hec`. Começar com `nao_confirmado`, nunca presumir que todas estejam disponíveis.
- Estado por base: status (`disponivel`, `sem_viatura`, `nao_confirmado`), versão inteira crescente, atualização gerada no servidor e autoria autenticada.
- Auditoria imutável e gravada na mesma transação da alteração: estado anterior e novo, ator autenticado, data do servidor, estação, request_id, versão anterior e nova.
- RLS e privilégios devem bloquear anônimos e usuários não cadastrados/inativos. `viewer` lê, `operator` e `supervisor` podem confirmar disponibilidade. Não conceder ao navegador escrita direta em estado, auditoria ou perfis.
- Revogar EXECUTE das funções de PUBLIC/anon; as funções precisam validar `auth.uid()` e autorização em cada chamada. Se SECURITY DEFINER for necessário, fixar search_path e qualificar objetos. RLS não deve ser o único controle dentro de função privilegiada.
- Auditoria não pode receber INSERT/UPDATE/DELETE/TRUNCATE do navegador. Identidade e timestamps não vêm do cliente. `station_id` é somente uma referência de diagnóstico, não prova de identidade.
- Se já existir outro cadastro no projeto, usar estruturas próprias do SAMU e preservar os dados anteriores. Não apagar tabelas nem substituir cadastros de outras aplicações.

## RPCs consumidas pelo código

### `samu_station_snapshot()`

Sem parâmetros. Somente operador ativo autorizado. Resposta JSON:

```json
{
  "operator": {"id": "UUID-DE-AUTH-USERS", "name": "Nome cadastrado", "role": "operator"},
  "bases": [
    {"base_id": "central", "status": "nao_confirmado", "version": 0, "updated_at": "2026-11-18T12:00:00Z"}
  ],
  "server_time": "2026-11-18T12:00:00Z"
}
```

`bases` deve conter exatamente as dez bases, sem repetição. A sessão deve corresponder a `operator.id`. O cliente rejeita snapshot incompleto. O timestamp de sincronização representa a leitura, não uma nova confirmação de disponibilidade por rádio.

### `samu_set_base_status(p_base_id text, p_status text, p_expected_version bigint, p_request_id uuid, p_station_id text)`

Somente operador/supervisor ativo. Aceitar apenas `disponivel` ou `sem_viatura` como confirmação manual. O servidor valida base, tamanhos e parâmetros, bloqueia a linha para atualização e compara a versão esperada. Se mudou desde a leitura, devolver conflito SQLSTATE `40001` sem sobrescrever nem criar auditoria de alteração inexistente.

Gravar estado e auditoria atomicamente. Usar chave idempotente por ator/request_id: repetir a mesma solicitação retorna o mesmo resultado; reutilizar identificador com conteúdo diferente é erro. Nunca persistir alteração sem auditoria. Resposta:

```json
{
  "record": {"base_id": "central", "status": "sem_viatura", "version": 1, "updated_at": "2026-11-18T12:01:00Z"},
  "audit_id": "IDENTIFICADOR-DO-EVENTO-COMO-STRING"
}
```

O cliente não mostra sucesso antecipado. Enquanto a gravação estiver pendente, bloqueia as demais alterações. Não existe fila automática de alterações offline. Em resultado incerto, releia o estado e consulte o histórico antes de repetir.

### `samu_status_audit(p_limit integer)`

Somente operadores ativos com autorização de leitura. Limitar o parâmetro no servidor a 1–50. Retornar os eventos mais recentes em ordem decrescente:

```json
[
  {
    "id": "1", "base_id": "central",
    "previous_status": "nao_confirmado", "current_status": "disponivel",
    "changed_at": "2026-11-18T12:01:00Z",
    "operator_name": "Nome cadastrado", "station_id": "UUID-DA-ESTACAO"
  }
]
```

Não retornar senhas, tokens, dados clínicos ou dados pessoais desnecessários. Se a política institucional limitar a leitura do histórico ao supervisor, a função deve aplicar essa regra; a interface informa o acesso recusado.

## Sincronização e contingência

O cliente consulta um snapshot completo a cada 15 segundos e ao recuperar rede/foco. Falha de leitura bloqueia imediatamente a indicação central; ausência de nova confirmação de conexão por mais de 45 segundos também invalida o snapshot. Isso não é telemetria de viatura nem atualização em tempo real garantida.

A versão serve para evitar que operadores sobrescrevam alterações concorrentes. O prazo de validade de uma disponibilidade individual precisa ser definido pela coordenação e aplicado no servidor; a rotina de leitura não deve renovar artificialmente a confirmação de uma viatura.

## Validação obrigatória antes de ativar

1. Desabilitar cadastro público e provisionar somente usuários autorizados. Aplicar política institucional de senha, sessão e MFA.
2. Testar chamadas sem sessão, com usuário fora do cadastro, inativo e com perfil viewer: não podem alterar estado, perfis nem auditoria.
3. Testar operador autorizado em dois navegadores/perfis independentes. Uma alteração confirmada deve aparecer no segundo em até um ciclo de consulta, com evento de auditoria correspondente.
4. Fazer os dois operadores alterarem a mesma versão: somente uma alteração deve vencer; a outra deve receber conflito.
5. Repetir o mesmo request_id e testar conteúdo diferente com a mesma chave. Confirmar idempotência sem duplicação.
6. Derrubar a rede, expirar/revogar a sessão e retirar a autorização: nenhuma disponibilidade local deve substituir a central; nenhuma alteração pode ficar silenciosamente em fila.
7. Verificar persistência, retenção de logs, backups, restauração, monitoramento e acessos administrativos com a TI responsável.
8. Homologar cobertura, endereços, coordenadas, fonte oficial dos status e protocolo com a coordenação/regulação do SAMU.

Os testes automatizados do adaptador e da interface usam respostas controladas; não substituem os testes das políticas no banco nem a integração com uma fonte oficial.

Referências do SDK: https://supabase.com/docs/reference/javascript/auth-signinwithpassword e https://supabase.com/docs/reference/javascript/auth-onauthstatechange .
