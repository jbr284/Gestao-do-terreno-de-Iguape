import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// --- COLE SUAS CHAVES DO FIREBASE AQUI ---
const firebaseConfig = {
  apiKey: "AIzaSyBh7HtgTJcLCa4hHAhbZGXcfE8pOHTJLso",
  authDomain: "gestao-do-terreno-iguape.firebaseapp.com",
  projectId: "gestao-do-terreno-iguape",
  storageBucket: "gestao-do-terreno-iguape.firebasestorage.app",
  messagingSenderId: "111574998276",
  appId: "1:111574998276:web:a490d5ee802cb26a3bc451"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Funções Utilitárias
const formatarDinheiro = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const formatarData = (ts) => new Date(ts.seconds * 1000).toLocaleDateString('pt-BR');

// --- FUNÇÕES GLOBAIS ---

window.mudarAba = function(aba) {
    document.getElementById('aba-entrada').classList.remove('active');
    document.getElementById('aba-financiamento').classList.remove('active');
    
    const btns = document.getElementsByClassName('tab-btn');
    for(let i=0; i<btns.length; i++) btns[i].classList.remove('active');

    document.getElementById('aba-' + aba).classList.add('active');
    
    if(aba === 'entrada') btns[0].classList.add('active');
    else btns[1].classList.add('active');
}

window.toggleAno = function(ano) {
    // O ID agora precisa ser único, então usamos o prefixo que vem no parâmetro (ex: 'entrada-2024' ou 'financ-2025')
    const conteudo = document.getElementById('wrapper-' + ano);
    const header = document.getElementById('header-' + ano);
    
    if(!conteudo || !header) return;

    if (conteudo.classList.contains('visivel')) {
        conteudo.classList.remove('visivel');
        header.classList.remove('aberto');
    } else {
        conteudo.classList.add('visivel');
        header.classList.add('aberto');
    }
}

// Função auxiliar para gerar o HTML do Acordeão
function gerarHtmlPorAno(dadosPorAno, contagemPorAno, prefixoId) {
    let htmlFinal = "";
    Object.keys(dadosPorAno).sort().forEach(ano => {
        // Criamos um ID único combinando o prefixo (entrada/financ) + ano
        const idUnico = `${prefixoId}-${ano}`;
        
        htmlFinal += `
            <div class="ano-container">
                <div id="header-${idUnico}" class="ano-header" onclick="toggleAno('${idUnico}')">
                    <span>📅 ${ano} <small style="color:#777; font-weight:normal">(${contagemPorAno[ano]} parcelas)</small></span>
                    <span class="seta">▶</span>
                </div>
                
                <div id="wrapper-${idUnico}" class="ano-wrapper">
                    <div class="grid-parcelas">
                        ${dadosPorAno[ano]}
                    </div>
                </div>
            </div>
        `;
    });
    return htmlFinal;
}

// --- LÓGICA PRINCIPAL ---
async function carregarDados() {
    const q = query(collection(db, "parcelas"), orderBy("vencimento"));
    const snapshot = await getDocs(q);

    const containerEntrada = document.getElementById('listaEntrada');
    const containerFinanc = document.getElementById('containerFinanciamento');
    
    // Agora ambos usam a lógica de agrupamento
    let dadosEntradaPorAno = {};
    let contagemEntrada = {};
    let dadosFinancPorAno = {}; 
    let contagemFinanc = {};
    
    let totalEntrada = 0;
    let totalFinanc = 0;

    snapshot.forEach((doc) => {
        const d = doc.data();
        const id = doc.id;
        
        // Cálculos de Total
        if(d.status === 'pendente') {
            if(d.tipo === 'entrada') totalEntrada += d.valor_original;
            else totalFinanc += d.valor_original;
        }

        // HTML do Desconto
        let htmlDesconto = "";
        if(d.regra_desconto && d.regra_desconto.tem_desconto) {
            const vlrComDesc = d.valor_original - d.regra_desconto.valor_do_desconto;
            htmlDesconto = `<div class="regra-desconto">⚡ Pague <b>${formatarDinheiro(vlrComDesc)}</b> até dia ${d.regra_desconto.ate_dia}</div>`;
        }

        // HTML do Card
        const card = `
            <div class="parcela-card ${d.status === 'pago' ? 'pago' : ''}">
                <div class="top-row">
                    <span style="font-weight:bold; color:#777">#${d.numero}</span>
                    <span class="status ${d.status === 'pago' ? 'pago' : 'pendente'}">${d.status}</span>
                </div>
                <div class="valor">${formatarDinheiro(d.valor_original)}</div>
                <div class="data">Vencimento: <strong>${formatarData(d.vencimento)}</strong></div>
                ${htmlDesconto}
                <button class="btn-detalhes" onclick="alert('ID: ${id}')">📂 Detalhes</button>
            </div>
        `;

        // Pega o Ano da parcela
        const ano = new Date(d.vencimento.seconds * 1000).getFullYear();

        // Distribui nas caixas certas (Entrada ou Financiamento)
        if(d.tipo === 'entrada') {
            if(!dadosEntradaPorAno[ano]) { dadosEntradaPorAno[ano] = ""; contagemEntrada[ano] = 0; }
            dadosEntradaPorAno[ano] += card;
            contagemEntrada[ano]++;
        } else {
            if(!dadosFinancPorAno[ano]) { dadosFinancPorAno[ano] = ""; contagemFinanc[ano] = 0; }
            dadosFinancPorAno[ano] += card;
            contagemFinanc[ano]++;
        }
    });

    // Renderiza Entrada (Agora usando a função de acordeão)
    // Se não tiver nenhuma parcela, mostra aviso, senão gera o acordeão
    if (Object.keys(dadosEntradaPorAno).length === 0) {
        containerEntrada.innerHTML = '<p style="text-align:center">Nenhuma parcela encontrada.</p>';
    } else {
        containerEntrada.innerHTML = gerarHtmlPorAno(dadosEntradaPorAno, contagemEntrada, 'entrada');
    }
    document.getElementById('resumoEntrada').innerText = formatarDinheiro(totalEntrada);

    // Renderiza Financiamento
    containerFinanc.innerHTML = gerarHtmlPorAno(dadosFinancPorAno, contagemFinanc, 'financ');
    document.getElementById('resumoFinanc').innerText = formatarDinheiro(totalFinanc);
}

carregarDados();

