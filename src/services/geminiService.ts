import { GoogleGenAI } from "@google/genai";

export async function getFleetInsights(anomalies: any[], stats: any, topBottom?: any, customApiKey?: string) {
  // 1. Tenta primeiro a rota segura do servidor backend (/api/ai/insights)
  // Dessa forma, a chave de API (GEMINI_API_KEY) fica 100% protegida no servidor e NUNCA e exposta no navegador ou no GitHub
  try {
    const response = await fetch('/api/ai/insights', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        anomalies,
        stats,
        topBottom,
        customApiKey: customApiKey || undefined,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.text) {
        return data.text;
      }
    }
  } catch (backendError) {
    console.warn("[Gemini] Rota de backend /api/ai/insights indisponivel ou falhou, tentando fallback direto:", backendError);
  }

  // 2. Fallback para execucao direta se o usuario configurou chave propria no cliente ou via env
  const metaEnv = (import.meta as any).env || {};
  const apiKey = customApiKey || metaEnv.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Chave de API do Gemini não configurada. Configure a variável GEMINI_API_KEY no servidor ou insira sua chave nas Configurações.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    Você é um analista de frota sênior e especialista em logística e eficiência energética.
    Analise os seguintes dados da frota e forneça um relatório executivo estratégico em português (Brasil).

    Estatísticas Gerais do Período:
    - KM Total Percorrido: ${stats?.totalKm ? stats.totalKm.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : '0'} km
    - KM Produtivo (Informado): ${stats?.totalKmProdutivo ? stats.totalKmProdutivo.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : '0'} km
    - Consumo Total: ${stats?.totalLitros ? stats.totalLitros.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : '0'} litros
    - Eficiência Média (KM/L): ${stats?.avgKml ? stats.avgKml.toFixed(2) : '0.00'} km/l
    - Custo Total com Combustível: R$ ${stats?.totalValor ? stats.totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
    - Custo por KM: R$ ${stats?.totalValor && stats?.totalKm ? (stats.totalValor / stats.totalKm).toFixed(2) : '0.00'} / km

    ${topBottom ? `
    Destaques de Performance:
    - Melhores Médias: ${topBottom.top3?.map((v: any) => `${v.name} (${v.kml?.toFixed(2)} km/l)`).join(', ') || 'N/A'}
    - Piores Médias: ${topBottom.bottom3?.map((v: any) => `${v.name} (${v.kml?.toFixed(2)} km/l)`).join(', ') || 'N/A'}
    - Maior Custo: ${topBottom.highestCost?.name || 'N/A'} (R$ ${topBottom.highestCost?.valor ? topBottom.highestCost.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '0,00'})
    ` : ''}

    Anomalias e Alertas Críticos (${anomalies?.length || 0} totais):
    ${anomalies && anomalies.length > 0 ? anomalies.slice(0, 15).map((a: any) => `- ${a.PLACA || ''} (${a.DATA || ''}): ${a.reason || ''} [KM: ${a.DISTANCE || ''}, L: ${a.LITROS || ''}, KML: ${a.KML ? a.KML.toFixed(2) : ''}]`).join('\n') : 'Nenhuma anomalia crítica identificada.'}
    ${anomalies && anomalies.length > 15 ? `... e mais ${anomalies.length - 15} outras anomalias que requerem atenção.` : ''}

    Seu relatório deve conter:
    1. **Sumário Executivo**: Uma frase impactante sobre a saúde da frota.
    2. **Análise de Eficiência**: Comentário sobre a média de ${stats?.avgKml ? stats.avgKml.toFixed(2) : '0.00'} km/l e o custo por KM.
    3. **Pontos de Atenção**: Destaque as anomalias mais graves (ex: consumos impossíveis ou falta de dados).
    4. **Plano de Ação**: 3 a 5 recomendações práticas para reduzir custos e melhorar a coleta de dados.

    Use Markdown para formatação, com títulos claros e emojis para facilitar a leitura.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: [{ parts: [{ text: prompt }] }],
    });

    return response.text || "Não foi possível gerar insights no momento.";
  } catch (error) {
    console.error("Error generating insights:", error);
    return "Erro ao conectar com a inteligência artificial. Verifique sua chave de API ou conexão com o servidor.";
  }
}
