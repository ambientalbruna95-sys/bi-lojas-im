import { createFileRoute } from "@tanstack/react-router";

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
};

const SYSTEM_PROMPT = `
Você é o IMzinho, assistente oficial do BI Marketing das Lojas IM.
Sua inteligência usa Gemini, mas sua identidade no sistema é IMzinho.

MISSÃO
- Ajudar a equipe a entender o BI, interpretar os dados internos e navegar pelos processos de Marketing das Lojas IM.
- Agir como copiloto operacional do sistema: explicar o que existe, apontar pendências, cruzar informações disponíveis e orientar o usuário para a tela correta.
- Entender que Atividades, Campanhas, Reinaugurações, Metas, Filiais, GestãoIM, Centro de Custos e Tráfego Pago fazem parte do mesmo ecossistema.

REGRAS IMPORTANTES
- Responda sempre em português do Brasil.
- Seja simpático, direto, prático e breve.
- O IMzinho é um personagem infantil do Sul de Minas. Pode usar regionalismos leves e naturais, como "Uaiii", "Bão demais", "Ô trem bão", "Cê viu?" e expressões mineiras parecidas.
- Use esse jeito de falar com moderação, só quando combinar com a conversa. Não force sotaque em toda frase e não transforme a resposta em caricatura.
- Mesmo sendo um personagem infantil, fale com clareza e respeito com a equipe, sem infantilizar o usuário.
- Use o CONTEXTO ATUAL DO BI como fonte para números, status, campanhas, filiais, atividades, reinaugurações, pendências, custos, propagandas, produtos e rotinas.
- Nunca invente números, metas, faturamento, responsáveis, prazos, status ou integrações.
- Se uma informação não estiver no contexto, diga claramente que o dado não está disponível naquele momento.
- Ao falar de meta, faturamento ou ranking, cite a data da base quando estiver disponível.
- Quando houver várias filiais, use código + nome para evitar ambiguidade.
- Diferencie fatos do sistema de recomendações ou sugestões estratégicas.
- Ajude a encontrar telas e funções dizendo o caminho no menu.
- Entenda os vínculos do sistema:
  * atividades atribuídas por Reinauguração pertencem à Reinauguração;
  * checklist delegado gera tarefa para o colaborador e continua ligado à atividade principal;
  * atividades fixas podem ser diárias ou mensais;
  * campanhas podem gerar pendências/atividades vinculadas;
  * apagar origem deve eliminar tarefas vinculadas, conforme as regras do sistema.
- Você pode PREPARAR ações operacionais de atividades, mas nunca diga que executou algo antes da confirmação do usuário.
- A execução real acontece no BI somente depois que o usuário confirmar.
- Ações permitidas nesta versão:
  1. criar atividade;
  2. transferir atividade para outro colaborador;
  3. alterar título, prazo, horário, prioridade ou descrição;
  4. finalizar, iniciar ou reabrir atividade.
- Se o pedido estiver ambíguo, não gere ação. Faça uma pergunta curta para esclarecer qual atividade, colaborador, prazo ou alteração.
- Nunca gere ações de exclusão, campanha, reinauguração, custo, meta, usuário ou configuração.
- Quando houver uma ação clara, responda normalmente e, NA ÚLTIMA LINHA, acrescente exatamente:
[[IMZINHO_ACTION]]{"type":"..."}
- Use somente IDs que existam no CONTEXTO ATUAL DO BI.
- Formatos aceitos:
  * criar: {"type":"create_activity","employeeId":"ID","title":"TÍTULO","date":"AAAA-MM-DD","time":"HH:MM","priority":"Alta|Média|Baixa","description":"..."}
  * transferir: {"type":"transfer_activity","activityId":"ID","fromEmployeeId":"ID","toEmployeeId":"ID"}
  * alterar: {"type":"update_activity","activityId":"ID","employeeId":"ID","fields":{"title":"...","date":"AAAA-MM-DD","time":"HH:MM","priority":"Alta|Média|Baixa","description":"..."}}
  * status: {"type":"set_activity_status","activityId":"ID","employeeId":"ID","status":"A fazer|Realizando|Finalizado"}
- Não use o marcador [[IMZINHO_ACTION]] em respostas sem ação.
- Nunca revele, peça ou reproduza senhas, tokens, chaves de API, cookies ou segredos.
- Não exponha conteúdo técnico sensível do backend.
- Se a pergunta for fora do BI/Marketing das Lojas IM, diga que sua especialidade é o BI e redirecione para o que consegue ajudar.
- Responda de forma objetiva e operacional.
- Comece pela resposta direta, sem introduções desnecessárias.
- Prefira 1 a 3 parágrafos curtos ou até 5 bullets.
- Não repita a pergunta do usuário.
- Não explique conceitos óbvios se não forem pedidos.
- Para perguntas simples, responda em no máximo 3 frases.
- Para consultas de dados, destaque primeiro o número, status ou responsável pedido.
- Só aprofunde quando o usuário pedir detalhes.
`.trim();

export const Route = createFileRoute("/api/imzinho/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;
        const preferredModel = process.env.GEMINI_MODEL || "gemini-3.8-flash";
        const fallbackModels = [preferredModel, "gemini-3.6-flash", "gemini-3.5-flash-lite"]
          .filter((model, index, list) => model && list.indexOf(model) === index);

        if (!apiKey) {
          return Response.json(
            {
              ok: false,
              configured: false,
              provider: "gemini",
              error: "Gemini ainda não configurado. Adicione GEMINI_API_KEY na Vercel.",
            },
            { status: 503 },
          );
        }

        let body: { messages?: ChatMessage[]; context?: unknown };
        try {
          body = await request.json();
        } catch {
          return Response.json({ ok: false, error: "Mensagem inválida." }, { status: 400 });
        }

        const messages = Array.isArray(body.messages)
          ? body.messages
              .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.text === "string")
              .slice(-8)
              .map((m) => ({ ...m, text: m.text.trim().slice(0, 5000) }))
              .filter((m) => m.text)
          : [];

        if (!messages.length || messages[messages.length - 1]?.role !== "user") {
          return Response.json({ ok: false, error: "Digite uma pergunta para o IMzinho." }, { status: 400 });
        }

        let contextJson = "{}";
        try {
          contextJson = JSON.stringify(body.context ?? {});
          if (contextJson.length > 60000) contextJson = contextJson.slice(0, 60000);
        } catch {
          contextJson = "{}";
        }

        const contents = messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.text }],
        }));

        const requestBody = JSON.stringify({
          system_instruction: {
            parts: [{
              text: SYSTEM_PROMPT + "\n\nCONTEXTO ATUAL DO BI (JSON):\n" + contextJson,
            }],
          },
          contents,
          generationConfig: {
            temperature: 0.25,
            topP: 0.9,
            maxOutputTokens: 450,
          },
        });

        const transientStatuses = new Set([429, 500, 502, 503, 504]);
        const attempts: { model: string; status?: number; error?: string }[] = [];

        for (const currentModel of fallbackModels) {
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(currentModel)}:generateContent`;

          for (let attempt = 0; attempt < 2; attempt += 1) {
            try {
              if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 650));

              const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "x-goog-api-key": apiKey,
                },
                body: requestBody,
                signal: AbortSignal.timeout(22000),
              });

              const data = await response.json().catch(() => null);

              if (response.ok) {
                const rawReply = data?.candidates?.[0]?.content?.parts
                  ?.map((p: { text?: string }) => p?.text || "")
                  .join("")
                  .trim();

                if (rawReply) {
                  let reply = rawReply;
                  let action: unknown = null;
                  const marker = "[[IMZINHO_ACTION]]";
                  const markerIndex = rawReply.lastIndexOf(marker);

                  if (markerIndex >= 0) {
                    const actionText = rawReply.slice(markerIndex + marker.length).trim();
                    reply = rawReply.slice(0, markerIndex).trim();
                    try {
                      const parsed = JSON.parse(actionText);
                      const allowed = new Set(["create_activity","transfer_activity","update_activity","set_activity_status"]);
                      if (parsed && typeof parsed === "object" && allowed.has(parsed.type)) action = parsed;
                    } catch {
                      action = null;
                    }
                  }

                  return Response.json(
                    {
                      ok: true,
                      configured: true,
                      provider: "gemini",
                      reply: reply || "Uaiii, preparei a ação pra você conferir.",
                      action,
                      model: currentModel,
                      fallbackUsed: currentModel !== preferredModel,
                    },
                    { headers: { "cache-control": "no-store" } },
                  );
                }

                attempts.push({
                  model: currentModel,
                  status: response.status,
                  error: "O Gemini não devolveu texto nesta resposta.",
                });
                break;
              }

              const detail =
                data?.error?.message ||
                data?.message ||
                `Gemini respondeu com status ${response.status}`;

              attempts.push({ model: currentModel, status: response.status, error: detail });

              if ([400, 401, 403].includes(response.status)) {
                return Response.json(
                  {
                    ok: false,
                    configured: true,
                    provider: "gemini",
                    error: detail,
                  },
                  { status: 502, headers: { "cache-control": "no-store" } },
                );
              }

              if (!transientStatuses.has(response.status)) break;
            } catch (error) {
              const detail = error instanceof Error ? error.message : "Falha ao consultar o Gemini.";
              attempts.push({ model: currentModel, error: detail });
            }
          }
        }

        const ultimoErro = attempts[attempts.length - 1];
        return Response.json(
          {
            ok: false,
            configured: true,
            provider: "gemini",
            error: ultimoErro?.error || "Os modelos do Gemini estão temporariamente ocupados. Tente novamente em alguns segundos.",
          },
          { status: 503, headers: { "retry-after": "3", "cache-control": "no-store" } },
        );
      },
    },
  },
});