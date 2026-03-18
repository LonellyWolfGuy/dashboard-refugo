import { useDashboard } from "@/contexts/DashboardContext";
import { getMotivosCoresMap, MOTIVOS_REFUGO_PADRAO } from "@/lib/initialData";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function AnaliseMotivoRefugo() {
  const { mesAtual, getMesData } = useDashboard();
  const mesData = getMesData(mesAtual);
  const coresMap = getMotivosCoresMap();

  // Agregar motivos por mês
  const motivosTotais: Record<string, number> = {};
  
  mesData.registros.forEach((registro) => {
    if (registro.motivos && registro.motivos.length > 0) {
      registro.motivos.forEach((motivo) => {
        motivosTotais[motivo.motivo] = (motivosTotais[motivo.motivo] || 0) + motivo.quantidade;
      });
    }
  });

  // Preparar dados para gráfico de barras
  const dadosBarras = MOTIVOS_REFUGO_PADRAO
    .filter((motivo) => motivosTotais[motivo] > 0)
    .map((motivo) => ({
      motivo: motivo.length > 20 ? motivo.substring(0, 17) + "..." : motivo,
      quantidade: motivosTotais[motivo],
      cor: coresMap[motivo],
    }));

  // Preparar dados para gráfico de pizza
  const dadosPizza = Object.entries(motivosTotais).map(([motivo, quantidade]) => ({
    name: motivo,
    value: quantidade,
    cor: coresMap[motivo],
  }));

  const totalMotivos = Object.values(motivosTotais).reduce((sum, val) => sum + val, 0);

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
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Motivos de Refugo - Quantidade</h3>
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
              formatter={(value: any) => value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
            />
            <Bar 
              dataKey="quantidade" 
              fill="#3b82f6"
              radius={[8, 8, 0, 0]}
            >
              {dadosBarras.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.cor} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Gráfico de Pizza + Tabela */}
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
                label={({ name, value }) => `${name}: ${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {dadosPizza.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.cor} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: any) => value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Tabela de Detalhes */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Detalhes por Motivo</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {Object.entries(motivosTotais)
              .sort(([, a], [, b]) => b - a)
              .map(([motivo, quantidade]) => {
                const percentual = totalMotivos > 0 ? (quantidade / totalMotivos) * 100 : 0;
                return (
                  <div key={motivo} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: coresMap[motivo] }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{motivo}</p>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                          <div
                            className="h-1.5 rounded-full transition-all"
                            style={{
                              width: `${percentual}%`,
                              backgroundColor: coresMap[motivo],
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="text-right ml-2 flex-shrink-0">
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
