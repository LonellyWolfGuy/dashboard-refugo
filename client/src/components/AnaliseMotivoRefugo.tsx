import { useDashboard } from "@/contexts/DashboardContext";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

// Paleta de cores — expande automaticamente para qualquer número de motivos
const PALETA = [
  "#FF2D2D", // vermelho vivo
  "#FF7A00", // laranja
  "#FFD600", // amarelo
  "#00C853", // verde
  "#00B8D4", // ciano
  "#2979FF", // azul
  "#D500F9", // roxo
  "#FF1493", // rosa choque
  "#00E676", // verde neon
  "#FF6D00", // laranja escuro
  "#1DE9B6", // turquesa
  "#AA00FF", // violeta
  "#F50057", // vermelho rosa
  "#00B0FF", // azul claro
  "#76FF03", // lima
  "#FF4081", // rosa
];

function getCor(index: number): string {
  return PALETA[index % PALETA.length];
}

// Ordena motivos: alfabético, "Outros" sempre por último
function ordenarMotivos(motivos: string[]): string[] {
  const outros = motivos.filter(m => m.toLowerCase() === "outros");
  const resto  = motivos.filter(m => m.toLowerCase() !== "outros").sort((a, b) => a.localeCompare("pt-BR") || a.localeCompare(b));
  return [...resto, ...outros];
}

export default function AnaliseMotivoRefugo() {
  const { mesAtual, getMesData, motivos: motivosCadastrados } = useDashboard();
  const mesData = getMesData(mesAtual);

  // 1. Agrega quantidades por motivo a partir dos registros do mês
  const totais: Record<string, number> = {};
  mesData.registros.forEach(registro => {
    (registro.motivos ?? []).forEach(m => {
      totais[m.motivo] = (totais[m.motivo] || 0) + m.quantidade;
    });
  });

  // 2. Une motivos cadastrados + motivos que aparecem nos registros (sem duplicatas)
  const todosMotivosBrutos = Array.from(
    new Set([...motivosCadastrados, ...Object.keys(totais)])
  );

  // 3. Ordena: alfabético, "Outros" por último
  const todosMotivos = ordenarMotivos(todosMotivosBrutos);

  // 4. Mapa de cor estável por motivo (baseado na posição ordenada)
  const coresMap: Record<string, string> = {};
  todosMotivos.forEach((m, i) => { coresMap[m] = getCor(i); });

  // 5. Dados para gráfico de barras — apenas motivos com quantidade > 0
  const dadosBarras = todosMotivos
    .filter(m => (totais[m] ?? 0) > 0)
    .map(m => ({
      motivo: m.length > 20 ? m.substring(0, 17) + "..." : m,
      motivoCompleto: m,
      quantidade: totais[m],
      cor: coresMap[m],
    }));

  // 6. Dados para pizza — todos com quantidade > 0
  const dadosPizza = todosMotivos
    .filter(m => (totais[m] ?? 0) > 0)
    .map(m => ({ name: m, value: totais[m], cor: coresMap[m] }));

  const totalGeral = Object.values(totais).reduce((s, v) => s + v, 0);

  if (dadosBarras.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Análise de Motivos de Refugo</h3>
        <div className="flex items-center justify-center h-64">
          <p className="text-sm text-gray-500">Nenhum motivo de refugo registrado neste mês</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Gráfico de Barras */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Motivos de Refugo — Quantidade</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={dadosBarras} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="motivo"
              angle={-45}
              textAnchor="end"
              height={100}
              tick={{ fontSize: 12 }}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{ backgroundColor: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px" }}
              formatter={(value: any) => [value.toLocaleString("pt-BR", { maximumFractionDigits: 2 }), "Quantidade"]}
              labelFormatter={(label) => {
                const entry = dadosBarras.find(d => d.motivo === label);
                return entry?.motivoCompleto ?? label;
              }}
            />
            <Bar dataKey="quantidade" radius={[8, 8, 0, 0]} label={{ position: "top", fontSize: 11, fontWeight: 600, formatter: (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) }}>
              {dadosBarras.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.cor} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Pizza + Tabela */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pizza */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Distribuição de Motivos</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={dadosPizza}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) =>
                  `${name.length > 14 ? name.substring(0, 12) + "…" : name}: ${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}`
                }
                outerRadius={80}
                dataKey="value"
              >
                {dadosPizza.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.cor} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: any, name: any) => [
                  value.toLocaleString("pt-BR", { maximumFractionDigits: 2 }),
                  name,
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Tabela de detalhes */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Detalhes por Motivo</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {dadosBarras.map(({ motivoCompleto, quantidade, cor }) => {
              const percentual = totalGeral > 0 ? (quantidade / totalGeral) * 100 : 0;
              return (
                <div key={motivoCompleto} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cor }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{motivoCompleto}</p>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                        <div
                          className="h-1.5 rounded-full transition-all"
                          style={{ width: `${percentual}%`, backgroundColor: cor }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="text-right ml-3 flex-shrink-0">
                    <p className="text-sm font-semibold text-gray-800">
                      {quantidade.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-gray-500">{percentual.toFixed(1)}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
