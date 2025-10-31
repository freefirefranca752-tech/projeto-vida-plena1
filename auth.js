// auth.js
// Importa o Supabase
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ATENÇÃO: Suas chaves (verificadas na sua imagem)
const SUPABASE_URL = 'https://iuyapkycjgmyvxlpycdd.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1eWFwa3ljamdteXZ4bHB5Y2RkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExMTYwODUsImV4cCI6MjA3NjY5MjA4NX0.VlLOoSnNvaWoMFtof6zaLUgWC60bCBJT_ckdI7GRFkM';
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Seleciona os elementos
const registerForm = document.getElementById('register-form');
const loginForm = document.getElementById('login-form');
const feedbackMessage = document.getElementById('feedback-message');
const googleLoginBtn = document.getElementById('google-login-btn');


// --- FUNÇÕES DE FEEDBACK E CARREGAMENTO ---

/** Mostra uma mensagem de feedback (erro ou sucesso) */
function showFeedback(message, type = 'error') {
    if (!feedbackMessage) return;

    if (type === 'clear') {
        feedbackMessage.textContent = '';
        feedbackMessage.className = '';
    } else {
        feedbackMessage.textContent = message;
        feedbackMessage.className = type; // 'error' ou 'success'
    }
}

/** Ativa o estado de carregamento do botão (spinner) - Agora usa SVG nativo */
function showLoading(button, text) {
    if (!button) return;
    
    // Guarda o texto original do botão para restaurar depois
    const originalText = button.dataset.originalText || button.innerHTML;
    button.dataset.originalText = originalText;
    
    button.disabled = true;
    
    // Usando SVG de spinner nativo em vez de depender da biblioteca lucide
    button.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="spinner" style="vertical-align: middle; animation: spin 1s linear infinite; display: inline-block; margin-right: 8px;">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
        ${text}
    `;
}

/** Desativa o estado de carregamento do botão */
function hideLoading(button, defaultText) {
    if (!button) return;
    button.disabled = false;
    // Restaura o texto original ou usa o texto padrão
    button.innerHTML = button.dataset.originalText || defaultText;
    // Limpa o atributo de texto original
    delete button.dataset.originalText;
}


// --- LÓGICA DE LOGIN COM GOOGLE ---

if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', handleGoogleLogin);
}

async function handleGoogleLogin(e) {
    e.preventDefault();
    
    const btn = e.currentTarget;
    const originalText = btn.innerHTML; // Guarda o HTML/Texto original
    
    // Mostra o spinner no botão
    showLoading(btn, "Redirecionando..."); 

    const { data, error } = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: {
            // O Supabase irá redirecionar o usuário para esta página após o login
            redirectTo: window.location.origin + '/comunidade.html',
        }
    });

    if (error) {
        showFeedback('Erro ao tentar login com Google. Verifique a configuração do seu Supabase e Google Cloud.', 'error');
        // Restaura o botão em caso de erro
        hideLoading(btn, originalText); 
        // A função hideLoading usa o defaultText, que é o original neste caso.
    }
    // Se não houver erro, o navegador é redirecionado pelo Supabase/Google.
}


// --- LÓGICA DE CADASTRO (GAMIFICADA) ---

if (registerForm) {
    setupRegistrationSteps(); 
    
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const userName = document.getElementById('user-name').value;
        const submitButton = registerForm.querySelector('button[type="submit"]');

        showLoading(submitButton, "Criando conta...");

        const { data, error } = await sb.auth.signUp({
            email: email,
            password: password,
            options: {
                data: { user_name: userName }
            }
        });

        if (error) {
            showFeedback('Erro no cadastro: ' + error.message);
            hideLoading(submitButton, "Concluir e Entrar"); 
        } else {
            showFeedback('Conta criada! Redirecionando...', 'success');
            window.location.href = 'comunidade.html'; 
        }
    });
}

/** Configura a navegação em passos do formulário de cadastro */
function setupRegistrationSteps() {
    const btnNextStep = document.getElementById('btn-next-step');
    if (!btnNextStep) return; 
    
    const step1 = document.getElementById('step-1');
    const step2 = document.getElementById('step-2');
    const progressSteps = document.querySelectorAll('.progress-step');

    btnNextStep.addEventListener('click', () => {
        const email = document.getElementById('email').value;
        const pass = document.getElementById('password').value;

        if (email && pass.length >= 6) {
            step1.classList.remove('active');
            step2.classList.add('active');
            progressSteps[0].classList.remove('active');
            progressSteps[1].classList.add('active');
            showFeedback('', 'clear'); 
        } else {
            showFeedback('Preencha o e-mail e uma senha com 6+ caracteres.', 'error');
        }
    });
}


// --- LÓGICA DE LOGIN ---

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const submitButton = loginForm.querySelector('button[type="submit"]');
        
        showLoading(submitButton, "Entrando...");

        const { data, error } = await sb.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            showFeedback('Erro no login: E-mail ou senha inválidos.');
            hideLoading(submitButton, "Entrar"); 
        } else {
            window.location.href = 'comunidade.html';
        }
    });
}