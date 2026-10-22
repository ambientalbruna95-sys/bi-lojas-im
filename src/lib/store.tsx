import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { initCloudState, mergeLegacyCloudState, pullCloudState, pushCloudState } from "@/lib/cloud-sync";

export type Perfil = "Master" | "Diretoria" | "Gerente de Marketing" | "Coordenação" | "Funcionário" | "Influencer";
export const PERFIS: Perfil[] = ["Master", "Diretoria", "Gerente de Marketing", "Coordenação", "Funcionário", "Influencer"];

export type Filial = { id: string; codigo: string; nome: string; cidade: string; instagram: string; isCD: boolean; gerente: string; meta: number };
export type Post = { id: string; tipo: "Reel" | "Feed" | "Stories" | "TikTok" | "YouTube"; link: string; data: string; views: number; likes: number; comentarios: number; filialId?: string; alcance?: number; engajamentos?: number; vendasAtribuidas?: number; receitaAtribuida?: number };
export type Influencer = { id: string; nome: string; handle: string; seguidores: number; cache: number; filialId: string; filialIds: string[]; pacote: string; frequencia: string; vinculos: { filialId: string; valor: number; pacote: string; frequencia: string; contrato?: string; observacao?: string }[]; posts: Post[] };
export type AssinaturaContrato = {
  modalidade: "Digitada" | "Imagem";
  nome: string;
  valor: string;
  fonte?: string;
  cpf?: string;
  assinadoEm: string;
  usuarioId: string;
  aceite: boolean;
};
export type EventoContrato = {
  id: string;
  data: string;
  tipo: "Criado" | "Editado" | "Enviado" | "Assinado influencer" | "Assinado empresa" | "Assinado testemunha 1" | "Assinado testemunha 2" | "Assinaturas invalidadas" | "Nova versão" | "Encerrado";
  usuario: string;
  detalhe?: string;
};
export type StatusContrato = "Rascunho" | "Aguardando influencer" | "Aguardando empresa" | "Aguardando testemunhas" | "Vigente" | "Encerrado" | "Cancelado";
export type ContratoInfluencer = {
  id: string;
  influencerId: string;
  filialId?: string;
  titulo: string;
  conteudo: string;
  versao: number;
  status: StatusContrato;
  inicioVigencia: string;
  fimVigencia: string;
  valor: number;
  criadoEm: string;
  atualizadoEm: string;
  assinaturaInfluencer?: AssinaturaContrato;
  assinaturaEmpresa?: AssinaturaContrato;
  assinaturaTestemunha1?: AssinaturaContrato;
  assinaturaTestemunha2?: AssinaturaContrato;
  historico: EventoContrato[];
};
export type JustificativaAtividade = {
  motivo: string;
  status: "Pendente" | "Aprovada" | "Rejeitada";
  enviadaEm: string;
  decididaEm?: string;
  decididoPor?: string;
};
export type AtividadeChecklistItem = {
  id: string;
  texto: string;
  feito: boolean;
  prazo?: string;
  horario?: string;
  responsavel?: string;
  responsavelId?: string;
  statusAtividade?: PendenciaStatus;
};
export type ComentarioAtividade = {
  id: string;
  autorUsuarioId?: string;
  autorFuncionarioId?: string;
  autorNome: string;
  texto: string;
  criadoEm: string;
  mencoesUsuarioIds: string[];
  lidaPorUsuarioIds: string[];
};
export type Atividade = {
  id: string;
  titulo: string;
  data: string;
  horario?: string;
  feito: boolean;
  status?: PendenciaStatus;
  sourcePendenciaId?: string;
  sourceReinauguracaoId?: string;
  sourceReinauguracaoCardId?: string;
  sourceReinauguracaoItemId?: string;
  sourceCampanhaId?: string;
  sourceAtividadeId?: string;
  sourceAtividadeOwnerId?: string;
  sourceAtividadeChecklistItemId?: string;
  sourceRotinaId?: string;
  sourceDespesaFixaId?: string;
  sourceDespesaFixaCompetencia?: string;
  origem?: "Manual" | "Central de Pendências" | "Reinauguração" | "Checklist delegado" | "Rotina diária" | "Campanha" | "Despesa fixa";
  area?: string;
  descricao?: string;
  prioridade?: "Alta" | "Média" | "Baixa";
  checklist?: AtividadeChecklistItem[];
  comentarios?: ComentarioAtividade[];
  justificativa?: JustificativaAtividade;
};
export type Funcionario = { id: string; nome: string; cargo: string; filialId: string; hardSkills: string[]; softSkills: string[]; atividades: Atividade[] };
export type RotinaDiaria = {
  id: string;
  funcionarioId: string;
  titulo: string;
  descricao?: string;
  horario?: string;
  prioridade: "Alta" | "Média" | "Baixa";
  checklist: AtividadeChecklistItem[];
  ativa: boolean;
  frequencia?: "Diária" | "Mensal";
  diaMes?: number;
  criadaEm: string;
};
export type Apoiador = { id: string; nome: string; logo: string; site: string; cota: string; valor: number };
export type AcaoCampanhaFilial = { id: string; nome: string; valor: number; observacao?: string };
export type PlanoCampanhaFilial = { filialId: string; verba: number; acoes: AcaoCampanhaFilial[] };
export type ProdutoPromocional = {
  id: string;
  sku: string;
  nome: string;
  descricao: string;
  imagem: string;
  url: string;
  precoSite: number | null;
  precoAnterior: number | null;
  precoVista: number;
  precoParcelado: number;
  parcelas: number;
  juros: "Sem juros" | "Com juros";
  jurosPercentual?: number;
  observacao: string;
  feito: boolean;
  growthVideo?: boolean;
};
export type VideoCampanha = { id: string; titulo: string; url: string; observacao?: string; criadoEm?: string };
export type AprovacaoCampanha = "Rascunho" | "Aguardando Diretoria" | "Aprovada" | "Ajustes solicitados";
export type Campanha = {
  id: string;
  nome: string;
  proposito: string;
  status: "Planejada" | "Ativa" | "Encerrada";
  prioridade?: "Alta" | "Média" | "Baixa";
  aprovacao: AprovacaoCampanha;
  aprovadoPor?: string;
  aprovadoEm?: string;
  observacaoAprovacao?: string;
  inicio: string;
  fim: string;
  verba: number;
  abrangencia: "Rede" | "Filiais";
  filialIds: string[];
  planosFiliais?: PlanoCampanhaFilial[];
  produtosPromocionais: ProdutoPromocional[];
  pecas: { Feed: boolean; Stories: boolean; Banner: boolean };
  artes?: Partial<Record<"Feed" | "Stories" | "Banner", string>>;
  logoCampanha?: string;
  videos?: VideoCampanha[];
  fonteProdutosUrl?: string;
  tom: number;
  apoiadores: Apoiador[];
};
export type Meta = { id: string; titulo: string; alvo: number; atual: number; unidade: string; prazo: string };
export type Venda = { id: string; filialId: string; data: string; valor: number };
export type JRetailLinha = { codigo: string; filial: string; vendas: number; pedidos: number | null; ticket: number | null };
export type JRetailLote = { id: string; inicio: string; fim: string; tipo: "vendas" | "ticket"; arquivo: string; importadoEm: string; linhas: JRetailLinha[] };
export type ResultadoDiario = { id: string; filialId: string; data: string; meta: number; faturamento: number; origem?: string; modo?: "movimento" | "acumulado" };
export type PendenciaStatus = "A fazer" | "Realizando" | "Finalizado";
export type Pendencia = {
  id: string;
  titulo: string;
  responsavel: string;
  funcionarioId?: string;
  prazo: string;
  prioridade: "Alta" | "Média" | "Baixa";
  feito: boolean;
  status?: PendenciaStatus;
  area: string;
  descricao?: string;
  campanhaId?: string;
  filialId?: string;
  checklist?: { id: string; texto: string; feito: boolean; prazo?: string }[];
  comentarios?: Comentario[];
};
export type Volante = { id: string; filialId: string; competencia: string; veiculo: string; fornecedor: string; spot: string; data: string; horas: number; custo: number; limiteMensal: number; rota: string };
export type Custo = { id: string; categoria: string; descricao: string; valor: number; filialId: string; data: string; reinauguracaoId?: string; origem?: "Manual" | "GestãoIM" | "Tráfego" | "Propaganda volante" | "Reinauguração" | "Despesa fixa"; externalId?: string; sincronizadoEm?: string };
export type DespesaFixa = {
  id: string;
  filialId: string;
  categoria: string;
  descricao: string;
  valor: number;
  recorrente?: boolean;
  frequencia: "Mensal" | "Trimestral" | "Semestral" | "Anual";
  inicio: string;
  diaVencimento: number;
  alertarDiasAntes: number;
  responsavelFuncionarioId?: string;
  alertaUsuarioIds: string[];
  ativa: boolean;
  pagamentos: { competencia: string; dataPago: string; valor: number }[];
};
export type Usuario = { id: string; nome: string; email: string; perfil: Perfil; ativo: boolean; vinculoId?: string; observacao?: string; senha?: string; foto?: string };
export type SocialPlatform = "Facebook" | "Instagram" | "TikTok" | "LinkedIn" | "YouTube";
export type SocialConnection = {
  id: string;
  plataforma: SocialPlatform;
  status: "Desconectado" | "Pendente" | "Conectado" | "Erro";
  conta: string;
  ultimaSincronizacao: string;
  observacao: string;
};
export type SocialMetric = {
  id: string;
  plataforma: SocialPlatform;
  competencia: string;
  filialId: string;
  seguidores: number;
  alcance: number;
  impressoes: number;
  engajamentos: number;
  cliques: number;
  visualizacoesVideo: number;
  posts: number;
};
export type CheckItem = { id: string; texto: string; feito: boolean; prazo?: string; horario?: string; responsavel?: string; responsavelId?: string; statusAtividade?: PendenciaStatus };
export type Comentario = { id: string; autor: string; texto: string; data: string };
export type CardStatus = "A fazer" | "Em andamento" | "Concluído" | "Bloqueado";
export type Card = { id: string; coluna: string; titulo: string; descricao: string; responsaveis: string[]; prazo: string; checklist: CheckItem[]; comentarios: Comentario[]; status: CardStatus };
export type Reinauguracao = { id: string; filialId: string; data: string; cards: Card[]; faturamentoFinal: number; observacaoResultado: string };
export type NotaAvaliacao = { criterio: string; nota: number };
export type TrafegoPago = {
  id: string;
  competencia: string;
  plataforma: "Meta Ads" | "Google Ads" | "TikTok Ads" | "YouTube Ads";
  filialId: string;
  campanha: string;
  objetivo: string;
  investimento: number;
  alcance: number;
  impressoes: number;
  cliques: number;
  resultados: number;
  receitaAtribuida: number;
  observacao: string;
};
export type AvaliacaoMensal = {
  id: string;
  funcionarioId: string;
  mes: string;
  avaliador: string;
  gerais: NotaAvaliacao[];
  funcao: NotaAvaliacao[];
  comentario: string;
  pontosFortes: string;
  pontosMelhoria: string;
  planoAcao: string;
  criadoEm: string;
};

export const CRITERIOS_GERAIS = ["Qualidade", "Organização", "Comunicação", "Prazo / Agilidade", "Proatividade", "Resultado"];

export const CRITERIOS_FUNCAO: Record<string, string[]> = {
  "e-jordan": ["Liderança", "Organização", "Planejamento", "Comunicação", "Gestão de equipe", "Visão estratégica"],
  "e-hellen": ["Organização", "Agilidade", "Suporte operacional", "Comunicação", "Atenção aos detalhes", "Comprometimento"],
  "e-bruna": ["Criatividade", "Qualidade visual", "Agilidade nas entregas", "Organização", "Entendimento de briefing", "Consistência visual"],
  "e-luiz": ["Análise de dados", "Mídia paga", "Capacidade estratégica", "Otimização de campanhas", "Organização", "Cumprimento de prazos"],
};

export const mediaNotas = (notas: NotaAvaliacao[]) => notas.length ? notas.reduce((a, n) => a + n.nota, 0) / notas.length : 0;

export const COLUNAS = ["ANTES DE IR", "ÍTENS PARA CARREGAR NO CAMINHÃO", "O QUE LEVAR CONOSCO", "DURANTE", "FINAL"];

export const uid = () => Math.random().toString(36).slice(2, 10);
const d = (offset: number) => { const x = new Date(); x.setDate(x.getDate() + offset); return x.toISOString().slice(0, 10); };

export const FILIAIS_OFICIAIS = [
  { codigo: "CD", nome: "CD / Lojas IM Oficial", instagram: "https://www.instagram.com/lojasimoficial/" },
  { codigo: "02", nome: "Varginha", instagram: "https://www.instagram.com/lojasimvarginha/" },
  { codigo: "03", nome: "Três Pontas Loja 03", instagram: "https://www.instagram.com/lojasimtrespontas03/" },
  { codigo: "05", nome: "Três Pontas Loja 05", instagram: "https://www.instagram.com/lojasimfonte/" },
  { codigo: "06", nome: "Carmo Cachoeira", instagram: "https://www.instagram.com/lojasimcarmocachoeira/" },
  { codigo: "08", nome: "Campo do Meio", instagram: "https://www.instagram.com/lojasimcampodomeio/" },
  { codigo: "10", nome: "Conc. dos Ouros", instagram: "https://www.instagram.com/lojasim_conceicaodosouros/" },
  { codigo: "11", nome: "Areado", instagram: "https://www.instagram.com/lojasimareado/" },
  { codigo: "12", nome: "Conc. Aparecida", instagram: "https://www.instagram.com/lojasimconceicaodaaparecida/" },
  { codigo: "13", nome: "Santana Vargem", instagram: "https://www.instagram.com/lojasimsantanadavargem/" },
  { codigo: "14", nome: "Careaçu", instagram: "https://www.instagram.com/lojasimcareacu/" },
  { codigo: "15", nome: "Congonhal", instagram: "https://www.instagram.com/lojasimcongonhal/" },
  { codigo: "16", nome: "Coqueiral", instagram: "https://www.instagram.com/loja.simcoqueiral16/" },
  { codigo: "18", nome: "Cabo Verde", instagram: "https://www.instagram.com/lojasimcaboverde/" },
  { codigo: "19", nome: "Monte Sto Minas", instagram: "https://www.instagram.com/lojasimmontesantodeminas/" },
  { codigo: "20", nome: "Arceburgo", instagram: "https://www.instagram.com/lojasimarceburgo/" },
  { codigo: "21", nome: "Nova Resende", instagram: "https://www.instagram.com/lojasim_novaresende/" },
  { codigo: "22", nome: "Juruaia", instagram: "https://www.instagram.com/im_juruaia/" },
  { codigo: "23", nome: "Cachoeira Minas", instagram: "https://www.instagram.com/lojasimcachoeirademinas/" },
  { codigo: "24", nome: "Bandeira do Sul", instagram: "https://www.instagram.com/lojasimbandeiradosul/" },
  { codigo: "25", nome: "Bueno Brandão", instagram: "https://www.instagram.com/lojaimbuenobrandao/" },
  { codigo: "26", nome: "Ipuiúna", instagram: "https://www.instagram.com/lojasimipuiuna/" },
  { codigo: "27", nome: "Caldas", instagram: "https://www.instagram.com/lojasim.caldas/" },
  { codigo: "28", nome: "Alterosa", instagram: "https://www.instagram.com/lojasimalterosa/" },
  { codigo: "29", nome: "Poços de Caldas", instagram: "https://www.instagram.com/lojasimpocos/" },
  { codigo: "30", nome: "Córrego do Ouro", instagram: "https://www.instagram.com/lojasimcorregodo/" },
  { codigo: "31", nome: "Muzambinho", instagram: "https://www.instagram.com/lojasimmuzambinho/" },
  { codigo: "32", nome: "Nepomuceno", instagram: "https://www.instagram.com/lojasimnepomuceno/" },
  { codigo: "33", nome: "Campos Gerais", instagram: "https://www.instagram.com/lojasimcamposgerais/" },
  { codigo: "35", nome: "Divisa Nova", instagram: "https://www.instagram.com/lojasimdivisanova/" },
  { codigo: "38", nome: "Bom Repouso", instagram: "https://www.instagram.com/lojasimbomrepouso/" },
];
const filiais: Filial[] = FILIAIS_OFICIAIS.map((x, i) => ({ id: `f${x.codigo}`, codigo: x.codigo, nome: x.nome, cidade: x.nome, instagram: x.instagram, isCD: x.codigo === "CD", gerente: "Não cadastrado", meta: x.codigo === "CD" ? 0 : 80000 + (i % 7) * 15000 }));
const lojas = filiais.filter((f) => !f.isCD);
export const igHandle = (url: string) => "@" + url.replace(/\/+$/, "").split("/").pop();

const tipos: Post["tipo"][] = ["Reel", "Feed", "Stories", "TikTok", "YouTube"];
const influencers: Influencer[] = [
  { id: "i-samira", nome: "Samira", handle: "@samiracardosotp", seguidores: 0, cache: 600, filialId: "f03", filialIds: ["f03","f05"], pacote: "2 sequências de stories por filial", frequencia: "Sexta-feira a cada 15 dias", vinculos: [
    { filialId: "f03", valor: 300, pacote: "2 sequências de stories", frequencia: "Sexta-feira a cada 15 dias", contrato: "Mensal", observacao: "1 ano" },
    { filialId: "f05", valor: 300, pacote: "2 sequências de stories", frequencia: "Sexta-feira a cada 15 dias", contrato: "Mensal", observacao: "1 ano" },
  ], posts: [] },
  { id: "i-quesia", nome: "Quesia Alves", handle: "@quesia_alvees", seguidores: 0, cache: 490, filialId: "f08", filialIds: ["f08"], pacote: "1 Reel + stories", frequencia: "Véspera do quinto dia útil", vinculos: [{ filialId: "f08", valor: 490, pacote: "1 Reel + stories", frequencia: "Véspera do quinto dia útil", contrato: "Esporádico", observacao: "Breno" }], posts: [] },
  { id: "i-amanda", nome: "Amanda", handle: "@amandaaccarvalho", seguidores: 0, cache: 300, filialId: "f10", filialIds: ["f10"], pacote: "2 Reels + sequência de stories", frequencia: "Sexta-feira a cada 15 dias ou campanha mais forte", vinculos: [{ filialId: "f10", valor: 300, pacote: "2 Reels + sequência de stories", frequencia: "Sexta-feira a cada 15 dias ou campanha mais forte", contrato: "Esporádico", observacao: "Ver para fechar mensal" }], posts: [] },
  { id: "i-juliana", nome: "Juliana Batista", handle: "@jubsbatista_", seguidores: 0, cache: 450, filialId: "f11", filialIds: ["f11"], pacote: "4 Reels + sequência de stories", frequencia: "Toda terça-feira", vinculos: [{ filialId: "f11", valor: 450, pacote: "4 Reels + sequência de stories", frequencia: "Toda terça-feira", contrato: "Mensal", observacao: "1 ano" }], posts: [] },
  { id: "i-carla", nome: "Carla", handle: "@carlaelisario / @portalmais1mg", seguidores: 0, cache: 450, filialId: "f12", filialIds: ["f12"], pacote: "1 Reel + 5 sequências de stories", frequencia: "Quinzenal", vinculos: [{ filialId: "f12", valor: 450, pacote: "1 Reel + 5 sequências de stories", frequencia: "Quinzenal", contrato: "Mensal" }], posts: [] },
  { id: "i-susany", nome: "Susany", handle: "@susanyevelyn", seguidores: 0, cache: 1500, filialId: "f15", filialIds: ["f15","f26"], pacote: "2 Reels + sequência de stories por filial", frequencia: "Terça-feira a cada 15 dias ou campanha mais forte", vinculos: [
    { filialId: "f15", valor: 750, pacote: "2 Reels + sequência de stories", frequencia: "Terça-feira a cada 15 dias ou campanha mais forte", contrato: "Mensal", observacao: "6 meses" },
    { filialId: "f26", valor: 750, pacote: "2 Reels + sequência de stories", frequencia: "Terça-feira a cada 15 dias ou campanha mais forte", contrato: "Mensal", observacao: "6 meses" },
  ], posts: [] },
  { id: "i-vanessa", nome: "Vanessa Cristina", handle: "@vanessacristinamidia", seguidores: 0, cache: 2000, filialId: "f18", filialIds: ["f18","f20","f21","f24"], pacote: "2 Reels + 4 sequências de stories por filial", frequencia: "Postagem de Reels em campanha mais forte", vinculos: [
    { filialId: "f18", valor: 500, pacote: "2 Reels + 4 sequências de stories", frequencia: "Postagem de Reels em campanha mais forte", contrato: "Mensal", observacao: "6 meses" },
    { filialId: "f20", valor: 500, pacote: "2 Reels + 4 sequências de stories", frequencia: "Postagem de Reels em campanha mais forte", contrato: "Mensal", observacao: "6 meses" },
    { filialId: "f21", valor: 500, pacote: "2 Reels + 4 sequências de stories", frequencia: "Postagem de Reels em campanha mais forte", contrato: "Mensal", observacao: "6 meses" },
    { filialId: "f24", valor: 500, pacote: "2 Reels + 4 sequências de stories", frequencia: "Postagem de Reels em campanha mais forte", contrato: "Mensal", observacao: "6 meses" },
  ], posts: [] },
  { id: "i-paola", nome: "Paola Santos", handle: "@paollasanttos", seguidores: 0, cache: 600, filialId: "f19", filialIds: ["f19"], pacote: "2 Reels + 2 sequências de stories", frequencia: "Postagem de Reels em campanha mais forte", vinculos: [{ filialId: "f19", valor: 600, pacote: "2 Reels + 2 sequências de stories", frequencia: "Postagem de Reels em campanha mais forte", contrato: "Mensal", observacao: "6 meses" }], posts: [] },
  { id: "i-priscila", nome: "Priscila Carvalho", handle: "@priilicarvalhoo", seguidores: 0, cache: 600, filialId: "f19", filialIds: ["f19"], pacote: "4 Reels + 2 sequências de stories", frequencia: "Postagem de Reels em campanha mais forte", vinculos: [{ filialId: "f19", valor: 600, pacote: "4 Reels + 2 sequências de stories", frequencia: "Postagem de Reels em campanha mais forte", contrato: "Mensal", observacao: "Testes" }], posts: [] },
  { id: "i-marcelly", nome: "Marcelly Silva", handle: "@marcellyestanoar", seguidores: 0, cache: 700, filialId: "f22", filialIds: ["f22"], pacote: "2 Reels por mês + sequência de stories", frequencia: "A combinar", vinculos: [{ filialId: "f22", valor: 700, pacote: "2 Reels por mês + sequência de stories", frequencia: "A combinar" }], posts: [] },
  { id: "i-jackeline", nome: "Jackeline", handle: "@_jackelinecosta_", seguidores: 0, cache: 700, filialId: "f23", filialIds: ["f23"], pacote: "2 Reels + sequência de stories", frequencia: "Segunda-feira a cada 15 dias", vinculos: [{ filialId: "f23", valor: 700, pacote: "2 Reels + sequência de stories", frequencia: "Segunda-feira a cada 15 dias", contrato: "Mensal", observacao: "3 meses" }], posts: [] },
  { id: "i-emerson", nome: "Emerson", handle: "@oemersonnegrao", seguidores: 0, cache: 600, filialId: "f27", filialIds: ["f27"], pacote: "4 Reels/mês + 2 sequências de stories", frequencia: "A combinar", vinculos: [{ filialId: "f27", valor: 600, pacote: "4 Reels/mês + 2 sequências de stories", frequencia: "A combinar", contrato: "Mensal", observacao: "3 meses teste" }], posts: [] },
  { id: "i-joao", nome: "João Guilherme Gregório", handle: "@joaogregoriooficial", seguidores: 0, cache: 600, filialId: "f29", filialIds: ["f29"], pacote: "2 Reels + sequência de stories", frequencia: "Esporádico", vinculos: [{ filialId: "f29", valor: 600, pacote: "2 Reels + sequência de stories", frequencia: "Esporádico", contrato: "Esporádico", observacao: "Matheus" }], posts: [] },
  { id: "i-claudia", nome: "Cláudia Pedrosa", handle: "@claudiapedrosamarketing", seguidores: 0, cache: 460, filialId: "f31", filialIds: ["f31"], pacote: "2 Reels + 4 sequências de stories", frequencia: "Quinta-feira a cada 15 dias", vinculos: [{ filialId: "f31", valor: 460, pacote: "2 Reels + 4 sequências de stories", frequencia: "Quinta-feira a cada 15 dias", contrato: "Mensal", observacao: "Maraisa" }], posts: [] },
  { id: "i-suellen", nome: "Suellen Nayra", handle: "@suellen_nayra1", seguidores: 0, cache: 950, filialId: "f32", filialIds: ["f32"], pacote: "1 Reel + 2 sequências de stories", frequencia: "Reels na quinta-feira da segunda semana do mês", vinculos: [{ filialId: "f32", valor: 950, pacote: "1 Reel + 2 sequências de stories", frequencia: "Reels na quinta-feira da segunda semana do mês", contrato: "Mensal", observacao: "3 meses" }], posts: [] },
  { id: "i-thais", nome: "Thaís Souza", handle: "@thaysmidia", seguidores: 0, cache: 530, filialId: "f35", filialIds: ["f35"], pacote: "4 Reels + 4 sequências de stories", frequencia: "Toda segunda-feira; Reels e Stories na semana", vinculos: [{ filialId: "f35", valor: 530, pacote: "4 Reels + 4 sequências de stories", frequencia: "Toda segunda-feira; Reels e Stories na semana", contrato: "Mensal", observacao: "3 meses" }], posts: [] },
  { id: "i-mirelle", nome: "Mirelle Mariano", handle: "@mirellemariano", seguidores: 0, cache: 400, filialId: "f38", filialIds: ["f38"], pacote: "2 Reels + sequência de stories", frequencia: "A combinar", vinculos: [{ filialId: "f38", valor: 400, pacote: "2 Reels + sequência de stories", frequencia: "A combinar", contrato: "Esporádico", observacao: "Ceza" }], posts: [] },
]

const VANESSA_CONTRATO_TEXTO = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE PARCERIA PARA DIVULGAÇÃO EM MÍDIAS DIGITAIS

Pelo presente instrumento particular, de um lado, ELETRO CASA NOVA LTDA., pessoa jurídica de direito privado, inscrita no CNPJ sob o nº 17.823.155/0024-17, com endereço profissional à Av. Santa Terezinha, 111 - Centro, Bandeira do Sul - MG, 37.740-000, doravante denominada simplesmente CONTRATANTE; e, de outro lado, Vanessa Cristina Flavio, brasileira, casada, influencer digital, inscrito no CPF sob o nº 133.743.496-50, portador do RG nº MG 19.835.946, residente e domiciliado à Rua José Ferraz n 347 – Bairro Parque da Colina, Muzambinho CEP 37890-000, e-mail: vc376112@gmail.com, telefone: (35) 99941-9420, doravante denominado INFLUENCER;

Celebram entre si o presente CONTRATO DE PARCERIA PARA DIVULGAÇÃO EM MÍDIAS DIGITAIS, mediante as cláusulas e condições seguintes:

CLÁUSULA PRIMEIRA – DO OBJETO
O presente contrato, regido pelas normas do Direito Civil, tem por objeto a criação, publicação e divulgação de conteúdo digital pelo CONTRATADO, por meio de suas redes sociais e plataformas digitais, com o objetivo de aumentar o tráfego, a visibilidade e as vendas da marca LOJAS IM – Eletro Casa Nova, promovendo seus produtos e/ou serviços, conforme diretrizes da CONTRATANTE.

CLÁUSULA SEGUNDA – DAS OBRIGAÇÕES DO CONTRATADO
O CONTRATADO se compromete a:
a) Criar e publicar os seguintes conteúdos: Instagram: 2 (dois) reels no feed a cada 15 dias e vinculação da página oficial da CONTRATANTE, além de 4 (quatro) stories por semana, com menção ao @ do Instagram da contratante;
b) Cumprir cronograma previamente estabelecido, com entrega de conteúdo até 48h antes da publicação para aprovação da CONTRATANTE;
c) Observar integralmente as diretrizes de branding da CONTRATANTE, incluindo identidade visual (logotipo, paleta de cores), mensagens-chave e tom de voz da marca;
d) Submeter todos os conteúdos à aprovação prévia da CONTRATANTE, comprometendo-se a realizar alterações solicitadas em até 24h, sem custos adicionais;
e) Indicar claramente que se trata de publicidade/promoção paga, conforme diretrizes legais e autorregulatórias vigentes.
f) Manter o conteúdo publicado disponível e ativo em seu perfil por, no mínimo, 6 (seis) meses contados da data da publicação;
g) Não divulgar conteúdo ofensivo, falso, ilegal ou que possa prejudicar a imagem da CONTRATANTE;
h) Ceder, de forma irrevogável e irretratável, os direitos de uso da imagem, voz e nome utilizados nos conteúdos à CONTRATANTE, para uso promocional, editorial e publicitário, inclusive em mídias pagas, em território nacional e internacional, durante a vigência do contrato e após seu encerramento;
i) Garantir a veracidade das informações veiculadas e não promover marcas concorrentes da CONTRATANTE durante a vigência deste contrato e pelos 6 (seis) meses subsequentes.

CLÁUSULA TERCEIRA – DAS OBRIGAÇÕES DA CONTRATANTE
A CONTRATANTE se compromete a:
a) Fornecer ao CONTRATADO todos os produtos, informações, materiais visuais e diretrizes necessários para a produção dos conteúdos;
b) Disponibilizar canal de comunicação para responder, em tempo hábil, dúvidas e solicitações do CONTRATADO, especialmente para aprovação dos materiais;
c) Realizar os pagamentos devidos conforme estabelecido na Cláusula Quarta;
d) Confirmar a aprovação de conteúdo enviado em até 48h do recebimento. O silêncio será interpretado como aprovação tácita.

CLÁUSULA QUARTA – DA REMUNERAÇÃO
A CONTRATANTE pagará ao CONTRATADO a quantia de R$ 500,00 (quinhentos reais), a título de remuneração pelos serviços prestados, por transferência bancária via PIX.
a) poderá haver bônus por performance, mediante alcance de metas previamente estipuladas em anexo, tais como: número de cliques, conversões em vendas, alcance orgânico, ou engajamento nas publicações.
b) O CONTRATADO se obriga a divulgar e promover, entre seus seguidores e audiência, cupons de desconto vinculados ao seu nome ou identidade, fornecidos pela CONTRATANTE.
c) A CONTRATANTE poderá, a seu critério, fornecer ao CONTRATADO cupons de desconto personalizados, também vinculados ao nome ou identidade do CONTRATADO, com o objetivo de mensurar a efetividade das ações de marketing e campanhas de divulgação. Nessa hipótese, o CONTRATADO se compromete a promover ampla divulgação desses cupons, por todos os meios acordados neste instrumento. Contudo, o uso dos cupons pelo público-alvo não implicará, por si só, em qualquer direito de remuneração adicional ao CONTRATADO, salvo se expressamente previsto na forma da cláusula 4, alínea “a”.

CLÁUSULA QUINTA – DA EXCLUSIVIDADE
Durante a vigência deste contrato e por 7 (sete) dias após seu término, o CONTRATADO se compromete a não divulgar, patrocinar ou promover produtos, serviços ou marcas concorrentes da CONTRATANTE que atuem no mesmo segmento de mercado, salvo autorização expressa e por escrito da CONTRATANTE.

CLÁUSULA SEXTA – DA PROPRIEDADE INTELECTUAL
O conteúdo produzido será considerado de propriedade e titularidade da CONTRATANTE, que poderá utilizá-lo em suas redes sociais, websites, e materiais publicitários diversos, inclusive em mídias pagas, pelo prazo de 2 (dois) anos após o término da parceria, sem qualquer ônus adicional ao CONTRATADO.

CLÁUSULA SÉTIMA – DA CONFIDENCIALIDADE
As partes se obrigam a manter sigilo absoluto sobre quaisquer informações, dados, documentos, estratégias e condições comerciais, não podendo divulgá-las a terceiros sem autorização prévia e escrita da outra parte, mesmo após o encerramento da relação contratual.

CLÁUSULA OITAVA – DO PRAZO E DA RESCISÃO
Este contrato terá vigência de 06 meses, renovando-se automaticamente se não houver objeção de qualquer das partes. O contrato poderá ser rescindido unilateralmente, com aviso prévio de 60 dias, comunicado por escrito (e-mail ou carta com aviso de recebimento).
Considerar-se-á, também, rescindido a qualquer tempo, por qualquer das partes, em caso de:
a) Descumprimento de quaisquer cláusulas ou obrigações aqui previstas;
b) Divulgação de conteúdo que afete negativamente a imagem da CONTRATANTE;
c) Má conduta profissional, comportamento inapropriado, antitético ou infração legal por parte do CONTRATADO;
d) Violação das cláusulas de confidencialidade ou exclusividade;
A parte infratora será responsabilizada civilmente pelos danos diretos e indiretos decorrentes da violação contratual.

CLÁUSULA NONA – DA CLÁUSULA PENAL
a) Em caso de descumprimento da obrigação de exclusividade prevista na Cláusula Quinta, o CONTRATADO pagará à CONTRATANTE, a título de cláusula penal compensatória, o valor equivalente a 20% (vinte por cento) do valor total contratado, independentemente de comprovação de prejuízo, sem prejuízo das perdas e danos eventualmente apuráveis em juízo.
b) Da mesma forma, a divulgação de conteúdo ofensivo, inverídico, ilegal ou que prejudique a imagem da CONTRATANTE, em violação ao disposto na Cláusula Segunda, item “g”, ensejará a aplicação de cláusula penal, no valor equivalente a 20% (vinte por cento) do valor total contratado, por ocorrência, podendo a CONTRATANTE, a seu critério, rescindir o contrato de forma imediata, sem prejuízo da apuração de danos morais e materiais.
c) O pagamento das penalidades previstas nesta cláusula deverá ocorrer no prazo máximo de 10 (dez) dias corridos, a contar da notificação formal enviada pela CONTRATANTE ao CONTRATADO.
d) A aplicação da cláusula penal não exime o CONTRATADO do cumprimento integral das demais obrigações contratuais, nem impede a adoção de medidas judiciais cabíveis para reparação de danos adicionais.

CLÁUSULA DÉCIMA – DAS DISPOSIÇÕES FINAIS
Este contrato é firmado com base na boa-fé e na confiança entre as partes, sendo personalíssimo em relação às obrigações do CONTRATADO, conforme disposto no artigo 248 do Código Civil.
Fica eleito o foro da Comarca de Três Pontas/MG, com renúncia expressa de qualquer outro, por mais privilegiado que seja, para dirimir quaisquer dúvidas oriundas deste contrato.

E, por estarem de pleno acordo, assinam as partes o presente instrumento em 2 (duas) vias de igual teor e forma, juntamente com 2 (duas) testemunhas.

Três Pontas, 04 de setembro de 2026

LOJAS IM – ELETRO CASA NOVA LTDA
Representante legal

Vanessa Cristina Flavio

[REPRESENTANTE DA AGÊNCIA, SE HOUVER]

TESTEMUNHAS:
1. Nome: ___________________________ CPF: _________________________
2. Nome: ___________________________ CPF: _________________________`;

const contratosIniciais: ContratoInfluencer[] = [{
  id: "ct-vanessa-bandeira-2026",
  influencerId: "i-vanessa",
  filialId: "f24",
  titulo: "Prestação de Serviços · Vanessa · Bandeira do Sul",
  conteudo: VANESSA_CONTRATO_TEXTO,
  versao: 1,
  status: "Rascunho",
  inicioVigencia: "2026-09-04",
  fimVigencia: "2027-03-04",
  valor: 500,
  criadoEm: "2026-09-04T12:00:00.000Z",
  atualizadoEm: "2026-09-04T12:00:00.000Z",
  historico: [{ id:"ev-vanessa-1", data:"2026-09-04T12:00:00.000Z", tipo:"Criado", usuario:"Equipe Lojas IM", detalhe:"Importado do contrato-base enviado para a plataforma." }],
}];

const funcionarios: Funcionario[] = [
  { id: "e-jordan", nome: "Jordan", cargo: "Gerente de Marketing", filialId: "fCD", hardSkills: ["Gestão de campanhas","Planejamento","Análise de resultados","Coordenação de equipe"], softSkills: ["Liderança","Comunicação","Organização","Tomada de decisão"], atividades: [] },
  { id: "e-hellen", nome: "Elen", cargo: "Assistente de Marketing", filialId: "fCD", hardSkills: ["Apoio operacional","Organização de materiais","Contato com fornecedores","Rotinas de marketing"], softSkills: ["Proatividade","Organização","Colaboração","Atenção aos detalhes"], atividades: [] },
  { id: "e-bruna", nome: "Bruna Marques", cargo: "Designer", filialId: "fCD", hardSkills: ["Design gráfico","Identidade visual","Social media","Peças de campanha"], softSkills: ["Criatividade","Agilidade","Comunicação visual","Organização"], atividades: [] },
  { id: "e-luiz", nome: "Luiz", cargo: "Analista de Marketing", filialId: "fCD", hardSkills: ["Mídia paga","Análise de dados","Vídeo","Métricas digitais"], softSkills: ["Pensamento analítico","Proatividade","Organização","Resolução de problemas"], atividades: [] },
]

export const EQUIPE = ["BRUNA", "JORDAN", "LUIZ", "ELEN"];

export const defaultCards = (): Card[] => {
  const card = (coluna: string, titulo: string, responsaveis: string[] = [], descricao = "", itens: string[] = []): Card => ({
    id: uid(), coluna, titulo, descricao, responsaveis, prazo: "", status: "A fazer", comentarios: [],
    checklist: itens.map((texto) => ({ id: uid(), texto, feito: false })),
  });
  return [
    card("ANTES DE IR", "PLANILHA DE CLIENTES OURO DO LUGAR", ["BRUNA"]),
    card("ANTES DE IR", "IMPULSIONAMENTO DA REINAUGURAÇÃO", ["LUIZ"]),
    card("ANTES DE IR", "EDIÇÃO DA REINAUGURAÇÃO", ["BRUNA","LUIZ"], "Organizar para entregar todas as edições antes da reinauguração.", ["Atenção","Babado","Dado Premiado","Chave Premiada","Faltam 3 dias","Faltam 2 dias","É amanhã"]),
    card("ANTES DE IR", "IMPRESSÕES", ["JORDAN"], "", ["PARA CHAVES","PARA PRODUTOS DA CHAVE","TABLOIDE","FAIXA","CARTAZ PRECIFICADOR","CARTAZ COM DATA PARA COLAR NO POST E ESTABELECIMENTO"]),
    card("ANTES DE IR", "SPOT DA REINAUGURAÇÃO", ["JORDAN"], "Música Jingle Reinauguração\nSpot é amanhã\nSpot tá acontecendo"),
    card("ANTES DE IR", "GRAVAR VÍDEOS DA REINAUGURAÇÃO", ["LUIZ"], "", ["Atenção","Moço Moço","Ameaço","Faltam 3 dias","Faltam 2 dias","É Amanhã","CHAVE PREMIADA"]),
    card("ANTES DE IR", "COMPRAS MERCADO", ["ELEN"], "Fazer compra de balas e pirulito total de 15 pacotes."),
    card("ANTES DE IR", "CAMISAS TIME IM", ["BRUNA"], "Verificar com o Cleiton qual equipe vai para a reinauguração. Produzir camiseta apenas para quem ainda não possui. Retirar antes da viagem."),
    card("ANTES DE IR", "DECORAÇÃO DE LOJA", ["ELEN"], "Solicitar contato da decoradora. Frente da loja com balões vermelho, amarelo e branco; dentro da loja, cachos. Usar outras reinaugurações como referência."),
    card("ANTES DE IR", "ALGUÉM PRA SER IMZINHO", [], "Solicitar alguém para vestir o IMzinho na carreata e no dia da reinauguração. Referência: R$ 200,00 + almoço."),
    card("ANTES DE IR", "CARRO DE SOM", [], "Reservar carro de som e microfone para a carreata. Registrar dias, horários e custos também em Propaganda Volante."),
    card("ANTES DE IR", "INFLUENCER DA REINAUGURAÇÃO", ["JORDAN"], "Reservar e orçar disponibilidade para gravação dos anúncios."),
    card("ANTES DE IR", "CARRO PARA IR AO LOCAL", ["JORDAN"], "Reservar veículo para a equipe."),
    card("ANTES DE IR", "PESSOAS PARA PANFLETAGEM", [], "Verificar na loja duas pessoas para entrega dos tabloides. Referência: R$ 50,00 por milheiro."),
    card("ANTES DE IR", "PESSOA PARA FAZER PIPOCA", [], "Orçar pipoca e algodão doce para os dias da ação."),
    card("ANTES DE IR", "LOCUTOR - PORTA DE LOJA", ["ELEN"], "Confirmar disponibilidade do locutor e locução da carreata."),
    card("ÍTENS PARA CARREGAR NO CAMINHÃO", "ENVIAR IMZINHO NO CAMINHÃO", ["ELEN"], "Embalar o mascote e conferir todos os itens.", ["Cabeça","Blusa","Sapato","Luva"]),
    card("ÍTENS PARA CARREGAR NO CAMINHÃO", "ENVIAR DADO NO CAMINHÃO", ["ELEN"], "Separar e deixar embalado na caixa.", ["Dado","Banner","Tripé"]),
    card("ÍTENS PARA CARREGAR NO CAMINHÃO", "ENVIAR CARTAZES DE PREÇO", ["ELEN"], "Solicitar cartazes de precificação e garantir chegada antecipada na loja."),
    card("ÍTENS PARA CARREGAR NO CAMINHÃO", "ITENS PARA ENVIAR NO CAMINHÃO", [], "Conferir com a decoradora as quantidades.", ["BALÃO INFLADO GRANDE","BEXIGAS","BALAS","BRINDES (boné e chaveiro)","CHAVE E CADEADO","CAMISAS","BANDEIRA COM MASTRO"]),
    card("O QUE LEVAR CONOSCO", "NOTEBOOK", ["BRUNA","JORDAN","LUIZ"], "", ["Notebook","Carregador","Mouse"]),
    card("O QUE LEVAR CONOSCO", "CELULAR", ["BRUNA","JORDAN","LUIZ"], "", ["Celular","Carregador","Power bank"]),
    card("DURANTE", "CARREATA", ["JORDAN"], "Verificar caminhonete para o IMzinho e confirmar rota, horário e equipe."),
    card("DURANTE", "ESPALHAR CHAVES", ["BRUNA","JORDAN","LUIZ"]),
    card("DURANTE", "ENTREGAR FOLHETOS", ["JORDAN"]),
    card("DURANTE", "GRAVAR VÍDEOS INFLUENCER", ["LUIZ"], "", ["Tá acontecendo","Amanhã tem mais","Último dia"]),
    card("DURANTE", "MANDAR MENSAGEM CONVIDANDO AS PESSOAS", ["BRUNA"], "Enviar convite aos clientes pelo WhatsApp da loja nos dias anteriores."),
    card("DURANTE", "COBERTURA NOS STORIES", ["LUIZ"], "", ["Véspera, ajustes finais da loja","Mostrar como foi abertura da loja","Promoções do dia"]),
    card("FINAL", "RELATÓRIO", ["JORDAN"], "Fechar fotos, vídeos, ações executadas, custos, vendas, alcance, influencers e pontos de melhoria."),
    card("FINAL", "ORGANIZAR RESPONSÁVEL PARA DEVOLUÇÃO", ["JORDAN"], "Verificar materiais do marketing e organizar devolução/conferência."),
  ];
};

const initial = {
  autenticado: false,
  usuarioAtivoId: "",
  perfil: "Master" as Perfil,
  influencerAtivaId: "i-samira",
  filiais,
  influencers,
  funcionarios,
  avaliacoes: [] as AvaliacaoMensal[],
  trafegoPago: [
    { id: "tp1", competencia: new Date().toISOString().slice(0,7), plataforma: "Meta Ads", filialId: "fCD", campanha: "Institucional / Ofertas", objetivo: "Mensagens e tráfego", investimento: 8500, alcance: 485000, impressoes: 920000, cliques: 18400, resultados: 1260, receitaAtribuida: 0, observacao: "Dados demonstrativos até inserir o relatório real do mês." },
    { id: "tp2", competencia: new Date().toISOString().slice(0,7), plataforma: "Google Ads", filialId: "fCD", campanha: "Pesquisa Lojas IM", objetivo: "Tráfego e intenção de compra", investimento: 4200, alcance: 0, impressoes: 185000, cliques: 7200, resultados: 540, receitaAtribuida: 0, observacao: "Dados demonstrativos até inserir o relatório real do mês." },
  ] as TrafegoPago[],
  campanhas: [
    { id: "c1", nome: "Black Friday IM", proposito: "Concentrar ofertas de alto apelo comercial para acelerar vendas no período de Black Friday.", status: "Planejada", aprovacao: "Rascunho", inicio: d(20), fim: d(25), verba: 25000, abrangencia: "Rede", filialIds: [], produtosPromocionais: [], pecas: { Feed: true, Stories: true, Banner: false }, tom: 25, apoiadores: [] },
    { id: "c2", nome: "Primavera em Casa", proposito: "Estimular renovação da casa com foco em móveis e categorias sazonais da primavera.", status: "Ativa", aprovacao: "Aprovada", inicio: d(-5), fim: d(10), verba: 12000, abrangencia: "Rede", filialIds: [], produtosPromocionais: [], pecas: { Feed: true, Stories: true, Banner: true }, tom: 0, apoiadores: [] },
    { id: "c3", nome: "Aniversário Lojas IM", proposito: "Celebrar o aniversário da rede, gerar fluxo nas lojas e reforçar percepção de oportunidade e premiação.", status: "Encerrada", aprovacao: "Aprovada", inicio: d(-40), fim: d(-30), verba: 18000, abrangencia: "Rede", filialIds: [], produtosPromocionais: [], pecas: { Feed: true, Stories: false, Banner: true }, tom: 340, apoiadores: [] },
  ] as Campanha[],
  metas: [
    { id: "m1", titulo: "Faturamento mensal da rede", alvo: 3000000, atual: 2150000, unidade: "R$", prazo: d(18) },
    { id: "m2", titulo: "Novos seguidores Instagram", alvo: 10000, atual: 7300, unidade: "seg.", prazo: d(18) },
    { id: "m3", titulo: "Reinaugurações no trimestre", alvo: 6, atual: 2, unidade: "lojas", prazo: d(60) },
  ] as Meta[],
  vendas: lojas.flatMap((f, i) => Array.from({ length: 6 }, (_, k) => ({ id: uid(), filialId: f.id, data: d(-k * 30), valor: 60000 + ((i + 1) * (k + 3) * 7919) % 70000 }))) as Venda[],
  resultadosDiarios: [] as ResultadoDiario[],
  jretailLotes: [] as JRetailLote[],
  pendencias: [
    { id: "p1", titulo: "Aprovar arte Black Friday", responsavel: "Bruna Marques", funcionarioId: "e-bruna", prazo: d(1), prioridade: "Alta", feito: false, status: "Realizando", area: "Campanhas", descricao: "Revisar identidade visual e peças principais antes da aprovação final.", checklist: [{ id: uid(), texto: "Feed", feito: true }, { id: uid(), texto: "Stories", feito: false }, { id: uid(), texto: "Banner", feito: false }], comentarios: [] },
    { id: "p2", titulo: "Confirmar entrega de conteúdo da Samira", responsavel: "Bruna Marques", funcionarioId: "e-bruna", prazo: d(2), prioridade: "Média", feito: false, status: "A fazer", area: "Influencers", descricao: "Conferir o combinado do mês e os links de Feed/Stories.", checklist: [], comentarios: [] },
    { id: "p3", titulo: "Importar vendas de setembro", responsavel: "Jordan", funcionarioId: "e-jordan", prazo: d(-1), prioridade: "Alta", feito: false, status: "Realizando", area: "Vendas", descricao: "Atualizar base de vendas e validar o relatório consolidado.", checklist: [], comentarios: [] },
    { id: "p4", titulo: "Rota do carro de som Varginha", responsavel: "Elen", funcionarioId: "e-hellen", prazo: d(4), prioridade: "Baixa", feito: true, status: "Finalizado", area: "Propaganda Volante", descricao: "Confirmar rota e horários com o fornecedor.", checklist: [], comentarios: [] },
    { id: "p5", titulo: "Analisar performance Meta Ads", responsavel: "Luiz", funcionarioId: "e-luiz", prazo: d(2), prioridade: "Média", feito: false, status: "A fazer", area: "Tráfego Pago", descricao: "Revisar CPM, CTR e custo por resultado da campanha ativa.", checklist: [], comentarios: [] },
  ] as Pendencia[],
  volantes: [
    { id: "v1", filialId: "f03", competencia: new Date().toISOString().slice(0,7), veiculo: "Carro de som", fornecedor: "", spot: "Institucional / ofertas", data: d(3), horas: 4, custo: 600, limiteMensal: 1200, rota: "Centro e bairros" },
    { id: "v2", filialId: "f05", competencia: new Date().toISOString().slice(0,7), veiculo: "Carro de som", fornecedor: "", spot: "Ofertas da semana", data: d(6), horas: 3, custo: 450, limiteMensal: 1000, rota: "Região central" },
  ] as Volante[],
  custos: [] as Custo[],
  despesasFixas: [] as DespesaFixa[],
  contratos: contratosIniciais,
  usuarios: [
    { id: "u-master", nome: "Bruna Marques", email: "", perfil: "Master", ativo: true, vinculoId: "e-bruna", observacao: "Acesso completo ao BI", senha: "123456" },
    { id: "u-diretoria", nome: "Diretoria", email: "", perfil: "Diretoria", ativo: true, observacao: "Visão estratégica", senha: "123456" },
    { id: "u-gerente", nome: "Jordan", email: "", perfil: "Gerente de Marketing", ativo: true, vinculoId: "e-jordan", observacao: "Gerente de Marketing", senha: "123456" },
    { id: "u-coord", nome: "Coordenação", email: "", perfil: "Coordenação", ativo: true, observacao: "Perfil de coordenação operacional", senha: "123456" },
    
    { id: "u-hellen", nome: "Elen", email: "", perfil: "Funcionário", ativo: true, vinculoId: "e-hellen", observacao: "Assistente de Marketing", senha: "123456" },
    { id: "u-luiz", nome: "Luiz", email: "", perfil: "Funcionário", ativo: true, vinculoId: "e-luiz", observacao: "Analista de Marketing", senha: "123456" },
    
    ...influencers.map((i) => ({ id: `u-${i.id}`, nome: i.nome, email: "", perfil: "Influencer" as Perfil, ativo: true, vinculoId: i.id, observacao: i.handle, senha: "123456" })),
  ] as Usuario[],
  conexoesSociais: [
    { id: "sc-fb", plataforma: "Facebook", status: "Desconectado", conta: "", ultimaSincronizacao: "", observacao: "Meta Graph API / Página do Facebook" },
    { id: "sc-ig", plataforma: "Instagram", status: "Desconectado", conta: "", ultimaSincronizacao: "", observacao: "Instagram Graph API / conta profissional" },
    { id: "sc-tt", plataforma: "TikTok", status: "Desconectado", conta: "", ultimaSincronizacao: "", observacao: "TikTok for Developers / Business API" },
    { id: "sc-li", plataforma: "LinkedIn", status: "Desconectado", conta: "", ultimaSincronizacao: "", observacao: "LinkedIn Marketing APIs / organização" },
    { id: "sc-yt", plataforma: "YouTube", status: "Desconectado", conta: "", ultimaSincronizacao: "", observacao: "YouTube Data API / Analytics API" },
  ] as SocialConnection[],
  metricasSociais: [] as SocialMetric[],
  coresResponsaveis: {} as Record<string, string>,
  rotinasDiarias: [] as RotinaDiaria[],
  reinauguracoes: [{ id: "r1", filialId: "f02", data: d(12), cards: defaultCards(), faturamentoFinal: 0, observacaoResultado: "" }, { id: "r2", filialId: "f03", data: d(25), cards: defaultCards(), faturamentoFinal: 0, observacaoResultado: "" }, { id: "r3", filialId: "f19", data: d(-2), cards: defaultCards().map((c, i) => ({ ...c, status: i % 2 ? "Concluído" : c.status, prazo: i % 2 ? c.prazo : d(-3) })), faturamentoFinal: 0, observacaoResultado: "" }, { id: "r4", filialId: "f31", data: "", cards: defaultCards(), faturamentoFinal: 0, observacaoResultado: "" }] as Reinauguracao[],
};

export type AppState = typeof initial;

export function excluirReinauguracaoEmCascata(state: AppState, reinauguracaoId: string): AppState {
  return {
    ...state,
    reinauguracoes: state.reinauguracoes.filter((x) => x.id !== reinauguracaoId),
    custos: state.custos.filter((x) => x.reinauguracaoId !== reinauguracaoId),
    funcionarios: state.funcionarios.map((func) => ({
      ...func,
      atividades: func.atividades.filter((a) => a.sourceReinauguracaoId !== reinauguracaoId),
    })),
  };
}

type Ctx = { s: AppState; set: (fn: (s: AppState) => AppState) => void };
const AppCtx = createContext<Ctx | null>(null);

const normalizaPessoa = (valor: string) => valor
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .trim()
  .toUpperCase();

function funcionarioDoResponsavel(state: AppState, nome?: string) {
  const alvo = normalizaPessoa(nome || "");
  if (!alvo) return undefined;
  return state.funcionarios.find((f) => {
    const nomeFunc = normalizaPessoa(f.nome);
    return nomeFunc === alvo || nomeFunc.split(" ")[0] === alvo.split(" ")[0];
  });
}

/**
 * Migra atribuições antigas da reinauguração de Muzambinho para os nomes
 * oficiais da equipe. Isso também faz com que tarefas criadas antes da
 * integração com Atividades passem a ser reconhecidas automaticamente.
 */
function normalizeMuzambinhoAssignments(state: AppState): AppState {
  let alterou = false;

  const reinauguracoes = state.reinauguracoes.map((r) => {
    if (r.filialId !== "f31") return r;

    const cards = r.cards.map((card) => {
      const responsaveis = card.responsaveis.map((nome) => {
        const funcionario = funcionarioDoResponsavel(state, nome);
        const canonico = funcionario?.nome || nome.trim();
        if (canonico !== nome) alterou = true;
        return canonico;
      });

      const checklist = card.checklist.map((item) => {
        if (!item.responsavel?.trim()) return item;
        const funcionario = funcionarioDoResponsavel(state, item.responsavel);
        if (!funcionario) return { ...item, responsavel: item.responsavel.trim() };

        const canonico = funcionario.nome;
        const statusAtividade = item.statusAtividade || (item.feito ? "Finalizado" : "A fazer");
        if (canonico !== item.responsavel || statusAtividade !== item.statusAtividade) alterou = true;

        return {
          ...item,
          responsavel: canonico,
          statusAtividade,
        };
      });

      return { ...card, responsaveis, checklist };
    });

    return { ...r, cards };
  });

  return alterou ? { ...state, reinauguracoes } : state;
}

function withTaskActivities(rawState: AppState): AppState {
  const state = normalizeMuzambinhoAssignments(rawState);
  const hojeIso = new Date().toISOString().slice(0, 10);

  // 1) Monta as atividades "de verdade" de cada colaborador.
  // Tudo que nasce de Pendência/Reinauguração/Rotina é reconstruído a partir
  // da origem. Isso elimina tarefas órfãs quando a origem é apagada.
  const baseFuncionarios = state.funcionarios.map((func) => {
    const manuais = func.atividades
      .filter((a) =>
        !a.sourcePendenciaId &&
        !a.sourceReinauguracaoCardId &&
        !a.sourceAtividadeId &&
        !a.sourceRotinaId &&
        (!a.sourceCampanhaId || state.campanhas.some((c) => c.id === a.sourceCampanhaId))
      )
      .map((a) => {
        const checklist = a.checklist || [];
        if (!checklist.length) return a;
        const todos = checklist.every((i) => i.feito);
        const algum = checklist.some((i) => i.feito || i.statusAtividade === "Realizando");
        if (todos && a.status !== "Finalizado") return { ...a, feito: true, status: "Finalizado" as PendenciaStatus };
        if (algum && (!a.status || a.status === "A fazer")) return { ...a, feito: false, status: "Realizando" as PendenciaStatus };
        return a;
      });

    const pendencias = state.pendencias
      .filter((p) => (p.funcionarioId || funcionarioDoResponsavel(state, p.responsavel)?.id) === func.id)
      .map((p) => {
        const existente = func.atividades.find((a) => a.sourcePendenciaId === p.id);
        const status = p.status || (p.feito ? "Finalizado" : "A fazer");
        return {
          ...existente,
          id: existente?.id || `task-${p.id}`,
          titulo: p.titulo,
          data: p.prazo || "",
          feito: status === "Finalizado",
          status,
          sourcePendenciaId: p.id,
          sourceCampanhaId: p.campanhaId,
          origem: p.campanhaId ? "Campanha" as const : "Central de Pendências" as const,
          area: p.area,
          descricao: p.descricao,
          prioridade: p.prioridade,
          checklist: p.checklist || [],
        };
      });

    const reinauguracao = state.reinauguracoes.flatMap((r) => {
      const filial = state.filiais.find((f) => f.id === r.filialId);
      const area = filial ? `Reinauguração · ${filial.codigo} · ${filial.nome}` : "Reinauguração";

      return r.cards.flatMap((card) => {
        const itensComAtribuicao = card.checklist.filter((item) => !!(item.responsavelId || item.responsavel?.trim()));
        const atividadesItens = card.checklist
          .filter((item) => (item.responsavelId || funcionarioDoResponsavel(state, item.responsavel)?.id) === func.id)
          .map((item) => {
            const existente = func.atividades.find((a) =>
              a.sourceReinauguracaoId === r.id &&
              a.sourceReinauguracaoCardId === card.id &&
              a.sourceReinauguracaoItemId === item.id
            );
            const status = item.statusAtividade || (item.feito ? "Finalizado" : "A fazer");
            const descricaoPadrao = card.descricao ? `${card.titulo} · ${card.descricao}` : card.titulo;
            return {
              ...existente,
              id: existente?.id || `rein-${r.id}-${card.id}-${item.id}`,
              titulo: item.texto,
              data: item.prazo || card.prazo || r.data || "",
              horario: item.horario,
              feito: status === "Finalizado",
              status,
              sourceReinauguracaoId: r.id,
              sourceReinauguracaoCardId: card.id,
              sourceReinauguracaoItemId: item.id,
              origem: "Reinauguração" as const,
              area,
              descricao: existente?.descricao || descricaoPadrao,
              prioridade: existente?.prioridade || "Média",
              checklist: existente?.checklist || [],
              justificativa: existente?.justificativa,
            };
          });

        // Compatibilidade com cartões antigos que ainda atribuem o cartão inteiro.
        const responsavelDoCartao = card.responsaveis.some((nome) => funcionarioDoResponsavel(state, nome)?.id === func.id);
        const atividadesCartao = responsavelDoCartao && itensComAtribuicao.length === 0
          ? (() => {
              const existente = func.atividades.find((a) =>
                a.sourceReinauguracaoId === r.id &&
                a.sourceReinauguracaoCardId === card.id &&
                !a.sourceReinauguracaoItemId
              );
              const status: PendenciaStatus =
                card.status === "Concluído" ? "Finalizado" :
                card.status === "Em andamento" ? "Realizando" :
                "A fazer";
              return [{
                ...existente,
                id: existente?.id || `rein-card-${r.id}-${card.id}-${func.id}`,
                titulo: card.titulo,
                data: card.prazo || r.data || "",
                feito: status === "Finalizado",
                status,
                sourceReinauguracaoId: r.id,
                sourceReinauguracaoCardId: card.id,
                origem: "Reinauguração" as const,
                area,
                descricao: card.descricao || `Tarefa da reinauguração de ${filial?.nome || "filial"}`,
                prioridade: existente?.prioridade || "Média",
                checklist: card.checklist.map((item) => ({
                  id: item.id,
                  texto: item.texto,
                  feito: item.feito,
                  prazo: item.prazo,
                  horario: item.horario,
                  responsavel: item.responsavel,
                  responsavelId: item.responsavelId,
                  statusAtividade: item.statusAtividade,
                })),
                justificativa: existente?.justificativa,
              }];
            })()
          : [];

        return [...atividadesCartao, ...atividadesItens];
      });
    });

    // Histórico das rotinas continua salvo; a tarefa do dia atual é recriada
    // a partir da definição fixa para sempre aparecer com a data correta.
    const historicoRotinas = func.atividades.filter((a) => {
      if (!a.sourceRotinaId) return false;
      const rotina = state.rotinasDiarias.find((r) => r.id === a.sourceRotinaId);
      if (!rotina) return true;
      return (rotina.frequencia || "Diária") === "Mensal"
        ? !a.data.startsWith(hojeIso.slice(0,7))
        : a.data !== hojeIso;
    });

    const [anoAtual, mesAtual] = hojeIso.split("-").map(Number);
    const ultimoDiaMes = new Date(anoAtual, mesAtual, 0).getDate();

    const rotinasDoPeriodo = state.rotinasDiarias
      .filter((r) => r.ativa && r.funcionarioId === func.id)
      .map((rotina) => {
        const frequencia = rotina.frequencia || "Diária";
        const dataReferencia = frequencia === "Mensal"
          ? `${hojeIso.slice(0,7)}-${String(Math.min(Math.max(1, rotina.diaMes || 1), ultimoDiaMes)).padStart(2,"0")}`
          : hojeIso;
        const existente = func.atividades.find((a) =>
          a.sourceRotinaId === rotina.id &&
          (frequencia === "Mensal" ? a.data.startsWith(hojeIso.slice(0,7)) : a.data === hojeIso)
        );
        return {
          ...existente,
          id: existente?.id || `rotina-${rotina.id}-${dataReferencia}`,
          titulo: rotina.titulo,
          data: dataReferencia,
          horario: rotina.horario,
          feito: existente?.feito || false,
          status: existente?.status || "A fazer" as PendenciaStatus,
          sourceRotinaId: rotina.id,
          origem: "Rotina diária" as const,
          descricao: rotina.descricao,
          prioridade: rotina.prioridade,
          checklist: existente?.checklist || rotina.checklist.map((item) => ({
            ...item,
            id: item.id,
            feito: false,
            prazo: dataReferencia,
            statusAtividade: "A fazer" as PendenciaStatus,
          })),
          justificativa: existente?.justificativa,
        };
      });

    return {
      ...func,
      atividades: [...manuais, ...historicoRotinas, ...rotinasDoPeriodo, ...pendencias, ...reinauguracao],
    };
  });

  // 2) Checklist delegado: cada item com colaborador vira uma tarefa própria
  // para essa pessoa, mas continua ligado à atividade principal.
  const pais = baseFuncionarios.flatMap((owner) =>
    owner.atividades
      .filter((a) =>
        !a.sourceAtividadeId &&
        !a.sourcePendenciaId &&
        !a.sourceReinauguracaoCardId
      )
      .map((atividade) => ({ owner, atividade }))
  );

  const funcionarios = baseFuncionarios.map((func) => {
    const delegadas = pais.flatMap(({ owner, atividade }) =>
      (atividade.checklist || [])
        .filter((item) => (item.responsavelId || funcionarioDoResponsavel(state, item.responsavel)?.id) === func.id)
        .map((item) => {
          const existente = state.funcionarios
            .find((f) => f.id === func.id)
            ?.atividades.find((a) =>
              a.sourceAtividadeOwnerId === owner.id &&
              a.sourceAtividadeId === atividade.id &&
              a.sourceAtividadeChecklistItemId === item.id
            );
          const status = item.statusAtividade || (item.feito ? "Finalizado" : "A fazer");
          const nomes = (atividade.checklist || []).map((i) => {
            const resp = state.funcionarios.find((f) => f.id === i.responsavelId)?.nome || i.responsavel;
            return resp ? `${i.texto}: ${resp}` : i.texto;
          }).join(" · ");
          return {
            ...existente,
            id: existente?.id || `delegada-${owner.id}-${atividade.id}-${item.id}`,
            titulo: item.texto,
            data: item.prazo || atividade.data,
            horario: item.horario || atividade.horario,
            feito: status === "Finalizado",
            status,
            sourceAtividadeOwnerId: owner.id,
            sourceAtividadeId: atividade.id,
            sourceAtividadeChecklistItemId: item.id,
            sourceCampanhaId: atividade.sourceCampanhaId,
            origem: "Checklist delegado" as const,
            descricao: `Atividade: ${atividade.titulo}${atividade.descricao ? ` · ${atividade.descricao}` : ""}${nomes ? ` · Equipe: ${nomes}` : ""}`,
            prioridade: atividade.prioridade || "Média",
            checklist: atividade.checklist,
            justificativa: existente?.justificativa,
          };
        })
    );

    return { ...func, atividades: [...func.atividades, ...delegadas] };
  });

  return { ...state, funcionarios };
}

const RESULTADOS_STORAGE_KEY = "bi-lojas-im-resultados-v1";
const OPERACIONAL_STORAGE_KEY = "bi-lojas-im-operacional-v1";
const CLOUD_MIGRATION_KEY = "bi-cloud-legacy-migrated-v1";

function sharedStateFromApp(state: AppState): Record<string, unknown> {
  return {
    filiais: state.filiais,
    influencers: state.influencers,
    funcionarios: state.funcionarios,
    avaliacoes: state.avaliacoes,
    trafegoPago: state.trafegoPago,
    campanhas: state.campanhas,
    metas: state.metas,
    vendas: state.vendas,
    resultadosDiarios: state.resultadosDiarios,
    jretailLotes: state.jretailLotes,
    pendencias: state.pendencias,
    volantes: state.volantes,
    custos: state.custos,
    despesasFixas: state.despesasFixas,
    contratos: state.contratos,
    usuarios: state.usuarios,
    conexoesSociais: state.conexoesSociais,
    metricasSociais: state.metricasSociais,
    coresResponsaveis: state.coresResponsaveis,
    rotinasDiarias: state.rotinasDiarias,
    reinauguracoes: state.reinauguracoes,
  };
}

function applySharedState(current: AppState, remote: Record<string, unknown>): AppState {
  const next: AppState = {
    ...current,
    ...(Array.isArray(remote.filiais) ? { filiais: remote.filiais as AppState["filiais"] } : {}),
    ...(Array.isArray(remote.influencers) ? { influencers: remote.influencers as AppState["influencers"] } : {}),
    ...(Array.isArray(remote.funcionarios) ? { funcionarios: remote.funcionarios as AppState["funcionarios"] } : {}),
    ...(Array.isArray(remote.avaliacoes) ? { avaliacoes: remote.avaliacoes as AppState["avaliacoes"] } : {}),
    ...(Array.isArray(remote.trafegoPago) ? { trafegoPago: remote.trafegoPago as AppState["trafegoPago"] } : {}),
    ...(Array.isArray(remote.campanhas) ? { campanhas: remote.campanhas as AppState["campanhas"] } : {}),
    ...(Array.isArray(remote.metas) ? { metas: remote.metas as AppState["metas"] } : {}),
    ...(Array.isArray(remote.vendas) ? { vendas: remote.vendas as AppState["vendas"] } : {}),
    ...(Array.isArray(remote.jretailLotes) ? { jretailLotes: remote.jretailLotes as AppState["jretailLotes"] } : {}),
    ...(Array.isArray(remote.resultadosDiarios) ? { resultadosDiarios: remote.resultadosDiarios as AppState["resultadosDiarios"] } : {}),
    ...(Array.isArray(remote.pendencias) ? { pendencias: remote.pendencias as AppState["pendencias"] } : {}),
    ...(Array.isArray(remote.volantes) ? { volantes: remote.volantes as AppState["volantes"] } : {}),
    ...(Array.isArray(remote.custos) ? { custos: remote.custos as AppState["custos"] } : {}),
    ...(Array.isArray(remote.despesasFixas) ? { despesasFixas: remote.despesasFixas as AppState["despesasFixas"] } : {}),
    ...(Array.isArray(remote.contratos) ? { contratos: remote.contratos as AppState["contratos"] } : {}),
    ...(Array.isArray(remote.usuarios) ? { usuarios: remote.usuarios as AppState["usuarios"] } : {}),
    ...(Array.isArray(remote.conexoesSociais) ? { conexoesSociais: remote.conexoesSociais as AppState["conexoesSociais"] } : {}),
    ...(Array.isArray(remote.metricasSociais) ? { metricasSociais: remote.metricasSociais as AppState["metricasSociais"] } : {}),
    ...(remote.coresResponsaveis && typeof remote.coresResponsaveis === "object"
      ? { coresResponsaveis: remote.coresResponsaveis as AppState["coresResponsaveis"] }
      : {}),
    ...(Array.isArray(remote.rotinasDiarias) ? { rotinasDiarias: remote.rotinasDiarias as AppState["rotinasDiarias"] } : {}),
    ...(Array.isArray(remote.reinauguracoes) ? { reinauguracoes: remote.reinauguracoes as AppState["reinauguracoes"] } : {}),
  };

  return withTaskActivities(normalizeMuzambinhoAssignments(next));
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<AppState>(() => withTaskActivities(normalizeMuzambinhoAssignments(initial)));
  const [resultadosStorageReady, setResultadosStorageReady] = useState(false);
  const [cloudReady, setCloudReady] = useState(false);
  const hadLegacyOperationalCacheRef = useRef(typeof window !== "undefined" && window.localStorage.getItem(OPERACIONAL_STORAGE_KEY) !== null);
  const cloudVersionRef = useRef(0);
  const cloudUserRef = useRef("");
  const lastCloudPayloadRef = useRef("");
  const cloudPushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cloudPullBusyRef = useRef(false);
  const cloudPushBusyRef = useRef(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(RESULTADOS_STORAGE_KEY);
      if (raw) {
        const salvos = JSON.parse(raw) as ResultadoDiario[];
        if (Array.isArray(salvos) && salvos.length) {
          setS((atual) => ({ ...atual, resultadosDiarios: salvos }));
        }
      }

      const operacionalRaw = window.localStorage.getItem(OPERACIONAL_STORAGE_KEY);
      if (operacionalRaw) {
        const operacional = JSON.parse(operacionalRaw) as Partial<AppState>;
        setS((atual) => withTaskActivities(normalizeMuzambinhoAssignments({
          ...atual,
          ...(Array.isArray(operacional.despesasFixas) ? { despesasFixas: operacional.despesasFixas } : {}),
          ...(Array.isArray(operacional.campanhas) ? { campanhas: operacional.campanhas } : {}),
          ...(Array.isArray(operacional.contratos) ? { contratos: operacional.contratos } : {}),
          ...(Array.isArray(operacional.influencers) ? { influencers: operacional.influencers } : {}),
          ...(Array.isArray(operacional.usuarios) ? { usuarios: operacional.usuarios } : {}),
          ...(Array.isArray(operacional.metas) ? { metas: operacional.metas } : {}),
          ...(Array.isArray(operacional.pendencias) ? { pendencias: operacional.pendencias } : {}),
          ...(Array.isArray(operacional.reinauguracoes) ? { reinauguracoes: operacional.reinauguracoes } : {}),
          ...(Array.isArray(operacional.rotinasDiarias) ? { rotinasDiarias: operacional.rotinasDiarias } : {}),
          coresResponsaveis: Object.fromEntries(Object.entries(operacional.coresResponsaveis || {}).filter(([, cor]) => typeof cor === "string" && /^#[0-9a-f]{6}$/i.test(cor))),
          ...(Array.isArray(operacional.funcionarios) ? { funcionarios: operacional.funcionarios } : {}),
          ...(Array.isArray(operacional.custos) ? { custos: operacional.custos.filter((c) => !["k1","k2","k3","k4","k5"].includes(String((c as Custo).id))) } : {}),
        } as AppState)));
      }
    } catch {
      // Se o navegador bloquear storage, o BI continua funcionando apenas na sessão atual.
    } finally {
      setResultadosStorageReady(true);
    }
  }, []);

  useEffect(() => {
    if (!resultadosStorageReady) return;
    try {
      window.localStorage.setItem(RESULTADOS_STORAGE_KEY, JSON.stringify(s.resultadosDiarios));
      window.localStorage.setItem(OPERACIONAL_STORAGE_KEY, JSON.stringify({
        despesasFixas: s.despesasFixas,
        campanhas: s.campanhas,
        contratos: s.contratos,
        influencers: s.influencers,
        usuarios: s.usuarios,
        metas: s.metas,
        pendencias: s.pendencias,
        funcionarios: s.funcionarios,
        custos: s.custos,
        reinauguracoes: s.reinauguracoes,
        rotinasDiarias: s.rotinasDiarias,
        coresResponsaveis: s.coresResponsaveis,
        jretailLotes: s.jretailLotes,
      }));
    } catch {
      // O cache local é só contingência; a fonte principal passa a ser a nuvem.
    }
  }, [s.resultadosDiarios, s.campanhas, s.contratos, s.influencers, s.usuarios, s.metas, s.pendencias, s.funcionarios, s.custos, s.despesasFixas, s.reinauguracoes, s.rotinasDiarias, s.coresResponsaveis, s.jretailLotes, resultadosStorageReady]);

  // Sempre que muda o usuário autenticado, reinicia a sessão de sincronização.
  useEffect(() => {
    setCloudReady(false);
    cloudVersionRef.current = 0;
    cloudUserRef.current = s.usuarioAtivoId;
    lastCloudPayloadRef.current = "";
    if (cloudPushTimerRef.current) {
      clearTimeout(cloudPushTimerRef.current);
      cloudPushTimerRef.current = null;
    }
  }, [s.autenticado, s.usuarioAtivoId]);

  // Login: baixa a base central. Na primeira utilização, o Master envia a base
  // local atual e transforma a nuvem na fonte única para todos os computadores.
  useEffect(() => {
    if (!resultadosStorageReady || !s.autenticado || !s.usuarioAtivoId || cloudReady) return;
    let cancelled = false;

    const sincronizarEntrada = async () => {
      try {
        let remote;

        // Primeiro incorpora, uma única vez, o que existia neste computador
        // antes da nuvem. Isso funciona mesmo se a pessoa tiver trocado a senha
        // localmente antes da centralização.
        if (window.localStorage.getItem(CLOUD_MIGRATION_KEY) !== "1" && hadLegacyOperationalCacheRef.current) {
          try {
            const migrated = await mergeLegacyCloudState(sharedStateFromApp(s));
            if (migrated.state) {
              remote = migrated;
              window.localStorage.setItem(CLOUD_MIGRATION_KEY, "1");
            }
          } catch (error) {
            console.error("[CloudSync] Falha ao incorporar dados antigos deste computador:", error);
          }
        }

        if (!remote) {
          remote = await pullCloudState();
        }
        if (cancelled || cloudUserRef.current !== s.usuarioAtivoId) return;

        if (remote.empty) {
          if (s.perfil !== "Master") {
            console.warn("[CloudSync] Base central ainda aguarda inicialização pelo Master.");
            return;
          }

          const localPayload = sharedStateFromApp(s);
          const initialized = await initCloudState(localPayload);
          if (cancelled) return;

          const finalState = initialized.state || localPayload;
          cloudVersionRef.current = Number(initialized.version || 1);
          lastCloudPayloadRef.current = JSON.stringify(finalState);
          if (initialized.state) {
            setS((current) => applySharedState(current, initialized.state as Record<string, unknown>));
          }
          try { window.localStorage.setItem(CLOUD_MIGRATION_KEY, "1"); } catch {}
          setCloudReady(true);
          return;
        }

        if (remote.state) {
          cloudVersionRef.current = Number(remote.version || 0);
          lastCloudPayloadRef.current = JSON.stringify(remote.state);
          setS((current) => applySharedState(current, remote.state as Record<string, unknown>));
          setCloudReady(true);
        }
      } catch (error) {
        console.error("[CloudSync] Falha ao carregar base central:", error);
      }
    };

    void sincronizarEntrada();
    return () => { cancelled = true; };
  }, [resultadosStorageReady, s.autenticado, s.usuarioAtivoId, s.perfil, cloudReady]);

  // Toda alteração operacional é enviada automaticamente para a nuvem.
  useEffect(() => {
    if (!resultadosStorageReady || !s.autenticado || !cloudReady) return;

    const payload = sharedStateFromApp(s);
    const serialized = JSON.stringify(payload);
    if (serialized === lastCloudPayloadRef.current) return;

    if (cloudPushTimerRef.current) clearTimeout(cloudPushTimerRef.current);
    cloudPushTimerRef.current = setTimeout(() => {
      cloudPushTimerRef.current = null;
      if (cloudPushBusyRef.current) return;
      cloudPushBusyRef.current = true;

      void pushCloudState(payload)
        .then((result) => {
          cloudVersionRef.current = Number(result.version || cloudVersionRef.current);
          lastCloudPayloadRef.current = serialized;
        })
        .catch((error) => {
          console.error("[CloudSync] Falha ao salvar na nuvem:", error);
        })
        .finally(() => {
          cloudPushBusyRef.current = false;
        });
    }, 650);

    return () => {
      if (cloudPushTimerRef.current) {
        clearTimeout(cloudPushTimerRef.current);
        cloudPushTimerRef.current = null;
      }
    };
  }, [s, resultadosStorageReady, cloudReady]);

  // Atualiza este computador quando outra pessoa altera a base.
  useEffect(() => {
    if (!resultadosStorageReady || !s.autenticado || !cloudReady) return;

    const atualizarDeOutroComputador = async () => {
      if (cloudPullBusyRef.current || cloudPushBusyRef.current || cloudPushTimerRef.current) return;
      cloudPullBusyRef.current = true;

      try {
        const remote = await pullCloudState();
        const version = Number(remote.version || 0);
        if (remote.state && version > cloudVersionRef.current) {
          const serialized = JSON.stringify(remote.state);
          cloudVersionRef.current = version;
          lastCloudPayloadRef.current = serialized;
          setS((current) => applySharedState(current, remote.state as Record<string, unknown>));
        }
      } catch (error) {
        console.error("[CloudSync] Falha ao buscar alterações:", error);
      } finally {
        cloudPullBusyRef.current = false;
      }
    };

    const interval = window.setInterval(() => { void atualizarDeOutroComputador(); }, 6000);
    return () => window.clearInterval(interval);
  }, [resultadosStorageReady, s.autenticado, s.usuarioAtivoId, cloudReady]);

  return <AppCtx.Provider value={{ s, set: (fn) => setS((p) => withTaskActivities(normalizeMuzambinhoAssignments(fn(p)))) }}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const c = useContext(AppCtx);
  if (!c) throw new Error("AppProvider missing");
  return c;
}

export const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
export const num = (n: number) => n.toLocaleString("pt-BR");
export const fmtDate = (s: string) => (s ? s.split("-").reverse().join("/") : "—");
export const filialNome = (s: AppState, id: string) => s.filiais.find((f) => f.id === id)?.nome ?? "—";