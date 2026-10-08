-- ==============================================================================
-- TESTE DE CONSULTAS: PRODUÇÃO E REFUGO DO PROTHEUS
-- Execute no SQL Server Management Studio (SSMS) no banco do Protheus
-- ==============================================================================

-- 1. Defina a data de teste no formato YYYYMMDD (Ex: '20261007' para 07/10/2026)
DECLARE @Data CHAR(8) = '20261007';
DECLARE @Filial CHAR(2) = '01'; -- Ajuste se a filial for diferente

PRINT '>>> CONSULTANDO MOVIMENTAÇÃO DO DIA: ' + @Data;

-- ------------------------------------------------------------------------------
-- A) CONSULTA DE REFUGO POR MOTIVO (Tabela SBC010 + SX5010)
-- Equivalente à rotina U_REF_DIARIO do STQ_DIARIO.prw (Local 55)
-- ------------------------------------------------------------------------------
SELECT 
    ISNULL(RTRIM(X5.X5_DESCRI), 'Outros') AS motivo,
    RTRIM(SBC.BC_MOTIVO)                  AS cod_motivo,
    CAST(SUM(SBC.BC_QTDDEST) AS NUMERIC(12,2)) AS quantidade_kg,
    COUNT(DISTINCT SBC.BC_OP)             AS total_ops_refugadas
FROM SBC010 SBC
LEFT JOIN SX5010 X5 
    ON X5.X5_TABELA = '43' 
   AND RTRIM(X5.X5_CHAVE) = RTRIM(SBC.BC_MOTIVO)
   AND X5.D_E_L_E_T_ = ' '
WHERE SBC.BC_LOCAL = '55'
  AND SBC.BC_DATA = @Data
  AND SBC.D_E_L_E_T_ = ' '
GROUP BY X5.X5_DESCRI, SBC.BC_MOTIVO
ORDER BY quantidade_kg DESC;

-- Total Geral de Refugo no Dia:
SELECT 
    CAST(ISNULL(SUM(SBC.BC_QTDDEST), 0) AS NUMERIC(12,2)) AS TOTAL_REFUGO_KG
FROM SBC010 SBC
WHERE SBC.BC_LOCAL = '55'
  AND SBC.BC_DATA = @Data
  AND SBC.D_E_L_E_T_ = ' ';


-- ------------------------------------------------------------------------------
-- B) CONSULTA DE PRODUÇÃO DO DIA (Tabela SD3010 + SB1010)
-- Equivalente à rotina U_PRD_DIARIO do STQ_DIARIO.prw (TM 010, Local 98, Lote L%)
-- ------------------------------------------------------------------------------
SELECT 
    CAST(ISNULL(SUM(SD3.D3_QUANT * ISNULL(SB1.B1_PESO, 0)), 0) AS NUMERIC(12,2)) AS TOTAL_PRODUCAO_KG,
    COUNT(DISTINCT SD3.D3_OP) AS TOTAL_OPS_PRODUZIDAS,
    COUNT(*) AS TOTAL_APONTAMENTOS
FROM SD3010 SD3
LEFT JOIN SB1010 SB1 
    ON SB1.B1_COD = SD3.D3_COD 
   AND SB1.D_E_L_E_T_ = ' '
WHERE SD3.D3_TM = '010'
  AND SD3.D3_LOCAL = '98'
  AND SD3.D3_LOTECTL LIKE 'L%'
  AND SD3.D3_EMISSAO = @Data
  AND SD3.D_E_L_E_T_ = ' ';
