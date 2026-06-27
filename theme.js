(function(){
  const saved = localStorage.getItem('jayby-theme');
  if(saved === 'dark'){
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();

document.addEventListener('DOMContentLoaded', function(){
  const btn = document.getElementById('themeToggle');
  if(!btn) return;
  btn.addEventListener('click', function(){
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if(isDark){
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('jayby-theme', 'light');
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('jayby-theme', 'dark');
    }
  });
});