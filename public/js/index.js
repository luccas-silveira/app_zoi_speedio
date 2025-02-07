// Seleciona os elementos da página
const cidade = document.querySelector('#cidade');
const estado = document.querySelector('#estado');
const contendo = document.querySelector('#contendo');
const message = document.querySelector('#message');
const downloadButton = document.querySelector('#download');
const sendButton = document.querySelector('#send');

// Variável global para armazenar os dados obtidos
let globalData = [];

// Função para converter os dados em CSV
function convertToCSV(dataArray, headers) {
  // Cria a primeira linha com os cabeçalhos
  let csvContent = headers.join(',') + '\n';

  // Adiciona cada linha de dados
  dataArray.forEach(item => {
    // Mapeia os valores na ordem dos cabeçalhos
    const row = headers.map(header => {
      let value = item[header] || "";
      // Se o valor for uma string e conter vírgulas, quebras de linha ou aspas, o envolve com aspas
      if (typeof value === 'string') {
        // Escapa aspas duplicando-as
        value = value.replace(/"/g, '""');
        if (value.search(/("|,|\n)/g) >= 0) {
          value = `"${value}"`;
        }
      }
      return value;
    });
    csvContent += row.join(',') + "\n";
  });
  return csvContent;
}

// Evento do botão "enviar"
sendButton.addEventListener("click", async () => {
  try {
    // Monta a URL para a requisição (verifique se a URL está correta conforme sua API)
    const response = await fetch(`https://viacep.com.br/ws/${estado.value}/${cidade.value}/${contendo.value}/json/`);
    
    if (!response.ok) {
      console.error('Erro na requisição');
      return;
    }
    
    const data = await response.json();
    console.log(data);

    // Armazena os dados na variável global para uso posterior
    globalData = data;
    
    message.textContent = `${data.length} Resultados Encontrados`;

    // Exibe o botão de download
    downloadButton.style.display = 'block';

  } catch (error) {
    console.error("Erro:", error);
  }
});

// Evento do botão "Download" para gerar e baixar o CSV
downloadButton.addEventListener('click', () => {
  if (!globalData || globalData.length === 0) {
    alert('Não há dados para baixar');
    return;
  }
  
  // Define os cabeçalhos desejados para o CSV
  const headers = ["cep", "logradouro", "complemento", "unidade", "bairro"];
  
  // Converte os dados para o formato CSV
  const csvContent = convertToCSV(globalData, headers);
  
  // Cria um blob com o conteúdo CSV
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  // Cria um link temporário e simula o clique para iniciar o download
  const a = document.createElement('a');
  a.href = url;
  a.download = `CEP's ${cidade.value}-${estado.value}-${contendo.value}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});