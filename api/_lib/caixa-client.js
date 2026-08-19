// api/_lib/caixa-client.js
const CAIXA_API = 'https://servicebus2.caixa.gov.br/portaldeloterias/api/lotofacil';

async function fetchConcurso(concurso) {
  const url = concurso ? `${CAIXA_API}/${concurso}` : CAIXA_API;

  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Accept': 'application/json'
    },
    signal: AbortSignal.timeout(8000)
  });

  if (!resp.ok) {
    throw new Error(`Caixa API retornou ${resp.status} para concurso ${concurso || 'atual'}`);
  }

  return resp.json();
}

function parseConcurso(resultado) {
  const numero = resultado.numero;

  const dataParts = resultado.dataApuracao.split('/');
  const data_sorteio = `${dataParts[2]}-${dataParts[1].padStart(2, '0')}-${dataParts[0].padStart(2, '0')}`;

  const dezenas = resultado.dezenasSorteadasOrdemSorteio || resultado.listaDezenas || [];
  const balls = {};
  dezenas.slice(0, 15).forEach((d, i) => {
    balls[`bola${i + 1}`] = parseInt(d, 10);
  });

  let ganhadores15 = 0;
  if (resultado.listaRateioPremio && resultado.listaRateioPremio.length > 0) {
    const faixa1 = resultado.listaRateioPremio.find(r => r.faixa === 1);
    if (faixa1) {
      ganhadores15 = faixa1.quantidadeGanhadores || 0;
    }
  }

  return {
    numero,
    data_sorteio,
    ...balls,
    ganhadores_15_acertos: ganhadores15
  };
}

module.exports = { fetchConcurso, parseConcurso };
