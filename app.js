// app.js
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

// --- FUNÇÕES GLOBAIS (Visíveis para o HTML) ---

// Função de Abas
window.mudarAba = function(aba) {
    document.getElementById('aba-entrada').classList.remove('active');
    document.getElementById('aba-financiamento').classList.remove('active');
    
    const btns = document.getElementsByClassName('tab-btn');
    for(let i=0; i<btns.length; i++) btns[i].classList.remove('active');

    document.getElementById('aba-' + aba).classList.add('active');
    
    if(aba === 'entrada') btns[0].classList.add('active');
    else btns[1].classList.add('active');
}

// Função do Acordeão (Expandir/Recolher)
window.toggleAno = function(ano) {
    const conteudo = document.getElementById('wrapper-' + ano); // Busca pelo Wrapper
    const header = document.getElementById('header-' + ano);
    
    if(!conteudo || !header) return;

    // Alterna classes
    if (conteudo.classList.contains('visivel')) {
        conteudo.classList.remove('visivel');
        header.classList.remove('aberto');
    } else {
        conteudo.classList.add('visivel');
        header.classList.add('aberto');
    }
}

// --- LÓGICA PRINCIPAL ---
async function carregarDados() {
    const q = query(collection(db, "parcelas"), orderBy("vencimento"));
    const snapshot = await getDocs(q);

    const containerEntrada = document.getElementById('listaEntrada');
    const containerFinanc = document.getElementById('containerFinanciamento');
    
    let htmlEntrada = "";
    let dadosFinancPorAno = {}; 
    let contagemPorAno = {};
    let totalEntrada = 0;
    let totalFinanc = 0;

    snapshot.forEach((doc) => {
        const d = doc.data();
        const id = doc.id;
        
        // Cálculos
        if(d.status === 'pendente') {
            if(d.tipo === 'entrada') totalEntrada += d.valor_original;
            else totalFinanc += d.valor_original;
        }

        // Desconto
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

        if(d.tipo === 'entrada') {
            htmlEntrada += card;
        } else {
            // Agrupamento por Ano
            const ano = new Date(d.vencimento.seconds * 1000).getFullYear();
            if(!dadosFinancPorAno[ano]) {
                dadosFinancPorAno[ano] = "";
                contagemPorAno[ano] = 0;
            }
            dadosFinancPorAno[ano] += card;
            contagemPorAno[ano]++;
        }
    });

    // Renderiza Entrada
    containerEntrada.innerHTML = htmlEntrada;
    document.getElementById('resumoEntrada').innerText = formatarDinheiro(totalEntrada);

    // Renderiza Financiamento (Com Wrapper para corrigir bug)
    let htmlFinalFinanc = "";
    Object.keys(dadosFinancPorAno).sort().forEach(ano => {
        htmlFinalFinanc += `
            <div class="ano-container">
                <div id="header-${ano}" class="ano-header" onclick="toggleAno('${ano}')">
                    <span>📅 ${ano} <small style="color:#777; font-weight:normal">(${contagemPorAno[ano]} parcelas)</small></span>
                    <span class="seta">▶</span>
                </div>
                
                <div id="wrapper-${ano}" class="ano-wrapper">
                    <div class="grid-parcelas">
                        ${dadosFinancPorAno[ano]}
                    </div>
                </div>
            </div>
        `;
    });
    
    containerFinanc.innerHTML = htmlFinalFinanc;
    document.getElementById('resumoFinanc').innerText = formatarDinheiro(totalFinanc);
}

// Inicia
carregarDados();