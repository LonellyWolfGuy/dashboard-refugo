import { useState } from "react";
import { RefugoMotivo, MOTIVOS_REFUGO_PADRAO } from "@/lib/initialData";
import { useDashboard } from "@/contexts/DashboardContext";
import { X, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface ModalMotivoRefugoProps {
  isOpen: boolean;
  onClose: () => void;
  motivos: RefugoMotivo[] | undefined;
  totalRefugo: number;
  onSave: (motivos: RefugoMotivo[]) => void;
}

export default function ModalMotivoRefugo({
  isOpen,
  onClose,
  motivos = [],
  totalRefugo,
  onSave,
}: ModalMotivoRefugoProps) {
  const { motivos: motivosCustomizados } = useDashboard();
  const [motivosList, setMotivosList] = useState<RefugoMotivo[]>(motivos);
  const [novoMotivo, setNovoMotivo] = useState("");
  const [novaQuantidade, setNovaQuantidade] = useState("");
  
  const motivosDisponiveis = motivosCustomizados && motivosCustomizados.length > 0 
    ? motivosCustomizados 
    : MOTIVOS_REFUGO_PADRAO;

  function adicionarMotivo() {
    if (!novoMotivo || !novaQuantidade) {
      toast.error("Selecione motivo e quantidade.");
      return;
    }

    const quantidade = parseFloat(novaQuantidade.replace(",", "."));
    if (isNaN(quantidade) || quantidade <= 0) {
      toast.error("Quantidade deve ser maior que zero.");
      return;
    }

    const totalAtual = motivosList.reduce((sum, m) => sum + m.quantidade, 0);
    if (totalAtual + quantidade > totalRefugo) {
      toast.error(`Total de motivos não pode exceder ${totalRefugo}.`);
      return;
    }

    setMotivosList([
      ...motivosList,
      {
        id: Date.now().toString(),
        motivo: novoMotivo,
        quantidade,
      },
    ]);

    setNovoMotivo("");
    setNovaQuantidade("");
  }

  function removerMotivo(id: string) {
    setMotivosList(motivosList.filter((m) => m.id !== id));
  }

  function salvar() {
    const totalMotivos = motivosList.reduce((sum, m) => sum + m.quantidade, 0);
    if (totalMotivos > totalRefugo) {
      toast.error(`Total de motivos (${totalMotivos}) não pode exceder ${totalRefugo}.`);
      return;
    }

    onSave(motivosList);
    onClose();
    toast.success("Motivos de refugo salvos com sucesso.");
  }

  if (!isOpen) return null;

  const totalMotivos = motivosList.reduce((sum, m) => sum + m.quantidade, 0);
  const diferenca = totalRefugo - totalMotivos;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-gray-800">Motivos de Refugo</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6 space-y-6">
          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>Total de Refugo:</strong> {totalRefugo.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} unidades
            </p>
            <p className="text-sm text-blue-900 mt-1">
              <strong>Já classificados:</strong> {totalMotivos.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} unidades
            </p>
            {diferenca > 0 && (
              <p className="text-sm text-amber-700 mt-1 font-semibold">
                <strong>Faltam classificar:</strong> {diferenca.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} unidades
              </p>
            )}
          </div>

          {/* Adicionar novo motivo */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700">Adicionar Motivo</label>
            <div className="flex gap-2">
              <select
                value={novoMotivo}
                onChange={(e) => setNovoMotivo(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Selecione um motivo...</option>
                {motivosDisponiveis.map((motivo) => (
                  <option key={motivo} value={motivo}>
                    {motivo}
                  </option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Qtd"
                value={novaQuantidade}
                onChange={(e) => setNovaQuantidade(e.target.value)}
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                step="0.01"
                min="0"
              />
              <button
                onClick={adicionarMotivo}
                className="px-3 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 transition-colors flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Adicionar</span>
              </button>
            </div>
          </div>

          {/* Lista de motivos */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Motivos Registrados</label>
            {motivosList.length === 0 ? (
              <p className="text-sm text-gray-500 italic">Nenhum motivo adicionado ainda.</p>
            ) : (
              <div className="space-y-2">
                {motivosList.map((motivo) => (
                  <div
                    key={motivo.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{motivo.motivo}</p>
                      <p className="text-xs text-gray-500">
                        {motivo.quantidade.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} unidades
                      </p>
                    </div>
                    <button
                      onClick={() => removerMotivo(motivo.id)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-6 border-t border-gray-200 bg-gray-50 sticky bottom-0">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={salvar}
            className="flex-1 px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 transition-colors font-medium"
          >
            Salvar Motivos
          </button>
        </div>
      </div>
    </div>
  );
}
