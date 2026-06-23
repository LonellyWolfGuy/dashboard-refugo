export interface PrevisaoDia {
  data: string;
  tempMax: number;
  tempMin: number;
  codigo: number;
}

export interface DadosClima {
  cidade: string;
  temperatura: number;
  codigo: number;
  previsao: PrevisaoDia[];
}

const CODIGOS_TEMPO: Record<number, { desc: string; icone: string }> = {
  0:  { desc: "Céu limpo",         icone: "☀️" },
  1:  { desc: "Parcialmente nublado", icone: "🌤️" },
  2:  { desc: "Nublado",           icone: "⛅" },
  3:  { desc: "Encoberto",         icone: "☁️" },
  45: { desc: "Neblina",           icone: "🌫️" },
  48: { desc: "Nevoeiro",          icone: "🌫️" },
  51: { desc: "Garoa fraca",       icone: "🌦️" },
  53: { desc: "Garoa",             icone: "🌦️" },
  55: { desc: "Garoa forte",       icone: "🌧️" },
  61: { desc: "Chuva fraca",       icone: "🌦️" },
  63: { desc: "Chuva",             icone: "🌧️" },
  65: { desc: "Chuva forte",       icone: "🌧️" },
  71: { desc: "Neve fraca",        icone: "🌨️" },
  73: { desc: "Neve",              icone: "🌨️" },
  75: { desc: "Neve forte",        icone: "❄️" },
  80: { desc: "Chuvisco",          icone: "🌦️" },
  81: { desc: "Chuva moderada",    icone: "🌧️" },
  82: { desc: "Chuva intensa",     icone: "🌧️" },
  95: { desc: "Tempestade",        icone: "⛈️" },
  96: { desc: "Tempestade c/ granizo", icone: "⛈️" },
  99: { desc: "Tempestade c/ granizo forte", icone: "⛈️" },
};

export function descricaoTempo(codigo: number): string {
  return CODIGOS_TEMPO[codigo]?.desc ?? "Desconhecido";
}

export function iconeTempo(codigo: number): string {
  return CODIGOS_TEMPO[codigo]?.icone ?? "❓";
}

export async function buscarClima(cidade = "Joinville"): Promise<DadosClima> {
  const geoRes = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cidade)}&count=1&language=pt&format=json`
  );
  const geoData = await geoRes.json();
  if (!geoData.results?.length) throw new Error("Cidade não encontrada");

  const { latitude, longitude, name } = geoData.results[0];

  const climaRes = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=America%2FSao_Paulo&forecast_days=4`
  );
  const climaData = await climaRes.json();

  const previsao: PrevisaoDia[] = climaData.daily.time.map((data: string, i: number) => ({
    data,
    tempMax: climaData.daily.temperature_2m_max[i],
    tempMin: climaData.daily.temperature_2m_min[i],
    codigo: climaData.daily.weather_code[i],
  }));

  previsao.shift();

  return {
    cidade: name,
    temperatura: Math.round(climaData.current.temperature_2m),
    codigo: climaData.current.weather_code,
    previsao,
  };
}
