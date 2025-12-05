import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy, doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// ⚠️ ATENÇÃO: NÃO ESQUEÇA DE COLAR SUAS CHAVES AQUI NOVAMENTE!
const firebaseConfig = {
  apiKey: "AIzaSyBh7HtgTJcLCa4hHAhbZGXcfE8pOHTJLso",
  authDomain: "gestao-do-terreno-iguape.firebaseapp.com",
  projectId: "gestao-do-terreno-iguape",
  storageBucket: "gestao-do-terreno-iguape.firebasestorage.app",
  messagingSenderId: "111574998276",
  appId: "1:111574998276:web:a490d5ee802cb26a3bc451"};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

let idParcelaAtual = null;

const formatarDinheiro = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const formatarData = (ts) => new Date(ts.seconds * 1000).toLocaleDateString('pt-BR');

// --- FUNÇÕES GLOBAIS ---
window.mudarAba = function(aba) {
    document.querySelectorAll('.tab-content').forEach(e => e.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(e => e.classList.remove('active'));
    document.getElementById('aba-' + aba).classList.add('active');
    
    const btns = document.querySelectorAll('.tab-btn');
    if(aba === 'entrada') btns[0].classList.add('active'); else btns[1].classList.add('active');
}

window.toggleAno = function(id) {
    const conteudo = document.getElementById('wrapper-' + id);
    const header = document.getElementById('header-' + id);
    if(conteudo) {
        conteudo.classList.toggle('visivel');
        header.classList.toggle('aberto');
    }
}

window.fecharModal = function() {
    document.getElementById('modalDetalhes').classList.remove('aberto');
    idParcelaAtual = null;
}

window.abrirDetalhes = async function(id) {
    idParcelaAtual = id;
    const modal = document.getElementById('modalDetalhes');
    
    const docRef = doc(db, "parcelas", id);
    const docSnap = await getDoc(docRef);
    const d = docSnap.data();

    // --- MUDANÇA AQUI: Título da Janela com "Nº" ---
    document.getElementById('modalTitulo').innerText = `Parcela Nº ${d.numero}`;
    
    document.getElementById('modalValor').innerText = formatarDinheiro(d.valor_original);
    document.getElementById('modalVencimento').innerText = formatarData(d.vencimento);

    const aviso = document.getElementById('modalAvisoDesconto');
    if(d.regra_desconto && d.regra_desconto.tem_desconto) {
        aviso.style.display = 'block';
        const vlrDesc = d.valor_original - d.regra_desconto.valor_do_desconto;
        aviso.innerHTML = `💡 Desconto: Pague <b>${formatarDinheiro(vlrDesc)}</b> até dia ${d.regra_desconto.ate_dia}.`;
    } else {
        aviso.style.display = 'none';
    }

    const areaUpload = document.querySelector('.area-upload');
    const areaComprovante = document.getElementById('areaComprovante');
    const btnConfirmar = document.getElementById('btnConfirmar');

    if (d.status === 'pago') {
        areaUpload.style.display = 'none';
        btnConfirmar.style.display = 'none';
        areaComprovante.style.display = 'block';
        if(d.comprovante_url) {
            document.getElementById('linkComprovante').href = d.comprovante_url;
            document.getElementById('linkComprovante').innerText = "📄 Ver Comprovante";
        } else {
            document.getElementById('linkComprovante').innerText = "✅ Pago (Sem comprovante)";
            document.getElementById('linkComprovante').removeAttribute('href');
        }
    } else {
        areaUpload.style.display = 'block';
        btnConfirmar.style.display = 'block';
        areaComprovante.style.display = 'none';
        document.getElementById('inputArquivo').value = "";
    }
    modal.classList.add('aberto');
}

window.realizarPagamento = async function() {
    const arquivo = document.getElementById('inputArquivo').files[0];
    const btn = document.getElementById('btnConfirmar');

    if (!arquivo) {
        if(!confirm("Dar baixa sem anexar comprovante?")) return;
    }

    btn.disabled = true;
    btn.innerText = "⏳ Enviando...";

    try {
        let downloadURL = null;
        if (arquivo) {
            const storageRef = ref(storage, `comprovantes/${idParcelaAtual}_${arquivo.name}`);
            const snapshot = await uploadBytes(storageRef, arquivo);
            downloadURL = await getDownloadURL(snapshot.ref);
        }

        const docRef = doc(db, "parcelas", idParcelaAtual);
        await updateDoc(docRef, {
            status: "pago",
            data_pagamento: new Date(),
            comprovante_url: downloadURL
        });

        alert("Pagamento registrado!");
        window.fecharModal();
        carregarDados();

    } catch (error) {
        console.error(error);
        alert("Erro: " + error.message);
    } finally {
        btn.disabled = false;
        btn.innerText = "✅ Confirmar Pagamento";
    }
}

async function carregarDados() {
    const q = query(collection(db, "parcelas"), orderBy("vencimento"));
    const snapshot = await getDocs(q);

    const containerEntrada = document.getElementById('listaEntrada');
    const containerFinanc = document.getElementById('containerFinanciamento');
    
    let dadosEntrada = {}; let contEntrada = {};
    let dadosFinanc = {}; let contFinanc = {};
    let totE = 0; let totF = 0;

    snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        const id = docSnap.id;
        
        if(d.status === 'pendente') {
            if(d.tipo === 'entrada') totE += d.valor_original; else totF += d.valor_original;
        }

        let htmlDesc = "";
        if(d.regra_desconto && d.regra_desconto.tem_desconto) {
            const v = d.valor_original - d.regra_desconto.valor_do_desconto;
            htmlDesc = `<div class="regra-desconto">⚡ Pague <b>${formatarDinheiro(v)}</b> até dia ${d.regra_desconto.ate_dia}</div>`;
        }

        // --- MUDANÇA AQUI: Formatação "Nº X" ---
        const card = `
            <div class="parcela-card ${d.status === 'pago' ? 'pago' : ''}">
                <div class="top-row">
                    <span style="font-weight:bold; color:#777">Nº ${d.numero}</span>
                    <span class="status ${d.status === 'pago' ? 'pago' : 'pendente'}">${d.status}</span>
                </div>
                <div class="valor">${formatarDinheiro(d.valor_original)}</div>
                <div class="data">Venc: <strong>${formatarData(d.vencimento)}</strong></div>
                ${htmlDesc}
                <button class="btn-detalhes" onclick="abrirDetalhes('${id}')">
                    ${d.status === 'pago' ? '🔍 Ver Recibo' : '📂 Pagar / Anexar'}
                </button>
            </div>
        `;

        const ano = new Date(d.vencimento.seconds * 1000).getFullYear();
        if(d.tipo === 'entrada') {
            if(!dadosEntrada[ano]) { dadosEntrada[ano] = ""; contEntrada[ano] = 0; }
            dadosEntrada[ano] += card; contEntrada[ano]++;
        } else {
            if(!dadosFinanc[ano]) { dadosFinanc[ano] = ""; contFinanc[ano] = 0; }
            dadosFinanc[ano] += card; contFinanc[ano]++;
        }
    });

    const gerarHtml = (dados, cont, prefixo) => {
        let html = "";
        Object.keys(dados).sort().forEach(ano => {
            const uid = `${prefixo}-${ano}`;
            html += `
            <div class="ano-container">
                <div id="header-${uid}" class="ano-header" onclick="toggleAno('${uid}')">
                    <span>📅 ${ano} <small>(${cont[ano]} parcelas)</small></span>
                    <span class="seta">▶</span>
                </div>
                <div id="wrapper-${uid}" class="ano-wrapper"><div class="grid-parcelas">${dados[ano]}</div></div>
            </div>`;
        });
        return html;
    };

    if(Object.keys(dadosEntrada).length === 0) containerEntrada.innerHTML = "<p style='text-align:center; padding:20px'>Nenhuma parcela encontrada.</p>";
    else containerEntrada.innerHTML = gerarHtml(dadosEntrada, contEntrada, 'ent');

    containerFinanc.innerHTML = gerarHtml(dadosFinanc, contFinanc, 'fin');

    document.getElementById('resumoEntrada').innerText = formatarDinheiro(totE);
    document.getElementById('resumoFinanc').innerText = formatarDinheiro(totF);
}

carregarDados();
