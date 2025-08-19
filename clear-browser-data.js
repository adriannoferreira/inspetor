// Script para limpar dados do navegador relacionados ao Supabase
// Execute este script no console do navegador (F12 > Console)

// Limpar localStorage
localStorage.clear();
console.log('localStorage limpo');

// Limpar sessionStorage
sessionStorage.clear();
console.log('sessionStorage limpo');

// Limpar cookies do domínio atual
document.cookie.split(";").forEach(function(c) { 
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
});
console.log('Cookies limpos');

// Recarregar a página
window.location.reload();