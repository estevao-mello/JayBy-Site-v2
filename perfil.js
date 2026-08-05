import { auth, db, onAuthStateChanged, signOut, updatePassword, deleteUser, EmailAuthProvider, reauthenticateWithCredential, updateProfile, doc, setDoc, getDoc, updateDoc, collection, getDocs, query, orderBy } from './firebase.js';

// Gera avatar com iniciais
function gerarAvatar(nome, email) {
  const texto = nome || email || "?";
  const iniciais = texto.split(/[\s@]/)[0].substring(0, 2).toUpperCase();
  const cores = ['#00B8B8','#2C4250','#019999','#1C2B33','#0E5A60'];
  const cor = cores[texto.charCodeAt(0) % cores.length];
  return { iniciais, cor };
}

// Abre/fecha o painel
export function abrirPerfil() {
  document.getElementById('perfilDrawer').classList.add('open');
  document.getElementById('perfilOverlay').classList.add('open');
  carregarPerfil();
}

function fecharPerfil() {
  document.getElementById('perfilDrawer').classList.remove('open');
  document.getElementById('perfilOverlay').classList.remove('open');
}

// Carrega dados do usuário
async function carregarPerfil() {
  const user = auth.currentUser;
  if (!user) return;

  // Avatar
  const { iniciais, cor } = gerarAvatar(user.displayName, user.email);
  document.getElementById('perfilAvatar').textContent = iniciais;
  document.getElementById('perfilAvatar').style.background = cor;

  // Dados básicos
  document.getElementById('perfilEmail').textContent = user.email;
  document.getElementById('perfilNomeInput').value = user.displayName || '';

  // Dados do Firestore
  const docRef = doc(db, 'usuarios', user.uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    document.getElementById('perfilNichoInput').value = data.nichoFavorito || '';
    document.getElementById('perfilDataCadastro').textContent = 
      data.dataCadastro ? new Date(data.dataCadastro).toLocaleDateString('pt-BR') : '—';
  }

  // Histórico de ebooks
  carregarEbooks(user.uid);
}

// Carrega histórico de ebooks
async function carregarEbooks(uid) {
  const lista = document.getElementById('perfilEbooks');
  lista.innerHTML = '<p style="color:var(--text-soft);font-size:13px;">Carregando...</p>';
  
  try {
    const q = query(collection(db, 'usuarios', uid, 'ebooks'), orderBy('criadoEm', 'desc'));
    const snap = await getDocs(q);
    
    if (snap.empty) {
      lista.innerHTML = '<p style="color:var(--text-soft);font-size:13px;">Nenhum ebook gerado ainda.</p>';
      return;
    }

    lista.innerHTML = snap.docs.map(d => {
  const e = d.data();
  const data = e.criadoEm ? new Date(e.criadoEm).toLocaleDateString('pt-BR') : '—';
  return `
    <div class="perfil-ebook-item">
      <div class="perfil-ebook-info">
        <span class="perfil-ebook-titulo">${e.titulo}</span>
        <span class="perfil-ebook-data">${data}</span>
      </div>
      <button class="perfil-ebook-baixar btn btn-solid" 
        data-id="${d.id}"
        data-titulo="${e.titulo}"
        data-subtitulo="${e.subtitulo || ''}"
        data-intro="${e.intro || ''}"
        data-chapters='${JSON.stringify(e.chapters || [])}'>
        ↓ PDF
      </button>
    </div>`;
    }).join('');

    // Adiciona eventos de download
    lista.querySelectorAll('.perfil-ebook-baixar').forEach(btn => {
      btn.addEventListener('click', () => {
        const ebook = {
          title: btn.dataset.titulo,
          subtitle: btn.dataset.subtitulo,
          intro: btn.dataset.intro,
          chapters: JSON.parse(btn.dataset.chapters)
        };
        baixarEbookPDF(ebook);
      });
    });

  } catch(err) {
    lista.innerHTML = '<p style="color:var(--text-soft);font-size:13px;">Erro ao carregar ebooks.</p>';
  }
}

// Inicializa eventos do painel
export function inicializarPerfil() {
  // Fechar
  document.getElementById('perfilFechar').addEventListener('click', fecharPerfil);
  document.getElementById('perfilOverlay').addEventListener('click', fecharPerfil);

  // Salvar nome
  document.getElementById('perfilSalvarNome').addEventListener('click', async () => {
    const user = auth.currentUser;
    const nome = document.getElementById('perfilNomeInput').value.trim();
    const msg = document.getElementById('perfilMsgNome');
    if (!nome) return;
    try {
      await updateProfile(user, { displayName: nome });
      await setDoc(doc(db, 'usuarios', user.uid), { nome }, { merge: true });
      // Atualiza navbar
      const navUser = document.getElementById('navUser');
      if (navUser) navUser.textContent = 'Olá, ' + nome.split(' ')[0];
      // Atualiza avatar
      const { iniciais, cor } = gerarAvatar(nome, user.email);
      document.getElementById('perfilAvatar').textContent = iniciais;
      document.getElementById('perfilAvatar').style.background = cor;
      msg.textContent = '✓ Nome atualizado!';
      msg.style.color = 'var(--teal-deep)';
      setTimeout(() => msg.textContent = '', 3000);
    } catch(err) {
      msg.textContent = 'Erro ao salvar nome.';
      msg.style.color = '#B23A3A';
    }
  });

  // Salvar nicho favorito
  document.getElementById('perfilSalvarNicho').addEventListener('click', async () => {
    const user = auth.currentUser;
    const nicho = document.getElementById('perfilNichoInput').value.trim();
    const msg = document.getElementById('perfilMsgNicho');
    try {
      await setDoc(doc(db, 'usuarios', user.uid), { nichoFavorito: nicho }, { merge: true });
      msg.textContent = '✓ Nicho salvo!';
      msg.style.color = 'var(--teal-deep)';
      setTimeout(() => msg.textContent = '', 3000);
    } catch(err) {
      msg.textContent = 'Erro ao salvar nicho.';
      msg.style.color = '#B23A3A';
    }
  });

  // Trocar senha
  document.getElementById('perfilSalvarSenha').addEventListener('click', async () => {
    const user = auth.currentUser;
    const senhaAtual = document.getElementById('perfilSenhaAtual').value;
    const senhaNova = document.getElementById('perfilSenhaNova').value;
    const msg = document.getElementById('perfilMsgSenha');
    if (!senhaAtual || !senhaNova) {
      msg.textContent = 'Preencha os dois campos.';
      msg.style.color = '#B23A3A';
      return;
    }
    if (senhaNova.length < 6) {
      msg.textContent = 'A nova senha precisa ter pelo menos 6 caracteres.';
      msg.style.color = '#B23A3A';
      return;
    }
    try {
      const credential = EmailAuthProvider.credential(user.email, senhaAtual);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, senhaNova);
      document.getElementById('perfilSenhaAtual').value = '';
      document.getElementById('perfilSenhaNova').value = '';
      msg.textContent = '✓ Senha alterada com sucesso!';
      msg.style.color = 'var(--teal-deep)';
      setTimeout(() => msg.textContent = '', 3000);
    } catch(err) {
      if (err.code === 'auth/wrong-password') msg.textContent = 'Senha atual incorreta.';
      else msg.textContent = 'Erro ao trocar senha.';
      msg.style.color = '#B23A3A';
    }
  });

  // Excluir conta
  document.getElementById('perfilExcluirBtn').addEventListener('click', async () => {
    const user = auth.currentUser;
    const senha = document.getElementById('perfilSenhaExcluir').value;
    const msg = document.getElementById('perfilMsgExcluir');
    if (!senha) {
      msg.textContent = 'Digite sua senha pra confirmar.';
      msg.style.color = '#B23A3A';
      return;
    }
    if (!confirm('Tem certeza? Essa ação não pode ser desfeita.')) return;
    try {
      const credential = EmailAuthProvider.credential(user.email, senha);
      await reauthenticateWithCredential(user, credential);
      await deleteUser(user);
      window.location.href = 'index.html';
    } catch(err) {
      if (err.code === 'auth/wrong-password') msg.textContent = 'Senha incorreta.';
      else msg.textContent = 'Erro ao excluir conta.';
      msg.style.color = '#B23A3A';
    }
  });
}

function baixarEbookPDF(ebook) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const marginLeft = 20;
  const maxWidth = 170;
  let y = 25;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(28, 43, 51);
  const titleLines = doc.splitTextToSize(ebook.title, maxWidth);
  doc.text(titleLines, marginLeft, y);
  y += titleLines.length * 9 + 4;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(13);
  doc.setTextColor(92, 116, 128);
  const subtitleLines = doc.splitTextToSize(ebook.subtitle, maxWidth);
  doc.text(subtitleLines, marginLeft, y);
  y += subtitleLines.length * 7 + 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(40, 40, 40);
  const introLines = doc.splitTextToSize(ebook.intro, maxWidth);
  doc.text(introLines, marginLeft, y);
  y += introLines.length * 6 + 12;

  ebook.chapters.forEach((cap, i) => {
    if(y > 250){ doc.addPage(); y = 25; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(0, 153, 153);
    const chapTitleLines = doc.splitTextToSize(`Capítulo ${i+1}: ${cap.title}`, maxWidth);
    doc.text(chapTitleLines, marginLeft, y);
    y += chapTitleLines.length * 7 + 4;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);
    const paragraphs = cap.content.split('\n').filter(p => p.trim());
    paragraphs.forEach(paragraph => {
      if(y > 265){ doc.addPage(); y = 25; }
      const paraLines = doc.splitTextToSize(paragraph, maxWidth);
      doc.text(paraLines, marginLeft, y);
      y += paraLines.length * 6 + 5;
    });
    y += 6;
  });

  doc.save(ebook.title.replace(/[^a-zA-Z0-9]+/g, "_").substring(0, 60) + ".pdf");
}