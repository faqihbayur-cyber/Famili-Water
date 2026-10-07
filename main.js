
const $=(s,c=document)=>c.querySelector(s),$$=(s,c=document)=>[...c.querySelectorAll(s)];
function showToast(msg,err){let b=$('.toast-box');if(!b){b=document.createElement('div');b.className='toast-box';document.body.appendChild(b)}
const t=document.createElement('div');t.className='toast'+(err?' err':'');t.textContent=msg;b.appendChild(t);setTimeout(()=>t.remove(),3200)}
function showConfirm(msg,onYes){const m=$('#modal');$('p',m).textContent=msg;m.classList.add('on');
$('#mYes').onclick=()=>{m.classList.remove('on');onYes()};$('#mNo').onclick=()=>m.classList.remove('on')}
const nav=$('.nav'),burger=$('.burger'),links=$('.links');
addEventListener('scroll',()=>nav.classList.toggle('scrolled',scrollY>8),{passive:true});
burger.onclick=()=>{burger.classList.toggle('open');links.classList.toggle('open')};
$$('.links a').forEach(a=>a.addEventListener('click',()=>{burger.classList.remove('open');links.classList.remove('open')}));
const io=new IntersectionObserver(e=>e.forEach(x=>{if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target)}}),{threshold:.15});
$$('.reveal').forEach((el,i)=>{el.style.transitionDelay=(i%4)*70+'ms';io.observe(el)});
$$('.tab').forEach(t=>t.onclick=()=>{$$('.tab').forEach(x=>x.classList.toggle('on',x===t));$$('.pane').forEach(p=>p.classList.toggle('on',p.id===t.dataset.p))});
const num=$('#people');if(num){let n=4;const up=()=>{num.value=n;$('#galon').textContent=Math.max(1,Math.ceil(n*2*7/19));
$('#calcWa').href='https://wa.me/6285759995235?text='+encodeURIComponent('Halo FAMILI WATER, keluarga saya '+n+' orang. Saya ingin langganan sekitar '+$('#galon').textContent+' galon per minggu.')};
$('#plus').onclick=()=>{n=Math.min(20,n+1);up()};$('#minus').onclick=()=>{n=Math.max(1,n-1);up()};up()}
const q=$('#q');if(q)q.oninput=()=>$$('.gcard').forEach(c=>c.classList.toggle('hide',!c.dataset.n.includes(q.value.toLowerCase())));
const f=$('#form');if(f)$('#kirim').onclick=()=>{
const ids=['name','daerah','lokasi','jumlah'],msg={name:'Nama lengkap',daerah:'Kecamatan',lokasi:'Desa/kelurahan',jumlah:'Jumlah galon'};
$$('input',f).forEach(i=>i.classList.remove('bad'));
for(const id of ids){const el=$('#'+id),v=el.value.trim();if(!v||(id==='jumlah'&&!(Number(v)>=1))){el.classList.add('bad');el.focus();return showToast(msg[id]+' wajib diisi dengan benar',1)}}
if(!$('#agree').checked)return showToast('Centang persetujuan dulu ya',1);
const go=()=>{const t=['Halo Admin FAMILI WATER, saya ingin menjadi mitra.','Nama: '+$('#name').value.trim(),'Daerah (Kecamatan): '+$('#daerah').value.trim(),'Lokasi (Desa/Kelurahan): '+$('#lokasi').value.trim(),'Jumlah awal (galon): '+$('#jumlah').value.trim()].join('\n');
showToast('Mengarahkan ke WhatsApp…');setTimeout(()=>location.href='https://wa.me/6285759995235?text='+encodeURIComponent(t),700)};
Number($('#jumlah').value)<4?showConfirm('Jumlah kurang dari minimal 4 galon. Tetap lanjut?',go):go()};
