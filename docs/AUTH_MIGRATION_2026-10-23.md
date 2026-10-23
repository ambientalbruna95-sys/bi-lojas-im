# Plano de migração de autenticação — 23/10/2026

## Diagnóstico verificado
- Supabase projeto BI Lojas IM (São Paulo): estado operacional inicializado na versão **987** no momento do preflight.
- Backup independente pré-migração: `ca7df279-c8b9-429b-9053-1120348683da`, versão 987.
- Auth.users: **0 usuários**; bi_profiles e tabelas relacionais: **0 linhas**.
- `bi-sync` versão 6 em produção ainda autentica usando `state.usuarios[].senha` e admite fallback `123456`.
- `cloud-sync.ts` envia userId e password em toda requisição; credenciais são mantidas em sessionStorage.
- Estado central é um JSON global. CAS por versão existe no push, mas qualquer usuário legado autenticado pode enviar o documento inteiro; isolamento de papéis não é confiável.
- Não há migração automática segura para as tabelas normalizadas enquanto os IDs de usuário e os modelos de acesso não forem reconciliados.

## Etapas seguras
1. Validar os e-mails individuais e relacioná-los aos IDs legados sem alterar registros históricos.
2. Criar usuários no Supabase Auth por convite/reset, com validação de e-mail. Não distribuir nem fixar senha universal `123456`.
3. Criar perfis de autorização sob controle administrativo; roles nunca derivadas de user_metadata.
4. Habilitar o novo fluxo de login atrás de feature flag **desligada por padrão**. Exigir `getUser`/JWT validado no servidor e conferir perfil ativo.
5. Adaptar `bi-sync` para validar JWT e impor autorização por ação. Nunca permitir a colaboradores sobrescrever `usuarios` ou o estado global sem controle; preferir operações por entidade/filial.
6. Implementar trava por versão e merge de conflito não destrutivo. Registrar auditoria por autor/data.
7. Testar Master, Diretoria, Funcionário e Influencer com contas distintas, além de login inválido, troca de senha, reconexão e concorrência.
8. Fazer dry-run de cópia de dados com contagens e hashes; validar restauração com o backup; só então ativar o novo login gradualmente e revogar o legado.

## Critérios de bloqueio de produção
- Não apagar `operational_state` ou seus backups.
- Não habilitar Auth novo enquanto zero contas estiverem provisionadas.
- Não publicar fluxo híbrido que autorize escrita integral com credenciais legadas.
- Não migrar senhas em texto puro para perfis.
- Não executar a migração SQL deste branch sem revisão de identidade, privilégios e rollback.
