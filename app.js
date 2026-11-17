const defaults = Object.freeze({name:'Hunaifa',karat:22,weight:2,date:'2026-08-07',paid:29100,purchaseFx:95.15,localRate:null});
const key='hunaifa-gold-details-v1', $=id=>document.getElementById(id);
const inr=(n,d=0)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:d}).format(n);
const usd=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(n);
const dateText=d=>new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric'}).format(new Date(d+'T12:00:00Z'));
const compactDate=d=>new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'2-digit'}).format(new Date(d+'T12:00:00Z'));
function savedDetails(){try{const s=JSON.parse(localStorage.getItem(key));if(s&&[18,22,24].includes(Number(s.karat))&&Number(s.weight)>0&&Number(s.paid)>0&&Number(s.purchaseFx)>0)return {...defaults,...s}}catch{}return {...defaults}}
let details=savedDetails(), gold=null, fx=null, ratesLoaded=false;
function showTrend(container,arrow,text,change,original,format){
 const direction=change>0?'gain':change<0?'loss':'flat';
 $(container).className='trend'+(container==='inr-trend'?' inr-trend':'')+' '+direction;
 $(arrow).textContent=direction==='gain'?'↑':direction==='loss'?'↓':'→';
 $(text).textContent=(direction==='gain'?'Profit ':direction==='loss'?'Loss ':'No change · ')+format(Math.abs(change))+' ('+Math.abs(change/original*100).toFixed(1)+'%)';
}
function render(){
 const purity=Number(details.karat), rate=details.localRate===null?gold?.rates[purity]:Number(details.localRate), originalUsd=Number(details.paid)/Number(details.purchaseFx);
 $('rate-updated').textContent=ratesLoaded?'Rates updated: gold '+(details.localRate===null?(gold?.date?compactDate(gold.date):'unavailable'):'your quote')+' · FX '+(fx?.date?compactDate(fx.date):'unavailable'):'Checking rate dates…';
 $('name-title').textContent=details.name+"'s";$('coin-karat').textContent=purity+'K';
 $('coin-fact').textContent=Number(details.weight).toLocaleString('en-US',{maximumFractionDigits:3})+' g · '+purity+'K';
 $('paid-fact').textContent=inr(Number(details.paid));$('cost-fact').textContent=usd(originalUsd);
 if(!Number.isFinite(rate)||rate<=0){$('rate-label').textContent='Gold rate unavailable';$('rate-date').textContent='';$('inr-value').textContent='—';$('usd-value').textContent='—';$('inr-trend').className='trend inr-trend';$('inr-trend-arrow').textContent='';$('inr-trend-text').textContent='Change unavailable';$('trend').className='trend';$('trend-arrow').textContent='';$('trend-text').textContent='Change unavailable';$('status').textContent='Tap the gear to enter a local gold rate.';return}
 $('rate-label').textContent=purity+'K '+(details.localRate===null?'India benchmark':'local quote')+' · '+inr(rate,2)+'/g';
 $('rate-date').textContent=details.localRate===null?dateText(gold.date):'Your rate';
 const valueInr=rate*Number(details.weight);$('inr-value').textContent=inr(valueInr);
 showTrend('inr-trend','inr-trend-arrow','inr-trend-text',valueInr-Number(details.paid),Number(details.paid),inr);
 if(!fx){$('usd-value').textContent='—';$('trend').className='trend';$('trend-arrow').textContent='';$('trend-text').textContent='Change unavailable';$('fx-detail').textContent='Exchange rate unavailable';$('status').textContent='Waiting for the latest USD/INR rate.';return}
 const valueUsd=valueInr/fx.rate,change=valueUsd-originalUsd;
 $('usd-value').textContent=usd(valueUsd);
 $('fx-detail').textContent='$1 = ₹'+fx.rate.toFixed(2)+' · '+dateText(fx.date);
 showTrend('trend','trend-arrow','trend-text',change,originalUsd,usd);
 $('status').textContent=details.localRate===null?'Published India rate · enter a Hyderabad quote in settings':'Your Hyderabad / Malabar quote · saved on this device';
}
function fillForm(){
 $('edit-name').value=details.name;$('edit-karat').value=details.karat;$('edit-weight').value=details.weight;
 $('edit-date').value=details.date;$('edit-paid').value=details.paid;$('edit-purchase-fx').value=details.purchaseFx;$('edit-rate').value=details.localRate??'';
}
$('gear').addEventListener('click',()=>{fillForm();$('settings').showModal()});
$('close').addEventListener('click',()=>$('settings').close());
$('settings').addEventListener('click',e=>{if(e.target===$('settings'))$('settings').close()});
$('restore').addEventListener('click',()=>{details={...defaults};localStorage.removeItem(key);fillForm();render()});
$('edit-form').addEventListener('submit',e=>{
 e.preventDefault();
 details={name:$('edit-name').value.trim(),karat:Number($('edit-karat').value),weight:Number($('edit-weight').value),date:$('edit-date').value,paid:Number($('edit-paid').value),purchaseFx:Number($('edit-purchase-fx').value),localRate:$('edit-rate').value===''?null:Number($('edit-rate').value)};
 localStorage.setItem(key,JSON.stringify(details));$('settings').close();render();
});
async function loadRates(){
 const responses=await Promise.allSettled([
  fetch('https://snapdata.dev/api/v1/gold/in/latest.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('gold');return r.json()}),
  fetch('https://api.frankfurter.dev/v2/rate/usd/inr',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('fx');return r.json()})
 ]);
 if(responses[0].status==='fulfilled'){
  const data=responses[0].value,rates={};
  for(const karat of [18,22,24]){const row=data.observations?.find(x=>x.instrument==='XAU.'+karat+'K'&&Number.isFinite(x.value)&&x.value>0);if(row)rates[karat]=row.value}
  if(rates[22])gold={rates,date:data.coverage?.to};
 }
 if(responses[1].status==='fulfilled'){const d=responses[1].value;if(d.base==='USD'&&d.quote==='INR'&&Number.isFinite(d.rate)&&d.rate>0)fx={rate:d.rate,date:d.date}}
 ratesLoaded=true;
 render();
}
render();loadRates();
