// auth-ui.js - small UX helpers for auth pages
document.addEventListener('click', e=>{
  const t = e.target
  if(t.matches('.toggle-pw')){
    const input = t.closest('.password-field').querySelector('input')
    if(input.type === 'password'){ input.type = 'text'; t.textContent='ซ่อน' } else { input.type='password'; t.textContent='แสดง' }
  }
  if(t.matches('.token-copy')){
    const input = t.closest('.token-box').querySelector('input')
    input.select()
    try{ document.execCommand('copy'); t.textContent='คัดลอกแล้ว' ; setTimeout(()=>t.textContent='คัดลอก',1200)}catch(e){ alert('ไม่สามารถคัดลอกได้') }
  }
})
