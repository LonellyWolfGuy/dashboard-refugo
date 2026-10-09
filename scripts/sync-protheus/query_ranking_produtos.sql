-- ==============================================================================
-- CONSULTA: TOP 10 PRODUTOS E FERRAMENTAS COM MAIOR ÍNDICE DE REFUGO (30 DIAS)
-- Executar no SQL Server do Protheus (Banco de Produção)
-- ==============================================================================

DECLARE @Inicio char(8);
DECLARE @Fim char(8);

SET @Inicio = CONVERT(
    char(8),
    DATEADD(day, -29, GETDATE()),
    112
);

SET @Fim = CONVERT(char(8), GETDATE(), 112);

DECLARE @Refugo TABLE (
    Produto varchar(15),
    Ferramenta varchar(6),
    NomeFerramenta varchar(25),
    KgRefugo float
);

DECLARE @Producao TABLE (
    Produto varchar(15),
    Descricao varchar(55),
    Unidade varchar(2),
    QuantidadeProduzida float,
    KgProducao float
);

-- Identifica o produto acabado de cada OP com refugo.
;WITH RefugoPorOP AS (
    SELECT
        BC.BC_FILIAL AS Filial,
        LTRIM(RTRIM(BC.BC_OP)) AS OP,
        LTRIM(RTRIM(BC.BC_FERRAME)) AS Ferramenta,
        LTRIM(RTRIM(BC.BC_NOMEFER)) AS NomeFerramenta,
        SUM(ISNULL(BC.BC_QTDDEST, 0)) AS KgRefugo

    FROM dbo.SBC010 BC WITH (NOLOCK)

    WHERE BC.D_E_L_E_T_ <> '*'
      AND BC.BC_FILIAL = '01'
      AND BC.BC_LOCAL = '55'
      AND NULLIF(LTRIM(RTRIM(BC.BC_OP)), '') IS NOT NULL
      AND BC.BC_DATA BETWEEN @Inicio AND @Fim

    GROUP BY
        BC.BC_FILIAL,
        LTRIM(RTRIM(BC.BC_OP)),
        LTRIM(RTRIM(BC.BC_FERRAME)),
        LTRIM(RTRIM(BC.BC_NOMEFER))
)

INSERT INTO @Refugo (
    Produto,
    Ferramenta,
    NomeFerramenta,
    KgRefugo
)
SELECT
    LTRIM(RTRIM(O.Produto)),
    R.Ferramenta,
    R.NomeFerramenta,
    R.KgRefugo

FROM RefugoPorOP R

OUTER APPLY (
    SELECT
        COUNT(*) AS Correspondencias,

        CASE
            WHEN COUNT(*) = 1
                THEN MAX(C2.C2_PRODUTO)
            ELSE NULL
        END AS Produto,

        CASE
            WHEN COUNT(*) = 1
                THEN MAX(C2.C2_LOTEIMP)
            ELSE NULL
        END AS Lote

    FROM dbo.SC2010 C2 WITH (NOLOCK)

    WHERE C2.D_E_L_E_T_ <> '*'
      AND C2.C2_FILIAL = R.Filial
      AND (
            LTRIM(RTRIM(C2.C2_OP)) = R.OP

            OR (
                LTRIM(RTRIM(C2.C2_NUM))
                + LTRIM(RTRIM(C2.C2_ITEM))
                + LTRIM(RTRIM(C2.C2_SEQUEN))
            ) = R.OP
          )
) O

WHERE O.Correspondencias = 1
  AND LEFT(
      LTRIM(RTRIM(ISNULL(O.Lote, ''))),
      1
  ) <> 'R';

-- Calcula a produção normal por produto.
INSERT INTO @Producao (
    Produto,
    Descricao,
    Unidade,
    QuantidadeProduzida,
    KgProducao
)
SELECT
    LTRIM(RTRIM(D3.D3_COD)),
    LTRIM(RTRIM(B1.B1_DESC)),
    LTRIM(RTRIM(B1.B1_UM)),

    SUM(
        ISNULL(D3.D3_QUANT, 0)
    ),

    SUM(
        ISNULL(D3.D3_QUANT, 0)
        * ISNULL(B1.B1_PESO, 0)
    )

FROM dbo.SD3010 D3 WITH (NOLOCK)

OUTER APPLY (
    SELECT TOP (1)
        SB1.B1_DESC,
        SB1.B1_UM,
        SB1.B1_PESO,
        SB1.B1_TIPO

    FROM dbo.SB1010 SB1 WITH (NOLOCK)

    WHERE SB1.D_E_L_E_T_ <> '*'
      AND SB1.B1_COD = D3.D3_COD
      AND SB1.B1_FILIAL IN ('', D3.D3_FILIAL)

    ORDER BY
        CASE
            WHEN SB1.B1_FILIAL = D3.D3_FILIAL THEN 0
            ELSE 1
        END,
        SB1.R_E_C_N_O_ DESC
) B1

WHERE D3.D_E_L_E_T_ <> '*'
  AND D3.D3_FILIAL = '01'
  AND D3.D3_EMISSAO BETWEEN @Inicio AND @Fim
  AND D3.D3_TM = '010'
  AND D3.D3_LOCAL = '98'
  AND B1.B1_TIPO = '01'
  AND NULLIF(LTRIM(RTRIM(D3.D3_OP)), '') IS NOT NULL
  AND LEFT(
      LTRIM(RTRIM(ISNULL(D3.D3_LOTECTL, ''))),
      1
  ) <> 'R'

GROUP BY
    LTRIM(RTRIM(D3.D3_COD)),
    LTRIM(RTRIM(B1.B1_DESC)),
    LTRIM(RTRIM(B1.B1_UM));

-- Monta o ranking por produto.
;WITH RefugoPorProduto AS (
    SELECT
        Produto,
        SUM(KgRefugo) AS KgRefugo

    FROM @Refugo

    GROUP BY Produto
)

SELECT TOP (10)
    CAST(
        STUFF(
            (
                SELECT DISTINCT
                    '; ' +
                    CASE
                        WHEN NULLIF(F.NomeFerramenta, '') IS NOT NULL
                            THEN F.NomeFerramenta
                        WHEN NULLIF(F.Ferramenta, '') IS NOT NULL
                            THEN F.Ferramenta
                        ELSE 'Sem ferramenta'
                    END

                FROM @Refugo F

                WHERE F.Produto = P.Produto

                FOR XML PATH(''), TYPE
            ).value('.', 'nvarchar(max)'),
            1,
            2,
            ''
        )
        AS varchar(1000)
    ) AS Ferramentas,

    P.Produto,
    P.Descricao,

    CAST(
        P.QuantidadeProduzida AS decimal(18,3)
    ) AS [Quantidade produzida],

    P.Unidade,

    CAST(
        P.KgProducao AS decimal(18,2)
    ) AS [Produção kg],

    CAST(
        R.KgRefugo AS decimal(18,2)
    ) AS [Refugo kg],

    CAST(
        R.KgRefugo * 100.0
        / NULLIF(P.KgProducao + R.KgRefugo, 0)
        AS decimal(18,2)
    ) AS [Rejeição %]

FROM @Producao P

INNER JOIN RefugoPorProduto R
    ON R.Produto = P.Produto

WHERE P.KgProducao > 0
  AND R.KgRefugo > 0

ORDER BY
    R.KgRefugo * 100.0
        / NULLIF(P.KgProducao + R.KgRefugo, 0) DESC,
    R.KgRefugo DESC,
    P.Produto;
